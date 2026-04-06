import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const distDir = join(appRoot, 'dist');
const envLocalPath = join(appRoot, '.env.local');
const envDeployPath = join(appRoot, '.env.deploy.local');
const remoteManifestName = '.spots-deploy-manifest.json';

function parseEnvFile(pathname) {
  if (!existsSync(pathname)) {
    return {};
  }

  const content = readFileSync(pathname, 'utf8');
  const values = {};

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');

    if (key) {
      values[key] = value;
    }
  });

  return values;
}

function readEnvValue(key, fallback = '') {
  const deployEnv = parseEnvFile(envDeployPath);
  const localEnv = parseEnvFile(envLocalPath);
  return process.env[key] || deployEnv[key] || localEnv[key] || fallback;
}

function walkFiles(rootDir) {
  const files = [];

  function visit(currentDir) {
    const entries = readdirSync(currentDir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    entries.forEach((entry) => {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        return;
      }

      if (entry.isFile()) {
        files.push(fullPath);
      }
    });
  }

  visit(rootDir);
  return files;
}

function sha1File(pathname) {
  const content = readFileSync(pathname);
  return createHash('sha1').update(content).digest('hex');
}

function buildManifest(rootDir) {
  const files = walkFiles(rootDir);
  const entries = {};

  files.forEach((file) => {
    const relPath = relative(rootDir, file).replaceAll('\\', '/');
    const stats = statSync(file);
    entries[relPath] = {
      sha1: sha1File(file),
      size: stats.size,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    files: entries,
  };
}

function ftpUrl(host, port, basePath, pathname = '') {
  const cleanBase = (basePath || '/').replace(/\/+$/, '');
  const cleanPath = pathname.replace(/^\/+/, '');
  const fullPath = [cleanBase, cleanPath].filter(Boolean).join('/');
  return `ftp://${host}:${port}${fullPath.startsWith('/') ? '' : '/'}${fullPath}`;
}

function runCurl(args, options = {}) {
  return execFileSync('curl', args, {
    encoding: 'utf8',
    stdio: options.captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

function tryReadRemoteManifest({ host, port, username, password, basePath }) {
  try {
    const output = runCurl(
      [
        '--silent',
        '--show-error',
        '--user',
        `${username}:${password}`,
        ftpUrl(host, port, basePath, remoteManifestName),
      ],
      { captureOutput: true },
    );

    const parsed = JSON.parse(output);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function ensureParentDir(pathname) {
  const parentDir = dirname(pathname);
  mkdirSync(parentDir, { recursive: true });
}

function uploadFile({ host, port, username, password, basePath, localPath, remotePath }) {
  runCurl([
    '--silent',
    '--show-error',
    '--ftp-create-dirs',
    '--user',
    `${username}:${password}`,
    '-T',
    localPath,
    ftpUrl(host, port, basePath, remotePath),
  ]);
}

function deleteRemoteFile({ host, port, username, password, basePath, remotePath }) {
  try {
    runCurl([
      '--silent',
      '--show-error',
      '--user',
      `${username}:${password}`,
      ftpUrl(host, port, basePath),
      '-Q',
      `DELE ${remotePath}`,
    ]);
  } catch {
    // Ignore missing files or server delete quirks.
  }
}

function main() {
  if (!existsSync(distDir)) {
    throw new Error('No existe dist. Corre el export antes del deploy.');
  }

  const host = readEnvValue('HOSTINGER_FTP_HOST', '145.223.107.61');
  const port = readEnvValue('HOSTINGER_FTP_PORT', '21');
  const username = readEnvValue('HOSTINGER_FTP_USERNAME');
  const password = readEnvValue('HOSTINGER_FTP_PASSWORD');
  const basePath = readEnvValue('HOSTINGER_FTP_BASE_PATH', '/');

  if (!host || !port || !username || !password) {
    throw new Error(
      'Faltan credenciales FTP. Define HOSTINGER_FTP_HOST, HOSTINGER_FTP_PORT, HOSTINGER_FTP_USERNAME y HOSTINGER_FTP_PASSWORD.',
    );
  }

  const localManifest = buildManifest(distDir);
  const remoteManifest = tryReadRemoteManifest({
    host,
    port,
    username,
    password,
    basePath,
  });

  const remoteFiles = remoteManifest?.files && typeof remoteManifest.files === 'object'
    ? remoteManifest.files
    : {};
  const localFiles = localManifest.files;

  const changedOrNewFiles = Object.keys(localFiles).filter((pathname) => {
    const localEntry = localFiles[pathname];
    const remoteEntry = remoteFiles[pathname];
    return (
      !remoteEntry ||
      remoteEntry.sha1 !== localEntry.sha1 ||
      remoteEntry.size !== localEntry.size
    );
  });

  const deletedFiles = Object.keys(remoteFiles).filter((pathname) => !(pathname in localFiles));

  changedOrNewFiles.forEach((pathname) => {
    const localPath = join(distDir, pathname);
    console.log(`Uploading ${pathname}`);
    uploadFile({
      host,
      port,
      username,
      password,
      basePath,
      localPath,
      remotePath: pathname,
    });
  });

  deletedFiles.forEach((pathname) => {
    console.log(`Deleting ${pathname}`);
    deleteRemoteFile({
      host,
      port,
      username,
      password,
      basePath,
      remotePath: pathname,
    });
  });

  const manifestTempDir = join(tmpdir(), 'spots-deploy');
  const manifestTempPath = join(manifestTempDir, remoteManifestName);
  ensureParentDir(manifestTempPath);
  writeFileSync(manifestTempPath, JSON.stringify(localManifest), 'utf8');

  console.log(`Uploading ${remoteManifestName}`);
  uploadFile({
    host,
    port,
    username,
    password,
    basePath,
    localPath: manifestTempPath,
    remotePath: remoteManifestName,
  });

  console.log(
    `Deploy completed. Uploaded ${changedOrNewFiles.length} file(s), deleted ${deletedFiles.length} file(s).`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
