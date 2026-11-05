import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

// Parse the embedded string as data, never execute the page's JavaScript.
export function extractCanva(html) {
  const match = html.match(/window\['bootstrap'\] = JSON\.parse\('((?:\\.|[^'\\])*)'\)/s);
  if (!match) throw new Error('Canva bootstrap unavailable');
  const raw = match[1].replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, x) => {
    if (x[0] === 'u' || x[0] === 'x') return String.fromCharCode(parseInt(x.slice(1), 16));
    return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v' })[x] ?? x;
  });
  const document = JSON.parse(raw)?.page?.Bj?.A?.D?.A;
  if (!Array.isArray(document?.A)) throw new Error('Unrecognized Canva document schema');
  return { title: document.D, pages: document.A.map((page, index) => {
    const blocks = [];
    function walk(element, path) {
      if (!element || typeof element !== 'object') return;
      if (Array.isArray(element.a?.C?.A)) {
        const text = element.a.C.A.filter(value => typeof value === 'string').join('');
        if (text.trim()) blocks.push({ path, text, geometry: Object.fromEntries(Object.entries(element).filter(([key,value]) => typeof value === 'number')) });
      }
      if (Array.isArray(element.c)) element.c.forEach((child, i) => walk(child, `${path}.c.${i}`));
    }
    (page.E ?? []).forEach((element, i) => walk(element, `E.${i}`));
    return { page: index + 1, blocks };
  }) };
}

if (process.argv[2]) {
  const start = performance.now();
  const result = extractCanva(fs.readFileSync(process.argv[2], 'utf8'));
  result.parseMs = performance.now() - start;
  const serialized = JSON.stringify(result, null, 2);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], serialized + '\n');
  else console.log(serialized);
}
