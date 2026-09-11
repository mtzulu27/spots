import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';

type VisitedRecord = { visitedAt: string };
type VisitedRecords = Record<string, VisitedRecord>;

type VisitedStoreValue = {
  ready: boolean;
  isVisited: (spotId: string | number) => boolean;
  getVisitedAt: (spotId: string | number) => string | null;
  toggleVisited: (spotId: string | number) => Promise<void>;
};

const VisitedStoreContext = createContext<VisitedStoreValue>({
  ready: false,
  isVisited: () => false,
  getVisitedAt: () => null,
  toggleVisited: async () => undefined,
});

function getStorageKey(userId: string | null) {
  return `spots-visited:${userId ?? 'guest'}`;
}

function parseRecords(raw: string | null): VisitedRecords {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => (
      Boolean(value) && typeof value === 'object' && typeof (value as VisitedRecord).visitedAt === 'string'
    ))) as VisitedRecords;
  } catch {
    return {};
  }
}

async function readRecords(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return parseRecords(window.localStorage.getItem(key));
  }
  try {
    return parseRecords(await AsyncStorage.getItem(key));
  } catch {
    return {};
  }
}

async function writeRecords(key: string, records: VisitedRecords) {
  const serialized = JSON.stringify(records);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.setItem(key, serialized); } catch {}
    return;
  }
  try { await AsyncStorage.setItem(key, serialized); } catch {}
}

export function VisitedStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const storageKey = getStorageKey(user?.id ?? null);
  const [records, setRecords] = useState<VisitedRecords>({});
  const [ready, setReady] = useState(false);
  const recordsRef = useRef(records);
  const loadedKey = useRef<string | null>(null);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    setReady(false);
    loadedKey.current = null;
    void readRecords(storageKey).then((nextRecords) => {
      if (!active) return;
      recordsRef.current = nextRecords;
      setRecords(nextRecords);
      loadedKey.current = storageKey;
      setReady(true);
    });
    return () => { active = false; };
  }, [storageKey]);

  const value = useMemo<VisitedStoreValue>(() => ({
    ready,
    isVisited: spotId => Boolean(records[String(spotId)]),
    getVisitedAt: spotId => records[String(spotId)]?.visitedAt ?? null,
    async toggleVisited(spotId) {
      if (loadedKey.current !== storageKey) return;
      const key = String(spotId);
      const nextRecords = { ...recordsRef.current };
      if (nextRecords[key]) delete nextRecords[key];
      else nextRecords[key] = { visitedAt: new Date().toISOString() };
      recordsRef.current = nextRecords;
      setRecords(nextRecords);
      writes.current = writes.current.catch(() => {}).then(() => writeRecords(storageKey, nextRecords));
      await writes.current;
    },
  }), [ready, records, storageKey]);

  return <VisitedStoreContext.Provider value={value}>{children}</VisitedStoreContext.Provider>;
}

export function useVisitedStore() {
  return useContext(VisitedStoreContext);
}
