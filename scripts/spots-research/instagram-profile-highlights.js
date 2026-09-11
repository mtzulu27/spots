async function extractProfileHighlights(configJson) {
  const config = JSON.parse(configJson);
  const started = performance.now();
  const profile = location.pathname.match(/^\/([\w.]+)\/?$/)?.[1];
  if (location.hostname !== 'www.instagram.com' || profile !== config.username) {
    throw new Error('Open the expected Instagram profile first.');
  }
  if (!/^\d+$/.test(config.docId || '')) throw new Error('An observed read-query docId is required.');
  const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const relevant = /\b(horarios?|hours?|sedes?|ubicaciones?|ubicacion|direcciones?|direccion|locations?|donde estamos|como llegar)\b/;
  const inventory = [...new Map([...document.querySelectorAll('a[href*="/stories/highlights/"]')]
    .map((a) => ({ id: a.href.match(/\/highlights\/(\d+)/)?.[1],
      title: (a.innerText || a.getAttribute('aria-label') || '').trim(), url: a.href }))
    .filter((a) => a.id).map((a) => [a.id, a])).values()];
  const selected = inventory.filter((a) => relevant.test(normalize(a.title)) &&
    (!config.selectedIds || config.selectedIds.includes(a.id)));
  const result = { sourceType: 'authenticated-profile-read-query', profileUrl: location.href,
    extractedAt: new Date().toISOString(), inventory, selected, folders: [], pending: [],
    inventoryCoverage: 'DOM links only; not a guarantee of the full profile inventory' };
  const versions = (values) => (values || []).filter((v) => {
    try { const u = new URL(v.url); return u.protocol === 'https:' &&
      (u.hostname.endsWith('.fbcdn.net') || u.hostname.endsWith('.cdninstagram.com')); }
    catch { return false; }
  }).map(({url, width, height}) => ({url, width, height}))
    .sort((a,b) => b.width*b.height - a.width*a.height);
  for (const folder of selected) {
    if (performance.now() - started >= 25000) {
      result.pending.push({ id: folder.id, reason: 'time_budget' }); continue;
    }
    const variables = { initial_reel_id: `highlight:${folder.id}`, reel_ids: [`highlight:${folder.id}`],
      first: 3, last: 2, __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider: true };
    // Session material stays inside the page; it is never returned or written to disk.
    const csrf = document.cookie.split('; ').find((v) => v.startsWith('csrftoken='))?.slice(10);
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (csrf) headers['X-CSRFToken'] = csrf;
    try {
      const response = await fetch('/graphql/query', { method: 'POST', credentials: 'same-origin', headers,
        signal: AbortSignal.timeout(Math.max(1, Math.min(15000, Math.floor(25000 - (performance.now() - started))))), body: new URLSearchParams({ doc_id: config.docId,
          fb_api_req_friendly_name: 'PolarisStoriesV3HighlightsPageQuery', variables: JSON.stringify(variables) }) });
      if (!response.ok) throw new Error(`http_${response.status}`);
      const payload = JSON.parse((await response.text()).replace(/^for \(;;\);\s*/, ''));
      if (payload.errors?.length) throw new Error('graphql_error');
      const connection = payload.data?.xdt_api__v1__feed__reels_media__connection;
      const node = connection?.edges?.find((e) => e.node?.id === `highlight:${folder.id}`)?.node;
      if (!node || !Array.isArray(node.items)) throw new Error('missing_highlight');
      if (node.user?.username && node.user.username !== config.username) throw new Error('profile_mismatch');
      result.folders.push({ id: node.id, title: node.title, url: folder.url,
        hasNextPage: connection.page_info?.has_next_page ?? null,
        items: node.items.map((item) => ({ id: item.id, mediaType: item.media_type,
          publishedAt: Number.isFinite(item.taken_at) ? new Date(item.taken_at*1000).toISOString() : null,
          images: versions(item.image_versions2?.candidates), videos: versions(item.video_versions) })) });
      if (connection.page_info?.has_next_page) result.pending.push({id: folder.id, reason: 'pagination_not_resolved'});
    } catch (error) {
      result.pending.push({ id: folder.id, reason: ['missing_highlight','profile_mismatch','graphql_error'].includes(error.message)
        || /^http_\d+$/.test(error.message) ? error.message : 'request_failed' });
      for (const remaining of selected.slice(selected.indexOf(folder)+1)) {
        result.pending.push({id: remaining.id, reason: 'stopped_after_error'});
      }
      break;
    }
  }
  result.elapsedMs = Math.round(performance.now() - started);
  result.status = !selected.length ? 'no_matching_dom_links' : result.pending.length ? 'partial' : 'captured';
  return result;
}
