import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const distDir = join(appRoot, 'dist');
const publicDir = join(appRoot, 'public');
const distIndexPath = join(distDir, 'index.html');
const distManifestPath = join(distDir, 'manifest.json');
const iconSourcePath = join(publicDir, 'apple-touch-icon-v2.png');
const iconDistPath = join(distDir, 'apple-touch-icon-v2.png');
const webPushSwSourcePath = join(publicDir, 'web-push-sw.js');
const webPushSwDistPath = join(distDir, 'web-push-sw.js');
const catalogSourcePath = join(publicDir, 'spots-catalog.json');
const catalogDistPath = join(distDir, 'spots-catalog.json');

if (!existsSync(distDir)) {
  throw new Error('No existe dist. Corre el export antes de parchear.');
}

if (!existsSync(iconSourcePath)) {
  throw new Error('No existe apple-touch-icon-v2.png en public.');
}

if (!existsSync(webPushSwSourcePath)) {
  throw new Error('No existe web-push-sw.js en public.');
}

if (!existsSync(catalogSourcePath)) {
  throw new Error('No existe spots-catalog.json en public. Genera el catálogo antes del export.');
}

mkdirSync(distDir, { recursive: true });
copyFileSync(iconSourcePath, iconDistPath);
copyFileSync(webPushSwSourcePath, webPushSwDistPath);
copyFileSync(catalogSourcePath, catalogDistPath);

const headInjection = `
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
    <meta name="theme-color" content="#050305" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Spots" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v2.png" />
    <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-v2.png" />
    <link rel="icon" href="/favicon.ico" />`;

const viewportScript = `(function () {
  var stableHeight = 0;
  var pendingShrinkHeight = null;
  var rootReady = false;
  var resumeTimer = null;
  var skipHeightUpdate = false;
  function readAppHeight() {
    return (
      (window.visualViewport && window.visualViewport.height) ||
      window.innerHeight ||
      document.documentElement.clientHeight ||
      0
    );
  }

  function commitAppHeight(nextHeight) {
    if (!nextHeight || skipHeightUpdate) {
      return;
    }

    stableHeight = nextHeight;
    pendingShrinkHeight = null;
    document.documentElement.style.setProperty('--app-height', nextHeight + 'px');
    document.documentElement.setAttribute('data-app-height-ready', 'true');
  }

  function scheduleAppHeightSyncAfterResume() {
    stableHeight = 0;
    pendingShrinkHeight = null;
    skipHeightUpdate = true;
    if (resumeTimer !== null) {
      clearTimeout(resumeTimer);
    }
    resumeTimer = window.setTimeout(function () {
      skipHeightUpdate = false;
      resumeTimer = null;
      scheduleAppHeightSync({ allowShrink: true });
    }, 600);
  }

  function setAppHeight(options) {
    var nextHeight = readAppHeight();
    var allowShrink = options && options.allowShrink;

    if (!nextHeight) {
      return;
    }

    if (!stableHeight) {
      commitAppHeight(nextHeight);
      return;
    }

    if (nextHeight >= stableHeight) {
      commitAppHeight(nextHeight);
      return;
    }

    if (allowShrink) {
      if (pendingShrinkHeight !== null && Math.abs(pendingShrinkHeight - nextHeight) < 2) {
        commitAppHeight(nextHeight);
        return;
      }

      pendingShrinkHeight = nextHeight;
      return;
    }

    pendingShrinkHeight = nextHeight;
  }

  function afterFrames(callback, framesLeft) {
    if (framesLeft <= 0) {
      callback();
      return;
    }

    window.requestAnimationFrame(function () {
      afterFrames(callback, framesLeft - 1);
    });
  }

  function revealBody() {
    rootReady = true;
    document.documentElement.setAttribute('data-app-height-ready', 'true');
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
  }

  function bootstrapAppHeight() {
    setAppHeight({ allowShrink: true });
    afterFrames(function () {
      setAppHeight({ allowShrink: true });
      revealBody();
    }, 2);
  }

  function scheduleAppHeightSync(options) {
    var syncOptions = options || {};
    revealBody();
    setAppHeight(syncOptions);
    afterFrames(function () {
      setAppHeight(syncOptions);
      revealBody();
    }, 2);
    [120, 260, 420, 700].forEach(function (delay) {
      window.setTimeout(function () {
        revealBody();
        setAppHeight({ allowShrink: true });
      }, delay);
    });
  }

  window.__spotsUpdateAppHeight = scheduleAppHeightSync;

  bootstrapAppHeight();

  window.addEventListener('resize', function () {
    scheduleAppHeightSync({ allowShrink: true });
  });
  window.addEventListener('focus', function () {
    scheduleAppHeightSyncAfterResume();
  });
  window.addEventListener('pageshow', function () {
    scheduleAppHeightSyncAfterResume();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      scheduleAppHeightSyncAfterResume();
    }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      scheduleAppHeightSync({ allowShrink: true });
    });
    window.visualViewport.addEventListener('scroll', function () {
      scheduleAppHeightSync({ allowShrink: true });
    });
  }
})();`;

const htmlCssOverride = `:root {
  --app-height: 100dvh;
}

html, body, #root {
  margin: 0;
  padding: 0;
  width: 100%;
  height: var(--app-height);
  min-height: var(--app-height);
  background: #f7f3f7;
  -webkit-text-size-adjust: 100%;
  overflow: hidden;
}

body {
  visibility: hidden;
  opacity: 0;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}

html[data-app-height-ready='true'] body {
  visibility: visible;
  opacity: 1;
}

#root {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: var(--app-height);
  min-height: var(--app-height);
}

[data-expo-router-root],
[data-expo-router-root] > * {
  flex: 1 !important;
  height: var(--app-height) !important;
  min-height: var(--app-height) !important;
}`;

let indexHtml = readFileSync(distIndexPath, 'utf8');

indexHtml = indexHtml.replace('<html lang="en">', '<html lang="es">');
indexHtml = indexHtml.replace(
  /<meta name="viewport"[^>]*\/>/,
  headInjection,
);
indexHtml = indexHtml.replace(
  /<style id="expo-reset">[\s\S]*?<\/style>/,
  `<style id="expo-reset">\n${htmlCssOverride}\n    </style>`,
);
indexHtml = indexHtml.replace(/<style id="spots-pwa-shell">[\s\S]*?<\/style>/, '');
indexHtml = indexHtml.replace(/<script id="spots-app-height">[\s\S]*?<\/script>/, '');
indexHtml = indexHtml.replace(
  '</head>',
  `    <script id="spots-app-height">${viewportScript}</script>\n  </head>`,
);

writeFileSync(distIndexPath, indexHtml, 'utf8');

const manifest = JSON.parse(readFileSync(distManifestPath, 'utf8'));
manifest.display = 'standalone';
manifest.display_override = ['standalone'];
manifest.orientation = 'portrait';
manifest.start_url = '/';
manifest.scope = '/';
manifest.background_color = '#050305';
manifest.theme_color = '#050305';
manifest.icons = [
  {
    src: '/apple-touch-icon-v2.png',
    sizes: '180x180',
    type: 'image/png',
  },
  {
    src: '/apple-touch-icon-v2.png',
    sizes: '512x512',
    type: 'image/png',
  },
];

writeFileSync(distManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
