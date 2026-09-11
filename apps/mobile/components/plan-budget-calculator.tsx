import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accountUi as ui } from '@/lib/account-ui';
import type { Spot } from '@/lib/mock-spots';
import { scenarioBudget, scenarioNames } from '@/lib/budget-scenarios';
import { estimateMenuTotal, summarizePrices, type PriceSummary } from '@/lib/menu-pricing';

type CounterKey = 'mains' | 'starters' | 'desserts' | 'drinks' | 'cover' | 'tickets' | 'extras';
type Counts = Record<CounterKey, number>;

const initialCounts: Counts = { mains: 0, starters: 0, desserts: 0, drinks: 0, cover: 0, tickets: 0, extras: 0 };

function money(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

function categoryMode(spot: Spot) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const category = normalize(spot.category);
  if (/comida|restaurante|cafe|panaderia|heladeria/.test(category)) return 'food' as const;
  if (/tomar algo|vida nocturna|bar|discoteca|club/.test(category)) return 'nightlife' as const;

  const metadata = [...spot.subcategories, ...spot.tags].join(' ');
  const value = normalize(metadata);
  if (/restaurante|comida|cafe|panaderia|heladeria|brunch|cocina/.test(value)) return 'food' as const;
  if (/bar|discoteca|club|rumba|coctel|cerveza|vida nocturna/.test(value)) return 'nightlife' as const;
  return 'general' as const;
}

function Counter({ label, value, summary, detail, minimum = 0, onChange }: { label: string; value: number; summary: PriceSummary | null; detail?: string; minimum?: number; onChange: (value: number) => void }) {
  return <View style={s.counterRow}>
    <View style={s.counterCopy}>
      <Text style={s.counterLabel}>{label}</Text>
      {detail ? <Text style={s.priceDetail}>{detail}</Text> : summary ? <View style={s.priceDetails}>
        <Text style={s.priceDetail}>Mín. {money(summary.minimum)}</Text>
        <Text style={s.priceDetail}>Máx. {money(summary.maximum)}</Text>
        <Text style={s.priceDetail}>Prom. {money(summary.average)}</Text>
      </View> : <Text style={s.priceDetail}>Precios por confirmar</Text>}
    </View>
    <View style={s.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${label}`} disabled={value <= minimum} onPress={() => onChange(Math.max(minimum, value - 1))} style={[s.stepButton, value <= minimum && s.stepDisabled]}>
        <Ionicons name="remove" size={18} color={ui.text} />
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={s.stepValue}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Añadir ${label}`} onPress={() => onChange(Math.min(30, value + 1))} style={s.stepButton}>
        <Ionicons name="add" size={18} color={ui.text} />
      </Pressable>
    </View>
  </View>;
}

export function PlanBudgetCalculator({ spot, visible, onClose }: { spot: Spot; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const [counts, setCounts] = useState(initialCounts);
  const [people, setPeople] = useState(2);
  const [scenario, setScenario] = useState(0);
  const pilot = spot.budgetPilot === true;
  const definition = spot.budgetScenarios?.[scenario];
  const plan = pilot ? scenarioBudget(spot.menuItems ?? [], people, definition) : null;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(420)).current;
  const mode = categoryMode(spot);

  useEffect(() => setCounts(initialCounts), [spot.id]);
  useEffect(() => { setPeople(2); setScenario(0); }, [spot.id]);

  useEffect(() => {
    if (visible) {
      setScenario(0);
      setMounted(true);
      sheetTranslateY.setValue(420);
      Animated.parallel([
        Animated.timing(scrimOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, damping: 22, stiffness: 210, mass: 0.9, overshootClamping: true, useNativeDriver: true }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(scrimOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 420, duration: 260, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [scrimOpacity, sheetTranslateY, visible]);

  const dragResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => sheetTranslateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 110 || gesture.vy > 0.8) {
        onClose();
        return;
      }
      Animated.spring(sheetTranslateY, { toValue: 0, damping: 20, stiffness: 230, mass: 0.85, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(sheetTranslateY, { toValue: 0, damping: 20, stiffness: 230, mass: 0.85, useNativeDriver: true }).start();
    },
  }), [onClose, sheetTranslateY]);

  const rows = mode === 'food'
    ? [
        ['mains', 'Platos fuertes'],
        ['drinks', 'Bebidas'],
        ['starters', 'Entradas'],
        ['desserts', 'Postres'],
      ] as const
    : mode === 'nightlife'
      ? [
          ['cover', 'Covers'],
          ['drinks', 'Bebidas'],
          ['starters', 'Comida para compartir'],
        ] as const
      : [
          ['tickets', 'Entradas'],
          ['drinks', 'Consumos'],
          ['extras', 'Extras'],
        ] as const;

  const summaries = useMemo(() => Object.fromEntries(
    rows.map(([key]) => [key, summarizePrices(spot.menuItems ?? [], key)]),
  ) as Partial<Record<CounterKey, PriceSummary | null>>, [rows, spot.menuItems]);

  const realProductsCount = useMemo(() => new Set(
    (spot.menuItems ?? []).filter(item => item.calculationIncluded !== false).map((item) => `${item.category}:${item.name}:${item.price}`),
  ).size, [spot.menuItems]);

  const estimate = useMemo(() => estimateMenuTotal(rows.map(([key]) => key), counts, summaries), [counts, rows, summaries]);

  const update = (key: CounterKey, value: number) => setCounts(current => ({ ...current, [key]: value }));
  const placeName = spot.brandName || spot.name;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Animated.View pointerEvents="none" style={[s.scrim, { opacity: scrimOpacity }]} />
        <Pressable accessibilityLabel="Cerrar calculador" style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={s.dragArea} {...dragResponder.panHandlers}>
            <View style={s.handle} />
            <View style={s.header}>
            <View style={s.headerCopy}>
              <Text style={s.title}>Presupuesto del plan</Text>
              <Text numberOfLines={1} style={s.subtitle}>{placeName}</Text>
            </View>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            {pilot ? <>
              <Counter label="Personas" value={people} summary={null} detail=" " minimum={1} onChange={setPeople} />
              <View style={s.priceDetails}>
                {scenarioNames.map((label, index) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: scenario === index }} onPress={() => setScenario(index)} style={[s.scenario, scenario === index && s.scenarioSelected]}><Text style={s.counterLabel}>{label}</Text></Pressable>)}
              </View>
              <View style={s.estimateCard}>
                <Text style={s.counterLabel}>Total estimado del plan</Text>
                <Text style={[s.estimateValue, s.rangeValue]}>{plan?.total == null ? 'Por confirmar' : money(plan.total)}</Text>
                <Text style={s.counterLabel}>{plan?.perPerson == null ? 'Faltan precios de la carta' : `${money(plan.perPerson)} por persona`}</Text>
              </View>
              <Text style={s.disclaimer}>{definition ? `Referencia para ${people} ${people === 1 ? 'persona' : 'personas'} · ${scenarioNames[scenario]} (${definition.concept}): ${plan?.lines.map(line => `${line.quantity} × ${line.name}`).join(', ')}. Sin propina. ${definition.note} ` : 'Este escenario está por confirmar: falta carta vigente o precios suficientes de esta sede. No usamos precios de otra sede ni promedios anteriores. '}El restaurante puede actualizar los precios.</Text>
              {mode === 'nightlife' ? <Text style={s.coverDisclaimer}>El cover o la entrada no está incluido en este cálculo y puede variar según la fecha o el evento.</Text> : null}
            </> : <>
            {rows.map(([key, label]) => <Counter key={key} label={label} value={counts[key]} summary={summaries[key] ?? null} onChange={value => update(key, value)} />)}
            <View style={s.estimateCard}>
              <View style={s.estimateColumn}>
                <Text style={s.estimateValue}>{estimate === null ? 'Por confirmar' : money(estimate)}</Text>
              </View>
            </View>
            {spot.budgetBasis ? <Text style={s.disclaimer}>{spot.budgetBasis}</Text> : null}
            <Text style={s.disclaimer}>{realProductsCount > 0 ? `Promedios de ${realProductsCount} opciones comparables de la carta de esta sede. ` : 'No hay precios por rubro verificados para esta sede. '}{spot.menuCalculationNote ? `${spot.menuCalculationNote} ` : ''}{estimate === null ? 'Faltan precios para uno o más rubros seleccionados. ' : ''}El valor final puede cambiar según servicio, promociones y precios del día.</Text>
            {mode === 'nightlife' ? <Text style={s.coverDisclaimer}>El cover o la entrada no está incluido en este cálculo y puede variar según la fecha o el evento.</Text> : null}
            </>}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scenario: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: ui.border, backgroundColor: ui.surface },
  scenarioSelected: { borderColor: ui.text, backgroundColor: ui.surfaceMuted },
  rangeValue: { fontSize: 26, lineHeight: 34 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,14,17,0.48)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: ui.surface },
  dragArea: { paddingTop: 10 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: ui.border, alignSelf: 'center', marginBottom: 12 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: ui.text, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  subtitle: { color: ui.textSecondary, fontSize: 13, lineHeight: 18 },
  content: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  counterRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterCopy: { flex: 1, minWidth: 0, gap: 2 },
  counterLabel: { color: ui.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  priceDetail: { color: ui.textSecondary, fontSize: 11, lineHeight: 16 },
  priceDetails: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: ui.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.35 },
  stepValue: { width: 24, color: ui.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  estimateCard: { marginTop: 8, minHeight: 112, borderRadius: 20, backgroundColor: ui.surfaceMuted, paddingHorizontal: 20, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  estimateColumn: { width: '100%', minWidth: 0, alignItems: 'center', gap: 6 },
  estimateValue: { color: ui.text, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8, textAlign: 'center' },
  disclaimer: { color: ui.textSecondary, fontSize: 11, lineHeight: 17 },
  coverDisclaimer: { color: ui.textSecondary, fontSize: 11, lineHeight: 17, fontStyle: 'italic' },
});
