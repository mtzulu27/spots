import { eventDateLabel, eventPriceLabel } from '@/lib/parches';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PlacePhoto } from './place-photo';
import { CategoryIcon } from './category-icon';
import { AppBookmarkButton } from './app-ui';
import { accountUi as ui } from '@/lib/account-ui';
import { getCategoryLabel } from '@/lib/category-icons';
import { getSpotFeedSubtitle, type Spot } from '@/lib/mock-spots';
import { formatApproxBudgetPerPersonLabel } from '@/lib/explore-filters';

export function ExploreGridCard({ spot, columnCount, distance, label, bookmarked, onPress, onToggleBookmark }: {
  spot: Spot;
  columnCount: number;
  distance: number | null;
  label: string;
  bookmarked: boolean;
  onPress: () => void;
  onToggleBookmark?: () => void | Promise<void>;
}) {
  return (<Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`Ver ${spot.type === 'event' ? spot.name : spot.brandName || spot.name}`} style={s.gridCard}>
              <View>
                <PlacePhoto uri={spot.image} grayscale={label === 'Cerrado ahora'} style={[s.gridImage, columnCount === 1 && s.gridImageSingle]} imageStyle={s.coverImage} />
                <View accessible accessibilityLabel={`Categoría: ${getCategoryLabel(spot.category)}`} style={s.categoryBadge}>
                  <CategoryIcon category={spot.category} size={18} color={ui.text} />
                </View>
              </View>
              <View style={s.gridCopy}>
                <View style={s.gridTitleRow}>
                  <Text numberOfLines={2} style={[s.placeTitle, s.gridTitle]}>{spot.type === 'event' ? spot.name : spot.brandName || spot.name}</Text>
                  {onToggleBookmark && <AppBookmarkButton bookmarked={bookmarked} iconSize={22} activeColor={ui.textSecondary} inactiveColor={ui.textSecondary} backgroundColor="transparent" style={s.gridSave} onPress={event => { event?.stopPropagation(); void onToggleBookmark?.(); }} />}
                </View>
                {spot.type === 'event' && <View style={s.practicalItem}>
                  <Ionicons name="calendar-outline" size={14} color={ui.textSecondary} />
                  <Text style={s.meta}>{eventDateLabel(spot)}</Text>
                </View>}
                <View style={s.practicalRow}>
                {spot.type !== 'event' && <View style={s.statusRow}>
                  <View style={[s.statusDot, { backgroundColor: label === 'Abierto ahora' ? '#26834a' : label === 'Abre en la próxima hora' ? '#a56a12' : '#8b8b94' }]} />
                  <Text style={s.meta}>{label === 'Abierto ahora' ? 'Abierto' : label === 'Cerrado ahora' ? 'Cerrado' : label === 'Abre en la próxima hora' ? 'Abre pronto' : 'Horario sin confirmar'}</Text>
                </View>}
                  <View style={s.practicalItem}>
                    <Ionicons name="location-outline" size={14} color={ui.textSecondary} />
                    <Text style={[s.meta, s.practicalText]}>{distance !== null ? `${distance.toFixed(1)} km en línea recta` : getSpotFeedSubtitle(spot)}</Text>
                  </View>
                  <View style={s.practicalItem}>
                    <Ionicons name="wallet-outline" size={14} color={ui.textSecondary} />
                    <Text style={[s.meta, s.practicalText]}>{spot.type === 'event' ? eventPriceLabel(spot) : formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget).replace(' COP', '')}</Text>
                  </View>
                </View>
              </View>
            </Pressable>);
}

const s = StyleSheet.create({
  meta: { fontSize: 12, lineHeight: 17, color: ui.textSecondary },
  coverImage: { borderRadius: 12 },
  placeTitle: { fontSize: 15, fontWeight: '600', color: ui.text, flexShrink: 1 },
  gridCard: { gap: 4, paddingBottom: 12 },
  gridImage: { width: '100%', aspectRatio: 1.8, borderRadius: 12, overflow: 'hidden' },
  gridImageSingle: { aspectRatio: 2 },
  gridCopy: { gap: 2 },
  categoryBadge: { position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: ui.surface, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  practicalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4 },
  practicalItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  practicalText: { flexShrink: 1 },
  gridTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridTitle: { flex: 1, fontSize: 18 },
  gridSave: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
