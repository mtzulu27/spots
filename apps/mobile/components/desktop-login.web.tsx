import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SpotsIcon } from './spots-icon';
import type { DesktopLoginProps } from './desktop-login.types';
import './desktop-login.css';

const photos = [1, 2, 3, 4, 5, 6].map((n) => `/auth-desktop/background-0${n}.jpg`);
const fallbackBrightness = [.14, .08, .58, .18, .7, .24];

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.7 6-14.9Z" />
    <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.7-5c-1.8 1.2-4 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.2A20.4 20.4 0 0 0 24 44Z" />
    <path fill="#FBBC05" d="M12.6 27.9a12.2 12.2 0 0 1 0-7.8v-5.2H5.7a20.1 20.1 0 0 0 0 18.2l6.9-5.2Z" />
    <path fill="#EA4335" d="M24 11.7c3 0 5.6 1 7.6 3l5.7-5.6A19.2 19.2 0 0 0 24 4 20.4 20.4 0 0 0 5.7 14.9l6.9 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
  </svg>;
}

export function DesktopLogin(props: DesktopLoginProps) {
  const [selected, setSelected] = useState(3);
  const [loaded, setLoaded] = useState<number[]>([]);
  const [failed, setFailed] = useState<number[]>([]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [glass, setGlass] = useState({ light: false, fill: 'rgba(28,28,32,.16)' });
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const imageRefs = useRef<Array<HTMLImageElement | null>>([]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReducedMotion(media.matches);
    const visibility = () => setHidden(document.hidden);
    motion();
    visibility();
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    if (!failed.includes(selected)) return;
    const next = loaded.find((index) => !failed.includes(index));
    if (next !== undefined) setSelected(next);
  }, [failed, loaded, selected]);

  useEffect(() => {
    if (focused || hidden || reducedMotion || loaded.length < 2) return;
    const timer = window.setTimeout(() => {
      for (let step = 1; step < photos.length; step++) {
        const next = (selected + step) % photos.length;
        if (loaded.includes(next) && !failed.includes(next)) {
          setSelected(next);
          break;
        }
      }
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [focused, hidden, reducedMotion, loaded, failed, selected]);

  useEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    const photo = imageRefs.current[selected];
    if (!root || !card || !photo?.naturalWidth) return;
    const sample = () => {
      const viewport = root.getBoundingClientRect();
      const bounds = card.getBoundingClientRect();
      const cover = Math.max(viewport.width / photo.naturalWidth, viewport.height / photo.naturalHeight);
      const cropX = (photo.naturalWidth - viewport.width / cover) / 2;
      const cropY = (photo.naturalHeight - viewport.height / cover) / 2;
      const zoom = selected === 3 && window.innerWidth >= 1000 ? 1.12 : 1;
      const shift = zoom === 1 ? 0 : -.05 * viewport.width * zoom;
      const x = (bounds.left - viewport.left - viewport.width / 2 - shift) / zoom + viewport.width / 2;
      const y = (bounds.top - viewport.top - viewport.height / 2) / zoom + viewport.height / 2;
      let brightness = fallbackBrightness[selected];
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.drawImage(photo, cropX + x / cover, cropY + y / cover, bounds.width / (cover * zoom), bounds.height / (cover * zoom), 0, 0, 32, 32);
          const pixels = context.getImageData(0, 0, 32, 32).data;
          let total = 0;
          for (let i = 0; i < pixels.length; i += 4) total += .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
          brightness = total / (32 * 32 * 255);
        }
      } catch { /* Retain the calibrated fallback if pixel sampling is unavailable. */ }
      const light = brightness >= .43;
      const alpha = light ? .52 + Math.max(0, .65 - brightness) * .18 : .12 + brightness * .22;
      const fill = `rgba(${light ? '245,245,247' : '28,28,32'},${alpha.toFixed(3)})`;
      setGlass((previous) => previous.fill === fill && previous.light === light ? previous : { light, fill });
    };
    sample();
    const observer = new ResizeObserver(sample);
    observer.observe(root);
    observer.observe(card);
    window.addEventListener('resize', sample);
    return () => { observer.disconnect(); window.removeEventListener('resize', sample); };
  }, [selected, loaded]);

  return <div ref={rootRef} className="spots-desktop-login" data-photo={selected} data-glass={glass.light ? 'light' : 'dark'} style={{ '--auth-glass-fill': glass.fill } as CSSProperties}>
    <div className="sdl-slides" aria-hidden="true">
      {photos.map((src, index) => <div key={src} className={`sdl-slide${selected === index ? ' is-active' : ''}`} data-index={index}>
        <img ref={(node) => { imageRefs.current[index] = node; }} src={src} alt="" decoding="async" loading="eager"
          onLoad={() => setLoaded((current) => current.includes(index) ? current : [...current, index])}
          onError={() => setFailed((current) => current.includes(index) ? current : [...current, index])} />
      </div>)}
    </div>
    <div className="sdl-shade" />
    <header className="sdl-header"><button type="button" className="sdl-explore" aria-label="Explorar sin cuenta" title="Explorar sin cuenta" onClick={props.onExplore} disabled={props.submitting}><SpotsIcon name="arrow-forward" size={20} /></button></header>
    <main className="sdl-main" onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
    }}>
      <img className="sdl-logo" src="/auth-desktop/logo-white.png" alt="Spots" />
      <section ref={cardRef} className="sdl-card" aria-labelledby="sdl-title">
        <h1 id="sdl-title">La ciudad está llamando</h1>
        {!props.showEmailForm ? <div className="sdl-methods">
          <button type="button" className="sdl-button sdl-google" onClick={props.onGoogle} disabled={props.submitting}><GoogleMark />{props.submitting ? 'Conectando...' : 'Continuar con Google'}</button>
          <div className="sdl-divider"><span />o<span /></div>
          <button type="button" className="sdl-button sdl-email" onClick={props.onShowEmail} disabled={props.submitting}><SpotsIcon name="mail-outline" size={18} color="currentColor" />Continuar con email</button>
        </div> : <form className="sdl-form" onSubmit={(event) => { event.preventDefault(); props.onSubmit(); }} noValidate aria-busy={props.submitting}>
          <label className="sdl-field"><span className="sdl-sr-only">Correo electrónico</span><SpotsIcon name="mail-outline" size={18} color="#5f5f67" /><input autoFocus type="email" name="email" autoComplete="email" placeholder="Tu email" value={props.email} onChange={(event) => props.onEmailChange(event.target.value)} onBlur={props.onEmailBlur} disabled={props.submitting} aria-invalid={Boolean(props.emailError)} aria-describedby={props.emailError ? 'sdl-email-error' : undefined} /></label>
          {props.emailError && <p id="sdl-email-error" className="sdl-error" role="status">{props.emailError}</p>}
          <label className="sdl-field"><span className="sdl-sr-only">Contraseña</span><SpotsIcon name="lock-closed-outline" size={18} color="#5f5f67" /><input type={props.showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Tu contraseña" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} onBlur={props.onPasswordBlur} disabled={props.submitting} aria-invalid={Boolean(props.passwordError)} aria-describedby={props.passwordError ? 'sdl-password-error' : undefined} /><button type="button" className="sdl-password" aria-label={props.showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={props.showPassword} onClick={props.onTogglePassword}><SpotsIcon name={props.showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#5f5f67" /></button></label>
          {props.passwordError && <p id="sdl-password-error" className="sdl-error" role="status">{props.passwordError}</p>}
          <button type="submit" className="sdl-button sdl-primary" disabled={!props.canSubmit}>{props.submitting ? 'Continuando...' : 'Continuar'}</button>
          <div className="sdl-email-actions"><button type="button" onClick={props.onOtherMethods} disabled={props.submitting}>Otros métodos</button><button type="button" onClick={props.onRecovery} disabled={props.submitting}>Olvidé mi contraseña</button></div>
        </form>}
        {props.authError && <p className="sdl-error" role="alert">{props.authError}</p>}
        <p className="sdl-legal">Al continuar aceptas los Términos de servicio y la Política de privacidad de Spots.</p>
      </section>
    </main>
    <footer className="sdl-footer" />
    {failed.length === photos.length && <p className="sdl-photo-error" role="status">No se pudieron cargar las fotografías.</p>}
  </div>;
}
