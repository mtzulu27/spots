import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'assets/home-announcement');
fs.mkdirSync(output, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/spots-catalog.json'), 'utf8'));
for (const [id, name] of [[4003, 'constantina'], [4002, 'braun'], [4004, 'bonne'], [4007, 'brazz'], [4008, 'el-santo'], [4009, 'lorso']]) {
  const spot = catalog.spots.find(spot => spot.id === id);
  if (!spot?.logo_url?.startsWith('/place-media/')) throw new Error(`Missing local logo for ${name}`);
  const destination = path.join(output, `${name}.jpg`);
  fs.copyFileSync(path.join(root, 'public', spot.logo_url), destination);
  execFileSync('sips', ['-Z', '96', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', destination]);
}
const food = path.resolve(root, '../../output/spots-rappi-banners-20261101/cream/assets/ibiza-food-cutout.png');
const destination = path.join(output, 'ibiza-food-cutout.png');
fs.copyFileSync(food, destination);
execFileSync('sips', ['-Z', '500', destination]);
console.log('Bundled six original logos and the approved AI-assisted concept cutout. No source images changed.');
