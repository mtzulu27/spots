import fs from 'node:fs/promises';

const filePath = '/Users/mateo/Documents/Playground/apps/mobile/lib/mock-spots.ts';
const source = await fs.readFile(filePath, 'utf8');

const blocks = source.match(/\{\n[\s\S]*?\n  \},/g) ?? [];

function extract(block, field) {
  const match = block.match(new RegExp(`${field}: '([^']*)'`));
  return match?.[1] ?? '';
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'CodexSpots/1.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${query}`);
  }

  const json = await response.json();
  return Array.isArray(json) && json[0]
    ? {
        latitude: Number(json[0].lat),
        longitude: Number(json[0].lon),
        displayName: json[0].display_name,
      }
    : null;
}

const results = [];

for (const block of blocks) {
  const id = extract(block, 'id');
  const name = extract(block, 'name');
  const address = extract(block, 'address');
  const type = extract(block, 'type');

  if (!id || !name || !address || type === 'home') {
    continue;
  }

  const queries = [
    `${name}, ${address}, Cali, Colombia`,
    `${address}, Cali, Colombia`,
    `${name}, Cali, Colombia`,
  ];

  let match = null;
  for (const query of queries) {
    try {
      match = await geocode(query);
    } catch (error) {
      match = null;
    }

    if (match) {
      results.push({ id, name, address, ...match });
      break;
    }
  }

  if (!match) {
    results.push({ id, name, address, latitude: null, longitude: null, displayName: null });
  }

  await new Promise((resolve) => setTimeout(resolve, 1100));
}

console.log(JSON.stringify(results, null, 2));
