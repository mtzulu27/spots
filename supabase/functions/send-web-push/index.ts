import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

type PushRequest = {
  body?: string;
  mode?: 'self-test';
  title?: string;
  url?: string;
};

type StoredSubscription = {
  endpoint: string;
  id: string;
  subscription: PushSubscriptionJSON;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: corsHeaders,
    status,
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const vapidPublicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('WEB_PUSH_VAPID_SUBJECT') ?? 'mailto:hello@spots.app';

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse(500, { error: 'Missing Supabase or VAPID configuration' });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Missing bearer token' });
  }

  const accessToken = authHeader.replace('Bearer ', '');
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return jsonResponse(401, { error: 'Invalid user session' });
  }

  const payload = ((await request.json().catch(() => ({}))) ?? {}) as PushRequest;

  const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
    .from('web_push_subscriptions')
    .select('id, endpoint, subscription')
    .eq('user_id', user.id);

  if (subscriptionsError) {
    return jsonResponse(500, { error: subscriptionsError.message });
  }

  if (!subscriptions?.length) {
    return jsonResponse(404, { error: 'No web push subscriptions found for this user' });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const staleSubscriptionIds: string[] = [];
  const results = await Promise.all(
    (subscriptions as StoredSubscription[]).map(async (subscriptionRow) => {
      try {
        await webpush.sendNotification(
          subscriptionRow.subscription,
          JSON.stringify({
            body: payload.body ?? 'Esta es una notificacion de prueba enviada por Spots.',
            tag: payload.mode ?? 'general',
            title: payload.title ?? 'Spots',
            url: payload.url ?? '/',
          }),
        );

        return {
          endpoint: subscriptionRow.endpoint,
          ok: true,
        };
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          staleSubscriptionIds.push(subscriptionRow.id);
        }

        return {
          endpoint: subscriptionRow.endpoint,
          ok: false,
          statusCode,
        };
      }
    }),
  );

  if (staleSubscriptionIds.length > 0) {
    await supabaseAdmin.from('web_push_subscriptions').delete().in('id', staleSubscriptionIds);
  }

  return jsonResponse(200, {
    results,
    sent: results.filter((result) => result.ok).length,
    staleRemoved: staleSubscriptionIds.length,
  });
});
