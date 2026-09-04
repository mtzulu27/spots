import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PlacePhoto } from './place-photo';
import { CategoryIcon } from './category-icon';
import { AppBookmarkButton } from './app-ui';
import { accountUi as ui } from '@/lib/account-ui';
import { getCategoryLabel } from '@/lib/category-icons';
import { getDiscoveryStatus } from '@/lib/discovery-ranking';
import { getSpotFeedSubtitle, type Spot } from '@/lib/mock-spots';
import { formatApproxBudgetPerPersonLabel } from '@/lib/explore-filters';

export function DiscoveryPlaceCard({ spot, bookmarked, onToggleBookmark, onPress, now = new Date(), width = 250 }: {
  spot: Spot; bookmarked: boolean; onToggleBookmark: () => void | Promise<void>; onPress: () => void; now?: Date; width?: number;
}) {
  return (<Pressable accessibilityRole="link" accessibilityLabel={`Ver ${spot.brandName || spot.name}`} onPress={onPress} style={[s.feature, { width }]}>
              <PlacePhoto uri={spot.image} style={s.cover} imageStyle={s.coverImage}>
                <View accessible accessibilityLabel={`Categoría: ${getCategoryLabel(spot.category)}`} style={s.categoryBadge}>
                  <CategoryIcon category={spot.category} size={18} color={ui.text} />
                </View>
                <View style={s.caption}>
                  <View style={s.gridTitleRow}>
                    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[s.placeTitle, { minWidth: 0, flexShrink: 1 }]}>{spot.brandName || spot.name}</Text>
                    <View accessible accessibilityLabel={getDiscoveryStatus(spot, now).label} style={[s.statusDot, { flexShrink: 0, backgroundColor: getDiscoveryStatus(spot, now).availability === 0 ? '#26834a' : '#8b8b94' }]} />
                    </View>
                    <AppBookmarkButton bookmarked={bookmarked} iconSize={22} activeColor={ui.textSecondary} inactiveColor={ui.textSecondary} backgroundColor="transparent" style={[s.gridSave, s.discoverySave]} onPress={event => { event?.stopPropagation(); void onToggleBookmark(); }} />
                  </View>
                  <View style={s.discoveryMeta}>
                    <View style={[s.practicalItem, s.discoveryMetaItem]}>
                      <Ionicons name="location-outline" size={13} color={ui.textSecondary} />
                      <Text numberOfLines={1} style={[s.meta, s.practicalText]}>{getSpotFeedSubtitle(spot)}</Text>
                    </View>
                    <View style={[s.practicalItem, s.discoveryMetaItem]}>
                      <Ionicons name="wallet-outline" size={13} color={ui.textSecondary} />
                      <Text numberOfLines={1} style={[s.meta, s.practicalText]}>{formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget).replace(' COP', '')}</Text>
                    </View>
                  </View>
                </View>
              </PlacePhoto>
            </Pressable>);
}
const s = StyleSheet.create({
  feature: { width: 250, height: 190 },
  cover: { flex: 1, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end', padding: 10 },
  coverImage: { borderRadius: 12 },
  categoryBadge: { position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: ui.surface, alignItems: 'center', justifyContent: 'center' },
  caption: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10, gap: 0 },
  gridTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  placeTitle: { fontSize: 15, fontWeight: '600', color: ui.text, flexShrink: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  gridSave: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  discoverySave: { width: 22, flexShrink: 0 },
  discoveryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginTop: -2 },
  practicalItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  discoveryMetaItem: { flexShrink: 1, minWidth: 0 },
  meta: { fontSize: 12, lineHeight: 17, color: ui.textSecondary },
  practicalText: { flexShrink: 1 },
});
