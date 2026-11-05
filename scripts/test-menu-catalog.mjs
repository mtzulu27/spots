import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyMenuItem, normalizeExtractedItems, summarizeMenuItems } from './lib/menu-catalog.mjs';

test('distingue una entrada gastronómica de una entrada al lugar', () => {
  assert.equal(classifyMenuItem({ category: 'Entradas', name: 'Carpaccio de res' }), 'starters');
  assert.equal(classifyMenuItem({ category: 'Taquilla', name: 'Entrada general' }), 'tickets');
  assert.equal(classifyMenuItem({ category: 'Información', name: 'Cover viernes' }), 'cover');
});

test('clasifica categorías de restaurante y descarta filas sin precio útil', () => {
  const items = normalizeExtractedItems([
    { category: 'Fuertes', name: 'Lomo al trapo', price: 48000 },
    { category: 'Postres', name: 'Tarta de queso', price: 22000 },
    { category: 'Bebidas', name: 'Limonada de coco', price: 14000 },
    { category: 'Adiciones', name: 'Salsa extra', price: 500 },
  ], { sourceUrl: 'https://example.com/menu', verifiedAt: '2026-09-05T00:00:00.000Z' });
  assert.deepEqual(items.map((item) => item.category).sort(), ['desserts', 'drinks', 'mains']);
});

test('calcula rango real y promedio recortado para evitar extremos', () => {
  const prices = [10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 200000];
  const summary = summarizeMenuItems(prices.map((price, index) => ({ category: 'drinks', name: `Bebida ${index}`, price })));
  assert.deepEqual(summary.drinks, { minimum: 10000, maximum: 200000, average: 14500, sampleSize: 10 });
});
