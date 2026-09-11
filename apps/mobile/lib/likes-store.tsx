import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useSpotsStore } from '@/lib/spots-store';
import { supabase } from '@/lib/supabase';

type LikesStoreValue = {
  ready: boolean;
  isLiked: (spotId: string | number) => boolean;
  getLikesCount: (spotId: string | number) => number;
  toggleLike: (spotId: string | number) => Promise<void>;
};
const LikesStoreContext = createContext<LikesStoreValue>({ ready: false, isLiked: () => false, getLikesCount: () => 0, toggleLike: async () => {} });

export function LikesStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const { spots } = useSpotsStore();
  const userId = user?.id ?? null;
  const owner = useRef(userId);
  owner.current = userId;
  const [loadedOwner, setLoadedOwner] = useState<string | null | undefined>(undefined);
  const [likedIds, setLikedIds] = useState(new Set<string>());
  const ids = useRef(likedIds);
  const pending = useRef(new Set<string>());
  const mutationVersion = useRef(0);
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [remoteCounts, setRemoteCounts] = useState<Record<string, number>>({});
  const countIds = [...new Set(spots.map(spot => Number(spot.likeTargetId)).filter(Number.isFinite))].sort((a, b) => a - b).join(',');
  const counts = useMemo(() => Object.fromEntries(spots.map(spot => [String(spot.likeTargetId), Number(spot.likes) || 0])), [spots]);

  useEffect(() => {
    const client = supabase;
    if (!client || !userId || !countIds) return;
    let active = true;
    const version = mutationVersion.current;
    const controller = new AbortController();
    void (async () => {
      const keys = countIds.split(',').map(Number);
      const result: Record<string, number> = Object.fromEntries(keys.map(key => [key, 0]));
      for (let offset = 0; offset < keys.length && active; offset += 200) {
        const { data, error } = await client.rpc('get_spot_like_counts', { spot_ids: keys.slice(offset, offset + 200) }).abortSignal(controller.signal);
        // Older backends keep the published snapshot until the migration is applied.
        if (error) return;
        for (const row of data ?? []) result[String(row.spot_id)] = Number(row.likes_count);
      }
      if (active && mutationVersion.current === version) setRemoteCounts(result);
    })().catch(() => {});
    return () => { active = false; controller.abort(); };
  }, [userId, countIds]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    ids.current = new Set();
    setLikedIds(new Set());
    setDeltas({});
    setRemoteCounts({});
    setLoadedOwner(undefined);
    const client = supabase;
    if (!client || !userId) { setLoadedOwner(userId); return; }
    void (async () => {
      try {
        const mine = new Set<string>();
        let cursor = 0;
        while (active) {
          const { data, error } = await client.from('spot_likes').select('spot_id')
            .eq('user_id', userId).gt('spot_id', cursor).order('spot_id').limit(500).abortSignal(controller.signal);
          if (error) throw error;
          for (const row of data ?? []) mine.add(String(row.spot_id));
          if (!data?.length || data.length < 500) break;
          cursor = Number(data[data.length - 1].spot_id);
        }
        if (active) { ids.current = mine; setLikedIds(mine); setLoadedOwner(userId); }
      } catch { /* Keep writes disabled when the initial state is unknown. */ }
    })();
    return () => { active = false; controller.abort(); };
  }, [userId]);

  const ready = loadedOwner === userId;
  const value: LikesStoreValue = {
    ready,
    isLiked: id => ready && likedIds.has(String(id)),
    // Totals use the published catalog plus this session's optimistic changes.
    getLikesCount: id => Math.max(ready && likedIds.has(String(id)) ? 1 : 0, (remoteCounts[String(id)] ?? counts[String(id)] ?? 0) + (ready ? deltas[String(id)] ?? 0 : 0)),
    async toggleLike(id) {
      const key = String(id);
      const requestKey = `${userId}:${key}`;
      if (!ready || pending.current.has(requestKey)) return;
      pending.current.add(requestKey);
      mutationVersion.current++;
      const wasLiked = ids.current.has(key);
      const delta = wasLiked ? -1 : 1;
      const next = new Set(ids.current);
      if (wasLiked) next.delete(key); else next.add(key);
      ids.current = next;
      setLikedIds(next);
      setDeltas(current => ({ ...current, [key]: (current[key] ?? 0) + delta }));
      try {
        if (userId && supabase) {
          const result = wasLiked
            ? await supabase.from('spot_likes').delete().eq('user_id', userId).eq('spot_id', Number(id))
            : await supabase.from('spot_likes').upsert({ user_id: userId, spot_id: Number(id) }, { onConflict: 'user_id,spot_id', ignoreDuplicates: true });
          if (result.error) throw result.error;
        }
      } catch {
        if (owner.current === userId) {
          const rollback = new Set(ids.current);
          if (wasLiked) rollback.add(key); else rollback.delete(key);
          ids.current = rollback;
          setLikedIds(rollback);
          setDeltas(current => ({ ...current, [key]: (current[key] ?? 0) - delta }));
        }
      } finally { pending.current.delete(requestKey); }
    },
  };
  return <LikesStoreContext.Provider value={value}>{children}</LikesStoreContext.Provider>;
}
export function useLikesStore() { return useContext(LikesStoreContext); }
export function formatLikesCount(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : String(value);
}
