import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchField } from '@/components/app-ui';
import { formatApproxBudgetPerPersonLabel } from '@/lib/explore-filters';
import {
  aggregatePlaceSpotsFromList,
  getBranchLocationLabel,
  getSimilarSpotsFromList,
  getSpotFeedSubtitle,
  type Spot,
} from '@/lib/mock-spots';
import { useSpotsStore } from '@/lib/spots-store';

type PreviewMode = 'explore' | 'detail';

const montserrat = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extrabold: 'Montserrat_800ExtraBold',
  black: 'Montserrat_900Black',
};

const outlineWidths = {
  shell: 2,
  control: 1.5,
  badge: 1,
};

const previewTheme = {
  canvas: '#efe6db',
  canvasShade: '#e1d6cb',
  ink: '#101010',
  inkSoft: '#353130',
  muted: '#6f6760',
  line: 'rgba(16,16,16,0.16)',
  outline: '#000000',
  outlineSoft: '#000000',
  card: '#171514',
  cardSoft: '#24201e',
  cream: '#f6efe5',
  creamSoft: '#ece2d6',
  coral: '#ff4b63',
  coralDeep: '#e43d5c',
  plum: '#662a5c',
  yellow: '#f5c94a',
  yellowDeep: '#d9aa28',
  mist: 'rgba(255,255,255,0.28)',
};

const quickCategories: Array<{ label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { label: 'Arte', color: '#662a5c', icon: 'color-palette-outline' },
  { label: 'Cine', color: '#f5c94a', icon: 'film-outline' },
  { label: 'Comida', color: '#f5c94a', icon: 'restaurant-outline' },
  { label: 'Noche', color: '#ff4b63', icon: 'wine-outline' },
  { label: 'Plan', color: '#ff4b63', icon: 'sparkles-outline' },
];

function getPriceLabel(spot: Spot) {
  return formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget);
}

function getHeroTitle(spot: Spot) {
  const base = spot.type === 'event' ? spot.name : spot.brandName;
  return base.toUpperCase().split(' ').slice(0, 4).join('\n');
}

function getCategoryBadge(spot: Spot) {
  return spot.category;
}

function getCategoryIcon(category: Spot['category']): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'Arte y cultura':
      return 'color-palette-outline';
    case 'Bares y noche':
      return 'wine-outline';
    case 'Cine':
      return 'film-outline';
    case 'Comida':
    case 'Restaurantes y cafés':
    case 'Restaurantes':
      return 'restaurant-outline';
    case 'Eventos':
      return 'ticket-outline';
    case 'Deporte y bienestar':
      return 'barbell-outline';
    case 'Familiar':
      return 'people-outline';
    case 'Pet friendly':
      return 'paw-outline';
    case 'Naturaleza y aire libre':
      return 'leaf-outline';
    default:
      return 'sparkles-outline';
  }
}

function getPeopleLabel(spot: Spot) {
  return `1-${spot.maxPeople} personas`;
}

function ExploreCard({ spot }: { spot: Spot }) {
  return (
    <View style={styles.exploreCard}>
      <View style={styles.exploreCardMediaWrap}>
        <ImageBackground source={{ uri: spot.image }} style={styles.exploreCardMedia} imageStyle={styles.exploreCardMediaImage}>
          <View style={styles.exploreCardOverlay} />
          <View style={styles.exploreCardTopRow}>
            <View style={styles.exploreBadge}>
              <Ionicons name={getCategoryIcon(spot.category)} size={14} color={previewTheme.ink} />
            </View>
            <View style={styles.iconGlass}>
              <Ionicons name="heart" size={16} color={previewTheme.cream} />
            </View>
          </View>
          <View style={styles.exploreCardTitleWrap}>
            <Text style={styles.exploreCardDisplay}>{getHeroTitle(spot)}</Text>
          </View>
        </ImageBackground>
      </View>

      <View style={styles.exploreCardFooter}>
        <View style={styles.exploreCardMetaBlock}>
          {spot.shortDescription ? (
            <Text numberOfLines={2} style={styles.exploreCardInfo}>
              {spot.shortDescription}
            </Text>
          ) : null}

          <View style={styles.exploreMetaRow}>
            <View style={styles.metaPillLight}>
              <Ionicons name="location-outline" size={12} color={previewTheme.ink} />
              <Text numberOfLines={1} style={styles.metaPillLightText}>
                {getSpotFeedSubtitle(spot)}
              </Text>
            </View>
            <View style={styles.metaPillLight}>
              <Ionicons name="cash-outline" size={12} color={previewTheme.ink} />
              <Text style={styles.metaPillLightText}>{getPriceLabel(spot)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.playButton}>
          <Ionicons name="chevron-forward" size={18} color={previewTheme.ink} />
        </View>
      </View>
    </View>
  );
}

function DetailPreview({
  spot,
  similarSpots,
}: {
  spot: Spot | null;
  similarSpots: Spot[];
}) {
  if (!spot) {
    return null;
  }

  const branches = spot.branches ?? [spot];
  const selectedBranch = branches[0] ?? spot;

  return (
    <View style={styles.detailScreen}>
      <View style={styles.detailHeroShell}>
        <ImageBackground source={{ uri: spot.image }} style={styles.detailHero} imageStyle={styles.detailHeroImage}>
          <View style={styles.detailHeroOverlay} />
          <View style={styles.detailNav}>
            <View style={styles.iconChrome}>
              <Ionicons name="chevron-back" size={18} color={previewTheme.cream} />
            </View>
            <View style={styles.detailBadge}>
              <Text style={styles.detailBadgeText}>{getCategoryBadge(spot)}</Text>
            </View>
            <View style={styles.iconChrome}>
              <Ionicons name="heart" size={16} color={previewTheme.cream} />
            </View>
          </View>

          <View style={styles.detailTitleBlock}>
            <Text style={styles.detailDisplay}>{getHeroTitle(spot)}</Text>
            <View style={styles.detailHeroMetaInline}>
              <View style={styles.detailHeroLocationRow}>
                <Ionicons name="location" size={13} color={previewTheme.cream} />
                <Text numberOfLines={1} style={styles.detailHeroLocationText}>
                  {branches.length > 1
                    ? `${branches.length} sedes: ${getBranchLocationLabel(selectedBranch, branches)}`
                    : `1 sede: ${getBranchLocationLabel(selectedBranch, branches)}`}
                </Text>
              </View>
            </View>
            {spot.moods.length > 0 ? (
              <View style={styles.detailHeroIdealRow}>
                <Text style={styles.detailHeroIdealLabel}>Ideal para:</Text>
                <View style={styles.detailHeroIdealChips}>
                  {spot.moods.slice(0, 3).map((mood) => (
                    <View key={mood} style={styles.detailHeroIdealChip}>
                      <Text style={styles.detailHeroIdealChipText}>{mood}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ImageBackground>
      </View>

      <View style={styles.detailSheet}>
        <View style={styles.detailSheetHandleWrap}>
          <View style={styles.detailSheetHandle} />
        </View>
        <ScrollView
          style={styles.detailSheetScroll}
          contentContainerStyle={styles.detailSheetScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.detailSectionBlock, styles.detailSectionBlockFirst]}>
            <Pressable style={styles.branchSelectorFieldPreview}>
              <View style={styles.branchSelectorCopyPreview}>
                <Text style={styles.branchSelectorTitlePreview}>
                  {getBranchLocationLabel(selectedBranch, branches)}
                </Text>
                <View style={styles.branchSelectorStatusRowPreview}>
                  <Text style={styles.branchSelectorMetaPreview}>
                    {selectedBranch.hours || 'Horario por confirmar'}
                  </Text>
                  <View style={styles.branchSelectorDotPreview} />
                </View>
              </View>
              <View style={styles.branchSelectorActionPreview}>
                <Text style={styles.branchSelectorActionTextPreview}>Cambiar sede</Text>
                <Ionicons name="chevron-forward" size={16} color={previewTheme.muted} />
              </View>
            </Pressable>
          </View>

          <View style={styles.detailSectionBlock}>
            <Text style={styles.detailBodyText}>{spot.description || spot.shortDescription}</Text>
          </View>

          <View style={styles.detailSectionBlock}>
            <Text style={styles.detailEyebrow}>Información</Text>
            <Pressable style={styles.scheduleCardPreview}>
              <View style={styles.scheduleCardHeaderPreview}>
                <View style={styles.scheduleIconWrapPreview}>
                  <Ionicons name="time-outline" size={18} color={previewTheme.ink} />
                </View>
                <View style={styles.scheduleCardCopyPreview}>
                  <View style={styles.scheduleTodayInlinePreview}>
                    <Text style={styles.scheduleTodayLabelPreview}>Hoy</Text>
                    <Text style={styles.scheduleTodaySeparatorPreview}>·</Text>
                    <Text style={styles.scheduleTodayValuePreview}>
                      {selectedBranch.hours || 'Horario por confirmar'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={18} color={previewTheme.muted} />
              </View>
            </Pressable>
          </View>

          <View style={styles.detailSectionBlock}>
            <View style={styles.quickInfoStackPreview}>
              <Pressable style={styles.statCardPreview}>
                <View style={styles.scheduleIconWrapPreview}>
                  <Ionicons name="location-outline" size={18} color={previewTheme.ink} />
                </View>
                <View style={styles.statCopyPreview}>
                  <Text numberOfLines={1} style={styles.statValuePreview}>
                    {getBranchLocationLabel(selectedBranch, branches)}
                  </Text>
                  <Text style={styles.statLabelPreview}>Abrir ubicación</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={previewTheme.muted} />
              </Pressable>

              <View style={styles.dualStatsPreview}>
                <View style={[styles.statCardPreview, styles.statCardCompactPreview]}>
                  <View style={styles.scheduleIconWrapPreview}>
                    <Ionicons name="cash-outline" size={18} color={previewTheme.ink} />
                  </View>
                  <View style={styles.statCopyPreview}>
                    <Text numberOfLines={1} style={styles.statValuePreview}>
                      {getPriceLabel(selectedBranch)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statCardPreview, styles.statCardCompactPreview]}>
                  <View style={styles.scheduleIconWrapPreview}>
                    <Ionicons name="people-outline" size={18} color={previewTheme.ink} />
                  </View>
                  <View style={styles.statCopyPreview}>
                    <Text numberOfLines={1} style={styles.statValuePreview}>
                      {getPeopleLabel(selectedBranch)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailSectionBlock}>
            <Text style={styles.detailEyebrow}>Acciones rápidas</Text>
            <View style={styles.quickActionsRowPreview}>
              <Pressable style={styles.quickActionButtonPreview}>
                <Ionicons name="restaurant-outline" size={16} color={previewTheme.ink} />
                <Text style={styles.quickActionTextPreview}>Menu</Text>
              </Pressable>
              <Pressable style={styles.quickActionButtonPreview}>
                <Ionicons name="logo-whatsapp" size={16} color={previewTheme.ink} />
                <Text style={styles.quickActionTextPreview}>Escribir</Text>
              </Pressable>
              <Pressable style={styles.quickActionButtonPreview}>
                <Ionicons name="logo-instagram" size={16} color={previewTheme.ink} />
                <Text style={styles.quickActionTextPreview}>Instagram</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.detailSectionBlock, styles.detailSectionBlockLast, styles.similarSectionPreview]}>
            <Text style={styles.detailEyebrow}>Lugares similares</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
              {similarSpots.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.similarCard}>
                  <Image source={{ uri: item.image }} style={styles.similarImage} />
                  <Text numberOfLines={2} style={styles.similarTitle}>
                    {item.brandName}
                  </Text>
                  <Text numberOfLines={1} style={styles.similarMeta}>
                    {getSpotFeedSubtitle(item)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function ExplorePreview({
  spots,
  heroSpot,
}: {
  spots: Spot[];
  heroSpot: Spot | null;
}) {
  const [query, setQuery] = useState('');

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.exploreScroll}>
      <View style={styles.introBlock}>
        <Text style={styles.eyebrow}>Soft Urban</Text>
        <Text style={styles.introTitle}>Mismo layout, pero con una estética más fashion, suave y curada.</Text>
        <Text style={styles.introCopy}>
          La idea aquí no es volver Spots oscura, sino darle un lenguaje visual más propio: crema cálida, bloques negros, coral, ciruela y amarillo de marca con fotografía protagonista.
        </Text>
      </View>

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerGreeting}>Hola, Mateo</Text>
          <Text style={styles.headerSubcopy}>Descubre un plan que se sienta más tuyo.</Text>
        </View>
        <View style={styles.iconCream}>
          <Ionicons name="notifications-outline" size={18} color={previewTheme.ink} />
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Busca un lugar o escribe el plan"
          showClearButton={query.trim().length > 0}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {quickCategories.map((item) => (
          <View key={item.label} style={styles.quickPill}>
            <View style={[styles.quickPillIcon, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={15} color={previewTheme.ink} />
            </View>
            <Text style={styles.quickPillText}>{item.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.modeSwitch}>
        <Pressable style={[styles.modeChip, styles.modeChipActive]}>
          <Text style={[styles.modeChipText, styles.modeChipTextActive]}>Lugares</Text>
        </Pressable>
        <Pressable style={styles.modeChip}>
          <Text style={styles.modeChipText}>Parches</Text>
        </Pressable>
      </View>

      <View style={styles.resultsRow}>
        <View>
          <Text style={styles.resultsTitle}>{spots.length} resultados</Text>
          <Text style={styles.resultsSubcopy}>Mantiene chips, filtros y jerarquía funcional.</Text>
        </View>
        <View style={styles.filterChrome}>
          <Ionicons name="options-outline" size={18} color={previewTheme.ink} />
        </View>
      </View>

      {heroSpot ? <ExploreCard spot={heroSpot} /> : null}
      {spots.slice(1, 3).map((spot) => (
        <ExploreCard key={spot.id} spot={spot} />
      ))}
    </ScrollView>
  );
}

export default function StylePreviewScreen() {
  const insets = useSafeAreaInsets();
  const { spots } = useSpotsStore();
  const [mode, setMode] = useState<PreviewMode>('explore');

  const placeSpots = useMemo(() => aggregatePlaceSpotsFromList(spots), [spots]);
  const detailSpot = placeSpots[0] ?? null;
  const similarSpots = useMemo(() => {
    if (!detailSpot) {
      return [];
    }

    return getSimilarSpotsFromList(placeSpots, detailSpot);
  }, [detailSpot, placeSpots]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.shell, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.shellHeader}>
          <Text style={styles.shellTitle}>Spots Preview Lab</Text>
          <Text style={styles.shellCopy}>Referencia adaptada al layout actual de Explore y detalle.</Text>
        </View>

        <View style={styles.labSwitch}>
          <Pressable
            onPress={() => setMode('explore')}
            style={[styles.labChip, mode === 'explore' && styles.labChipActive]}
          >
            <Text style={[styles.labChipText, mode === 'explore' && styles.labChipTextActive]}>Explore</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('detail')}
            style={[styles.labChip, mode === 'detail' && styles.labChipActive]}
          >
            <Text style={[styles.labChipText, mode === 'detail' && styles.labChipTextActive]}>Detalle</Text>
          </Pressable>
        </View>

        {mode === 'explore' ? (
          <ExplorePreview spots={placeSpots} heroSpot={placeSpots[0] ?? null} />
        ) : (
          <DetailPreview spot={detailSpot} similarSpots={similarSpots} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: previewTheme.canvasShade,
  },
  shell: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 14,
  },
  shellHeader: {
    gap: 4,
  },
  shellTitle: {
    color: previewTheme.ink,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: montserrat.extrabold,
  },
  shellCopy: {
    color: previewTheme.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: montserrat.medium,
  },
  labSwitch: {
    flexDirection: 'row',
    gap: 10,
  },
  labChip: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    backgroundColor: previewTheme.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labChipActive: {
    backgroundColor: previewTheme.ink,
    borderColor: previewTheme.outline,
  },
  labChipText: {
    color: previewTheme.inkSoft,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: montserrat.bold,
  },
  labChipTextActive: {
    color: previewTheme.cream,
  },
  exploreScroll: {
    paddingBottom: 40,
    gap: 16,
  },
  introBlock: {
    gap: 8,
    paddingTop: 4,
  },
  eyebrow: {
    color: previewTheme.coralDeep,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: montserrat.extrabold,
  },
  introTitle: {
    color: previewTheme.ink,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    maxWidth: 320,
    fontFamily: montserrat.black,
  },
  introCopy: {
    color: previewTheme.muted,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 330,
    fontFamily: montserrat.medium,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerGreeting: {
    color: previewTheme.ink,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: montserrat.extrabold,
  },
  headerSubcopy: {
    color: previewTheme.muted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: montserrat.medium,
  },
  iconCream: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  quickRow: {
    gap: 10,
    paddingRight: 8,
  },
  quickPill: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickPillIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPillText: {
    color: previewTheme.inkSoft,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: montserrat.bold,
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    borderRadius: 24,
    backgroundColor: previewTheme.creamSoft,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
  },
  modeChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: previewTheme.ink,
  },
  modeChipText: {
    color: previewTheme.muted,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: montserrat.bold,
  },
  modeChipTextActive: {
    color: previewTheme.cream,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultsTitle: {
    color: previewTheme.ink,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: montserrat.extrabold,
  },
  resultsSubcopy: {
    color: previewTheme.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: montserrat.medium,
  },
  filterChrome: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreCard: {
    borderRadius: 34,
    backgroundColor: previewTheme.card,
    overflow: 'hidden',
    borderWidth: outlineWidths.shell,
    borderColor: previewTheme.outline,
  },
  exploreCardMediaWrap: {
    padding: 10,
    paddingBottom: 0,
  },
  exploreCardMedia: {
    minHeight: 340,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 14,
  },
  exploreCardMediaImage: {
    borderRadius: 28,
  },
  exploreCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  exploreCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exploreBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.badge,
    borderColor: previewTheme.outlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: previewTheme.mist,
    borderWidth: outlineWidths.control,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreCardTitleWrap: {
    justifyContent: 'flex-end',
  },
  exploreCardDisplay: {
    color: previewTheme.cream,
    fontSize: 38,
    lineHeight: 36,
    fontWeight: '900',
    maxWidth: 220,
    fontFamily: montserrat.black,
  },
  exploreCardFooter: {
    minHeight: 98,
    backgroundColor: previewTheme.plum,
    margin: 10,
    marginTop: 10,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exploreCardMetaBlock: {
    flex: 1,
    gap: 8,
  },
  exploreInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  exploreInfoBadge: {
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(246,239,229,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreInfoBadgeText: {
    color: previewTheme.cream,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: montserrat.extrabold,
  },
  exploreCardName: {
    color: previewTheme.cream,
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
    fontFamily: montserrat.black,
  },
  exploreCardInfo: {
    color: 'rgba(246,239,229,0.86)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    fontFamily: montserrat.semibold,
  },
  exploreMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    minHeight: 28,
    maxWidth: '100%',
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(246,239,229,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaPillText: {
    color: previewTheme.cream,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
    fontFamily: montserrat.bold,
  },
  metaPillLight: {
    minHeight: 28,
    maxWidth: '100%',
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.badge,
    borderColor: previewTheme.outlineSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaPillLightText: {
    color: previewTheme.ink,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
    fontFamily: montserrat.bold,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: previewTheme.yellow,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScreen: {
    flex: 1,
    gap: 0,
  },
  detailHeroShell: {
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: previewTheme.card,
    borderWidth: outlineWidths.shell,
    borderColor: previewTheme.outline,
  },
  detailHero: {
    minHeight: 368,
    padding: 14,
    justifyContent: 'space-between',
  },
  detailHeroImage: {
    borderRadius: 34,
  },
  detailHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  detailNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconChrome: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: previewTheme.mist,
    borderWidth: outlineWidths.control,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBadge: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.badge,
    borderColor: previewTheme.outlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBadgeText: {
    color: previewTheme.ink,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: montserrat.extrabold,
  },
  detailTitleBlock: {
    justifyContent: 'flex-end',
    gap: 10,
  },
  detailDisplay: {
    color: previewTheme.cream,
    fontSize: 40,
    lineHeight: 38,
    fontWeight: '900',
    maxWidth: 220,
    fontFamily: montserrat.black,
  },
  detailHeroMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailHeroLocationRow: {
    minHeight: 30,
    maxWidth: '100%',
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(246,239,229,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  detailHeroLocationText: {
    color: previewTheme.cream,
    fontSize: 12,
    fontFamily: montserrat.semibold,
    flexShrink: 1,
  },
  detailHeroIdealRow: {
    gap: 8,
  },
  detailHeroIdealLabel: {
    color: 'rgba(246,239,229,0.82)',
    fontSize: 12,
    fontFamily: montserrat.bold,
  },
  detailHeroIdealChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailHeroIdealChip: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(246,239,229,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeroIdealChipText: {
    color: previewTheme.cream,
    fontSize: 11,
    fontFamily: montserrat.bold,
  },
  detailSheet: {
    marginHorizontal: 8,
    marginTop: -10,
    flex: 1,
    borderRadius: 30,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.shell,
    borderColor: previewTheme.outline,
    overflow: 'hidden',
  },
  detailSheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  detailSheetHandle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  detailSheetScroll: {
    flex: 1,
  },
  detailSheetScrollContent: {
    paddingBottom: Platform.OS === 'web' ? 28 : 36,
  },
  detailSectionBlock: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.14)',
    padding: 16,
    gap: 12,
  },
  detailSectionBlockFirst: {
    paddingTop: 18,
  },
  detailSectionBlockLast: {
    borderBottomWidth: 0,
    paddingBottom: 18,
  },
  branchSelectorFieldPreview: {
    minHeight: 84,
    borderRadius: 22,
    backgroundColor: previewTheme.creamSoft,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  branchSelectorCopyPreview: {
    flex: 1,
    gap: 6,
  },
  branchSelectorTitlePreview: {
    color: previewTheme.ink,
    fontSize: 16,
    fontFamily: montserrat.extrabold,
  },
  branchSelectorStatusRowPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  branchSelectorMetaPreview: {
    color: previewTheme.muted,
    fontSize: 12,
    fontFamily: montserrat.semibold,
  },
  branchSelectorDotPreview: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: previewTheme.coral,
  },
  branchSelectorActionPreview: {
    alignItems: 'flex-end',
    gap: 4,
  },
  branchSelectorActionTextPreview: {
    color: previewTheme.muted,
    fontSize: 12,
    fontFamily: montserrat.bold,
  },
  detailBodyText: {
    color: previewTheme.inkSoft,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: montserrat.medium,
  },
  detailEyebrow: {
    color: previewTheme.coralDeep,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    fontFamily: montserrat.extrabold,
  },
  scheduleCardPreview: {
    borderRadius: 22,
    backgroundColor: previewTheme.creamSoft,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    padding: 14,
  },
  scheduleCardHeaderPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleIconWrapPreview: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.badge,
    borderColor: previewTheme.outlineSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleCardCopyPreview: {
    flex: 1,
  },
  scheduleTodayInlinePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  scheduleTodayLabelPreview: {
    color: previewTheme.muted,
    fontSize: 12,
    fontFamily: montserrat.bold,
  },
  scheduleTodaySeparatorPreview: {
    color: previewTheme.muted,
    fontSize: 12,
    fontFamily: montserrat.bold,
  },
  scheduleTodayValuePreview: {
    color: previewTheme.ink,
    fontSize: 14,
    fontFamily: montserrat.extrabold,
  },
  quickInfoStackPreview: {
    gap: 10,
  },
  statCardPreview: {
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: previewTheme.creamSoft,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statCardCompactPreview: {
    flex: 1,
    minHeight: 64,
  },
  statCopyPreview: {
    flex: 1,
    gap: 3,
  },
  statValuePreview: {
    color: previewTheme.ink,
    fontSize: 14,
    fontFamily: montserrat.extrabold,
  },
  statLabelPreview: {
    color: previewTheme.muted,
    fontSize: 12,
    fontFamily: montserrat.semibold,
  },
  dualStatsPreview: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionsRowPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButtonPreview: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: previewTheme.creamSoft,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionTextPreview: {
    color: previewTheme.ink,
    fontSize: 12,
    fontFamily: montserrat.bold,
  },
  similarSectionPreview: {
    overflow: 'hidden',
  },
  branchRow: {
    gap: 10,
    paddingRight: 8,
  },
  branchCard: {
    width: 182,
    minHeight: 84,
    borderRadius: 24,
    backgroundColor: previewTheme.cream,
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    padding: 14,
    gap: 6,
  },
  branchCardActive: {
    backgroundColor: previewTheme.yellow,
    borderColor: previewTheme.outline,
  },
  branchCardTitle: {
    color: previewTheme.ink,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: montserrat.extrabold,
  },
  branchCardTitleActive: {
    color: previewTheme.ink,
  },
  branchCardMeta: {
    color: previewTheme.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    fontFamily: montserrat.semibold,
  },
  branchCardMetaActive: {
    color: previewTheme.inkSoft,
  },
  similarRow: {
    gap: 12,
    paddingRight: 8,
  },
  similarCard: {
    width: 176,
    borderRadius: 26,
    backgroundColor: previewTheme.cream,
    overflow: 'hidden',
    borderWidth: outlineWidths.control,
    borderColor: previewTheme.outlineSoft,
    paddingBottom: 12,
  },
  similarImage: {
    width: '100%',
    height: 132,
  },
  similarTitle: {
    color: previewTheme.ink,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingTop: 12,
    fontFamily: montserrat.extrabold,
  },
  similarMeta: {
    color: previewTheme.muted,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingTop: 4,
    fontFamily: montserrat.semibold,
  },
});
