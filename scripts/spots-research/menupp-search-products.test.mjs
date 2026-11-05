import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexMenuReport } from './menupp-search-products.mjs';

const source = 'https://menupp.co/example/venue/a/menu/b';
function report(products, categories = [{ id: 'beer', name: 'Cervezas', hierarchy: 'root' }]) {
  return { status: 'public_menu_records_received', finishedAt: '2026-11-01T20:00:00Z',
    menus: [{ source, metadata: { active: true }, categories, products }] };
}
const product = (overrides = {}) => ({ id: 'one', product_name: 'Lager', product_category: 'beer', disabled: false, ...overrides });

test('public product identity and provenance are retained independently of pricing', () => {
  const result = indexMenuReport(report([product()]), 'evidence.json')[0];
  assert.equal(result.products[0].category, 'drinks');
  assert.equal(result.products[0].sourceProductId, 'one');
  assert.equal(result.products[0].sourceUrl, source);
  assert.equal(result.products[0].verifiedAt, '2026-11-01T20:00:00Z');
  assert.equal(result.products[0].price, undefined);
});

test('disabled, sold-out and disabled-ancestor products cannot enter the index', () => {
  for (const patch of [{ disabled: true }, { noStock: true }, { price: [{ noStock: true }, { disable: true }] }]) {
    assert.equal(indexMenuReport(report([product(patch)]), 'evidence.json')[0].products.length, 0);
  }
  const categories = [{ id: 'beer', name: 'Nacionales', hierarchy: 'drinks' }, { id: 'drinks', name: 'Bebidas', hierarchy: 'root', disabled: true }];
  assert.equal(indexMenuReport(report([product()], categories), 'evidence.json')[0].products.length, 0);
  assert.equal(indexMenuReport(report([product({ price: [{ noStock: true }, { noStock: false }] })]), 'evidence.json')[0].products.length, 1);
});

test('incomplete reports, missing categories and hierarchy cycles are not usable evidence', () => {
  assert.deepEqual(indexMenuReport({ status: 'partial', menus: [] }, 'evidence.json'), []);
  assert.equal(indexMenuReport(report([product({ product_category: 'missing' })]), 'evidence.json')[0].products.length, 0);
  assert.equal(indexMenuReport(report([product()], [{ id: 'beer', name: 'Beer', hierarchy: 'beer' }]), 'evidence.json')[0].products.length, 0);
});

test('modifiers do not assert standalone products; hidden menus are excluded', () => {
  const data = report([product()], [{ id: 'beer', name: 'Adiciones', hierarchy: 'root' }]);
  assert.equal(indexMenuReport(data, 'evidence.json')[0].products.length, 0);
  data.menus[0].metadata.hide = true;
  assert.deepEqual(indexMenuReport(data, 'evidence.json'), []);
});

test('relative public source links resolve against the observed brand URL', () => {
  const data = report([product()]);
  data.source = 'https://menupp.co/example';
  data.menus[0].source = '/example/venue/a/menu/b';
  assert.equal(indexMenuReport(data, 'evidence.json')[0].sourceUrl, source);
});
