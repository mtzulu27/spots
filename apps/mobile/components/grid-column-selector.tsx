import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { accountUi as ui } from '@/lib/account-ui';

export function GridColumnSelector({ columns, onChange }: {
  columns: number;
  onChange: (columns: 1 | 2) => void;
}) {
  return <View style={s.columnSelector}>{([1, 2] as const).map(count => (
    <Pressable key={count} accessibilityRole="button" accessibilityLabel={`${count} ${count === 1 ? 'columna' : 'columnas'}`} accessibilityState={{ selected: columns === count }} onPress={() => onChange(count)} style={[s.columnButton, columns === count && s.columnActive]}>
      <Ionicons name={count === 1 ? 'reorder-two-outline' : 'grid-outline'} size={18} color={columns === count ? ui.text : ui.textSecondary} />
    </Pressable>
  ))}</View>;
}

const s = StyleSheet.create({
  columnSelector: { flexDirection: 'row', gap: 4, backgroundColor: ui.surfaceMuted, padding: 4, borderRadius: 14 },
  columnButton: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  columnActive: { backgroundColor: ui.surface },
});
