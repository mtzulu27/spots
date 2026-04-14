import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium, devices } from 'playwright';
import Tesseract from 'tesseract.js';

const PROFILE_URL = process.argv[2];
const MAX_HIGHLIGHTS = Number(process.argv[3] || 3);
const IG_USERNAME = process.env.IG_USERNAME || '';
const IG_PASSWORD = process.env.IG_PASSWORD || '';
const IG_2FA_CODE = process.env.IG_2FA_CODE || '';
const HEADLESS = process.env.HEADLESS !== 'false';

if (!PROFILE_URL) {
  console.error('Usage: node scripts/instagram-highlights-ocr.mjs <instagram-profile-url> [max-highlights]');
  process.exit(1);
}

const slug = PROFILE_URL
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')
  .split('/')
  .filter(Boolean)
  .pop()
  ?.replace(/[^a-z0-9_-]/gi, '-')
  .toLowerCase();

const outputDir = path.join(
  '/tmp',
  `instagram-ocr-${slug || 'profile'}-${Date.now()}`
);
const sessionDir = path.join(
  '/tmp',
  `instagram-session-${slug || 'profile'}`
);

const HIGHLIGHT_PRIORITY_PATTERNS = [
  /horario|horarios|hours?/i,
  /ubicaci[oó]n|ubicaci|ubica|direccion|direcci[oó]n|location|where/i,
  /c[oó]mo llegar|como llegar|get there|llegar/i,
  /contacto|contact|reservas?|reserva|cel|whats|tel/i,
  /sede|sedes/i,
];

function getHighlightIntent(label) {
  if (/horario|horarios|hours?/i.test(label)) return 'hours';
  if (/ubicaci[oó]n|ubicaci|ubica|direccion|direcci[oó]n|location|where/i.test(label)) return 'location';
  if (/c[oó]mo llegar|como llegar|get there|llegar/i.test(label)) return 'directions';
  if (/contacto|contact|reservas?|reserva|cel|whats|tel/i.test(label)) return 'contact';
  if (/sede|sedes/i.test(label)) return 'branch';
  return 'generic';
}

function extractLocationFromText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/[📍?]/.test(line) || /parque comercial|cali|pance|granada|ciudad jard[ií]n|local|mall|plaza/i.test(line)) {
      if (/publicacione|seguidore|seguido|seguir|mensaje|visitas|platos/i.test(line)) continue;
      return line
        .replace(/^[📍?\s]+/, '')
        .replace(/\.{3,}\s*m[aá]s$/i, '')
        .replace(/\s*m[aá]s$/i, '')
        .trim();
    }
  }

  return '';
}

function extractNameFromText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (
      /[|]/.test(line) &&
      !/publicacione|seguidore|seguido|seguir|mensaje|visitas|platos/i.test(line)
    ) {
      return line;
    }
  }

  for (const line of lines) {
    if (
      /restaurante|cafe|caf[eé]|rooftop|bistro|bar/i.test(line) &&
      !/publicacione|seguidore|seguido/i.test(line)
    ) {
      return line;
    }
  }

  return '';
}

function extractHoursFromText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const hourLines = lines.filter(
    (line) =>
      /(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|festivos|dom|lun|mar|mier|mi[eé]r|jue|vie|sab|s[aá]b)/i.test(line) ||
      /\d{1,2}(?::\d{2})?\s?(a\.?m|p\.?m|am|pm)/i.test(line)
  );

  return hourLines;
}

function looksTemporalHours(text) {
  return /(hoy|hoy abrimos|esta semana|este fin de semana|fin de semana|semana santa|festivo|festivos|puente|solo por hoy|temporal|temporalmente|especial)/i.test(
    text
  );
}

function normalizeStoryText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s:#|.-]/gu, '')
    .trim();
}

function isSameStoryText(a, b) {
  const normalizedA = normalizeStoryText(a);
  const normalizedB = normalizeStoryText(b);

  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;

  const sampleA = normalizedA.slice(0, 120);
  const sampleB = normalizedB.slice(0, 120);
  return sampleA === sampleB;
}

function pickPrimaryFrame(frames, intent) {
  if (!frames || frames.length === 0) return null;

  const ordered = [...frames].sort((a, b) => (a.frameIndex ?? 0) - (b.frameIndex ?? 0));

  if (intent === 'hours') {
    const regularCandidates = ordered.filter((frame) => !looksTemporalHours(frame.text));
    if (regularCandidates.length > 0) {
      return regularCandidates[regularCandidates.length - 1];
    }
  }

  return ordered[ordered.length - 1];
}

function hasHourSignal(text) {
  return (
    /(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|festivos|lun(?:es)?|mar(?:tes)?|mi[eé]r(?:coles)?|jue(?:ves)?|vie(?:rnes)?|s[aá]b(?:ado)?|dom(?:ingo)?)/i.test(text) ||
    /\d{1,2}(?::\d{2})?\s?(a\.?m|p\.?m|am|pm)/i.test(text)
  );
}

function scoreFrameForIntent(text, intent) {
  const normalized = text.toLowerCase();
  const hasDayNames = /(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|festivos|lunes a jueves|viernes a s[aá]bado|vie y s[aá]b|lun a jue)/i.test(text);
  const hasClockTimes = /\d{1,2}(?::\d{2})?\s?(a\.?m|p\.?m|am|pm)/i.test(text);
  const profileNoise =
    /publicacione|seguidore|seguido|seguir|visitas|platos/i.test(text);

  switch (intent) {
    case 'hours':
      if (hasDayNames && hasClockTimes) {
        return 8;
      }
      if (profileNoise) return -5;
      if (hasDayNames) return 5;
      if (hasClockTimes) return 4;
      if (/horarios?|servicio/i.test(text)) return 2;
      return 0;
    case 'location':
    case 'directions':
      if (profileNoise) return -5;
      if (/(direcci[oó]n|ubicaci[oó]n|parque comercial|cali|pance|granada|ciudad jard[ií]n|cra|cl\.?|calle|avenida|av\.?)/i.test(text)) return 5;
      if (/local|piso|mall|centro comercial|plaza/i.test(text)) return 3;
      return 0;
    case 'contact':
      if (profileNoise) return -5;
      if (/(wa\.me|whatsapp|contacto|reservas?|tel[eé]fono|\+57|\d{7,})/i.test(text)) return 5;
      return 0;
    case 'branch':
      if (profileNoise) return -5;
      if (/(sede|sedes|local|pance|granada|ciudad jard[ií]n|norte|sur)/i.test(text)) return 4;
      return 0;
    default:
      break;
  }

  if (profileNoise) return -5;

  return normalized.length > 20 ? 1 : 0;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function screenshotAndOcr(page, name) {
  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });

  const result = await Tesseract.recognize(filePath, 'spa+eng', {
    logger: () => {},
  });

  return {
    filePath,
    text: result.data.text.replace(/\s+\n/g, '\n').trim(),
  };
}

async function gotoInstagramPage(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('ERR_ABORTED')) {
      throw error;
    }
  }

  await page.waitForTimeout(2500);
  await dismissOverlays(page);
}

async function dismissOverlays(page) {
  const labels = [
    'Permitir todas las cookies',
    'Allow all cookies',
    'Ahora no',
    'Not now',
    'Guardar información',
    'Save info',
    'Guardar',
    'Save',
    'Activar notificaciones',
    'Turn on notifications',
    'Cerrar',
    'Close',
  ];

  for (const label of labels) {
    const button = page.getByRole('button', { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

async function dismissInstagramPrompts(page) {
  for (let i = 0; i < 4; i += 1) {
    await dismissOverlays(page);
    const promptButtons = [
      /ahora no|not now/i,
      /guardar información|save info|guardar|save/i,
      /activar notificaciones|turn on notifications/i,
      /omitir|skip/i,
    ];

    let clicked = false;
    for (const pattern of promptButtons) {
      const button = page.getByRole('button', { name: pattern }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click().catch(() => {});
        await page.waitForTimeout(800);
        clicked = true;
      }
    }

    if (!clicked) break;
  }
}

async function triggerLoginFromProfileGate(page) {
  const loginButtons = [
    page.getByRole('button', { name: /^Iniciar sesión$/i }).first(),
    page.getByRole('link', { name: /^Iniciar sesión$/i }).first(),
    page.locator('text="Iniciar sesión"').first(),
  ];

  for (const target of loginButtons) {
    if (await target.isVisible().catch(() => false)) {
      await target.click().catch(() => {});
      await page.waitForTimeout(1200);
      return true;
    }
  }

  return false;
}

async function loginIfNeeded(page) {
  const loginField = page.getByLabel(/teléfono|phone|nombre de usuario|username|correo electrónico|email/i).first();
  const passwordField = page.getByLabel(/contraseña|password/i).first();

  const needsLogin = await isLoginScreen(page);

  if (!needsLogin) return false;
  if (!IG_USERNAME || !IG_PASSWORD) return false;

  await loginField.fill(IG_USERNAME);
  await passwordField.fill(IG_PASSWORD);

  const loginButton = page.getByRole('button', { name: /iniciar sesión|log in/i }).first();
  if (await loginButton.isVisible().catch(() => false)) {
    await loginButton.click();
  } else {
    await passwordField.press('Enter');
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3000);
  await dismissOverlays(page);

  const twoFaField = page.getByLabel(/code|código/i).first();
  const needsTwoFa = await twoFaField.isVisible().catch(() => false);
  if (needsTwoFa && IG_2FA_CODE) {
    await twoFaField.fill(IG_2FA_CODE);
    const continueButton = page.getByRole('button', { name: /confirm|continuar|next|siguiente|enviar|submit/i }).first();
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click().catch(() => {});
    } else {
      await twoFaField.press('Enter');
    }
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(4000);
    await dismissOverlays(page);
  }

  return {
    attempted: true,
    requiresTwoFa: needsTwoFa && !IG_2FA_CODE,
  };
}

async function collectBioText(page) {
  const candidates = [
    'header section',
    'header',
    'main header',
  ];

  for (const selector of candidates) {
    const region = page.locator(selector).first();
    if (await region.isVisible().catch(() => false)) {
      const text = (await region.innerText().catch(() => '')).trim();
      if (text) return text;
    }
  }

  return '';
}

async function findHighlightButtons(page) {
  const buttons = page.locator('main button, main a').filter({
    has: page.locator('img'),
  });
  const count = await buttons.count().catch(() => 0);
  const found = [];

  for (let i = 0; i < count; i += 1) {
    const button = buttons.nth(i);
    const box = await button.boundingBox().catch(() => null);
    if (!box) continue;
    if (box.y < 260 || box.y > 760) continue;
    if (box.width < 40 || box.width > 140) continue;
    if (box.height < 40 || box.height > 170) continue;

    const text = (await button.innerText().catch(() => '')).trim();
    const ariaLabel = (await button.getAttribute('aria-label').catch(() => '')) || '';
    const label = text || ariaLabel;

    if (!label) continue;
    if (/publicaci|segui|mensaje|contact|llamar|email/i.test(label)) continue;
    if (/^\d+$/.test(label)) continue;

    found.push({ index: i, label });
  }

  const prioritized = found
    .map((item) => ({
      ...item,
      priority:
        HIGHLIGHT_PRIORITY_PATTERNS.findIndex((pattern) => pattern.test(item.label)) ?? -1,
    }))
    .filter((item) => item.priority !== -1)
    .sort((a, b) => a.priority - b.priority);

  if (prioritized.length > 0) {
    return prioritized.slice(0, MAX_HIGHLIGHTS);
  }

  return found.slice(0, MAX_HIGHLIGHTS);
}

async function findAnyHighlightButton(page) {
  const buttons = page.locator('main button, main a').filter({
    has: page.locator('img'),
  });
  const count = await buttons.count().catch(() => 0);

  for (let i = 0; i < count; i += 1) {
    const button = buttons.nth(i);
    const box = await button.boundingBox().catch(() => null);
    if (!box) continue;
    if (box.y < 260 || box.y > 760) continue;
    if (box.width < 40 || box.width > 140) continue;
    if (box.height < 40 || box.height > 170) continue;

    const text = (await button.innerText().catch(() => '')).trim();
    const ariaLabel = (await button.getAttribute('aria-label').catch(() => '')) || '';
    const label = text || ariaLabel;

    if (!label) continue;
    if (/publicaci|segui|mensaje|contact|llamar|email/i.test(label)) continue;

    return { index: i, label };
  }

  return null;
}

async function openHighlightByLabel(page, label) {
  const exact = page.getByRole('button', { name: label }).first();
  if (await exact.isVisible().catch(() => false)) {
    await exact.click().catch(() => {});
    return true;
  }

  const partial = page.getByLabel(label).first();
  if (await partial.isVisible().catch(() => false)) {
    await partial.click().catch(() => {});
    return true;
  }

  const textMatch = page.locator(`text=${JSON.stringify(label)}`).first();
  if (await textMatch.isVisible().catch(() => false)) {
    await textMatch.click().catch(() => {});
    return true;
  }

  return false;
}

async function openHighlightByIndex(page, index) {
  const buttons = page.locator('main button, main a').filter({
    has: page.locator('img'),
  });
  const button = buttons.nth(index);
  if (await button.isVisible().catch(() => false)) {
    await button.scrollIntoViewIfNeeded().catch(() => {});

    const clickStrategies = [
      async () => button.tap(),
      async () => button.click(),
      async () => button.click({ force: true }),
      async () => {
        const box = await button.boundingBox();
        if (!box) return false;
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        return true;
      },
      async () => {
        const label = (await button.innerText().catch(() => '')).trim();
        if (!label) return false;
        const textTarget = page.getByText(label, { exact: true }).first();
        if (await textTarget.isVisible().catch(() => false)) {
          await textTarget.tap().catch(() => {});
          return true;
        }
        return false;
      },
      async () => {
        const box = await button.boundingBox();
        if (!box) return false;
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        return true;
      },
    ];

    for (const attempt of clickStrategies) {
      try {
        const result = await attempt();
        if (result === false) continue;
        await page.waitForTimeout(1200);
        return true;
      } catch {
        // Try the next strategy.
      }
    }
  }
  return false;
}

async function isLoginScreen(page) {
  const loginField = page.getByLabel(/teléfono|phone|nombre de usuario|username|correo electrónico|email/i).first();
  const passwordField = page.getByLabel(/contraseña|password/i).first();

  return (
    (await loginField.isVisible().catch(() => false)) &&
    (await passwordField.isVisible().catch(() => false))
  );
}

async function waitForStoryViewer(page) {
  for (let i = 0; i < 10; i += 1) {
    await dismissInstagramPrompts(page);

    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible().catch(() => false)) {
      return dialog;
    }

    const closeButton = page.getByRole('button', { name: /cerrar|close/i }).first();
    if (await closeButton.isVisible().catch(() => false)) {
      return page.locator('body');
    }

    await page.waitForTimeout(700);
  }

  return null;
}

function looksLikeInstagramProfileScreen(text) {
  const normalized = text.toLowerCase();

  const profileSignals = [
    /seguir|following|follow/.test(normalized),
    /mensaje|message/.test(normalized),
    /publicacione|seguidores|seguidos/.test(normalized),
    /men[úu]|horarios|ubicaci[oó]n|visitas|platos/.test(normalized),
  ];

  return profileSignals.filter(Boolean).length >= 2;
}

async function readCurrentStoryFrames(page, highlightSlug, initialCapture = null) {
  const frames = [];
  const debugFrames = [];
  let repeatedProfileCount = 0;
  const intent = getHighlightIntent(highlightSlug);
  let lastNonProfileText = '';
  let repeatedStoryCount = 0;
  let nextDelayMs = 400;

  async function captureCurrentScreen(filePath) {
    await page.screenshot({ path: filePath, fullPage: false }).catch(() => {});
    const result = await Tesseract.recognize(filePath, 'spa+eng', {
      logger: () => {},
    });
    const text = result.data.text.replace(/\s+\n/g, '\n').trim();
    const score = scoreFrameForIntent(text, intent);
    const frameIndexMatch = filePath.match(/frame-(\d+)/i);
    const frameIndex = frameIndexMatch ? Number(frameIndexMatch[1]) : debugFrames.length + 1;
    debugFrames.push({ filePath, text, score, frameIndex });
    if (score > 0) {
      frames.push({ filePath, text, score, frameIndex });
    }
    return { text, score };
  }

  if (initialCapture) {
    const seededScore = scoreFrameForIntent(initialCapture.text, intent);
    const seededFrame = {
      filePath: initialCapture.filePath,
      text: initialCapture.text,
      score: seededScore,
      frameIndex: 0,
    };
    debugFrames.push(seededFrame);
    if (seededScore > 0) {
      frames.push(seededFrame);
    }

    if (!looksLikeInstagramProfileScreen(initialCapture.text)) {
      lastNonProfileText = initialCapture.text;
      nextDelayMs = 4500;
    }
  }

  for (let i = 0; i < 6; i += 1) {
    await dismissInstagramPrompts(page);
    await page.waitForTimeout(nextDelayMs);

    const filePath = path.join(outputDir, `${highlightSlug}-frame-${i + 1}.png`);
    let { text, score } = await captureCurrentScreen(filePath);

    if (intent === 'hours' && score <= 0 && hasHourSignal(text)) {
      const retryPath = path.join(outputDir, `${highlightSlug}-frame-${i + 1}-retry.png`);
      await page.waitForTimeout(900);
      ({ text, score } = await captureCurrentScreen(retryPath));
    }

    const looksLikeProfile = looksLikeInstagramProfileScreen(text);

    if (looksLikeProfile) {
      repeatedProfileCount += 1;
      if (i > 0 || repeatedProfileCount >= 1) {
        break;
      }
    } else {
      repeatedProfileCount = 0;
    }

    if (looksLikeProfile) {
      break;
    }

    if (lastNonProfileText && isSameStoryText(lastNonProfileText, text)) {
      repeatedStoryCount += 1;
      if (repeatedStoryCount >= 1) {
        const viewport = page.viewportSize();
        if (viewport) {
          await page.touchscreen.tap(viewport.width * 0.82, viewport.height * 0.45).catch(() => {});
        } else {
          await page.keyboard.press('ArrowRight').catch(() => {});
        }
        nextDelayMs = 250;
      } else {
        nextDelayMs = 4500;
      }
    } else {
      lastNonProfileText = text;
      repeatedStoryCount = 0;
      nextDelayMs = 4500;
    }
  }

  await page.keyboard.press('Escape').catch(() => {});
  const fallbackPath = path.join(outputDir, `${highlightSlug}-viewer-fallback.png`);
  await page.screenshot({ path: fallbackPath, fullPage: false }).catch(() => {});
  return {
    frames: frames.sort((a, b) => (a.frameIndex ?? 0) - (b.frameIndex ?? 0)),
    debugFrames: debugFrames.sort((a, b) => (a.frameIndex ?? 0) - (b.frameIndex ?? 0)),
    fallbackPath,
  };
}

async function ensureBackOnProfile(page) {
  for (let i = 0; i < 3; i += 1) {
    await dismissInstagramPrompts(page);

    const profileCapture = await screenshotAndOcr(page, `profile-state-check-${i + 1}`);
    if (looksLikeInstagramProfileScreen(profileCapture.text)) {
      return true;
    }

    const followButton = page.getByRole('button', { name: /seguir|following|follow/i }).first();
    const messageButton = page.getByRole('button', { name: /mensaje|message/i }).first();
    if (
      (await followButton.isVisible().catch(() => false)) ||
      (await messageButton.isVisible().catch(() => false))
    ) {
      return true;
    }

    await page.goBack().catch(() => {});
    await page.waitForTimeout(1200);
  }

  await gotoInstagramPage(page, PROFILE_URL);
  return true;
}

async function confirmHighlightOpened(page, highlightSlug) {
  const capture = await screenshotAndOcr(page, `${highlightSlug}-open-check`);
  return {
    opened: !looksLikeInstagramProfileScreen(capture.text),
    capture,
  };
}

async function main() {
  await ensureDir(outputDir);
  await ensureDir(sessionDir);

  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: HEADLESS,
    ...devices['iPhone 13'],
    locale: 'es-CO',
  });
  const page = await context.newPage();

  try {
    await gotoInstagramPage(page, PROFILE_URL);
    const loginTriggered = await triggerLoginFromProfileGate(page);

    if (!loginTriggered) {
      const anyHighlight = await findAnyHighlightButton(page);
      if (anyHighlight) {
        await openHighlightByIndex(page, anyHighlight.index);
        await page.waitForTimeout(1500);
        await dismissInstagramPrompts(page);
      }
    }

    let loginResult = null;
    if (await isLoginScreen(page)) {
      loginResult = await loginIfNeeded(page);
      if (loginResult?.attempted) {
        await gotoInstagramPage(page, PROFILE_URL);
        await dismissInstagramPrompts(page);
      }
    }
    const loggedIn = Boolean(loginResult?.attempted);

    const bioText = await collectBioText(page);
    const profileCapture = await screenshotAndOcr(page, 'profile');
    const highlights = await findHighlightButtons(page);

    const parsedHighlights = [];
    for (const highlight of highlights) {
      let opened = await openHighlightByIndex(page, highlight.index);
      if (!opened) continue;
      await page.waitForTimeout(1000);
      let openState = await confirmHighlightOpened(page, highlight.label);
      if (!openState.opened) {
        await ensureBackOnProfile(page);
        opened = await openHighlightByIndex(page, highlight.index);
        if (!opened) continue;
        await page.waitForTimeout(1000);
        openState = await confirmHighlightOpened(page, highlight.label);
      }
      if (!openState.opened) {
        await ensureBackOnProfile(page);
        continue;
      }
      const intent = getHighlightIntent(highlight.label);
      const frames = await readCurrentStoryFrames(
        page,
        highlight.label,
        openState.capture
      );
      const primaryFrame = pickPrimaryFrame(frames.frames, intent);
      parsedHighlights.push({
        label: highlight.label,
        index: highlight.index,
        intent,
        frames: frames.frames,
        primaryFrame,
        debugFrames: frames.debugFrames,
        fallbackPath: frames.fallbackPath,
      });
      await ensureBackOnProfile(page);
    }

    console.log(
      JSON.stringify(
        {
          profileUrl: PROFILE_URL,
          outputDir,
          loggedIn,
          requiresTwoFa: Boolean(loginResult?.requiresTwoFa),
          bioText,
          profileOcrText: profileCapture.text,
          highlights: parsedHighlights,
          summary: {
            name: extractNameFromText(profileCapture.text),
            location: extractLocationFromText(profileCapture.text),
            primaryHighlights: parsedHighlights.map((highlight) => ({
              label: highlight.label,
              intent: highlight.intent,
              primaryFrame: highlight.primaryFrame
                ? {
                    filePath: highlight.primaryFrame.filePath,
                    score: highlight.primaryFrame.score,
                    frameIndex: highlight.primaryFrame.frameIndex,
                    temporal: highlight.intent === 'hours'
                      ? looksTemporalHours(highlight.primaryFrame.text)
                      : false,
                  }
                : null,
            })),
            hours: parsedHighlights
              .flatMap((highlight) => (highlight.intent === 'hours' && highlight.primaryFrame ? [highlight.primaryFrame] : []))
              .flatMap((frame) => extractHoursFromText(frame.text)),
          },
        },
        null,
        2
      )
    );
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
