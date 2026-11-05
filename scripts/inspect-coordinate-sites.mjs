import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const sites = [
  ['mimos', 'https://www.mimos.com.co/'],
  ['mister-wings', 'https://misterwings.com/'],
  ['cafe-quindio', 'https://www.cafequindio.com.co/pages/tiendas-cafe-quindio'],
  ['storia-damore', 'https://restaurantestoriadamore.com/'],
  ['king-papa', 'https://kingpapa.co/'],
  ['el-gran-langostino', 'https://sucursales.granlangostino.com/nosotros/'],
  ['new-anchor-caffe', 'https://newanchor.co/pages/caffe'],
  ['mantra-coffee-club', 'https://mantracoffeeclub.com/'],
  ['purist-cafe', 'https://puristcafe.co/'],
  ['chilitaco', 'https://chilitaco.co/'],
  ['el-cilindro', 'https://www.elcilindro.com/'],
  ['bbc', 'https://www.bbccerveceria.com/pubs-y-bodegas'],
  ['jardin-botanico-de-cali', 'https://www.jardinbotanicodecali.com.co/visita'],
  ['zoologico-de-cali', 'https://www.zoologicodecali.com.co/'],
  ['la-pergola-clandestina', 'https://lapergola.co/'],
  ['lengua-de-mariposa', 'https://lenguademariposa.com/'],
  ['patolandia', 'https://www.mallplaza.com/co/cali/tiendas/patolandia'],
];
const followups = [
  ['storia-granada', 'https://restaurantestoriadamore.com/pages/ristorante-granada-cali'],
  ['storia-chipichape', 'https://restaurantestoriadamore.com/pages/piazza-chipichape-cali'],
  ['storia-unicentro', 'https://restaurantestoriadamore.com/pages/piazza-unicentro-cali'],
  ['sushi-contacto', 'https://sushigreen.com.co/contactenos/'],
  ['t4-contacto', 'https://t4colombia.com/contacto/'],
  ['spacejump-contacto', 'https://spacejump.com.co/contacto/'],
  ['cantina-sedes', 'https://www.cantinala15.com/sedes/'],
  ['madelo-ubicaciones', 'https://www.madelo.com.co/ubicaciones'],
  ['mimos-locator', 'https://www.mimos.com.co/encuentranos/'],
  ['mister-wings-sedes', 'https://misterwings.com/sedes/'],
  ['cafe-quindio-cali', 'https://www.cafequindio.com.co/blogs/cali'],
  ['purist-sedes', 'https://puristcafe.co/pages/sedes'],
  ['chilitaco-ubicaciones', 'https://chilitaco.co/ubicaciones/'],
  ['lengua-contacto', 'https://lenguademariposa.com/contacto/'],
];
const folder = '/tmp/spots-coordinate-sites';
mkdirSync(folder, { recursive: true });
const reportPath = 'docs/catalog-review/coordinate-owner-site-checks.json';
const catalogSites = [];
if (process.argv.includes('--catalog')) {
  const catalog = JSON.parse(readFileSync('apps/mobile/public/spots-catalog.json', 'utf8'));
  const excluded = /menupp|instagram|facebook|canva|google|linktr|wa\.me|drive\.|dropbox|whatsapp|apparta|queresto|pirpos|cluvi|niceeat|mezzy|youtube|tiktok/;
  const seen = new Set();
  for (const branch of catalog.branches) {
    if (!branch.menu_url?.startsWith('https://')) continue;
    const url = new URL(branch.menu_url);
    if (excluded.test(url.hostname) || seen.has(url.origin)) continue;
    seen.add(url.origin);
    catalogSites.push([url.hostname.replaceAll('.', '-'), url.origin]);
  }
}
const selected = process.argv.includes('--catalog') ? catalogSites : process.argv.includes('--follow') ? followups : sites;
const results = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')).results.filter((r) => !selected.some(([, url]) => url === r.url)) : [];
for (const [slug, url] of selected) {
  try {
    const info = JSON.parse(execFileSync('curl', ['-sSL', '--max-time', '15', url,
      '-o', `${folder}/${slug}.html`, '-w', '%{json}'], { encoding: 'utf8', timeout: 17000 }));
    const html = readFileSync(`${folder}/${slug}.html`, 'utf8');
    const links = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map((m) => m[1]);
    const coordinates = [...html.matchAll(/.{0,90}(?:latitude|longitude|"lat"|"lng"|3\.[0-9]{4,}|-76\.[0-9]{4,}).{0,150}/gi)].map((m) => m[0]);
    results.push({ slug, url, resolvedUrl: info.url_effective, status: info.http_code, length: html.length,
      links: [...new Set(links)].filter((l) => /sede|location|tienda|store|contact|ubic|\.js|json/i.test(l)),
      coordinateSnippets: coordinates.slice(0, 100) });
  } catch (error) { results.push({ slug, url, error: String(error) }); }
  console.log(slug, results.at(-1).status ?? results.at(-1).error);
}
writeFileSync(reportPath, `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`);
