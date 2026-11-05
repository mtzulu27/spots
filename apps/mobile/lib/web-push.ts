import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const SERVICE_WORKER = '/web-push-sw.js';
const API = '/spots-push.php';
export type WebPushPermission = NotificationPermission | 'unsupported';
export type WebPushSnapshot = { installed: boolean; permission: WebPushPermission; subscribed: boolean; supported: boolean };

function supported() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && window.isSecureContext
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
export function isStandaloneWebApp() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}
async function request(body?: object): Promise<{ publicKey: string; subscribed: boolean; sent?: number }> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session) throw new Error('Inicia sesion para activar las notificaciones de tu cuenta.');
  const response = await fetch(API, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json', 'X-Spots-Push': '1' } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || 'Las notificaciones requieren la version publicada en spots.com.co.');
  return data;
}
export async function registerWebPushServiceWorker() {
  if (!supported()) return null;
  return navigator.serviceWorker.register(SERVICE_WORKER, { scope: '/', updateViaCache: 'none' });
}
export async function getWebPushSnapshot(): Promise<WebPushSnapshot> {
  const result: WebPushSnapshot = { installed: isStandaloneWebApp(), permission: supported() ? Notification.permission : 'unsupported', subscribed: false, supported: supported() };
  if (!result.supported) return result;
  const config = await request();
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER);
  const subscription = await registration?.pushManager.getSubscription();
  return { ...result, subscribed: Boolean(subscription && config.subscribed) };
}
export async function subscribeToWebPush(_userId?: string) {
  if (!supported()) throw new Error('Abre Spots instalada desde su icono y usando HTTPS.');
  if (!isStandaloneWebApp()) throw new Error('Agrega Spots a la pantalla de inicio y abre su icono.');
  if (Notification.permission === 'denied') throw new Error('Permiso bloqueado. Revisa Notificaciones de Spots en Ajustes del dispositivo.');
  // iOS requires this call directly in the tap, before network/worker awaits.
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('No se concedio permiso de notificaciones.');
  const config = await request();
  if (!config.publicKey) throw new Error('El servidor push aun no esta configurado.');
  await registerWebPushServiceWorker();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('El registro tardo demasiado. Vuelve a intentar.')), 15000); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
  const key = Uint8Array.from(atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  let subscription = await registration.pushManager.getSubscription();
  const oldKey = subscription?.options.applicationServerKey;
  if (subscription && oldKey && (oldKey.byteLength !== key.byteLength || new Uint8Array(oldKey).some((b, i) => b !== key[i]))) {
    await subscription.unsubscribe(); subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ applicationServerKey: key, userVisibleOnly: true });
  await request({ action: 'subscribe', subscription: subscription.toJSON() });
  return subscription;
}
export async function unsubscribeFromWebPush() {
  await request({ action: 'unsubscribe' });
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER);
  await (await registration?.pushManager.getSubscription())?.unsubscribe();
}
export async function sendWebPushSelfTest(_accessToken?: string | null) {
  const result = await request({ action: 'self-test' });
  if (result.sent !== 1) throw new Error('El servidor no confirmo el envio.');
}
