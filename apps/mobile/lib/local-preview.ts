import { Platform } from 'react-native';

function canUseLocalPreview() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  // Explicit temporary hosting preview; never grants a backend session.
  if (process.env.EXPO_PUBLIC_TEMPORARY_PREVIEW === 'true') return true;
  if (!__DEV__) return false;

  const host = window.location.hostname;
  const octets = host.split('.').map(Number);
  const privateIPv4 = octets.length === 4 &&
    octets.every((value) => Number.isInteger(value) && value >= 0 && value <= 255) &&
    (octets[0] === 10 ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
  return ['localhost', '127.0.0.1', '[::1]'].includes(host) || privateIPv4;
}

export const localPreviewAvailable = canUseLocalPreview();

export function enterLocalPreview() {
  if (!localPreviewAvailable) return false;
  // Reload so the backend client is disabled before rendering the preview.
  window.location.assign('/explore?preview=1');
  return true;
}

function readLocalPreview() {
  if (!localPreviewAvailable) return false;

  const requested = new URLSearchParams(window.location.search).get('preview');
  try {
    if (requested === '1' || requested === '0') {
      window.sessionStorage.setItem('spots-local-preview', requested);
    }
    return window.sessionStorage.getItem('spots-local-preview') === '1';
  } catch {
    return requested === '1';
  }
}

// Preview never creates a user or grants backend permissions.
export const localPreviewEnabled = readLocalPreview();
