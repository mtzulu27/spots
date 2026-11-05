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
import { useLikesStore } from '@/lib/likes-store';

type BookmarksStoreValue = {
  ready: boolean;
  isBookmarked: (spotId: string | number) => boolean;
  toggleBookmark: (spotId: string | number) => Promise<void>;
};

const BookmarksStoreContext = createContext<BookmarksStoreValue>({
  ready: false,
  isBookmarked: () => false,
  toggleBookmark: async () => undefined,
});

function getBookmarksStorageKey(userId: string | null) {
  return `spots-bookmarks:${userId ?? 'guest'}`;
}

async function readBookmarks(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

async function writeBookmarks(key: string, bookmarkedIds: Set<string>) {
  const serialized = JSON.stringify(Array.from(bookmarkedIds));

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, serialized);
    } catch {
      // Ignore local storage persistence issues.
    }
    return;
  }

  try {
    await AsyncStorage.setItem(key, serialized);
  } catch {
    // Ignore async storage persistence issues.
  }
}

export function BookmarksStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const { ready: likesReady, isLiked, toggleLike } = useLikesStore();
  const storageKey = getBookmarksStorageKey(user?.id ?? null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const idsRef = useRef(bookmarkedIds);
  const loadedKey = useRef<string | null>(null);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    setReady(false);
    loadedKey.current = null;

    void readBookmarks(storageKey).then((nextBookmarks) => {
      if (!active) {
        return;
      }

      setBookmarkedIds(nextBookmarks);
      idsRef.current = nextBookmarks;
      loadedKey.current = storageKey;
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [storageKey]);

  const value = useMemo<BookmarksStoreValue>(
    () => ({
      ready: ready && likesReady,
      isBookmarked(spotId) {
        return bookmarkedIds.has(String(spotId)) || isLiked(spotId);
      },
      async toggleBookmark(spotId) {
        const spotKey = String(spotId);
        if (loadedKey.current !== storageKey || !likesReady) return;
        const shouldSelect = !(idsRef.current.has(spotKey) || isLiked(spotId));
        const nextBookmarks = new Set(idsRef.current);
        if (shouldSelect) nextBookmarks.add(spotKey);
        else nextBookmarks.delete(spotKey);
        idsRef.current = nextBookmarks;
        setBookmarkedIds(nextBookmarks);
        writes.current = writes.current.catch(() => {}).then(() => writeBookmarks(storageKey, nextBookmarks));
        const likeMatchesTarget = isLiked(spotId) === shouldSelect;
        await Promise.all([writes.current, likeMatchesTarget ? Promise.resolve() : toggleLike(spotId)]);
      },
    }),
    [bookmarkedIds, isLiked, likesReady, ready, storageKey, toggleLike],
  );

  return (
    <BookmarksStoreContext.Provider value={value}>
      {children}
    </BookmarksStoreContext.Provider>
  );
}

export function useBookmarksStore() {
  return useContext(BookmarksStoreContext);
}
