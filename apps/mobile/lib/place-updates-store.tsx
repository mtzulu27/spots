import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { useUserPreferences } from '@/lib/user-preferences';
import { useSpotsStore } from '@/lib/spots-store';
import { condenseUpdates, diffCatalog, mergeEvents, projectCatalog, type CatalogEvent, type CatalogSnapshot } from '@/lib/catalog-updates/engine.mjs';

type Value = { events: CatalogEvent[]; unreadCount: number; readIds: Set<string>; loading: boolean; error: string | null; markRead: (ids: string[]) => void; refresh: () => void };
const Context = createContext<Value>({ events: [], unreadCount: 0, readIds: new Set(), loading: true, error: null, markRead: () => {}, refresh: () => {} });
const historyKey = 'spots-place-updates-v1';
function validEvent(value: unknown): value is CatalogEvent {
  const e = value as CatalogEvent | null;
  return !!e && typeof e.id === 'string' && ['newPlace', 'newBranch', 'updatedPlace'].includes(e.type) && Number.isFinite(e.spotId) && (e.branchId === null || Number.isFinite(e.branchId)) && Number.isFinite(Date.parse(e.occurredAt)) && typeof e.description === 'string' && Array.isArray(e.fields);
}
async function getJson(path: string, signal: AbortSignal) {
  const response = await fetch(path, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`No pudimos consultar las novedades (${response.status}).`);
  return response.json();
}
export function PlaceUpdatesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const { preferences, ready: preferencesReady } = useUserPreferences();
  const { spots, refresh: refreshSpots } = useSpotsStore();
  const refreshSpotsRef = useRef(refreshSpots);
  refreshSpotsRef.current = refreshSpots;
  const preferenceWrites = useRef(Promise.resolve());
  useEffect(() => {
    if (!user || !supabase || !preferencesReady) return;
    // Persist push eligibility only after local preferences have loaded.
    // The dispatcher also requires an existing granted web-push subscription.
    const db = supabase;
    preferenceWrites.current = preferenceWrites.current.catch(() => {}).then(async () => {
      const { error } = await db.from('place_notification_preferences').upsert({ user_id: user.id,
      new_place: preferences.newPlace, new_branch: preferences.newBranch, updated_place: preferences.updatedPlace,
      });
      if (error) console.warn('Push preference sync unavailable:', error.code);
    });
    void preferenceWrites.current.catch(() => {});
  }, [user?.id, preferencesReady, preferences.newPlace, preferences.newBranch, preferences.updatedPlace]);
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [readReady, setReadReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<() => void>(() => {});
  const readKey = `spots-place-updates-read-v1:${user?.id ?? 'guest'}`;
  const readKeyRef = useRef(readKey);
  readKeyRef.current = readKey;
  const readRef = useRef(readIds);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    setReadReady(false);
    setReadIds(new Set());
    readRef.current = new Set();
    AsyncStorage.getItem(readKey).then(raw => {
      if (!alive) return;
      const values = raw ? JSON.parse(raw) : [];
      const ids = new Set<string>(Array.isArray(values) ? values.filter(id => typeof id === 'string') : []);
      readRef.current = ids;
      setReadIds(ids);
    }).catch(() => {}).finally(() => { if (alive) setReadReady(true); });
    return () => { alive = false; };
  }, [readKey]);
  const markRead = useCallback((ids: string[]) => {
    if (!readReady) return;
    const next = new Set([...readRef.current, ...ids]);
    readRef.current = next;
    setReadIds(next);
    const key = readKeyRef.current;
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(key, JSON.stringify([...next].slice(-2000))));
    void writes.current.catch(() => { if (readKeyRef.current === key) setError('No pudimos guardar el estado de lectura en este dispositivo.'); });
  }, [readReady]);
  useEffect(() => {
    if (Platform.OS !== 'web') { setLoading(false); return; }
    let alive = true, running = false, initialized = false;
    let previous: CatalogSnapshot | null = null;
    let history: CatalogEvent[] = [];
    const controller = new AbortController();
    async function initialize() {
      try {
        const raw = await AsyncStorage.getItem(historyKey);
        if (raw) {
          const cached = JSON.parse(raw);
          history = Array.isArray(cached.events) ? cached.events.filter(validEvent) : [];
          // The persisted snapshot is regenerated from catalog facts, never timestamps.
          previous = cached.snapshot && typeof cached.snapshot === 'object' ? cached.snapshot : null;
          if (alive) setEvents(history);
        }
      } catch { /* Corrupt or unavailable storage starts with the published baseline. */ }
      initialized = true;
      await poll(true);
    }
    async function poll(force = false) {
      if (!alive || !initialized || running || (!force && document.visibilityState === 'hidden')) return;
      running = true;
      try {
        const [catalog, feed] = await Promise.all([getJson('/spots-catalog.json', controller.signal), getJson('/place-updates.json', controller.signal)]);
        if (!alive) return;
        if (feed.version !== 1 || !Array.isArray(feed.events)) throw new Error('El historial de novedades no es válido.');
        if (!previous) previous = await getJson('/place-updates-baseline.json', controller.signal);
        const next = projectCatalog(catalog);
        const changes = diffCatalog(previous, next, new Date().toISOString());
        history = mergeEvents(feed.events.filter(validEvent), history, changes);
        const changed = JSON.stringify(previous) !== JSON.stringify(next);
        previous = next;
        if (!alive) return;
        setEvents(history);
        setError(null);
        await AsyncStorage.setItem(historyKey, JSON.stringify({ snapshot: next, events: history })).catch(() => {});
        if (changed) await refreshSpotsRef.current().catch(() => {});
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'No pudimos cargar las novedades.');
      } finally {
        running = false;
        if (alive) setLoading(false);
      }
    }
    pollRef.current = () => { void poll(true); };
    void initialize();
    const timer = setInterval(() => { void poll(); }, 60000);
    const resume = () => { void poll(); };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => { alive = false; controller.abort(); clearInterval(timer); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); pollRef.current = () => {}; };
  }, []);
  const available = condenseUpdates(events).filter(event => preferences[event.type] && spots.some(spot => spot.spotId === event.spotId && (event.branchId === null || spot.branchId === event.branchId)));
  return <Context.Provider value={{ events: available, unreadCount: readReady ? available.filter(event => !readIds.has(event.id)).length : 0, readIds, loading, error, markRead, refresh: () => pollRef.current() }}>{children}</Context.Provider>;
}
export function usePlaceUpdates() { return useContext(Context); }
