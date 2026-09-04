import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useUserPreferences } from '@/lib/user-preferences';
import { accountUi as ui } from '@/lib/account-ui';

function NotificationToggle({ value, label, onChange }: { value: boolean; label: string; onChange: () => void }) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => { if (active) setReducedMotion(enabled); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: value ? 1 : 0, duration: reducedMotion ? 0 : 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [value, reducedMotion, progress]);
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={onChange} style={{ width: 44, height: 44, flexShrink: 0, justifyContent: 'center' }}>
    <View pointerEvents="none" style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: '#d6d6dc', overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 12, backgroundColor: ui.accent, opacity: progress }} />
      <Animated.View style={{ position: 'absolute', left: 3, top: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: ui.surface, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }} />
    </View>
  </Pressable>;
}

const faqs = [
  ['¿Cómo encuentro un plan?', 'Busca por nombre, categoría o zona en Explore. En el mapa puedes acercarte a una zona y consultar las sedes.'],
  ['¿Cómo guardo un lugar?', 'Toca el bookmark de una tarjeta. Tus lugares guardados aparecen en Mi cuenta.'],
  ['¿Por qué no aparece mi ubicación?', 'Revisa el permiso de ubicación del navegador y del dispositivo. Puedes seguir explorando sin compartir tu ubicación.'],
  ['¿Los horarios y precios son definitivos?', 'Son orientativos y pueden cambiar. Confirma con el lugar antes de desplazarte.'],
  ['¿Cómo sugiero un lugar o reporto un problema?', 'En la navegación de Explore encontrarás accesos para sugerir lugares y dejar feedback.'],
];
export function SettingsControls({ title }: { title: string }) {
  const { preferences, updatePreferences } = useUserPreferences();
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState('');
  const save = (patch: Parameters<typeof updatePreferences>[0]) => { setError(''); void updatePreferences(patch).catch(() => setError('No pudimos guardar la preferencia. Inténtalo de nuevo.')); };
  const text = { fontSize: 14, lineHeight: 21, color: ui.text };
  return <View style={{ gap: title === 'Notificaciones' ? 0 : 18 }}>
    {title === 'Notificaciones' && <>{([
      ['newPlace', 'Nuevos lugares'], ['newBranch', 'Nuevas sedes'], ['updatedPlace', 'Actualizaciones de lugares'], ['newReview', 'Nuevas reseñas'],
    ] as const).map(([key, label], index) => <View key={key}>
      {index > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#d6d6dc', marginHorizontal: 18 }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, minHeight: 58, paddingHorizontal: 18, paddingVertical: 7 }}>
      <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '400', color: ui.text, flex: 1 }}>{label}</Text>
      <NotificationToggle label={label} value={preferences[key]} onChange={() => save({ [key]: !preferences[key] })} />
      </View>
    </View>)}</>}
    {title === 'Rango de búsqueda' && <><Text style={text}>Distancia para sugerir lugares cercanos en Explore. Se aplica cuando tu ubicación está disponible.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[2, 5, 10, 25, 50].map(radius => <Pressable key={radius} accessibilityRole="radio" accessibilityState={{ checked: radius === preferences.radius }} onPress={() => save({ radius })} style={{ padding: 12, borderRadius: 20, backgroundColor: radius === preferences.radius ? ui.accentSoft : ui.surfaceMuted }}><Text style={text}>{radius} km</Text></Pressable>)}</View></>}
    {title === 'Apariencia' && <><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={text}>Vista previa oscura</Text><Switch accessibilityLabel="Vista previa oscura" value={preferences.dark} onValueChange={dark => save({ dark })} /></View><View style={{ backgroundColor: preferences.dark ? '#202024' : '#f5f5f7', padding: 24, borderRadius: 20 }}><Text style={{ color: preferences.dark ? '#fff' : ui.text, fontSize: 18 }}>Spots</Text><Text style={{ color: preferences.dark ? '#c8c8cf' : ui.textSecondary, marginTop: 8 }}>Un lugar para tu próximo plan</Text></View><Text style={text}>Vista previa del tema. La aplicación completa todavía utiliza el modo claro.</Text></>}
    {title === 'Ayuda y soporte' && faqs.map(([question, answer], index) => <View key={question}><Pressable accessibilityRole="button" accessibilityState={{ expanded: open === index }} onPress={() => setOpen(open === index ? null : index)} style={{ paddingVertical: 10 }}><Text style={[text, { fontWeight: '600' }]}>{question} {open === index ? '−' : '+'}</Text></Pressable>{open === index && <Text style={text}>{answer}</Text>}</View>)}
    {!!error && <Text accessibilityLiveRegion="polite" style={text}>{error}</Text>}
  </View>;
}
