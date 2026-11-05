import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getPlaceHeroScrollMetrics, PLACE_HERO_HEIGHT, PLACE_HERO_SCROLL_START } from '../lib/place-hero-scroll.mjs'

test('keeps the default maximum through the initial scroll allowance and overscroll', () => {
  for (const y of [-100, 0, 16, PLACE_HERO_SCROLL_START]) {
    assert.equal(getPlaceHeroScrollMetrics(y).height, PLACE_HERO_HEIGHT)
  }
})

test('tracks every position identically in both directions without history or snapping', () => {
  const positions = [32, 33, 64, 128, 200, 300, 338]
  const descending = positions.map(y => getPlaceHeroScrollMetrics(y).height)
  assert.deepEqual([...positions].reverse().map(y => getPlaceHeroScrollMetrics(y).height), descending.reverse())
  assert.equal(getPlaceHeroScrollMetrics(132).height, 306)
  assert.equal(getPlaceHeroScrollMetrics(132.5).height, 305.5)
})

test('clamps the minimum, including the device safe area, for arbitrarily long scrolls', () => {
  for (const inset of [0, 20, 59]) {
    const { distance, minHeight } = getPlaceHeroScrollMetrics(0, inset)
    for (const y of [PLACE_HERO_SCROLL_START + distance, 1000, 100000]) {
      assert.equal(getPlaceHeroScrollMetrics(y, inset).height, minHeight)
    }
    assert.equal(minHeight, 100 + inset)
  }
})

test('expands one persistent cover surface without crossfading a second image', () => {
  const source = readFileSync(new URL('../app/spot/[id].tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /heroGalleryOpacity|heroImageOpacity|styles\.heroBaseImage/)
  const media = source.slice(source.indexOf('testID="place-detail-hero-media"'), source.indexOf('<View pointerEvents="box-none" style={styles.heroChrome}>'))
  assert.match(media, /height: heroFootprintHeight/)
  assert.match(media, /galleryImages\.map/)
  assert.match(media, /imageStyle={styles\.heroImage}/)
  assert.match(source, /heroImage: \{\s+resizeMode: 'cover'/)
  assert.match(source, /const heroFootprintHeight = Animated\.add\(baseHeroHeightValue, sheetTranslateY\)/)
})

test('web sticky footprint does not add an opaque hit-testing wrapper', () => {
  const source = readFileSync(new URL('../app/spot/[id].tsx', import.meta.url), 'utf8')
  assert.match(source, /stickyHeaderIndices=\{Platform\.OS === 'web' \? undefined : \[0\]\}/)
  assert.match(source, /pointerEvents="box-none"\s+style=\{\[\s+\{ height: heroFootprintHeight \},\s+Platform\.OS === 'web' \? \(\{ position: 'sticky', top: 0, zIndex: 10 \}/)
})
