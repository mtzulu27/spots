import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const INPUT_URL = process.argv[2];

if (!INPUT_URL || !/^https?:\/\//i.test(INPUT_URL)) {
  console.error('Uso: node scripts/read-beacons-site.mjs <beacons-url>');
  process.exit(1);
}

const outputDir = join(tmpdir(), `beacons-reader-${Date.now()}`);
mkdirSync(outputDir, { recursive: true });

function normalize(value) {
  return String(value ?? '').replace(/\\u0026/g, '&').replace(/\\+/g, ' ').replace(/\s+/g, ' ').trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function collectStrings(value, result = []) {
  if (typeof value === 'string') {
    const text = normalize(value);
    if (text) result.push(text);
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, result));
    return result;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, result));
  }
  return result;
}

function collectPageRecords(value, pages = []) {
  if (!value || typeof value !== 'object') return pages;
  if (value.slug && (value.blocks || value.block_order)) {
    pages.push({
      name: normalize(value.name),
      slug: normalize(value.slug),
      blockOrder: Array.isArray(value.block_order) ? value.block_order : [],
      blocks: value.blocks ?? {},
    });
  }
  if (Array.isArray(value)) value.forEach((item) => collectPageRecords(item, pages));
  else Object.values(value).forEach((item) => collectPageRecords(item, pages));
  return pages;
}

function summarizePage(page) {
  const blocks = page.blockOrder.length
    ? page.blockOrder.map((id) => page.blocks[id]).filter(Boolean)
    : Object.values(page.blocks);
  const images = unique(
    blocks.flatMap((block) => [
      block.image_url,
      ...(Array.isArray(block.images) ? block.images.map((image) => image?.source || image?.url) : []),
    ]),
  ).filter((url) => /^https?:\/\//i.test(url));
  const links = unique(
    blocks.flatMap((block) => [
      block.primary_button_url,
      block.secondary_button_url,
      ...(Array.isArray(block.links) ? block.links.map((link) => link?.url) : []),
    ]),
  ).filter((url) => /^https?:\/\//i.test(url));
  const text = unique(
    blocks.flatMap((block) => collectStrings({
      heading: block.heading,
      subheading: block.subheading,
      title: block.title,
      description: block.description,
      links: block.links,
    })),
  );
  return { name: page.name, slug: page.slug, blockCount: blocks.length, images, links, text };
}

const response = await fetch(INPUT_URL, {
  headers: {
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'es-CO,es;q=0.9,en;q=0.8',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  },
});
if (!response.ok) {
  throw new Error(`Beacons respondió ${response.status} ${response.statusText}`);
}
const html = await response.text();
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
const jsonCandidates = [];

  for (const script of scripts) {
    const match = script.match(/\{.*\}/s);
    if (!match) continue;
    try {
      jsonCandidates.push(JSON.parse(match[0]));
    } catch {
      // Next.js RSC payloads are not always standalone JSON; parse the embedded objects below.
    }
  }

  const escapedJson = [...html.matchAll(/\\"slug\\":\\"([^"\\]+).*?(?=\\"slug\\":|$)/gs)].map((match) => match[0]);
  const pageRecords = [...jsonCandidates.flatMap((value) => collectPageRecords(value))];
  const slugs = unique([
    ...pageRecords.map((record) => record.slug),
    ...[...html.matchAll(/\\"slug\\":\\"([^"\\]+)\\"/g)].map((match) => match[1]),
  ]);

  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] ?? null;
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ?? null;
  const result = {
    sourceUrl: INPUT_URL,
    finalUrl: response.url,
    fetchedAt: new Date().toISOString(),
    provider: 'beacons',
    discovery: {
      routePattern: `${new URL(INPUT_URL).origin}/${new URL(INPUT_URL).pathname.split('/').filter(Boolean)[0]}/<slug>`,
      slugs,
      embeddedRscCandidates: escapedJson.length,
    },
    pages: unique(pageRecords.map((record) => JSON.stringify(summarizePage(record)))).map((value) => JSON.parse(value)),
    htmlMetadata: {
      title: normalize(title),
      canonical,
      description: normalize(description),
    },
  };
  const outputPath = join(outputDir, 'beacons-site.json');
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, pageCount: result.pages.length, slugs: result.discovery.slugs }, null, 2));
