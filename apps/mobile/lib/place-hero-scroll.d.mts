export const PLACE_HERO_HEIGHT: number
export const PLACE_HERO_SCROLL_START: number
export function getPlaceHeroScrollMetrics(scrollY: number, safeAreaTop?: number): {
  minHeight: number
  distance: number
  collapse: number
  height: number
}
