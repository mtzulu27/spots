import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthStoreProvider } from '@/lib/auth-store';
import { LikesStoreProvider } from '@/lib/likes-store';
import { LocationStoreProvider } from '@/lib/location-store';
import { emitRelayout } from '@/lib/relayout';
import { SpotsStoreProvider } from '@/lib/spots-store';
import { applyGlobalTypographyDefaults, MONTSERRAT_FONTS } from '@/lib/typography';
import { registerWebPushServiceWorker } from '@/lib/web-push';

type RecoveryState = {
  epoch: number;
  ready: boolean;
  recovering: boolean;
};

const VIEWPORT_STABILITY_TOLERANCE = 2;
const VIEWPORT_RECOVERY_DELAYS = [120, 260, 420, 700];
const VIEWPORT_RECOVERY_FAILSAFE_DELAY = 1400;
const HARD_RECOVERY_SESSION_KEY = 'spots-hard-recovery';
const ENABLE_WEB_VIEWPORT_RECOVERY = process.env.NODE_ENV === 'production';

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
  const [fontsLoaded] = useFonts(MONTSERRAT_FONTS);
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

    const roundedHeight = readViewportHeight();

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
      if (!mismatch) {
        window.sessionStorage.removeItem(HARD_RECOVERY_SESSION_KEY);
      } else {
        const alreadyTriedHardRecovery = window.sessionStorage.getItem(HARD_RECOVERY_SESSION_KEY) === '1';
        if (!alreadyTriedHardRecovery && recoveryState.epoch > 0) {
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
        startViewportRecovery('app-active');
      }
    });

    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return () => {
        appStateSubscription.remove();
      };
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        stableHeightRef.current = 0;
        pendingShrinkRef.current = null;
        setTimeout(() => startViewportRecovery('visible'), 600);
      }
    };

    const handleFocus = () => {
      stableHeightRef.current = 0;
      pendingShrinkRef.current = null;
      setTimeout(() => startViewportRecovery('focus'), 600);
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

    const handlePageShow = () => {
      stableHeightRef.current = 0;
      pendingShrinkRef.current = null;
      setTimeout(() => startViewportRecovery('pageshow'), 600);
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthStoreProvider>
      <SpotsStoreProvider>
        <LocationStoreProvider>
          <LikesStoreProvider>
            <View
              style={{
                flex: 1,
                height: viewportHeight ?? undefined,
                minHeight: viewportHeight ?? undefined,
                overflow: 'hidden',
                backgroundColor: '#050305',
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
                    backgroundColor: '#050305',
                  }}
                />
              ) : null}
              <SafeAreaProvider key={`safe-area-${recoveryState.epoch}`}>
                <StatusBar style="light" translucent backgroundColor="transparent" />
                <Stack
                  key={`viewport-stack-${recoveryState.epoch}`}
                  screenOptions={{
                    headerShown: false,
                    contentStyle: {
                      backgroundColor: '#050305',
                      flex: 1,
                    },
                  }}
                />
              </SafeAreaProvider>
            </View>
          </LikesStoreProvider>
        </LocationStoreProvider>
      </SpotsStoreProvider>
    </AuthStoreProvider>
  );
}
