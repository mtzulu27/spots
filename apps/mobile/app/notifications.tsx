import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton } from '@/components/app-ui';
import { SpotsIcon } from '@/components/spots-icon';
import { usePlaceUpdates } from '@/lib/place-updates-store';
import { useAuthStore } from '@/lib/auth-store';
import { useSpotsStore } from '@/lib/spots-store';
import { accountUi as ui } from '@/lib/account-ui';
import { topContentInset } from '@/lib/layout-insets';
import { notificationGroup, notificationTime } from '@/lib/notification-display.mjs';
import type { Spot } from '@/lib/mock-spots';

type NotificationMenu = { kind: 'place'; id: string; spot: Spot; top: number; right: number }
  | { kind: 'global'; top: number; right: number }
  | { kind: 'confirm' };

function Identity({ spot, unread }: { spot: Spot; unread: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [spot.logoUrl]);
  return <View style={s.identity}>
    <View style={s.logo}>{spot.logoUrl && !failed
      ? <Image source={{ uri: spot.logoUrl }} style={s.logoImage} resizeMode="contain" accessibilityLabel={`Logo de ${spot.name}`} onError={() => setFailed(true)} />
      : <SpotsIcon name="location-outline" size={22} color={ui.textSecondary} />}</View>
    {unread && <View style={s.unread} accessibilityLabel="Sin leer" />}
  </View>;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const updates = usePlaceUpdates();
  const { user } = useAuthStore();
  const { spots } = useSpotsStore();
  const [now, setNow] = useState(() => new Date());
  const [limit, setLimit] = useState(40);
  const [menu, setMenu] = useState<NotificationMenu | null>(null);
  const [undoIds, setUndoIds] = useState<string[]>([]);
  const menuTrigger = useRef<{ focus: () => void } | null>(null);
  useEffect(() => { setMenu(null); setUndoIds([]); }, [user?.id]);
  useEffect(() => {
    updates.refresh();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const events = updates.events.flatMap(event => {
    const spot = spots.find(place => place.spotId === event.spotId && (event.branchId === null || place.branchId === event.branchId));
    return spot && notificationGroup(event.occurredAt, now) ? [{ ...event, spot }] : [];
  }).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  const visibleEvents = events.slice(0, limit);
  const back = () => router.canGoBack() ? router.back() : router.replace('/explore');
  const openPlace = (id: string, spot: Spot) => {
    updates.markRead([id]);
    setMenu(null);
    router.push(`/spot/${spot.id}`);
  };
  const closeMenu = () => {
    setMenu(null);
    if (Platform.OS === 'web') menuTrigger.current?.focus();
  };
  return <View style={s.screen}>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={[s.header, { paddingTop: topContentInset(insets) }]}>
      <AppIconButton name="arrow-back" size={44} tone="light" accessibilityLabel="Volver a explorar" onPress={back} />
      <Text accessibilityRole="header" style={s.title}>Notificaciones</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Opciones de notificaciones" accessibilityState={{ expanded: menu?.kind === 'global' }} style={s.headerOptions} onPress={e => {
        const target = e.currentTarget;
        menuTrigger.current = target;
        target.measureInWindow((x, y, w, h) => setMenu({ kind: 'global', top: y + h + 8, right: Math.max(16, width - x - w) }));
      }}><SpotsIcon name="ellipsis-vertical" size={20} color={ui.text} /></Pressable>
    </View>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 32) }]} showsVerticalScrollIndicator={false}>
      {(['Hoy', 'Ayer', 'Esta semana', 'Anteriores'] as const).map(label => {
        const group = visibleEvents.filter(event => notificationGroup(event.occurredAt, now) === label);
        return group.length > 0 && <View key={label} style={s.section}>
          <Text accessibilityRole="header" style={s.sectionTitle}>{label}</Text>
          <View style={s.group}>{group.map(event => <View key={event.id}>
            <View style={s.row}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${event.spot.name}. ${event.description || ''} Ver lugar`} style={s.message} onPress={() => openPlace(event.id, event.spot)}>
                <Identity spot={event.spot} unread={!updates.readIds.has(event.id)} />
                <Text style={s.copy}><Text style={s.placeName}>{event.spot.name}.</Text>{' '}{event.description || (event.type === 'newPlace' ? 'Un nuevo lugar para tu próxima salida.' : event.type === 'newBranch' ? 'Conoce su nueva sede.' : 'Actualizamos su información.')}</Text>
              </Pressable>
              <View style={s.actions}>
                <Text style={s.time}>{notificationTime(event.occurredAt, now)}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Más opciones: ${event.spot.name}`} accessibilityState={{ expanded: menu?.kind === 'place' && menu.id === event.id }} style={s.more} onPress={e => {
                  const target = e.currentTarget;
                  menuTrigger.current = target;
                  target.measureInWindow((x, y, w, h) => setMenu({ kind: 'place', id: event.id, spot: event.spot, top: Math.max(0, Math.min(y + h, height - 140 - insets.bottom)), right: Math.max(16, width - x - w) }));
                }}><View style={s.dots}>{[0, 1, 2].map(dot => <View key={dot} style={s.dot} />)}</View></Pressable>
              </View>
            </View>
          </View>)}</View>
        </View>;
      })}
      {events.length > limit && <Pressable accessibilityRole="button" style={s.loadMore} onPress={() => setLimit(value => value + 40)}><Text style={s.secondary}>Ver más notificaciones</Text></Pressable>}
      {updates.error && <View style={s.state} accessibilityLiveRegion="polite"><Text style={s.secondary}>{updates.error}</Text><Pressable accessibilityRole="button" onPress={updates.refresh} style={s.retry}><Text style={s.placeName}>Reintentar</Text></Pressable></View>}
      {!events.length && !updates.error && <View style={s.state} accessibilityLiveRegion="polite">
        {updates.loading ? <><ActivityIndicator color={ui.accent} /><Text style={s.secondary}>Cargando novedades…</Text></> : <><SpotsIcon name="notifications-outline" size={36} color={ui.textTertiary} /><Text style={s.emptyTitle}>Estás al día</Text><Text style={[s.secondary, s.centered]}>Aquí encontrarás los nuevos lugares, sedes y novedades de Spots.</Text></>}
      </View>}
    </ScrollView>
    {undoIds.length > 0 && <View style={[s.undo, { bottom: Math.max(insets.bottom, 24) }]} accessibilityLiveRegion="polite"><Text style={s.undoText}>Notificaciones borradas</Text><Pressable accessibilityRole="button" accessibilityLabel="Deshacer borrado de notificaciones" style={s.undoButton} onPress={() => { updates.restoreDismissed(undoIds); setUndoIds([]); }}><Text style={s.undoLabel}>Deshacer</Text></Pressable></View>}
    <Modal visible={!!menu} transparent animationType="fade" onRequestClose={closeMenu}>
      <View style={[s.menuOverlay, menu?.kind === 'confirm' && s.confirmOverlay]}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar opciones" onPress={closeMenu} />
        {menu?.kind === 'global' && <View accessibilityViewIsModal style={[s.menu, s.globalMenu, { top: menu.top, right: menu.right }]}>
          <Pressable accessibilityRole="button" disabled={!updates.ready || !events.some(event => !updates.readIds.has(event.id))} accessibilityState={{ disabled: !updates.ready || !events.some(event => !updates.readIds.has(event.id)) }} style={[s.menuItem, (!updates.ready || !events.some(event => !updates.readIds.has(event.id))) && s.disabled]} onPress={() => { updates.markRead(events.map(event => event.id)); closeMenu(); }}><SpotsIcon name="checkmark" size={18} color={ui.text} /><Text style={s.menuText}>Marcar todas como leídas</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={!updates.ready || !events.length} accessibilityState={{ disabled: !updates.ready || !events.length }} style={[s.menuItem, (!updates.ready || !events.length) && s.disabled]} onPress={() => setMenu({ kind: 'confirm' })}><SpotsIcon name="close" size={18} color={ui.accent} /><Text style={[s.menuText, s.destructive]}>Borrar todas las notificaciones</Text></Pressable>
        </View>}
        {menu?.kind === 'confirm' && <View accessibilityViewIsModal style={s.confirmCard}>
          <Text accessibilityRole="header" style={s.confirmTitle}>¿Borrar todas las notificaciones?</Text>
          <Text style={s.secondary}>Se quitarán de tu lista en este dispositivo. Los lugares y las futuras notificaciones no se eliminarán.</Text>
          <View style={s.confirmActions}><Pressable accessibilityRole="button" style={s.confirmButton} onPress={closeMenu}><Text style={s.menuText}>Cancelar</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Confirmar borrar todas" style={[s.confirmButton, s.confirmDelete]} onPress={() => { setUndoIds(updates.dismissAll()); closeMenu(); }}><Text style={s.confirmDeleteLabel}>Borrar todas</Text></Pressable></View>
        </View>}
        {menu?.kind === 'place' && <View accessibilityViewIsModal style={[s.menu, { top: menu.top, right: menu.right }]}>
          <Pressable accessibilityRole="button" style={s.menuItem} onPress={() => { if (updates.readIds.has(menu.id)) updates.markUnread([menu.id]); else updates.markRead([menu.id]); closeMenu(); }}><SpotsIcon name="checkmark" size={18} color={ui.text} /><Text style={s.menuText}>{updates.readIds.has(menu.id) ? 'Marcar como no leída' : 'Marcar como leída'}</Text></Pressable>
          <Pressable accessibilityRole="button" style={s.menuItem} onPress={() => openPlace(menu.id, menu.spot)}><SpotsIcon name="location-outline" size={18} color={ui.textSecondary} /><Text style={[s.menuText, { color: ui.textSecondary }]}>Ver lugar</Text></Pressable>
        </View>}
      </View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  headerOptions: { width: 44, height: 44, borderRadius: 22, backgroundColor: ui.surface, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: ui.text },
  content: { paddingHorizontal: 16, paddingTop: 24, gap: 26 },
  section: { gap: 12 },
  sectionTitle: { paddingHorizontal: 16, fontSize: 14, lineHeight: 20, fontWeight: '500', color: ui.textSecondary },
  group: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, minHeight: 100, backgroundColor: ui.surface, borderRadius: 26 },
  message: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  identity: { width: 42, height: 42, flexShrink: 0 },
  logo: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: ui.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 42, height: 42, backgroundColor: ui.surface },
  unread: { position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: ui.surface, backgroundColor: ui.accent },
  copy: { flex: 1, minWidth: 0, color: ui.text, fontSize: 14, lineHeight: 21 },
  placeName: { color: ui.text, fontWeight: '600' },
  actions: { width: 32, alignItems: 'flex-end', flexShrink: 0 },
  time: { fontSize: 11, lineHeight: 17, color: ui.textTertiary, textAlign: 'right' },
  more: { width: 32, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: ui.textTertiary },
  state: { padding: 24, gap: 12, alignItems: 'center', backgroundColor: ui.surface, borderRadius: 26 },
  emptyTitle: { color: ui.text, fontSize: 18, fontWeight: '600' },
  secondary: { color: ui.textSecondary, fontSize: 14, lineHeight: 21 },
  centered: { textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  loadMore: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  menuOverlay: { flex: 1 },
  menu: { position: 'absolute', width: 232, borderRadius: 24, backgroundColor: ui.surface, padding: 8, shadowColor: '#141417', shadowOpacity: .12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, padding: 12, borderRadius: 16 },
  menuText: { fontSize: 13, color: ui.text },
  globalMenu: { width: 280, maxWidth: '92%' },
  disabled: { opacity: .4 },
  destructive: { color: ui.accent },
  confirmOverlay: { alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: ui.scrim },
  confirmCard: { width: '100%', maxWidth: 360, backgroundColor: ui.surface, borderRadius: 26, padding: 24, gap: 16 },
  confirmTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: ui.text },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmButton: { flex: 1, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.surfaceMuted },
  confirmDelete: { backgroundColor: ui.accent },
  confirmDeleteLabel: { fontSize: 13, fontWeight: '600', color: ui.surface },
  undo: { position: 'absolute', left: 16, right: 16, borderRadius: 24, backgroundColor: ui.text, paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  undoText: { flex: 1, color: ui.surface, fontSize: 13, lineHeight: 18 },
  undoButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  undoLabel: { color: ui.surface, fontWeight: '600', fontSize: 13 },
});
