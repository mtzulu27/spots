import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const publicDir = join(appRoot, 'public');
const distDir = join(appRoot, 'dist');
const catalogSourcePath = join(publicDir, 'spots-catalog.json');
const catalogDistPath = join(distDir, 'spots-catalog.json');
const placeMediaSourcePath = join(publicDir, 'place-media');
const placeMediaDistPath = join(distDir, 'place-media');

if (!existsSync(catalogSourcePath)) {
  throw new Error('No existe public/spots-catalog.json. Actualiza o genera el catálogo primero.');
}

if (!existsSync(distDir)) {
  throw new Error('No existe dist. Corre export:web al menos una vez antes de sincronizar catálogo local.');
}

mkdirSync(distDir, { recursive: true });
copyFileSync(catalogSourcePath, catalogDistPath);

if (existsSync(placeMediaDistPath)) {
  rmSync(placeMediaDistPath, { recursive: true, force: true });
}

if (existsSync(placeMediaSourcePath)) {
  cpSync(placeMediaSourcePath, placeMediaDistPath, { recursive: true });
}

const sourceStats = statSync(catalogSourcePath);
const distStats = statSync(catalogDistPath);

console.log(
  `Local catalog synced to dist (${sourceStats.size} bytes -> ${distStats.size} bytes): ${catalogDistPath}`,
);

if (existsSync(placeMediaDistPath)) {
  console.log(`Local place media synced to dist: ${placeMediaDistPath}`);
}
