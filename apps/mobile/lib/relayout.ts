import { useSyncExternalStore } from 'react';

let relayoutVersion = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return relayoutVersion;
}

export function emitRelayout() {
  relayoutVersion += 1;
  listeners.forEach((listener) => listener());
}

export function useRelayoutSignal() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}

export function useRelayoutSubscription() {
  useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
