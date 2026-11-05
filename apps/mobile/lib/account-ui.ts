import { Platform } from 'react-native';

export const lightAccountUi = {
  bg: '#f5f5f7',
  surface: '#ffffff',
  surfaceMuted: '#ededf0',
  text: '#141417',
  textSecondary: '#5f5f67',
  textTertiary: '#8b8b94',
  border: '#d6d6dc',
  accent: '#EF3857',
  accentSoft: 'rgba(239,56,87,0.12)',
  scrim: 'rgba(15,8,13,0.52)',
  caption: 'rgba(255,255,255,0.94)',
};

export const darkAccountUi = {
  bg: '#111114', surface: '#1c1c20', surfaceMuted: '#29292f', text: '#f7f5f7',
  textSecondary: '#bbb7bf', textTertiary: '#85818a', border: '#39383f',
  accent: '#ff4f70', accentSoft: 'rgba(255,79,112,0.18)', scrim: 'rgba(0,0,0,0.68)',
  caption: 'rgba(28,28,32,0.94)',
};

function token(name: string, fallback: string) {
  return Platform.OS === 'web' ? `var(--spots-${name}, ${fallback})` : fallback;
}

// Live web tokens let StyleSheets and portal-based modals update together.
export const accountUi = {
  bg: token('bg', lightAccountUi.bg), surface: token('surface', lightAccountUi.surface),
  surfaceMuted: token('surface-muted', lightAccountUi.surfaceMuted), text: token('text', lightAccountUi.text),
  textSecondary: token('text-secondary', lightAccountUi.textSecondary), textTertiary: token('text-tertiary', lightAccountUi.textTertiary),
  border: token('border', lightAccountUi.border), accent: token('accent', lightAccountUi.accent),
  accentSoft: token('accent-soft', lightAccountUi.accentSoft), scrim: token('scrim', lightAccountUi.scrim),
  caption: token('caption', lightAccountUi.caption),
};
