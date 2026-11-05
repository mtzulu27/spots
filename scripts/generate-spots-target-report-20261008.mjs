import fs from 'node:fs';

const report = JSON.parse(fs.readFileSync('docs/spots-target-completeness-2026-10-07.json', 'utf8'));
const catalog = JSON.parse(fs.readFileSync('apps/mobile/public/spots-catalog.json', 'utf8'));
const lines = [
  '# Reporte de carga de lugares',
  '',
  `Generado: ${new Date().toISOString()}`,
  '',
  '| # | Lugar | Estado | Visible | Pendientes |',
  '|---:|---|---|:---:|---|',
];

for (const [index, item] of report.places.entries()) {
  const spot = catalog.spots.find((entry) => entry.slug === item.slug);
  const status = item.status === 'complete' ? 'Completo' : item.status === 'discontinued' ? 'Discontinuado' : 'Pendiente';
  const missing = item.missing.length ? item.missing.join(', ') : 'Ninguno';
  const safeName = item.requestedName.replaceAll('|', '\\|');
  lines.push(`| ${index + 1} | ${safeName} | ${status} | ${spot?.is_active ? 'Sí' : 'No'} | ${missing} |`);
}

fs.writeFileSync('docs/spots-target-report-2026-10-08.md', `${lines.join('\n')}\n`);
console.log(JSON.stringify({ path: 'docs/spots-target-report-2026-10-08.md', places: report.places.length }, null, 2));
