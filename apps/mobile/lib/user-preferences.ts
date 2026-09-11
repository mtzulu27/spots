import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';

const defaults = { radius: 50, dark: false, newPlace: true, newBranch: true, updatedPlace: true, newReview: true };
let state = defaults;
let initialized: Promise<void> | undefined;
const listeners = new Set<() => void>();
let writes = Promise.resolve();
export function useUserPreferences() {
  const [ready, setReady] = useState(false);
  const value = useSyncExternalStore(callback => { listeners.add(callback); return () => listeners.delete(callback); }, () => state, () => defaults);
  useEffect(() => {
    initialized ??= AsyncStorage.getItem('spots-preferences-v1').then(raw => {
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state = { ...defaults, ...Object.fromEntries(Object.entries(parsed).filter(([key, value]) => key in defaults && typeof value === typeof defaults[key as keyof typeof defaults])) };
      listeners.forEach(callback => callback());
    }).catch(() => {});
    let alive = true;
    void initialized.finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  return { ready, preferences: value, updatePreferences: async (patch: Partial<typeof defaults>) => {
    await initialized;
    const next = { ...state, ...patch };
    writes = writes.catch(() => {}).then(() => AsyncStorage.setItem('spots-preferences-v1', JSON.stringify(next)));
    await writes;
    state = next;
    listeners.forEach(callback => callback());
  } };
}
