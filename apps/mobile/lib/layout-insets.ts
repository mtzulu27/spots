import type { EdgeInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export function topContentInset(insets: Pick<EdgeInsets, 'top'>, extra = 32) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (!standalone) return extra;
  }
  return insets.top + extra;
}
