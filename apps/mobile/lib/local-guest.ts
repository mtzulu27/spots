const storageKey = 'spots-local-guest';
let enabled = false;

export function canUseLocalGuest() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
    || /^10\./.test(host) || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

export function startLocalGuest() {
  if (!canUseLocalGuest()) return false;
  enabled = true;
  try { window.sessionStorage.setItem(storageKey, '1'); } catch {}
  return true;
}

export function isLocalGuest() {
  if (!canUseLocalGuest()) return false;
  try { return enabled || window.sessionStorage.getItem(storageKey) === '1'; }
  catch { return enabled; }
}
