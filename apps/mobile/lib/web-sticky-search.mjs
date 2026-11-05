// Measure the non-sticky profile, not the pinned shell: its DOM position moves
// with scrolling and would turn the threshold into the current scroll offset.
export function observeStickySearch({ viewport, profile, onChange, environment = globalThis }) {
  let frame = null;
  let disposed = false;
  const sync = () => {
    if (disposed || !viewport.isConnected || !profile.isConnected || viewport.clientHeight <= 0) return;
    const profileRect = profile.getBoundingClientRect();
    if (profileRect.height <= 0 || !profile.getClientRects().length) return;
    const viewportRect = viewport.getBoundingClientRect();
    const gap = Number.parseFloat(environment.getComputedStyle(profile.parentElement).rowGap) || 0;
    const threshold = profileRect.bottom - viewportRect.top + viewport.scrollTop + gap;
    onChange(viewport.scrollTop >= threshold - 1);
  };
  const schedule = () => {
    if (disposed || frame !== null) return;
    frame = environment.requestAnimationFrame(() => { frame = null; sync(); });
  };
  viewport.addEventListener('scroll', schedule, { passive: true });
  environment.addEventListener('resize', schedule);
  environment.addEventListener('focus', schedule);
  environment.addEventListener('pageshow', schedule);
  environment.document.addEventListener('visibilitychange', schedule);
  const observer = environment.ResizeObserver ? new environment.ResizeObserver(schedule) : null;
  observer?.observe(viewport);
  observer?.observe(profile);
  sync();
  schedule();
  return () => {
    disposed = true;
    if (frame !== null) environment.cancelAnimationFrame(frame);
    observer?.disconnect();
    viewport.removeEventListener('scroll', schedule);
    environment.removeEventListener('resize', schedule);
    environment.removeEventListener('focus', schedule);
    environment.removeEventListener('pageshow', schedule);
    environment.document.removeEventListener('visibilitychange', schedule);
  };
}
