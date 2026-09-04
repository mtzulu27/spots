import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

// Scheduler-only endpoint; never accepts event content or recipients from clients.
Deno.serve(async request => {
  const reply = (status: number, body: unknown) => Response.json(body, { status });
  if (request.method !== 'POST') return reply(405, { error: 'POST required' });
  const secret = Deno.env.get('CATALOG_PUSH_DISPATCH_SECRET');
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!secret || !token) return reply(401, { error: 'Unauthorized' });
  const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  const [expected, actual] = await Promise.all([digest(secret), digest(token)]);
  if (expected.reduce((difference, byte, i) => difference | (byte ^ actual[i]), 0) !== 0) return reply(401, { error: 'Unauthorized' });
  const origin = Deno.env.get('SPOTS_PUBLIC_ORIGIN');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY');
  if (!origin || !url || !key || !publicKey || !privateKey) return reply(503, { error: 'Missing server configuration' });
  try {
    const publicOrigin = new URL(origin);
    if (publicOrigin.protocol !== 'https:') throw new Error('Public origin must use HTTPS');
    const [response, baselineResponse] = await Promise.all(['/place-updates.json', '/place-updates-baseline.json'].map(path => fetch(new URL(path, publicOrigin), { signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store' })));
    if (!response.ok || !baselineResponse.ok) throw new Error('Published feed unavailable');
    const feed = await response.json();
    const baseline = await baselineResponse.json();
    if (feed.version !== 1 || !Array.isArray(feed.events) || feed.events.length > 300) throw new Error('Invalid published feed');
    const events = feed.events.filter((event: Record<string, unknown>) =>
      baseline[`${event.spotId}:${event.branchId ?? 'place'}`]?.active === true &&
      typeof event.id === 'string' && event.id.length < 200 &&
      ['newPlace', 'newBranch', 'updatedPlace'].includes(String(event.type)) &&
      typeof event.occurredAt === 'string' && Number.isFinite(Date.parse(event.occurredAt)) &&
      typeof event.description === 'string' && event.description.length < 500 &&
      Number.isFinite(event.spotId) && typeof event.name === 'string' && typeof event.slug === 'string');
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: enqueueError } = await db.rpc('enqueue_place_update_push', { events });
    if (enqueueError) throw enqueueError;
    const { error: staleError } = await db.from('place_push_queue').update({ status: 'failed', last_error: 'lease_expired_after_max_attempts' }).eq('status', 'sending').gte('attempts', 5).lt('claimed_at', new Date(Date.now() - 600000).toISOString());
    if (staleError) throw staleError;
    const { data: queue, error: claimError } = await db.rpc('claim_place_update_push');
    if (claimError) throw claimError;
    webpush.setVapidDetails(Deno.env.get('WEB_PUSH_VAPID_SUBJECT') ?? 'mailto:hello@spots.app', publicKey, privateKey);
    let sent = 0, skipped = 0, retried = 0;
    for (const job of queue ?? []) {
      let status = 'sent', lastError: string | null = null;
      try {
        const { data: subscription, error: subscriptionError } = await db.from('web_push_subscriptions').select('user_id,subscription,permission').eq('id', job.subscription_id).maybeSingle();
        if (subscriptionError) throw subscriptionError;
        const { data: prefs, error: prefsError } = subscription ? await db.from('place_notification_preferences').select('new_place,new_branch,updated_place').eq('user_id', subscription.user_id).maybeSingle() : { data: null, error: null };
        if (prefsError) throw prefsError;
        const allowed = prefs && (job.payload.type === 'newPlace' ? prefs.new_place : job.payload.type === 'newBranch' ? prefs.new_branch : prefs.updated_place);
        if (baseline[`${job.payload.spotId}:${job.payload.branchId ?? 'place'}`]?.active !== true || !subscription || subscription.permission !== 'granted' || !allowed || Date.parse(job.payload.occurredAt) < Date.now() - 86400000) {
          status = 'skipped'; skipped++;
        } else {
          await webpush.sendNotification(subscription.subscription, JSON.stringify({
            title: job.payload.name,
            body: job.payload.description,
            tag: job.event_id,
            url: `/spot/${encodeURIComponent(job.payload.slug)}`,
          }), { TTL: 3600, timeout: 10000 });
          sent++;
        }
      } catch (error) {
        const code = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;
        if (code === 404 || code === 410) {
          await db.from('web_push_subscriptions').delete().eq('id', job.subscription_id);
          skipped++;
          continue;
        }
        status = job.attempts >= 5 ? 'failed' : 'pending';
        lastError = code ? `push_http_${code}` : 'delivery_failed';
        retried++;
      }
      const { error: updateError } = await db.from('place_push_queue').update({ status, last_error: lastError,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        available_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** job.attempts) * 1000).toISOString(),
      }).eq('event_id', job.event_id).eq('subscription_id', job.subscription_id);
      if (updateError) throw updateError;
    }
    return reply(200, { sent, skipped, retried });
  } catch {
    return reply(503, { error: 'Unable to process place updates; check published feed and server configuration.' });
  }
});
