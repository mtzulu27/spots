import { eventDateLabel, eventPriceLabel } from '@/lib/parches';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { FeedPlacePhoto } from './place-photo';
import { CategoryIcon } from './category-icon';
import { AppBookmarkButton } from './app-ui';
import { accountUi as ui } from '@/lib/account-ui';
import { getCategoryLabel } from '@/lib/category-icons';
import { getSpotFeedSubtitle, type Spot } from '@/lib/mock-spots';
import { formatApproxBudgetPerPersonLabel } from '@/lib/explore-filters';
import { isRecentlyAdded } from '@/lib/discovery-ranking';
import { NewPlaceBadge } from './new-place-badge';

export function ExploreGridCard({ spot, displayCategory = spot.category, columnCount, distance, label, bookmarked, onPress, onVenuePress, onToggleBookmark, showLogo = false }: {
  spot: Spot;
  displayCategory?: string;
  showLogo?: boolean;
  columnCount: number;
  distance: number | null;
  label: string;
  bookmarked: boolean;
  onPress: () => void;
  onVenuePress?: () => void;
  onToggleBookmark?: () => void | Promise<void>;
}) {
  const recentlyAdded = isRecentlyAdded(spot, new Date());
  const [failedLogo, setFailedLogo] = useState<string>();
  const isTwoColumn = columnCount === 2;
  return (<Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`Ver ${spot.type === 'event' ? spot.name : spot.brandName || spot.name}${recentlyAdded ? ', nuevo' : ''}`} style={s.gridCard}>
              <View>
                <FeedPlacePhoto spot={spot} style={[s.gridImage, columnCount === 1 && s.gridImageSingle]} imageStyle={s.coverImage} />
                {recentlyAdded && <NewPlaceBadge style={s.newBadge} />}
                {showLogo && (spot.type === 'place' ? spot.logoUrl : spot.venueLogoUrl) && failedLogo !== (spot.type === 'place' ? spot.logoUrl : spot.venueLogoUrl) && (
                  <View pointerEvents="none" style={[s.logoBadge, columnCount === 1 && s.logoBadgeSingle]}>
                    <Image source={{ uri: spot.type === 'place' ? spot.logoUrl! : spot.venueLogoUrl! }} accessibilityLabel={`Logo de ${spot.type === 'place' ? spot.brandName || spot.name : spot.venueName || 'el lugar asociado'}`} resizeMode="contain" style={s.logoImage} onError={() => setFailedLogo(spot.type === 'place' ? spot.logoUrl : spot.venueLogoUrl || undefined)} />
                  </View>
                )}
              </View>
              <View style={s.gridCopy}>
                <View style={s.gridTitleRow}>
                  <View accessible accessibilityLabel={`Categoría: ${getCategoryLabel(displayCategory)}`} style={[s.titleCategory, isTwoColumn && s.titleCategoryCompact]}>
                    <CategoryIcon category={displayCategory} size={isTwoColumn ? 14 : 18} color={ui.textSecondary} />
                  </View>
                  <Text numberOfLines={2} style={[s.placeTitle, s.gridTitle]}>{spot.type === 'event' ? spot.name : spot.brandName || spot.name}</Text>
                  {onToggleBookmark && <AppBookmarkButton bookmarked={bookmarked} iconSize={isTwoColumn ? 18 : 20} activeColor={ui.accent} inactiveColor={ui.textSecondary} backgroundColor="transparent" containerStyle={[s.titleLikeWrap, !isTwoColumn && s.titleLikeWrapSingle]} style={s.titleLike} onPress={event => { event?.stopPropagation?.(); event?.preventDefault?.(); void onToggleBookmark?.(); }} />}
                </View>
                {spot.type === 'event' && <View style={s.practicalItem}>
                  <Ionicons name="calendar-outline" size={14} color={ui.textSecondary} />
                  <Text style={s.meta}>{eventDateLabel(spot)}</Text>
                </View>}
                <View style={s.practicalRow}>
                {spot.type !== 'event' && <View style={s.statusRow}>
                  <View style={[s.statusDot, { backgroundColor: label === 'Abierto ahora' ? '#26834a' : label === 'Abre en la próxima hora' ? '#a56a12' : '#8b8b94' }]} />
                  <Text style={s.meta}>{label === 'Abierto ahora' ? 'Abierto' : label === 'Cerrado ahora' ? 'Cerrado' : label === 'Abre en la próxima hora' ? 'Abre pronto' : label === 'Cerrado temporalmente' ? label : 'Horario sin confirmar'}</Text>
                </View>}
                  <View style={s.practicalItem}>
                    <Ionicons name="location-outline" size={14} color={ui.textSecondary} />
                    {spot.type === 'event' && onVenuePress ? <Pressable accessibilityRole="link" accessibilityLabel={`Ver lugar: ${spot.venueName || getSpotFeedSubtitle(spot)}`} onPress={event => { event.stopPropagation(); onVenuePress(); }}><Text style={[s.meta, s.practicalText, s.venueLink]}>{spot.venueName || getSpotFeedSubtitle(spot)}</Text></Pressable> : <Text style={[s.meta, s.practicalText]}>{distance !== null ? `${distance.toFixed(1)} km en línea recta` : getSpotFeedSubtitle(spot)}</Text>}
                  </View>
                  <View style={s.practicalItem}>
                    <Ionicons name="wallet-outline" size={14} color={ui.textSecondary} />
                    <Text style={[s.meta, s.practicalText]}>{spot.type === 'event' ? eventPriceLabel(spot) : formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget, spot.typicalBudget, spot.budgetPilot, spot.budgetBasis, false).replace(' COP', '')}</Text>
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
  newBadge: { position: 'absolute', top: 8, left: 8 },
  logoBadge: { position: 'absolute', left: 8, bottom: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#ffffff', overflow: 'hidden' },
  logoBadgeSingle: { width: 44, height: 44, borderRadius: 22 },
  logoImage: { width: '100%', height: '100%' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  practicalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4 },
  practicalItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  practicalText: { flexShrink: 1 },
  venueLink: { color: ui.accent, textDecorationLine: 'underline' },
  gridTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  gridTitle: { flex: 1, fontSize: 18 },
  titleCategory: { width: 22, height: 36, flexShrink: 0, alignItems: 'flex-start', justifyContent: 'center' },
  titleCategoryCompact: { width: 17, height: 30 },
  titleLikeWrap: { width: 24, height: 30, flexShrink: 0 },
  titleLikeWrapSingle: { width: 32, height: 36 },
  titleLike: { width: 24, height: 30, padding: 0, alignItems: 'flex-end', justifyContent: 'center' },
});
