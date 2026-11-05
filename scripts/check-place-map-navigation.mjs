import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const errors = [];
mkdirSync('output/playwright', { recursive: true });
try {
  for (const width of [375, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 812 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:8081/spot/alma-romero-leyenda-mall');
    await page.getByText('Calle 13A #103-335, La Leyenda , Ciudad Jardín', { exact: true }).click();
    await page.waitForURL('**/place-map?**');
    await page.getByRole('link', { name: 'Ver Alma Romero, nuevo lugar', exact: true }).waitFor();
    const back = page.getByRole('button', { name: 'Volver a la ficha del lugar', exact: true });
    await back.waitFor();
    // Wait for the entrance animation by checking the rendered element, not React internals.
    await page.waitForFunction(() => {
      const nodes = [...document.querySelectorAll('[title="Seleccionar Alma Romero"]')];
      return nodes.some(node => {
        const bounds = node.getBoundingClientRect();
        return Math.abs(bounds.x + bounds.width / 2 - innerWidth / 2) < 25 &&
          Math.abs(bounds.y + bounds.height / 2 - innerHeight / 2) < 25;
      });
    });
    assert.equal(await page.getByRole('button', { name: 'Volver al zoom anterior', exact: true }).count(), 0);
    await page.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile-loaded')].some(tile => {
      const bounds = tile.getBoundingClientRect();
      return bounds.left <= innerWidth / 2 && bounds.right >= innerWidth / 2 &&
        bounds.top <= innerHeight / 2 && bounds.bottom >= innerHeight / 2 &&
        Number(getComputedStyle(tile).opacity) >= .99;
    }));
    await page.screenshot({ path: `output/playwright/place-map-${width}.png` });
    await page.getByRole('button', { name: 'Ver todas las sedes de este lugar', exact: true }).click();
    await page.getByRole('button', { name: 'Volver al zoom anterior', exact: true }).click();
    await back.click();
    await page.waitForURL('**/spot/alma-romero-leyenda-mall');
    await page.getByText('Calle 13A #103-335, La Leyenda , Ciudad Jardín', { exact: true }).waitFor();
    console.log(`${width}px: ficha -> pin centrado y tarjeta La Leyenda -> toggle sedes -> regreso a ficha OK`);
    await page.close();
  }
  const direct = await browser.newPage();
  await direct.goto('http://localhost:8081/place-map?branch=alma-romero-leyenda-mall&returnSpot=alma-romero-leyenda-mall');
  await direct.getByRole('link', { name: 'Ver Alma Romero, nuevo lugar', exact: true }).waitFor();
  await direct.getByRole('button', { name: 'Volver a la ficha del lugar', exact: true }).click();
  await direct.waitForURL('**/spot/alma-romero-leyenda-mall?branch=alma-romero-leyenda-mall');
  await direct.goto('http://localhost:8081/explore?view=map&preview=1');
  await direct.getByRole('button', { name: 'Filtrar lugares en el mapa', exact: true }).waitFor();
  assert.equal(await direct.getByRole('button', { name: 'Volver a la ficha del lugar', exact: true }).count(), 0);
  console.log('Enlace directo: regreso a ficha OK. Mapa desde Explore: sin flecha contextual OK.');
  await direct.close();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
