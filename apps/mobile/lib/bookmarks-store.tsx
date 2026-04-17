import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';

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

const isIOSWeb =
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

function getBookmarksStorageKey(userId: string | null) {
  return `spots-bookmarks:${userId ?? 'guest'}`;
}

async function readBookmarks(key: string) {
  if (isIOSWeb) {
    return new Set<string>();
  }

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
  if (isIOSWeb) {
    return;
  }

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
  const storageKey = getBookmarksStorageKey(user?.id ?? null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);

    void readBookmarks(storageKey).then((nextBookmarks) => {
      if (!active) {
        return;
      }

      setBookmarkedIds(nextBookmarks);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [storageKey]);

  const value = useMemo<BookmarksStoreValue>(
    () => ({
      ready,
      isBookmarked(spotId) {
        return bookmarkedIds.has(String(spotId));
      },
      async toggleBookmark(spotId) {
        const spotKey = String(spotId);
        let nextBookmarks = new Set<string>();

        setBookmarkedIds((current) => {
          nextBookmarks = new Set(current);

          if (nextBookmarks.has(spotKey)) {
            nextBookmarks.delete(spotKey);
          } else {
            nextBookmarks.add(spotKey);
          }

          return nextBookmarks;
        });

        await writeBookmarks(storageKey, nextBookmarks);
      },
    }),
    [bookmarkedIds, ready, storageKey],
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
