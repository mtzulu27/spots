type Entry = { value?: unknown; etag?: string; checkedAt: number; pending?: Promise<unknown>; retryAt?: number; failure?: unknown };
const entries = new Map<string, Entry>();

// Shared by catalog and notifications. Never cache authenticated responses here.
export async function getPublicJson(path: string, maxAgeMs = 120_000): Promise<any> {
  const entry = entries.get(path) ?? { checkedAt: 0 };
  entries.set(path, entry);
  if (entry.pending) return entry.pending;
  if (entry.value !== undefined && Date.now() - entry.checkedAt < maxAgeMs) return entry.value;
  if (maxAgeMs > 0 && entry.retryAt && Date.now() < entry.retryAt) throw entry.failure;
  entry.pending = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(path, {
        cache: 'no-cache', signal: controller.signal,
        headers: entry.etag ? { 'If-None-Match': entry.etag } : {},
      });
      if (response.status === 304 && entry.value !== undefined) {
        entry.checkedAt = Date.now();
        return entry.value;
      }
      if (!response.ok) throw new Error(`No pudimos actualizar los datos (${response.status}).`);
      const value = await response.json();
      entry.value = value;
      entry.etag = response.headers.get('etag') ?? undefined;
      entry.checkedAt = Date.now();
      entry.retryAt = undefined;
      entry.failure = undefined;
      return value;
    } finally { clearTimeout(timeout); }
  })();
  try { return await entry.pending; }
  catch (error) { entry.failure = error; entry.retryAt = Date.now() + 15_000; throw error; }
  finally { entry.pending = undefined; }
}
