export const PLACE_HERO_HEIGHT = 406
export const PLACE_HERO_SCROLL_START = 32

export function getPlaceHeroScrollMetrics(scrollY, safeAreaTop = 0) {
  const minHeight = Math.min(PLACE_HERO_HEIGHT, Math.max(0, safeAreaTop) + 100)
  const distance = PLACE_HERO_HEIGHT - minHeight
  const collapse = Math.min(distance, Math.max(0, scrollY - PLACE_HERO_SCROLL_START))
  return { minHeight, distance, collapse, height: PLACE_HERO_HEIGHT - collapse }
}
