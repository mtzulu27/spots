import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(new URL('../package.json', import.meta.url))
const ts = require('typescript')
const source = readFileSync(new URL('../components/place-photo.tsx', import.meta.url), 'utf8')
const helper = source.slice(source.indexOf('export function getFeedPlaceGrayscaleStyle'), source.indexOf('export function FeedPlacePhoto'))
const js = ts.transpile(helper.replace('export ', ''), { target: ts.ScriptTarget.ES2020 })
function styleFor(platform, availability, type = 'place') {
  const now = new Date('2026-10-31T20:00:00Z')
  const spot = { type, branches: [{ id: 'branch' }] }
  const getStyle = new Function('Platform', 'getDiscoveryStatus', `${js}; return getFeedPlaceGrayscaleStyle`)(
    { OS: platform }, (receivedSpot, receivedNow) => {
      assert.equal(receivedSpot, spot)
      assert.equal(receivedNow, now)
      return { availability }
    },
  )
  return getStyle(spot, now)
}

test('closed and opens-soon place images share grayscale; open and unknown stay colored', () => {
  for (const status of [1, 3]) assert.deepEqual(styleFor('web', status), { filter: 'grayscale(1)' })
  for (const status of [0, 2]) assert.equal(styleFor('web', status), undefined)
})

test('preserves event exemptions and existing native behavior', () => {
  assert.equal(styleFor('web', 3, 'event'), undefined)
  for (const platform of ['ios', 'android']) assert.equal(styleFor(platform, 3), undefined)
})

test('cover and both logo card renderers use the same predicate and time', () => {
  assert.match(source, /imageStyle=\{\[imageStyle, getFeedPlaceGrayscaleStyle\(spot, now\)\]\}/)
  for (const file of ['discovery-place-card.tsx', 'explore-grid-card.tsx']) {
    const card = readFileSync(new URL(`../components/${file}`, import.meta.url), 'utf8')
    assert.match(card, /<FeedPlacePhoto spot=\{spot\} now=\{now\}/)
    assert.match(card, /style=\{\[s.logoImage, getFeedPlaceGrayscaleStyle\(spot, now\)\]\}/)
  }
})
