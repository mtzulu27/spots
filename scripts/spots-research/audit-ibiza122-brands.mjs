import fs from 'node:fs/promises';

const catalog = JSON.parse(await fs.readFile('apps/mobile/public/spots-catalog.json', 'utf8'));
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const brands = [
  ['Braun', ['Braun', 'Somos Braun'], ['somos.braun']],
  ['Constantina Pizzeria', ['Constantina', 'Constantina Pizzeria'], ['constantinapizzeria']],
  ['Bonne Pasteleria', ['Bonne', 'Bonne Pasteleria'], ['bonnepasteleria']],
  ['Zakani', ['Zakani', 'Zakani Restaurante'], ['zakanirestaurante']],
  ['Voltaire', ['Voltaire', 'Restaurante Voltaire'], ['restaurantevoltaire']],
  ['Dejamu', ['Dejamu', 'Dejamu Subachoque'], ['dejamusubachoque']],
  ['Brazz Cocina Urbana', ['Brazz', 'Brazz Burger', 'Brazz Burguer', 'Brazz Cocina Urbana'], ['brazzburger']],
  ['El Santo Taqueria', ['El Santo', 'El Santo Taqueria'], ['el_santo_taqueria']],
  ["L'Orso", ["L'Orso", 'Lorso', 'L Orso', 'Lorso Restaurante'], []],
  ['Premier Wings', ['Premier Wings', 'La 33 St', 'La33St', 'La 33 Street'], ['premierwings.co', 'la33st']],
  ["D'Cirilo Cocina Peruana", ["D'Cirilo", 'Dcirilo', 'D Cirilo', 'Dcirilo Cocina Peruana'], ['dcirilococinaperuana']],
];
const rows = brands.map(([name, aliases, handles]) => {
  const matches = catalog.spots.filter(spot => {
    const branches = catalog.branches.filter(branch => branch.spot_id === spot.id);
    const identities = [spot.name, spot.slug];
    const instagrams = [spot.instagram, ...branches.map(branch => branch.instagram)]
      .filter(Boolean).map(url => new URL(url).pathname.split('/').filter(Boolean)[0]);
    return identities.some(value => aliases.some(alias => normalize(value) === normalize(alias))) ||
      instagrams.some(value => handles.some(handle => normalize(value) === normalize(handle)));
  });
  return { name, checkedAliases: aliases, checkedHandles: handles,
    classification: matches.length ? 'existing_brand_add_branch' : 'new_brand',
    matches: matches.map(spot => ({ id: spot.id, name: spot.name, slug: spot.slug, active: spot.is_active,
      branches: catalog.branches.filter(branch => branch.spot_id === spot.id).map(branch => ({id: branch.id, slug: branch.slug, mall: branch.mall, active: branch.is_active})) })) };
});
const report = { checkedAt: new Date().toISOString(), scope: 'All local catalog spots, active and inactive; exact normalized names/slugs, aliases and Instagram handles. Menu product names are not places.',
  mall: {name: 'Ibiza 122 Food Mall', neighborhood: 'Pance', city: 'Cali', address: 'Calle 16A #122-30', source: 'https://www.instagram.com/ibiza122foodmall/'},
  totalSpotsChecked: catalog.spots.length, totalBranchesChecked: catalog.branches.length,
  existingBrands: rows.filter(row => row.matches.length).length, newBrands: rows.filter(row => !row.matches.length).length, brands: rows,
  exclusions: ['Dos Santos Cantina is not El Santo Taqueria.', 'El Santo occurrences in menu products are not brand records.'],
  writes: 'No spot or branch records created. New brand intake and branch opening verification remain separate tasks.' };
await fs.mkdir('docs/catalog-review/ibiza122-20261101', {recursive:true});
await fs.writeFile('docs/catalog-review/ibiza122-20261101/brand-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
