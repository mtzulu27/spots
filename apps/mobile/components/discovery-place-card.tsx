import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { FeedPlacePhoto } from './place-photo';
import { CategoryIcon } from './category-icon';
import { AppBookmarkButton } from './app-ui';
import { accountUi as ui } from '@/lib/account-ui';
import { getCategoryLabel } from '@/lib/category-icons';
import { getDiscoveryStatus, isRecentlyAdded } from '@/lib/discovery-ranking';
import { getSpotFeedSubtitle, type Spot } from '@/lib/mock-spots';
import { formatApproxBudgetPerPersonLabel } from '@/lib/explore-filters';
import { NewPlaceBadge } from './new-place-badge';

export function DiscoveryPlaceCard({ spot, displayCategory = spot.category, bookmarked, onToggleBookmark, onPress, now = new Date(), width = 250 }: {
  spot: Spot; displayCategory?: string; bookmarked: boolean; onToggleBookmark: () => void | Promise<void>; onPress: () => void; now?: Date; width?: number;
}) {
  const recentlyAdded = isRecentlyAdded(spot, now);
  const [failedLogo, setFailedLogo] = useState<string>();
  return (<Pressable accessibilityRole="link" accessibilityLabel={`Ver ${spot.brandName || spot.name}${recentlyAdded ? ', nuevo lugar' : ''}`} onPress={onPress} style={[s.feature, { width }]}>
              <FeedPlacePhoto spot={spot} now={now} style={s.cover} imageStyle={s.coverImage}>
                {recentlyAdded && <NewPlaceBadge style={s.newBadge} />}
                {spot.logoUrl && failedLogo !== spot.logoUrl && (
                  <View pointerEvents="none" style={s.logoBadge}>
                    <Image source={{ uri: spot.logoUrl }} accessibilityLabel={`Logo de ${spot.brandName || spot.name}`} resizeMode="contain" style={s.logoImage} onError={() => setFailedLogo(spot.logoUrl)} />
                  </View>
                )}
                <View style={s.caption}>
                  <View style={s.gridTitleRow}>
                    <View accessible accessibilityLabel={`Categoría: ${getCategoryLabel(displayCategory)}`} style={s.titleCategory}>
                      <CategoryIcon category={displayCategory} size={16} color={ui.textSecondary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[s.placeTitle, { minWidth: 0, flexShrink: 1 }]}>{spot.brandName || spot.name}</Text>
                    <View accessible accessibilityLabel={getDiscoveryStatus(spot, now).label} style={[s.statusDot, { flexShrink: 0, backgroundColor: getDiscoveryStatus(spot, now).availability === 0 ? '#26834a' : '#8b8b94' }]} />
                    </View>
                    <AppBookmarkButton bookmarked={bookmarked} iconSize={20} activeColor={ui.accent} inactiveColor={ui.textSecondary} backgroundColor="transparent" containerStyle={s.titleLikeWrap} style={s.titleLike} onPress={event => { event?.stopPropagation?.(); event?.preventDefault?.(); void onToggleBookmark(); }} />
                  </View>
                  <View style={s.discoveryMeta}>
                    <View style={[s.practicalItem, s.discoveryMetaItem]}>
                      <Ionicons name="location-outline" size={13} color={ui.textSecondary} />
                      <Text numberOfLines={1} style={[s.meta, s.practicalText]}>{getSpotFeedSubtitle(spot)}</Text>
                    </View>
                    <View style={[s.practicalItem, s.discoveryMetaItem]}>
                      <Ionicons name="wallet-outline" size={13} color={ui.textSecondary} />
                      <Text numberOfLines={1} style={[s.meta, s.practicalText]}>{formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget, spot.typicalBudget, spot.budgetPilot, spot.budgetBasis, false).replace(' COP', '')}</Text>
                    </View>
                  </View>
                </View>
              </FeedPlacePhoto>
            </Pressable>);
}
const s = StyleSheet.create({
  feature: { width: 250, height: 190 },
  cover: { flex: 1, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end', padding: 6 },
  coverImage: { borderRadius: 12 },
  newBadge: { position: 'absolute', top: 8, left: 8 },
  logoBadge: { width: 36, height: 36, marginLeft: 8, marginBottom: 6, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#ffffff', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  caption: { backgroundColor: ui.caption, borderRadius: 8, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10, gap: 0 },
  gridTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  placeTitle: { fontSize: 15, fontWeight: '600', color: ui.text, flexShrink: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  titleCategory: { width: 18, height: 36, flexShrink: 0, alignItems: 'flex-start', justifyContent: 'center' },
  titleLikeWrap: { width: 28, height: 36, flexShrink: 0 },
  titleLike: { width: 28, height: 36, padding: 0, alignItems: 'flex-end', justifyContent: 'center' },
  discoveryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginTop: -2 },
  practicalItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  discoveryMetaItem: { flexShrink: 1, minWidth: 0 },
  meta: { fontSize: 12, lineHeight: 17, color: ui.textSecondary },
  practicalText: { flexShrink: 1 },
});
