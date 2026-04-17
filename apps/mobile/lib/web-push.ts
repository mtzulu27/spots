import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const WEB_PUSH_SERVICE_WORKER_PATH = '/web-push-sw.js';
const WEB_PUSH_FUNCTION_NAME = process.env.EXPO_PUBLIC_WEB_PUSH_FUNCTION_NAME ?? 'send-web-push';
const WEB_PUSH_PUBLIC_KEY = process.env.EXPO_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? '';

export type WebPushPermission = NotificationPermission | 'unsupported';

export type WebPushSnapshot = {
  installed: boolean;
  permission: WebPushPermission;
  subscribed: boolean;
  supported: boolean;
};

function isWebRuntime() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

function isIOSWeb() {
  if (!isWebRuntime()) {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

function canUseServiceWorker() {
  if (!isWebRuntime()) {
    return false;
  }

  // Temporary isolation: iPhone/iPad PWA is the main crash surface, so we
  // disable web push there while we verify whether the boot crash is tied to
  // service worker / push APIs.
  if (isIOSWeb()) {
    return false;
  }

  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function getPermission(): WebPushPermission {
  if (!isWebRuntime() || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

function decodeBase64UrlToUint8Array(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const decoded = window.atob(padded);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}

function getBrowserPlatform() {
  if (!isWebRuntime()) {
    return 'native';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('mac os')) return 'macos';
  if (userAgent.includes('windows')) return 'windows';
  if (userAgent.includes('linux')) return 'linux';
  return 'web';
}

export function isStandaloneWebApp() {
  if (!isWebRuntime()) {
    return false;
  }

  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const navigatorStandalone =
    typeof navigator !== 'undefined' && 'standalone' in navigator
      ? Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      : false;

  return displayModeStandalone || navigatorStandalone;
}

export async function registerWebPushServiceWorker() {
  if (!canUseServiceWorker()) {
    return null;
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration(WEB_PUSH_SERVICE_WORKER_PATH);
  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register(WEB_PUSH_SERVICE_WORKER_PATH, {
    scope: '/',
    updateViaCache: 'none',
  });
}

export async function getWebPushSnapshot(): Promise<WebPushSnapshot> {
  const defaultWebPushSnapshot: WebPushSnapshot = {
    installed: false,
    permission: 'unsupported',
    subscribed: false,
    supported: false,
  };

  if (!canUseServiceWorker()) {
    return defaultWebPushSnapshot;
  }

  const registration = await navigator.serviceWorker.getRegistration(WEB_PUSH_SERVICE_WORKER_PATH);
  if (!registration?.pushManager) {
    return {
      ...defaultWebPushSnapshot,
      installed: isStandaloneWebApp(),
      permission: getPermission(),
      supported: true,
    };
  }

  const subscription = await registration?.pushManager.getSubscription();

  return {
    installed: isStandaloneWebApp(),
    permission: getPermission(),
    subscribed: Boolean(subscription),
    supported: true,
  };
}

async function persistSubscription(userId: string, subscription: PushSubscription) {
  if (!supabase) {
    throw new Error('Supabase no esta configurado.');
  }

  const payload = {
    endpoint: subscription.endpoint,
    installed: isStandaloneWebApp(),
    last_seen_at: new Date().toISOString(),
    permission: getPermission(),
    platform: getBrowserPlatform(),
    subscription: subscription.toJSON(),
    user_agent: navigator.userAgent,
    user_id: userId,
  };

  const { error } = await supabase
    .from('web_push_subscriptions')
    .upsert(payload, { onConflict: 'endpoint' });

  if (error) {
    throw new Error(error.message);
  }
}

export async function subscribeToWebPush(userId: string) {
  if (!canUseServiceWorker()) {
    throw new Error('Este navegador no soporta Web Push.');
  }

  if (!isStandaloneWebApp()) {
    throw new Error('Agrega Spots a tu pantalla de inicio para activar notificaciones push.');
  }

  if (!WEB_PUSH_PUBLIC_KEY.trim()) {
    throw new Error('Falta EXPO_PUBLIC_WEB_PUSH_PUBLIC_KEY para registrar la suscripcion.');
  }

  if (Notification.permission === 'denied') {
    throw new Error('Las notificaciones estan bloqueadas para Spots en este dispositivo.');
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Necesitamos permiso de notificaciones para activar los avisos fuera de la app.');
  }

  const registration = await registerWebPushServiceWorker();
  if (!registration) {
    throw new Error('No pudimos registrar el service worker de notificaciones.');
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      applicationServerKey: decodeBase64UrlToUint8Array(WEB_PUSH_PUBLIC_KEY),
      userVisibleOnly: true,
    }));

  await persistSubscription(userId, subscription);

  return subscription;
}

export async function sendWebPushSelfTest(accessToken?: string | null) {
  if (!supabase) {
    throw new Error('Supabase no esta configurado.');
  }

  const { error } = await supabase.functions.invoke(WEB_PUSH_FUNCTION_NAME, {
    body: {
      body: 'Esta es una prueba de Spots desde tu PWA instalada.',
      mode: 'self-test',
      title: 'Push activo en Spots',
      url: '/',
    },
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }
}
