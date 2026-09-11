import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { accountUi as ui } from '@/lib/account-ui';

export function NewPlaceBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityLabel="Lugar nuevo" style={[s.badge, style]}>
      <Text style={s.label}>Nuevo</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: '#fee8ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: ui.accent,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
  },
});
