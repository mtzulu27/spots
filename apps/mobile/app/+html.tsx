import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#050305" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Spots" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v2.png" />
        <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-v2.png" />
        <link rel="icon" href="/favicon.ico" />
        <title>Spots</title>
        <ScrollViewStyleReset />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var stableHeight = 0;
                var pendingShrinkHeight = null;
                var rootReady = false;
                var resumeTimer = null;
                var skipHeightUpdate = false;
                var justReloaded = false;
                try {
                  justReloaded = window.localStorage.getItem('spots-layout-reload') === '1';
                  if (justReloaded) window.localStorage.removeItem('spots-layout-reload');
                } catch (e) {}

                function isEditableElement(element) {
                  if (!element || !element.tagName) {
                    return false;
                  }

                  var tagName = element.tagName.toLowerCase();
                  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                    return true;
                  }

                  return !!element.isContentEditable;
                }

                function isKeyboardFocusActive() {
                  return isEditableElement(document.activeElement);
                }

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
                    if (window.navigator && window.navigator.standalone && !justReloaded) {
                      window.setTimeout(function () {
                        var measured = stableHeight;
                        var screenH = window.screen && window.screen.height;
                        if (measured && screenH && (screenH - measured) > 80) {
                          try { window.localStorage.setItem('spots-layout-reload', '1'); } catch (e) {}
                          window.location.reload();
                        }
                      }, 900);
                    }
                  }, 600);
                }

                function setAppHeight(options) {
                  var nextHeight = readAppHeight();
                  var allowShrink = options && options.allowShrink && !isKeyboardFocusActive();

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

                if (window.navigator && window.navigator.standalone && !justReloaded) {
                  window.setTimeout(function () {
                    var measured = stableHeight;
                    var screenH = window.screen && window.screen.height;
                    if (measured && screenH && (screenH - measured) > 80) {
                      try { window.localStorage.setItem('spots-layout-reload', '1'); } catch (e) {}
                      window.location.reload();
                    }
                  }, 1200);
                }
                window.addEventListener('resize', function () {
                  scheduleAppHeightSync({ allowShrink: true });
                });
                window.addEventListener('focus', function () {
                  scheduleAppHeightSyncAfterResume();
                });
                document.addEventListener('focusin', function () {
                  scheduleAppHeightSync({ allowShrink: false });
                });
                document.addEventListener('focusout', function () {
                  window.setTimeout(function () {
                    scheduleAppHeightSync({ allowShrink: true });
                  }, 80);
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
              })();
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --app-height: 100dvh;
              }

              html, body, #root {
                margin: 0;
                padding: 0;
                width: 100%;
                height: var(--app-height);
                min-height: var(--app-height);
                background: #050305;
                font-family: 'Montserrat', 'Segoe UI', sans-serif;
                -webkit-text-size-adjust: 100%;
                overflow: hidden;
              }

              input,
              textarea,
              select {
                font-size: 16px !important;
                line-height: 1.25 !important;
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
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
