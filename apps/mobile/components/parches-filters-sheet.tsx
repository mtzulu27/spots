import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton, AppPrimaryButton } from '@/components/app-ui';
import { FilterSection, FilterDivider, filterSheetStyles as styles } from '@/components/filters-sheet';

type Criteria = { category: string; zone: string; budget: string };
type Props = {
  draft: Criteria;
  onChange: (value: Criteria) => void;
  categories: string[];
  zones: string[];
  budgets: readonly (readonly [string, string])[];
  resultsCount: number;
  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
};

export function ParchesFiltersSheet({ draft, onChange, categories, zones, budgets, resultsCount, onClear, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const height = Math.round(Dimensions.get('window').height * 0.88);
  const translateY = useRef(new Animated.Value(height)).current;
  const [expanded, setExpanded] = useState({ category: true, budget: true, zone: true });
  useEffect(() => {
    const animation = Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [translateY]);
  const dismiss = (after = onClose) => Animated.timing(translateY, { toValue: height, duration: 220, useNativeDriver: true }).start(({ finished }) => { if (finished) after(); });
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
    onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 100 || gesture.vy > 0.8) dismiss();
      else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    },
  });
  const groups: { key: keyof Criteria; title: string; options: readonly (readonly [string, string])[]; empty: string }[] = [
    { key: 'category', title: 'Categoría del parche', options: [['', 'Todas'], ...categories.map(value => [value, value] as const)], empty: '' },
    { key: 'budget', title: 'Presupuesto por entrada', options: budgets, empty: 'all' },
    { key: 'zone', title: 'Ubicación', options: [['', 'Toda la ciudad'], ...zones.map(value => [value, value] as const)], empty: '' },
  ];
  return <Modal transparent visible animationType="none" onRequestClose={() => dismiss()}>
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.scrim, { opacity: translateY.interpolate({ inputRange: [0, height], outputRange: [0.35, 0], extrapolate: 'clamp' }) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar filtros" style={StyleSheet.absoluteFill} onPress={() => dismiss()} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handleArea} {...pan.panHandlers}><View style={styles.handle} /></View>
        <View style={styles.header}><Text style={styles.headerTitle}>Filtros</Text><AppIconButton name="close" tone="light" accessibilityLabel="Cerrar filtros" onPress={() => dismiss()} /></View>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: 132 + insets.bottom, flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
          {groups.map(({ key, title, options, empty }, index) => <View key={key} style={{ gap: 12 }}>
            {index > 0 && <FilterDivider />}
            <FilterSection title={title} expanded={expanded[key]} onToggle={() => setExpanded(value => ({ ...value, [key]: !value[key] }))} activeCount={Number(draft[key] !== empty)} actionLabel={draft[key] !== empty ? 'Quitar' : undefined} onActionPress={() => onChange({ ...draft, [key]: empty })}>
              <View style={styles.presetGrid}>{options.map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: draft[key] === value }} onPress={() => onChange({ ...draft, [key]: value })} style={[styles.filterChip, draft[key] === value && styles.filterChipActive]}><Text style={[styles.filterChipText, draft[key] === value && styles.filterChipTextActive]}>{label}</Text></Pressable>)}</View>
              {key !== 'budget' && options.length === 1 && <Text style={styles.inlineHint}>{key === 'category' ? 'Las categorías aparecerán cuando haya parches disponibles.' : 'Las zonas aparecerán cuando haya parches disponibles.'}</Text>}
            </FilterSection>
          </View>)}
        </ScrollView>
        <View style={[styles.bottomBar, { paddingBottom: 20 + insets.bottom }]}>
          <Pressable accessibilityRole="button" onPress={onClear} style={styles.clearButton}><Text style={styles.clearButtonText}>Limpiar</Text></Pressable>
          <View style={styles.applyWrap}><AppPrimaryButton label={`Mostrar ${resultsCount} parche${resultsCount === 1 ? '' : 's'}`} onPress={() => dismiss(onApply)} /></View>
        </View>
      </Animated.View>
    </View>
  </Modal>;
}
