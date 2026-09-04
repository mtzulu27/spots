import { useState } from 'react';
import { SettingsControls } from '@/components/settings-controls';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAvatar, AppIconButton } from '@/components/app-ui';
import { accountUi as ui } from '@/lib/account-ui';
import { useAuthStore } from '@/lib/auth-store';
import { useLocationStore } from '@/lib/location-store';
import { useSpotsStore } from '@/lib/spots-store';
import { PlaceNotifications } from '@/components/place-notifications';
import { aggregatePlaceSpotsFromList } from '@/lib/mock-spots';

type Row = { title: string; icon: keyof typeof Ionicons.glyphMap; action: () => void };

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { avatarUrl, fullName, user, signOut } = useAuthStore();
  const { requestLocation, userLocation, loading, error } = useLocationStore();
  const { spots } = useSpotsStore();
  const [notifications, setNotifications] = useState(false);
  const [detail, setDetail] = useState<{ title: string; text: string } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const back = () => detail ? setDetail(null) : router.canGoBack() ? router.back() : router.replace('/account');
  const info = (title: string, text: string) => () => setDetail({ title, text });
  const groups: { title: string; rows: Row[] }[] = [
    { title: 'Tu experiencia en Spots', rows: [
      { title: 'Rango de búsqueda', icon: 'options-outline', action: info('Rango de búsqueda', '') },
      { title: 'Tu ubicación', icon: 'location-outline', action: info('Tu ubicación', 'Comparte tu ubicación para encontrar lugares cercanos. También puedes explorar y elegir una zona sin compartirla.') },
    ] },
    { title: 'Ajustes de la aplicación', rows: [
      { title: 'Notificaciones', icon: 'notifications-outline', action: info('Notificaciones', '') },
      { title: 'Apariencia', icon: 'sunny-outline', action: info('Apariencia', '') },
      { title: 'Ayuda y soporte', icon: 'help-circle-outline', action: info('Ayuda y soporte', '') },
      { title: 'Datos y privacidad', icon: 'lock-closed-outline', action: info('Datos y privacidad', 'Puedes administrar el permiso de ubicación en los ajustes de tu navegador o dispositivo. Las herramientas para exportar o eliminar tus datos todavía no están disponibles en esta versión.') },
      { title: 'Acerca de Spots', icon: 'information-circle-outline', action: info('Acerca de Spots', 'Descubre lugares y resuelve qué hacer en Cali. Explora por categoría, presupuesto o zona, consulta sedes y horarios, y guarda los lugares que quieras visitar.') },
      { title: 'Información legal', icon: 'shield-checkmark-outline', action: info('Información legal', 'Borrador de contenido, no condiciones legales vigentes. Spots te ayuda a descubrir lugares; horarios, precios y disponibilidad pueden cambiar. Confirma los detalles directamente con el establecimiento. Los términos y la política de privacidad definitivos están pendientes de revisión y publicación.') },
    ] },
  ];
  return <View style={s.screen}>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}>
      <AppIconButton name="arrow-back" accessibilityLabel="Volver" tone="light" size={44} onPress={back} />
      <Text accessibilityRole="header" style={s.title}>{detail?.title ?? 'Ajustes'}</Text>
      <View style={{ width: 44 }} />
    </View>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}>
      {detail ? <View style={detail.title === 'Notificaciones' ? s.group : s.detail}>
        {!!detail.text && <Text style={s.body}>{detail.text}</Text>}
        <SettingsControls title={detail.title} />
        {detail.title === 'Tu ubicación' && <>
          <Pressable accessibilityRole="button" disabled={loading} onPress={requestLocation} style={s.action}><Text style={s.label}>{loading ? 'Buscando ubicación…' : 'Usar mi ubicación'}</Text></Pressable>
          <Text accessibilityLiveRegion="polite" style={s.body}>{userLocation ? 'Ubicación disponible.' : error ? 'No pudimos acceder. Revisa el permiso en tu navegador.' : 'No has compartido una ubicación disponible.'}</Text>
        </>}
      </View> : <>
        <Pressable accessibilityRole="button" accessibilityLabel="Editar mi perfil" onPress={() => router.push('/edit-profile')} style={s.profile}>
          <AppAvatar uri={avatarUrl} size={42} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text numberOfLines={1} style={[s.label, { fontSize: 19, fontWeight: '600' }]}>{fullName.trim() || user?.user_metadata?.name || 'Mateo'}</Text><Text numberOfLines={1} style={s.email}>{user?.email || 'Editar mi perfil'}</Text></View>
          <Ionicons name="chevron-forward" size={19} color={ui.textTertiary} />
        </Pressable>
        {groups.map(group => <View key={group.title} style={s.section}>
          <Text accessibilityRole="header" style={s.sectionTitle}>{group.title}</Text>
          <View style={s.group}>{group.rows.map((row, index) => <View key={row.title}>
            <Pressable accessibilityRole="button" accessibilityLabel={row.title} onPress={row.action} style={({ pressed }) => [s.row, pressed && { backgroundColor: ui.surfaceMuted }]}>
              <Ionicons name={row.icon} size={23} color={ui.text} />
              <Text style={[s.label, { flex: 1 }]}>{row.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={ui.textTertiary} />
            </Pressable>
            {index < group.rows.length - 1 && <View style={s.divider} />}
          </View>)}</View>
        </View>)}
        <Pressable accessibilityRole="button" disabled={signingOut} style={s.signOut} onPress={async () => {
          setSigningOut(true);
          try { const failure = await signOut(); if (failure) setDetail({ title: 'Cerrar sesión', text: 'No se pudo cerrar la sesión. Inténtalo de nuevo.' }); else router.replace('/login'); }
          finally { setSigningOut(false); }
        }}><Ionicons name="log-out-outline" size={22} color={ui.accent} /><Text style={[s.label, { color: ui.accent }]}>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</Text></Pressable>
      </>}
    </ScrollView>
    <PlaceNotifications visible={notifications} spots={aggregatePlaceSpotsFromList(spots.filter(spot => spot.type === 'place'))} onClose={() => setNotifications(false)} onPlace={spot => { setNotifications(false); router.push(`/spot/${spot.id}`); }} />
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: ui.text },
  content: { paddingHorizontal: 16, paddingTop: 24, gap: 26 },
  profile: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12, backgroundColor: ui.surface, borderRadius: 26 },
  label: { fontSize: 16, color: ui.text, fontWeight: '400' },
  email: { fontSize: 12, lineHeight: 17, color: ui.accent },
  section: { gap: 12 },
  sectionTitle: { paddingHorizontal: 16, fontSize: 14, fontWeight: '500', color: ui.textSecondary },
  group: { borderRadius: 26, overflow: 'hidden', backgroundColor: ui.surface },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
  divider: { marginLeft: 55, marginRight: 18, height: StyleSheet.hairlineWidth, backgroundColor: '#d6d6dc' },
  signOut: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: ui.surface, borderRadius: 24, padding: 18 },
  detail: { backgroundColor: ui.surface, borderRadius: 24, padding: 20, gap: 20 },
  body: { fontSize: 14, lineHeight: 22, color: ui.textSecondary },
  action: { backgroundColor: ui.accentSoft, padding: 14, borderRadius: 18, alignItems: 'center' },
});
