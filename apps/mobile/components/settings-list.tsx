import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { accountUi as ui } from '@/lib/account-ui';

export const settingsListStyles = StyleSheet.create({
  group: { borderRadius: 26, overflow: 'hidden', backgroundColor: ui.surface },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
  label: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '400', color: ui.text },
  divider: { marginHorizontal: 18, height: StyleSheet.hairlineWidth, backgroundColor: ui.border },
  insetDivider: { marginLeft: 55, marginRight: 18, height: StyleSheet.hairlineWidth, backgroundColor: ui.border },
  detail: { paddingHorizontal: 18, paddingVertical: 14 },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '400', color: ui.textSecondary },
});

export function SettingsDivider({ inset = false }: { inset?: boolean }) {
  return <View style={inset ? settingsListStyles.insetDivider : settingsListStyles.divider} />;
}

export function SettingsListItem({
  label,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityState,
}: {
  label: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityState?: { expanded?: boolean; checked?: boolean };
}) {
  const content = <>{leading}<Text style={settingsListStyles.label}>{label}</Text>{trailing}</>;

  if (!onPress) return <View style={settingsListStyles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [settingsListStyles.row, pressed && { backgroundColor: ui.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
}
