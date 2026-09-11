import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Animated, Image, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthStoreProvider } from '@/lib/auth-store';
import { BookmarksStoreProvider } from '@/lib/bookmarks-store';
import { VisitedStoreProvider } from '@/lib/visited-store';
import { LikesStoreProvider } from '@/lib/likes-store';
import { LocationStoreProvider } from '@/lib/location-store';
import { emitRelayout } from '@/lib/relayout';
import { PlaceUpdatesProvider } from '@/lib/place-updates-store';
import { SpotsStoreProvider } from '@/lib/spots-store';
import { applyGlobalTypographyDefaults, MONTSERRAT_FONTS } from '@/lib/typography';
import { registerWebPushServiceWorker } from '@/lib/web-push';
import { darkAccountUi, lightAccountUi } from '@/lib/account-ui';
import { useUserPreferences } from '@/lib/user-preferences';

type RecoveryState = {
  epoch: number;
  ready: boolean;
  recovering: boolean;
};

const VIEWPORT_STABILITY_TOLERANCE = 2;
const VIEWPORT_RECOVERY_DELAYS = [120, 260, 420, 700];
const VIEWPORT_RECOVERY_FAILSAFE_DELAY = 1400;
const HARD_RECOVERY_SESSION_KEY = 'spots-hard-recovery';
const PRE_RESUMPTION_HEIGHT_KEY = 'spots-pre-resumption-height';
const ENABLE_WEB_VIEWPORT_RECOVERY = false;



function isKeyboardFocusActive() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }

  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) {
    return false;
  }

  const tagName = activeElement.tagName?.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    activeElement.isContentEditable
  );
}

export default function RootLayout() {
  const pathname = usePathname();
  const darkChrome = pathname === '/' || /login|signup|welcome|profile-setup|onboarding/.test(pathname);
  const { preferences } = useUserPreferences();
  const isDebugScreen = pathname === '/debug';
  const isPlaceDetail = pathname.startsWith('/spot/');
  const translucentChrome = darkChrome || isDebugScreen || pathname === '/place-map' || pathname.startsWith('/spot/');
  const appDark = preferences.dark && !darkChrome && !isDebugScreen;
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const palette = appDark ? darkAccountUi : lightAccountUi;
    const color = isDebugScreen ? '#1687ff' : darkChrome ? '#050305' : isPlaceDetail ? '#000000' : palette.bg;
    const root = document.documentElement;
    root.classList.toggle('spot-detail', isPlaceDetail);
    root.style.setProperty('--spots-bg', palette.bg);
    root.style.setProperty('--spots-surface', palette.surface);
    root.style.setProperty('--spots-surface-muted', palette.surfaceMuted);
    root.style.setProperty('--spots-text', palette.text);
    root.style.setProperty('--spots-text-secondary', palette.textSecondary);
    root.style.setProperty('--spots-text-tertiary', palette.textTertiary);
    root.style.setProperty('--spots-border', palette.border);
    root.style.setProperty('--spots-accent', palette.accent);
    root.style.setProperty('--spots-accent-soft', palette.accentSoft);
    root.style.setProperty('--spots-scrim', palette.scrim);
    root.style.setProperty('--spots-caption', palette.caption);
    root.style.colorScheme = isPlaceDetail || appDark || darkChrome ? 'dark' : 'light';
    root.dataset.spotsTheme = appDark || darkChrome ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    root.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
  }, [appDark, darkChrome, isDebugScreen, isPlaceDetail, translucentChrome]);
  const [fontsLoaded] = useFonts(MONTSERRAT_FONTS);
  const [bootSplashVisible, setBootSplashVisible] = useState(true);
  const bootSplashOpacity = useRef(new Animated.Value(1)).current;
  const bootSplashScale = useRef(new Animated.Value(0.82)).current;
  const frameRef = useRef<number | null>(null);
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const stableHeightRef = useRef(0);
  const pendingShrinkRef = useRef<number | null>(null);
  const recoveryTokenRef = useRef(0);
  const recoveryMeasurementsRef = useRef<number[]>([]);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    epoch: 0,
    ready: Platform.OS !== 'web' || !ENABLE_WEB_VIEWPORT_RECOVERY,
    recovering: Platform.OS === 'web' && ENABLE_WEB_VIEWPORT_RECOVERY,
  });

  const readViewportHeight = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    const nextHeight =
      window.visualViewport?.height ?? window.innerHeight ?? document.documentElement.clientHeight;

    return nextHeight ? Math.round(nextHeight) : null;
  }, []);

  const syncViewportHeight = useCallback((allowShrink = false) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    let roundedHeight = readViewportHeight();

    if (!roundedHeight) {
      return null;
    }

    const stableHeight = stableHeightRef.current;

    if (!stableHeight) {
      stableHeightRef.current = roundedHeight;
      pendingShrinkRef.current = null;
      document.documentElement.style.setProperty('--app-height', `${roundedHeight}px`);
      setViewportHeight((current) => (current === roundedHeight ? current : roundedHeight));
      return roundedHeight;
    }

    if (roundedHeight >= stableHeight) {
      stableHeightRef.current = roundedHeight;
      pendingShrinkRef.current = null;
      document.documentElement.style.setProperty('--app-height', `${roundedHeight}px`);
      setViewportHeight((current) => (current === roundedHeight ? current : roundedHeight));
      return roundedHeight;
    }

    if (allowShrink) {
      if (
        pendingShrinkRef.current !== null &&
        Math.abs(pendingShrinkRef.current - roundedHeight) <= VIEWPORT_STABILITY_TOLERANCE
      ) {
        stableHeightRef.current = roundedHeight;
        pendingShrinkRef.current = null;
        document.documentElement.style.setProperty('--app-height', `${roundedHeight}px`);
        setViewportHeight((current) => (current === roundedHeight ? current : roundedHeight));
        return roundedHeight;
      }

      pendingShrinkRef.current = roundedHeight;
      return stableHeightRef.current || roundedHeight;
    }

    pendingShrinkRef.current = roundedHeight;
    return stableHeightRef.current || roundedHeight;
  }, [readViewportHeight]);

  const inspectViewportLayout = useCallback((source: string, targetHeight: number | null) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        mismatch: false,
        cssVarHeight: 0,
        rootHeight: 0,
        expoRootHeight: 0,
        targetHeight: 0,
      };
    }

    const root = document.getElementById('root');
    const expoRoot = document.querySelector('[data-expo-router-root]');
    const cssVarHeight = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--app-height'),
      10,
    );
    const rootHeight = root ? Math.round(root.getBoundingClientRect().height) : 0;
    const expoRootHeight = expoRoot ? Math.round(expoRoot.getBoundingClientRect().height) : 0;
    const nextTargetHeight = Math.round(targetHeight ?? stableHeightRef.current ?? cssVarHeight ?? 0);
    const mismatch =
      !!nextTargetHeight &&
      ((rootHeight && Math.abs(rootHeight - nextTargetHeight) > VIEWPORT_STABILITY_TOLERANCE) ||
        (expoRootHeight &&
          Math.abs(expoRootHeight - nextTargetHeight) > VIEWPORT_STABILITY_TOLERANCE));

    const snapshot = {
      source,
      visualViewportHeight: Math.round(window.visualViewport?.height ?? 0),
      innerHeight: Math.round(window.innerHeight ?? 0),
      clientHeight: Math.round(document.documentElement.clientHeight ?? 0),
      cssVarHeight,
      rootHeight,
      expoRootHeight,
      targetHeight: nextTargetHeight,
      mismatch,
    };

    return snapshot;
  }, []);

  const finalizeViewportRecovery = useCallback((source: string, targetHeight: number | null) => {
    const snapshot = inspectViewportLayout(source, targetHeight);
    const mismatch = snapshot.mismatch;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const alreadyTriedHardRecovery = window.sessionStorage.getItem(HARD_RECOVERY_SESSION_KEY) === '1';
      const shouldAllowHardRecovery = process.env.NODE_ENV === 'production';

      // Check measured height against the height saved just before this resumption cycle
      // began (pageshow/visibilitychange/focus). On iOS PWA after OAuth, the browser can
      // report a stable but incorrect viewport height, making mismatch detection blind.
      // The saved reference is the last confirmed-correct height on the same orientation.
      const savedRaw = window.sessionStorage.getItem(PRE_RESUMPTION_HEIGHT_KEY);
      if (savedRaw && shouldAllowHardRecovery && !alreadyTriedHardRecovery) {
        window.sessionStorage.removeItem(PRE_RESUMPTION_HEIGHT_KEY);
        try {
          const saved = JSON.parse(savedRaw) as { height: number; orientation: number };
          const currentOrientation =
            window.screen?.orientation?.angle ??
            (window as Window & { orientation?: number }).orientation ??
            0;
          if (
            saved.orientation === currentOrientation &&
            saved.height > 0 &&
            snapshot.targetHeight > 0 &&
            Math.abs(saved.height - snapshot.targetHeight) > VIEWPORT_STABILITY_TOLERANCE
          ) {
            window.sessionStorage.setItem(HARD_RECOVERY_SESSION_KEY, '1');
          }
        } catch {
          // ignore malformed saved data
        }
      } else if (savedRaw) {
        window.sessionStorage.removeItem(PRE_RESUMPTION_HEIGHT_KEY);
      }

      if (!mismatch) {
        window.sessionStorage.removeItem(HARD_RECOVERY_SESSION_KEY);
      } else {
        if (shouldAllowHardRecovery && !alreadyTriedHardRecovery && recoveryState.epoch > 0) {
          window.sessionStorage.setItem(HARD_RECOVERY_SESSION_KEY, '1');
        }
      }
    }

    setRecoveryState((current) => ({
      epoch: mismatch ? current.epoch + 1 : current.epoch,
      ready: true,
      recovering: false,
    }));

    emitRelayout();
  }, [inspectViewportLayout, recoveryState.epoch]);

  const observeViewportRecovery = useCallback((token: number, source: string, allowShrink = true) => {
    if (token !== recoveryTokenRef.current) {
      return;
    }

    const measuredHeight = syncViewportHeight(allowShrink) ?? readViewportHeight();

    if (!measuredHeight) {
      return;
    }

    const measurements = recoveryMeasurementsRef.current;
    const previousHeight = measurements[measurements.length - 1];
    measurements.push(measuredHeight);

    if (
      measurements.length >= 2 &&
      previousHeight !== undefined &&
      Math.abs(previousHeight - measuredHeight) <= VIEWPORT_STABILITY_TOLERANCE
    ) {
      finalizeViewportRecovery(source, measuredHeight);
    }
  }, [finalizeViewportRecovery, readViewportHeight, syncViewportHeight]);

  const startViewportRecovery = useCallback((source: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      emitRelayout();
      return;
    }

    recoveryTokenRef.current += 1;
    const token = recoveryTokenRef.current;
    recoveryMeasurementsRef.current = [];

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutRefs.current = [];

    setRecoveryState((current) => ({
      ...current,
      recovering: true,
    }));

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-app-height-ready', 'true');
      if (document.body) {
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
      }
    }

    observeViewportRecovery(token, `${source}:immediate`, false);
    emitRelayout();

    frameRef.current = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        observeViewportRecovery(token, `${source}:raf2`, false);
        frameRef.current = null;
      });
    });

    timeoutRefs.current = VIEWPORT_RECOVERY_DELAYS.map((delay) =>
      setTimeout(() => {
        observeViewportRecovery(token, `${source}:${delay}ms`, true);
      }, delay),
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        if (token !== recoveryTokenRef.current) {
          return;
        }

        finalizeViewportRecovery(
          `${source}:failsafe`,
          syncViewportHeight(true) ?? readViewportHeight(),
        );
      }, VIEWPORT_RECOVERY_FAILSAFE_DELAY),
    );
  }, [finalizeViewportRecovery, observeViewportRecovery, readViewportHeight, syncViewportHeight]);

  const triggerRelayout = useCallback((allowShrink = false, source = 'unknown') => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      emitRelayout();
      return;
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutRefs.current = [];

    syncViewportHeight(allowShrink);
    emitRelayout();

    frameRef.current = window.requestAnimationFrame(() => {
      syncViewportHeight(allowShrink);
      emitRelayout();
      frameRef.current = null;
    });

    timeoutRefs.current = VIEWPORT_RECOVERY_DELAYS.map((delay) =>
      setTimeout(() => {
        syncViewportHeight(true);
        emitRelayout();
        inspectViewportLayout(`${source}:${delay}ms`, stableHeightRef.current);
      }, delay),
    );
  }, [inspectViewportLayout, syncViewportHeight]);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    applyGlobalTypographyDefaults();
  }, [fontsLoaded]);

  useEffect(() => {
    if (!fontsLoaded || Platform.OS !== 'web') {
      return;
    }

    void registerWebPushServiceWorker().catch(() => {
      // Web Push is progressive enhancement; the app should still boot without it.
    });
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[unhandledrejection]', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    if (Platform.OS === 'web' && !ENABLE_WEB_VIEWPORT_RECOVERY) {
      setRecoveryState({
        epoch: 0,
        ready: true,
        recovering: false,
      });
      setViewportHeight(null);
      emitRelayout();
      return;
    }

    syncViewportHeight();

    if (Platform.OS === 'web') {
      startViewportRecovery('bootstrap');
    } else {
      setRecoveryState({
        epoch: 0,
        ready: true,
        recovering: false,
      });
    }

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // If the height is already correct, avoid a resume recovery cycle.
        if (stableHeightRef.current > 0) {
          let measuredHeight = readViewportHeight() ?? 0;
          if (
            measuredHeight > 0 &&
            Math.abs(measuredHeight - stableHeightRef.current) <= VIEWPORT_STABILITY_TOLERANCE
          ) {
            return;
          }
        }
        window.setTimeout(() => {
          startViewportRecovery('app-active');
        }, 180);
      }
    });

    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return () => {
        appStateSubscription.remove();
      };
    }

    const forceResumeRecovery = (source: string) => {
      // If the viewport height is already correct, avoid a heavier recovery path.
      if (stableHeightRef.current > 0) {
        let measuredHeight = readViewportHeight() ?? 0;
        if (
          measuredHeight > 0 &&
          Math.abs(measuredHeight - stableHeightRef.current) <= VIEWPORT_STABILITY_TOLERANCE
        ) {
          triggerRelayout(true, `${source}:light`);
          return;
        }
      }

      if (stableHeightRef.current > 0 && typeof window !== 'undefined') {
        if (!window.sessionStorage.getItem(PRE_RESUMPTION_HEIGHT_KEY)) {
          const orientation =
            window.screen?.orientation?.angle ??
            (window as Window & { orientation?: number }).orientation ??
            0;
          window.sessionStorage.setItem(
            PRE_RESUMPTION_HEIGHT_KEY,
            JSON.stringify({ height: stableHeightRef.current, orientation }),
          );
        }
      }

      window.setTimeout(() => {
        startViewportRecovery(source);
      }, 180);
    };

    const effectStartTime = Date.now();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - effectStartTime < 3000) return;
        forceResumeRecovery('visible');
      }
    };

    const handleFocus = () => {
      if (Date.now() - effectStartTime < 3000) return;
      forceResumeRecovery('focus');
    };

    const handleResize = () => {
      triggerRelayout(!isKeyboardFocusActive(), 'resize');
    };

    const handleFocusIn = () => {
      triggerRelayout(false, 'focusin');
    };

    const handleFocusOut = () => {
      window.setTimeout(() => {
        triggerRelayout(true, 'focusout');
      }, 80);
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      forceResumeRecovery('pageshow');
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      appStateSubscription.remove();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current = [];
    };
  }, [fontsLoaded, startViewportRecovery, syncViewportHeight, triggerRelayout]);

  useEffect(() => {
  if (!fontsLoaded || typeof window === 'undefined') {
    return;
  }

  const fix = () => {
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resize'));
  };

  setTimeout(fix, 200);
  setTimeout(fix, 600);
  setTimeout(fix, 1200);
}, [fontsLoaded]);

  useEffect(() => {
    if (!fontsLoaded) return;

    Animated.spring(bootSplashScale, {
      toValue: 1,
      friction: 5,
      tension: 75,
      useNativeDriver: true,
    }).start();

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const hideBootSplash = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        Animated.timing(bootSplashOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setBootSplashVisible(false);
        });
      }, 420);
    };

    const showBootSplash = () => {
      if (hideTimer) clearTimeout(hideTimer);
      bootSplashOpacity.stopAnimation();
      bootSplashOpacity.setValue(1);
      setBootSplashVisible(true);
      hideBootSplash();
    };

    const handleAppState = (state: string) => {
      if (state === 'active') {
        showBootSplash();
      } else if (state === 'background' || state === 'inactive') {
        setBootSplashVisible(true);
        bootSplashOpacity.setValue(1);
      }
    };

    const hideTimerOnStart = setTimeout(() => {
      Animated.timing(bootSplashOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setBootSplashVisible(false);
      });
    }, 420);

    const appStateSubscription = AppState.addEventListener('change', handleAppState);
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        showBootSplash();
      }
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearTimeout(hideTimerOnStart);
      if (hideTimer) clearTimeout(hideTimer);
      appStateSubscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [bootSplashOpacity, bootSplashScale, fontsLoaded]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
      <AuthStoreProvider>
        <SpotsStoreProvider>
          <PlaceUpdatesProvider>
          <LocationStoreProvider>
            <LikesStoreProvider>
              <BookmarksStoreProvider>
                <VisitedStoreProvider>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                  }}
                >
                  {ENABLE_WEB_VIEWPORT_RECOVERY && recoveryState.recovering && recoveryState.ready ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                        backgroundColor: '#ffffff',
                      }}
                    />
                  ) : null}
                  <StatusBar
                    style={pathname.startsWith('/spot/') || appDark || darkChrome || isDebugScreen ? 'light' : 'dark'}
                    translucent={translucentChrome}
                    backgroundColor={Platform.OS === 'web'
                      ? translucentChrome
                        ? 'transparent'
                        : (isDebugScreen ? '#1687ff' : appDark || darkChrome ? '#050305' : lightAccountUi.bg)
                      : translucentChrome ? 'transparent' : lightAccountUi.bg}
                  />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: {
                        backgroundColor: isDebugScreen ? '#1687ff' : darkChrome || appDark ? '#050305' : lightAccountUi.bg,
                        flex: 1,
                      },
                    }}
                  />
                  {bootSplashVisible ? (
                    <Animated.View
                      pointerEvents="auto"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 10000,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffff',
                        opacity: bootSplashOpacity,
                      }}
                    >
                      <Animated.Image
                        source={require('../assets/splash-logo-rojo.png')}
                        resizeMode="contain"
                        style={{ width: 148, height: 72, transform: [{ scale: bootSplashScale }] }}
                        accessibilityLabel="Spots"
                      />
                    </Animated.View>
                  ) : null}
                </View>
                </VisitedStoreProvider>
              </BookmarksStoreProvider>
            </LikesStoreProvider>
          </LocationStoreProvider>
        </PlaceUpdatesProvider>
        </SpotsStoreProvider>
      </AuthStoreProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
