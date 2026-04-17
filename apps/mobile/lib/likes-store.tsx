import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';

type LikeRow = {
  id?: number;
  user_id: string;
  spot_id: string | number;
};

type LikeRealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: LikeRow;
  old: LikeRow;
};

type LikesStoreValue = {
  ready: boolean;
  isLiked: (spotId: string | number) => boolean;
  getLikesCount: (spotId: string | number) => number;
  toggleLike: (spotId: string | number) => Promise<void>;
};

const LikesStoreContext = createContext<LikesStoreValue>({
  ready: false,
  isLiked: () => false,
  getLikesCount: () => 0,
  toggleLike: async () => undefined,
});

const isIOSWeb =
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

function buildLikeState(rows: LikeRow[], userId?: string) {
  const counts: Record<string, number> = {};
  const mine = new Set<string>();

  rows.forEach((row) => {
    const spotKey = String(row.spot_id);
    counts[spotKey] = (counts[spotKey] ?? 0) + 1;

    if (userId && row.user_id === userId) {
      mine.add(spotKey);
    }
  });

  return { counts, mine };
}

function applyLikeSnapshot(
  payload: LikeRealtimePayload,
  currentUserId: string | null,
  setCounts: Dispatch<SetStateAction<Record<string, number>>>,
  setLikedIds: Dispatch<SetStateAction<Set<string>>>,
) {
  const removeLike = (row: LikeRow) => {
    const spotKey = String(row.spot_id);
    setCounts((current) => ({
      ...current,
      [spotKey]: Math.max(0, (current[spotKey] ?? 0) - 1),
    }));
    if (currentUserId && row.user_id === currentUserId) {
      setLikedIds((current) => {
        const next = new Set(current);
        next.delete(spotKey);
        return next;
      });
    }
  };

  const addLike = (row: LikeRow) => {
    const spotKey = String(row.spot_id);
    setCounts((current) => ({
      ...current,
      [spotKey]: (current[spotKey] ?? 0) + 1,
    }));
    if (currentUserId && row.user_id === currentUserId) {
      setLikedIds((current) => new Set(current).add(spotKey));
    }
  };

  if (payload.eventType === 'DELETE') {
    removeLike(payload.old);
    return;
  }

  if (payload.eventType === 'UPDATE') {
    removeLike(payload.old);
  }

  addLike(payload.new);
}

export function LikesStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    if (isIOSWeb || !supabase || !currentUserId) {
      setCounts({});
      setLikedIds(new Set());
      setReady(true);
      return;
    }

    let active = true;
    const client = supabase;

    async function loadLikes() {
      const { data, error } = await client.from('spot_likes').select('user_id, spot_id');

      if (error) {
        if (active) {
          setReady(true);
        }
        return;
      }

      if (active) {
        const nextState = buildLikeState(
          (data as LikeRow[]) ?? [],
          currentUserId ?? undefined,
        );
        setCounts(nextState.counts);
        setLikedIds(nextState.mine);
        setReady(true);
      }
    }

    loadLikes();

    const channel = client
      .channel('spot-likes-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spot_likes' },
        (payload) => {
          if (!active) {
            return;
          }

          applyLikeSnapshot(
            payload as unknown as LikeRealtimePayload,
            currentUserId,
            setCounts,
            setLikedIds,
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [currentUserId]);

  const value = useMemo<LikesStoreValue>(
    () => ({
      ready,
      isLiked(spotId) {
        return likedIds.has(String(spotId));
      },
      getLikesCount(spotId) {
        return counts[String(spotId)] ?? 0;
      },
      async toggleLike(spotId) {
        const spotKey = String(spotId);
        const currentlyLiked = likedIds.has(spotKey);

        if (pendingIds.has(spotKey)) {
          return;
        }

        setPendingIds((current) => new Set(current).add(spotKey));
        setLikedIds((current) => {
          const next = new Set(current);
          if (currentlyLiked) {
            next.delete(spotKey);
          } else {
            next.add(spotKey);
          }
          return next;
        });
        setCounts((prev) => ({
          ...prev,
          [spotKey]: Math.max(0, (prev[spotKey] ?? 0) + (currentlyLiked ? -1 : 1)),
        }));

        if (!currentUserId || !supabase) {
          setPendingIds((current) => {
            const next = new Set(current);
            next.delete(spotKey);
            return next;
          });
          return;
        }

        if (currentlyLiked) {
          const { error } = await supabase
            .from('spot_likes')
            .delete()
            .eq('user_id', currentUserId)
            .eq('spot_id', Number(spotKey));

          if (error) {
            setLikedIds((current) => {
              const next = new Set(current);
              next.add(spotKey);
              return next;
            });
            setCounts((prev) => ({
              ...prev,
              [spotKey]: (prev[spotKey] ?? 0) + 1,
            }));
          }

          setPendingIds((current) => {
            const next = new Set(current);
            next.delete(spotKey);
            return next;
          });
          return;
        }

        const { error } = await supabase.from('spot_likes').insert({
          user_id: currentUserId,
          spot_id: Number(spotKey),
        });

        if (error) {
          setLikedIds((current) => {
            const next = new Set(current);
            next.delete(spotKey);
            return next;
          });
          setCounts((prev) => ({
            ...prev,
            [spotKey]: Math.max(0, (prev[spotKey] ?? 0) - 1),
          }));
        }

        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(spotKey);
          return next;
        });
      },
    }),
    [counts, currentUserId, likedIds, pendingIds, ready],
  );

  return (
    <LikesStoreContext.Provider value={value}>
      {children}
    </LikesStoreContext.Provider>
  );
}

export function useLikesStore() {
  return useContext(LikesStoreContext);
}

export function formatLikesCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }

  return String(value);
}
