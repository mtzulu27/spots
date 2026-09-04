import { usePlaceUpdates } from '@/lib/place-updates-store';
import { useSpotsStore } from '@/lib/spots-store';
import { useEffect } from 'react';
import { getCategoryLabel } from '@/lib/category-icons';
import { useUserPreferences } from '@/lib/user-preferences';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton } from './app-ui';
import { PlacePhoto } from './place-photo';
import { CategoryIcon } from './category-icon';
import { formatApproxBudgetPerPersonLabel } from '@/lib/explore-filters';
import { accountUi as ui } from '@/lib/account-ui';
import { getSpotFeedSubtitle, type Spot } from '@/lib/mock-spots';

const notificationStyles = {
  newPlace: { label: 'Nuevo lugar', icon: 'sparkles-outline', background: '#DDEFD8' },
  newBranch: { label: 'Nueva sede', icon: 'location-outline', background: '#D8ECFC' },
  updatedPlace: { label: 'Lugar actualizado', icon: 'refresh-outline', background: '#E4D5E8' },
  newReview: { label: 'Nueva reseña', icon: 'star-outline', background: '#FBE9AD' },
} as const;

export type PlaceNotification = {
  id: string;
  type: keyof typeof notificationStyles;
  spot: Spot;
  occurredAt: string;
  description?: string;
};

type Props = {
  visible: boolean;
  spots: Spot[];
  notifications?: PlaceNotification[];
  onClose: () => void;
  onPlace: (spot: Spot) => void;
};

export function PlaceNotifications({ visible, spots, notifications, onClose, onPlace }: Props) {
  const { preferences } = useUserPreferences();
  const insets = useSafeAreaInsets();
  const updates = usePlaceUpdates();
  const { spots: allSpots } = useSpotsStore();
  useEffect(() => { if (visible) updates.refresh(); }, [visible]);
  const events: PlaceNotification[] = notifications ?? updates.events.flatMap(event => {
    const spot = allSpots.find(place => place.spotId === event.spotId && (event.branchId === null || place.branchId === event.branchId));
    return spot ? [{ ...event, spot }] : [];
  });
  const latest = events.filter(event => preferences[event.type] && Number.isFinite(Date.parse(event.occurredAt)))
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[s.overlay, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar notificaciones" />
      <View style={s.panel} accessibilityViewIsModal>
        <View style={s.header}>
          <Text accessibilityRole="header" style={s.title}>Notificaciones</Text>
          <AppIconButton name="close" tone="light" size={36} accessibilityLabel="Cerrar notificaciones" onPress={onClose} />
        </View>
        {latest.some(event => !updates.readIds.has(event.id)) && <Pressable accessibilityRole="button" onPress={() => updates.markRead(latest.map(event => event.id))} style={{ paddingHorizontal: 20, paddingBottom: 12 }}><Text style={{ color: ui.textSecondary, fontSize: 13 }}>Marcar todas como leídas</Text></Pressable>}
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {latest.map(event => {
            const { spot } = event;
            const badge = notificationStyles[event.type];
            return <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`${badge.label}: ${spot.name}. Ver lugar`} onPress={() => { updates.markRead([event.id]); onPlace(spot); }} style={s.item}>
            <PlacePhoto uri={spot.image} style={s.photo} imageStyle={{ borderRadius: 12 }}>
              <View style={s.categoryBadge} accessible accessibilityLabel={`Categoría: ${getCategoryLabel(spot.category)}`}>
                <CategoryIcon category={spot.category} size={14} color={ui.text} />
              </View>
            </PlacePhoto>
            <View style={s.copy}>
              <View style={s.eventRow}>
                <View style={[s.badge, { backgroundColor: badge.background }]}>
                  <Ionicons name={badge.icon} size={12} color={ui.text} />
                  <Text style={s.badgeText}>{badge.label}</Text>
                </View>
              </View>
              <Text numberOfLines={1} ellipsizeMode="tail" style={s.name}>{spot.name}</Text>
              <View style={s.metadata}>
                <View style={s.metadataItem}>
                  <Ionicons name="location-outline" size={14} color={ui.textSecondary} />
                  <Text numberOfLines={1} ellipsizeMode="tail" style={s.meta}>{getSpotFeedSubtitle(spot)}</Text>
                </View>
                <View style={s.metadataItem}>
                  <Ionicons name="wallet-outline" size={14} color={ui.textSecondary} />
                  <Text numberOfLines={1} ellipsizeMode="tail" style={s.meta}>{formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget).replace(' COP', '')}</Text>
                </View>
              </View>
            </View>
          </Pressable>; })}
          {updates.error && <View style={{ gap: 12, paddingVertical: 16 }}><Text style={s.meta}>{updates.error}</Text><Pressable accessibilityRole="button" onPress={updates.refresh}><Text style={s.name}>Reintentar</Text></Pressable></View>}
          {!latest.length && !updates.error && <Text style={s.empty}>{updates.loading ? 'Cargando novedades…' : 'Aún no hay novedades. Aquí encontrarás los lugares, sedes y cambios que añadamos a Spots.'}</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,20,23,0.35)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  panel: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: ui.surface, borderRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: ui.text },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  eventRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '600', color: ui.text },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ui.surfaceMuted },
  photo: { width: 72, height: 72, aspectRatio: 1, flexShrink: 0, alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 12 },
  categoryBadge: { position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: ui.surface, alignItems: 'center', justifyContent: 'center' },
  metadata: { flexDirection: 'row', flexWrap: 'nowrap', gap: 10, minWidth: 0 },
  metadataItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: ui.text },
  meta: { fontSize: 12, lineHeight: 17, color: ui.textSecondary, flexShrink: 1 },
  empty: { fontSize: 14, lineHeight: 21, color: ui.textSecondary, paddingVertical: 24 },
});
