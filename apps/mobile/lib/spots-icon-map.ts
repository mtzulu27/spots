import type { SpotsGlyph } from './spots-icon-paths';

// Keep existing screen names stable while sharing the approved SVG geometry.
export const spotsIconMap = {
  'home-outline': 'explore', home: 'explore',
  'map-outline': 'map', map: 'map',
  'ticket-outline': 'parches',
  'chatbox-ellipses-outline': 'contribute', 'chatbubble-ellipses-outline': 'contribute',
  'person-outline': 'account',
  search: 'search', 'search-outline': 'search',
  'options-outline': 'filters',
  location: 'location', 'location-outline': 'location',
  'board-pin': 'board-pin',
  'locate-outline': 'locate',
  time: 'clock', 'time-outline': 'clock',
  'calendar-outline': 'calendar',
  'wallet-outline': 'wallet', 'cash-outline': 'cash', 'calculator-outline': 'calculator',
  people: 'people', 'people-outline': 'people',
  'sparkles-outline': 'sparkles',
  'restaurant-outline': 'food', 'color-palette-outline': 'art', 'wine-outline': 'wine',
  'disc-outline': 'nightlife', 'barbell-outline': 'wellness', 'leaf-outline': 'nature',
  'paw-outline': 'pets', 'film-outline': 'film', 'pricetag-outline': 'tag',
  heart: 'heart', 'heart-outline': 'heart', 'bookmark-outline': 'bookmark',
  'checkmark-circle': 'visited', 'checkmark-circle-outline': 'visited',
  'star-outline': 'star', 'share-social-outline': 'share', 'share-social': 'share', 'share-outline': 'share', share: 'share',
  'copy-outline': 'copy', 'open-outline': 'external', open: 'external', link: 'link',
  add: 'plus', 'add-circle-outline': 'plus-circle', remove: 'minus', close: 'close',
  checkmark: 'check', 'checkmark-outline': 'check',
  'arrow-back': 'back', 'arrow-forward': 'forward',
  'chevron-back': 'chevron-left', 'chevron-forward': 'chevron-right',
  'chevron-up': 'chevron-up', 'chevron-down': 'chevron-down',
  grid: 'grid', 'grid-outline': 'grid', 'reorder-two-outline': 'list', list: 'list',
  'ellipsis-vertical': 'more', 'expand-outline': 'expand', 'contract-outline': 'contract',
  'refresh-outline': 'refresh', 'cloud-offline-outline': 'offline', 'create-outline': 'edit',
  'mail-outline': 'mail', 'lock-closed-outline': 'lock',
  'eye-outline': 'eye', 'eye-off-outline': 'eye-off',
  notifications: 'bell', 'notifications-outline': 'bell',
  'sunny-outline': 'sun', 'help-circle-outline': 'help', 'information-circle-outline': 'info',
  'shield-checkmark-outline': 'shield', 'log-out-outline': 'logout',
  'call-outline': 'phone', 'globe-outline': 'web', 'book-outline': 'menu',
} as const satisfies Record<string, SpotsGlyph>;

export function resolveSpotsGlyph(name: string): SpotsGlyph | undefined {
  return spotsIconMap[name as keyof typeof spotsIconMap];
}
