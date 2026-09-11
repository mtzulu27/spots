import assert from 'node:assert/strict';
import { getPublicJson } from '../apps/mobile/lib/public-json-cache.ts';

let calls = 0;
const original = globalThis.fetch;
try {
  globalThis.fetch = async (_path, options) => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 10));
    if (calls === 1) return new Response('{"version":1}', { headers: { etag: '"v1"' } });
    assert.equal(options.headers['If-None-Match'], '"v1"');
    return new Response(null, { status: 304 });
  };
  const [a, b] = await Promise.all([getPublicJson('/test-catalog'), getPublicJson('/test-catalog')]);
  assert.equal(calls, 1);
  assert.deepEqual(a, { version: 1 });
  assert.equal(a, b);
  await getPublicJson('/test-catalog');
  assert.equal(calls, 1);
  assert.deepEqual(await getPublicJson('/test-catalog', 0), a);
  assert.equal(calls, 2);
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(getPublicJson('/test-catalog', 0), /offline/);
  assert.deepEqual(await getPublicJson('/test-catalog'), a);
  globalThis.fetch = async () => new Response('{"version":2}', { headers: { etag: '"v2"' } });
  assert.deepEqual(await getPublicJson('/test-catalog', 0), { version: 2 });
  console.log('PASS: deduplication, TTL, ETag/304, failure recovery and changed data.');
} finally { globalThis.fetch = original; }
