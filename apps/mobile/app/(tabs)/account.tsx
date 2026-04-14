import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAvatar, AppBookmarkButton, AppSegmentedTabs, spotsUi } from '@/components/app-ui';
import { useAuthStore } from '@/lib/auth-store';
import { useBookmarksStore } from '@/lib/bookmarks-store';
import { formatApproxBudgetPerPersonLabel, getEffectiveSpotDistanceKm } from '@/lib/explore-filters';
import { formatLikesCount, useLikesStore } from '@/lib/likes-store';
import {
  aggregatePlaceSpotsFromList,
  getBranchLocationLabel,
  getSpotFeedSubtitle,
  type Spot,
} from '@/lib/mock-spots';
import { useRelayoutSubscription } from '@/lib/relayout';
import { useSpotsStore } from '@/lib/spots-store';

type AccountTab = 'saved' | 'parches';
type AccountLayoutMode = 'editorial' | 'grid' | 'list';

const exploreFoodIcon = require('../../assets/explore_food_icon.png');
const exploreCinemaIcon = require('../../assets/explore_cinema_icon.png');
const exploreArtIcon = require('../../assets/explore_art_icon.png');
const exploreNightlifeIcon = require('../../assets/explore_nightlife_icon.png');
const exploreSportsIcon = require('../../assets/explore_sports_icon.png');
const exploreFamilyIcon = require('../../assets/explore_family_icon.png');
const exploreEventsIcon = require('../../assets/explore_events_icon.png');
const exploreNatureIcon = require('../../assets/explore_nature_icon.png');

function getCategoryImage(category: Spot['category']) {
  switch (category) {
    case 'Arte y cultura':
      return exploreArtIcon;
    case 'Bares y noche':
      return exploreNightlifeIcon;
    case 'Cine':
      return exploreCinemaIcon;
    case 'Restaurantes y cafés':
    case 'Restaurantes':
      return exploreFoodIcon;
    case 'Eventos':
      return exploreEventsIcon;
    case 'Deporte y bienestar':
      return exploreSportsIcon;
    case 'Familiar':
    case 'Pet friendly':
      return exploreFamilyIcon;
    case 'Naturaleza y aire libre':
      return exploreNatureIcon;
    default:
      return null;
  }
}

const layoutModes: Array<{
  key: AccountLayoutMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}> = [
  { key: 'editorial', icon: 'albums-outline', label: 'Editorial' },
  { key: 'grid', icon: 'grid-outline', label: 'Grid' },
  { key: 'list', icon: 'list-outline', label: 'Lista' },
];

function getCategoryIcon(category: Spot['category']): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'Arte y cultura':
      return 'color-palette-outline';
    case 'Bares y noche':
      return 'wine-outline';
    case 'Cine':
      return 'film-outline';
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

function getCategoryAccent(category: Spot['category']) {
  switch (category) {
    case 'Arte y cultura':
      return '#6B1D4A';
    case 'Bares y noche':
      return '#FF2D55';
    case 'Cine':
      return '#1B1464';
    case 'Restaurantes y cafés':
    case 'Restaurantes':
      return '#F5C400';
    case 'Eventos':
      return '#FF6B00';
    case 'Deporte y bienestar':
      return '#00C48C';
    case 'Familiar':
      return '#FFB6D9';
    case 'Pet friendly':
      return '#00C48C';
    case 'Naturaleza y aire libre':
      return '#C8E600';
    default:
      return spotsUi.textSecondary;
  }
}

function getPriceLabel(spot: Spot) {
  return formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget);
}

function getFeedMinPriceLabel(spot: Spot) {
  return formatApproxBudgetPerPersonLabel(spot.minBudget, spot.maxBudget);
}

function getPreferredDetailBranchId(spot: Spot) {
  if (spot.type !== 'place') {
    return null;
  }

  const branchCandidates = spot.branches && spot.branches.length > 0 ? spot.branches : [spot];
  if (!branchCandidates.length) {
    return null;
  }

  let preferredBranch = branchCandidates[0] ?? null;
  let bestDistance = preferredBranch ? getEffectiveSpotDistanceKm(preferredBranch, null) : null;

  branchCandidates.slice(1).forEach((branch) => {
    const branchDistance = getEffectiveSpotDistanceKm(branch, null);

    if (branchDistance === null) {
      return;
    }

    if (bestDistance === null || branchDistance < bestDistance) {
      preferredBranch = branch;
      bestDistance = branchDistance;
    }
  });

  return preferredBranch?.id ?? null;
}

function getSpotHref(spot: Spot) {
  const preferredBranchId = getPreferredDetailBranchId(spot);

  if (!preferredBranchId) {
    return `/spot/${spot.id}`;
  }

  return `/spot/${preferredBranchId}`;
}

const accountUi = {
  bg: '#f5f5f7',
  surface: '#ffffff',
  surfaceMuted: '#ededf0',
  text: '#141417',
  textSecondary: '#5f5f67',
  textTertiary: '#8b8b94',
  accent: '#EF3857',
  accentSoft: 'rgba(239,56,87,0.12)',
};

export default function AccountScreen() {
  useRelayoutSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { avatarUrl, fullName, signOut, user } = useAuthStore();
  const { spots } = useSpotsStore();
  const { getLikesCount, isLiked } = useLikesStore();
  const { isBookmarked, toggleBookmark } = useBookmarksStore();
  const [activeTab, setActiveTab] = useState<AccountTab>('saved');
  const [layoutMode, setLayoutMode] = useState<AccountLayoutMode>('editorial');
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const headerOpacity = useState(() => new Animated.Value(0))[0];
  const headerTranslateY = useState(() => new Animated.Value(14))[0];
  const profileOpacity = useState(() => new Animated.Value(0))[0];
  const profileTranslateY = useState(() => new Animated.Value(18))[0];
  const contentOpacity = useState(() => new Animated.Value(0))[0];
  const contentTranslateY = useState(() => new Animated.Value(24))[0];

  const firstName = useMemo(() => {
    if (fullName.trim()) {
      return fullName.trim().split(' ')[0];
    }

    const email = user?.email ?? '';
    return email ? email.split('@')[0] : 'Tu cuenta';
  }, [fullName, user?.email]);

  const savedSpots = useMemo(
    () =>
      aggregatePlaceSpotsFromList(
        spots.filter((spot) => spot.type === 'place' && isBookmarked(spot.likeTargetId)),
      ),
    [isBookmarked, spots],
  );
  const parches = useMemo(
    () => spots.filter((spot) => spot.type === 'event' && isLiked(spot.likeTargetId)),
    [isLiked, spots],
  );

  useFocusEffect(
    useMemo(
      () => () => {
        headerOpacity.setValue(0);
        headerTranslateY.setValue(14);
        profileOpacity.setValue(0);
        profileTranslateY.setValue(18);
        contentOpacity.setValue(0);
        contentTranslateY.setValue(24);

        Animated.parallel([
          Animated.parallel([
            Animated.timing(headerOpacity, {
              toValue: 1,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(headerTranslateY, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(40),
            Animated.parallel([
              Animated.timing(profileOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.spring(profileTranslateY, {
                toValue: 0,
                damping: 18,
                stiffness: 180,
                mass: 0.9,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.sequence([
            Animated.delay(90),
            Animated.parallel([
              Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.spring(contentTranslateY, {
                toValue: 0,
                damping: 18,
                stiffness: 175,
                mass: 0.92,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]).start();

        return () => undefined;
      },
      [
        contentOpacity,
        contentTranslateY,
        headerOpacity,
        headerTranslateY,
        profileOpacity,
        profileTranslateY,
      ],
    ),
  );

  async function handleSignOut() {
    try {
      setSigningOut(true);
      setMenuOpen(false);
      const error = await signOut();
      if (error) {
        return;
      }

      router.replace('/(auth)/login');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Modal
        animationType="fade"
        transparent
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuPanel} onPress={() => undefined}>
            <Pressable style={styles.menuItem} onPress={() => setMenuOpen(false)}>
              <Ionicons name="create-outline" size={17} color={accountUi.text} />
              <Text style={styles.menuItemText}>Editar perfil</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, signingOut && styles.menuItemDisabled]}
              disabled={signingOut}
              onPress={handleSignOut}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={accountUi.accent} />
              ) : (
                <Ionicons name="log-out-outline" size={17} color={accountUi.accent} />
              )}
              <Text style={styles.menuItemTextDanger}>
                {signingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: 32 + insets.bottom,
            flexGrow: 1,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          }}
        >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a explorar"
            hitSlop={10}
            onPress={() => router.replace('/(tabs)/explore')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={20} color={accountUi.text} />
          </Pressable>

          <View style={styles.headerMenuWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir acciones de cuenta"
              hitSlop={10}
              onPress={() => setMenuOpen((current) => !current)}
              style={styles.menuButton}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={accountUi.text} />
            </Pressable>
          </View>
        </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: profileOpacity,
            transform: [{ translateY: profileTranslateY }],
          }}
        >
        <View style={styles.profileRow}>
          <AppAvatar uri={avatarUrl} size={64} />
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{fullName || firstName}</Text>
            <Text style={styles.username}>{user?.email ?? 'tu@spots.com'}</Text>
          </View>
        </View>

        <AppSegmentedTabs
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { key: 'saved', label: 'Lugares' },
            { key: 'parches', label: 'Parches' },
          ]}
        />
        </Animated.View>

        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          }}
        >
        {activeTab === 'saved' ? (
          <>
            <View style={styles.resultsBar}>
              <View style={styles.resultsInfo}>
                <Text style={styles.resultsText}>{savedSpots.length} resultados</Text>
                <Text style={styles.resultsHint}>Tus lugares guardados</Text>
              </View>
              <View style={styles.layoutSwitcher}>
                {layoutModes.map((mode) => (
                  <Pressable
                    key={mode.key}
                    style={[
                      styles.layoutSwitcherButton,
                      layoutMode === mode.key && styles.layoutSwitcherButtonActive,
                    ]}
                    onPress={() => setLayoutMode(mode.key)}
                  >
                    <Ionicons
                      name={mode.icon}
                      size={18}
                      color={layoutMode === mode.key ? accountUi.text : accountUi.textSecondary}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {savedSpots.length > 0 ? renderSavedSpots(savedSpots, layoutMode, getLikesCount, isBookmarked, toggleBookmark) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Todavía no tienes guardados</Text>
                <Text style={styles.emptyMeta}>
                  Empieza a explorar y usa el bookmark para guardarlos aquí.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.resultsBar}>
              <View style={styles.resultsInfo}>
                <Text style={styles.resultsText}>{parches.length} resultados</Text>
                <Text style={styles.resultsHint}>Los parches que te han gustado</Text>
              </View>
              <View style={styles.layoutSwitcher}>
                {layoutModes.map((mode) => (
                  <Pressable
                    key={mode.key}
                    style={[
                      styles.layoutSwitcherButton,
                      layoutMode === mode.key && styles.layoutSwitcherButtonActive,
                    ]}
                    onPress={() => setLayoutMode(mode.key)}
                  >
                    <Ionicons
                      name={mode.icon}
                      size={18}
                      color={layoutMode === mode.key ? accountUi.text : accountUi.textSecondary}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {parches.length > 0 ? renderSavedSpots(parches, layoutMode, getLikesCount, isBookmarked, toggleBookmark) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Todavía no tienes parches guardados</Text>
                <Text style={styles.emptyMeta}>
                  Dale like a los parches que te interesen y te van a aparecer aqui.
                </Text>
              </View>
            )}
          </>
        )}
        </Animated.View>

      </ScrollView>
    </View>
  );
}

function renderSavedSpots(
  savedSpots: Spot[],
  layoutMode: AccountLayoutMode,
  getLikesCount: (spotId: string | number) => number,
  isBookmarked: (spotId: string | number) => boolean,
  toggleBookmark: (spotId: string | number) => Promise<void>,
) {
  if (layoutMode === 'grid') {
    return (
      <View style={styles.gridWrap}>
        {savedSpots.map((spot) => (
          <Link key={spot.id} href={getSpotHref(spot)} asChild>
            <Pressable style={styles.gridCard}>
              <ImageBackground
                source={{ uri: spot.image }}
                style={styles.gridCardImage}
                imageStyle={styles.gridCardImageStyle}
              >
                <View style={styles.cardOverlay} />
                <View style={styles.gridCardMeta}>
                  <View style={styles.cardImageActions}>
                    {spot.type === 'place' ? (
                      <AppBookmarkButton
                        bookmarked={isBookmarked(spot.likeTargetId)}
                        onPress={(event) => {
                          event?.stopPropagation?.();
                          event?.preventDefault?.();
                          void toggleBookmark(spot.likeTargetId);
                        }}
                        activeColor={accountUi.text}
                      />
                    ) : null}
                    <View style={styles.categoryChip}>
                      {getCategoryImage(spot.category) ? (
                        <Image source={getCategoryImage(spot.category)} style={styles.categoryChipImage} />
                      ) : (
                        <Ionicons
                          name={getCategoryIcon(spot.category)}
                          size={14}
                          color={getCategoryAccent(spot.category)}
                        />
                      )}
                    </View>
                  </View>
                </View>
              </ImageBackground>
              <View style={styles.gridCardBody}>
                <Text numberOfLines={2} style={styles.gridCardTitle}>
                  {spot.type === 'event' ? spot.name : spot.brandName}
                </Text>
                <View style={styles.gridCardFooter}>
                  <View style={styles.feedMetaInline}>
                    <View style={styles.feedMetaGroup}>
                      <Ionicons name="location-outline" size={12} color={accountUi.textSecondary} />
                      <Text numberOfLines={1} style={styles.feedMetaText}>
                        {spot.type === 'event'
                          ? getSpotFeedSubtitle(spot)
                          : (spot.branchCount ?? 0) > 1
                            ? `${spot.branchCount ?? 0} sedes`
                            : getBranchLocationLabel(spot)}
                      </Text>
                    </View>
                    <Text style={styles.accountLikeText}>
                      ♥ {formatLikesCount(getLikesCount(spot.likeTargetId))}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    );
  }

  if (layoutMode === 'list') {
    return (
      <View style={styles.listWrap}>
        {savedSpots.map((spot) => (
          <Link key={spot.id} href={getSpotHref(spot)} asChild>
            <Pressable style={styles.listCard}>
              <ImageBackground
                source={{ uri: spot.image }}
                style={styles.listCardImage}
                imageStyle={styles.listCardImageStyle}
              >
                <View style={styles.cardOverlay} />
                <View style={styles.listCardImageMeta}>
                  <View style={styles.cardImageActions}>
                    {spot.type === 'place' ? (
                      <AppBookmarkButton
                        bookmarked={isBookmarked(spot.likeTargetId)}
                        onPress={(event) => {
                          event?.stopPropagation?.();
                          event?.preventDefault?.();
                          void toggleBookmark(spot.likeTargetId);
                        }}
                        activeColor={accountUi.text}
                      />
                    ) : null}
                    <View style={styles.categoryChip}>
                      {getCategoryImage(spot.category) ? (
                        <Image source={getCategoryImage(spot.category)} style={styles.categoryChipImage} />
                      ) : (
                        <Ionicons
                          name={getCategoryIcon(spot.category)}
                          size={14}
                          color={getCategoryAccent(spot.category)}
                        />
                      )}
                    </View>
                  </View>
                </View>
              </ImageBackground>
              <View style={styles.listCardBody}>
                <Text numberOfLines={2} style={styles.listCardTitle}>
                  {spot.type === 'event' ? spot.name : spot.brandName}
                </Text>
                <Text numberOfLines={2} style={styles.listCardSubtitle}>
                  {spot.shortDescription}
                </Text>
                <View style={styles.listCardFooter}>
                  <View style={styles.feedMetaInline}>
                    <View style={styles.feedMetaGroup}>
                      <Ionicons name="location-outline" size={12} color={accountUi.textSecondary} />
                      <Text numberOfLines={1} style={styles.feedMetaText}>
                        {getSpotFeedSubtitle(spot)}
                      </Text>
                    </View>
                    <View style={styles.feedPriceInline}>
                      <Ionicons name="cash-outline" size={12} color={accountUi.textSecondary} />
                      <Text style={styles.feedMetaText}>{getFeedMinPriceLabel(spot)}</Text>
                    </View>
                  </View>
                  <Text style={styles.accountLikeText}>
                    ♥ {formatLikesCount(getLikesCount(spot.likeTargetId))}
                  </Text>
                </View>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.editorialWrap}>
      {savedSpots.map((spot) => (
        <Link key={spot.id} href={getSpotHref(spot)} asChild>
          <Pressable style={styles.card}>
            <ImageBackground
              source={{ uri: spot.image }}
              style={styles.cardImage}
              imageStyle={styles.cardImageStyle}
            >
              <View style={styles.cardOverlay} />
              <View style={styles.cardImageMeta}>
                <View style={styles.cardImageActions}>
                  {spot.type === 'place' ? (
                    <AppBookmarkButton
                      bookmarked={isBookmarked(spot.likeTargetId)}
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        event?.preventDefault?.();
                        void toggleBookmark(spot.likeTargetId);
                      }}
                      activeColor={accountUi.text}
                    />
                  ) : null}
                  <View style={styles.categoryChip}>
                    {getCategoryImage(spot.category) ? (
                      <Image source={getCategoryImage(spot.category)} style={styles.categoryChipImage} />
                    ) : (
                      <Ionicons
                        name={getCategoryIcon(spot.category)}
                        size={14}
                        color={getCategoryAccent(spot.category)}
                      />
                    )}
                  </View>
                </View>
              </View>
            </ImageBackground>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {spot.type === 'event' ? spot.name : spot.brandName}
              </Text>
              <View style={styles.cardFooterRow}>
                <View style={styles.feedMetaInline}>
                  <View style={styles.feedMetaGroup}>
                    <Ionicons name="location-outline" size={12} color={accountUi.textSecondary} />
                    <Text style={styles.feedMetaText}>
                      {getSpotFeedSubtitle(spot)}
                    </Text>
                  </View>
                  <View style={styles.feedPriceInline}>
                    <Ionicons name="cash-outline" size={12} color={accountUi.textSecondary} />
                    <Text style={styles.feedMetaText}>{getFeedMinPriceLabel(spot)}</Text>
                  </View>
                  <Text style={styles.accountLikeText}>
                    ♥ {formatLikesCount(getLikesCount(spot.likeTargetId))}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: accountUi.bg,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 64,
    paddingRight: 16,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 30,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: accountUi.surface,
  },
  headerMenuWrap: {
    position: 'relative',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: accountUi.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuPanel: {
    minWidth: 178,
    borderRadius: 20,
    backgroundColor: accountUi.surface,
    padding: 8,
    gap: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  menuItem: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemDisabled: {
    opacity: 0.75,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: accountUi.text,
  },
  menuItemTextDanger: {
    fontSize: 15,
    fontWeight: '600',
    color: accountUi.accent,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: accountUi.surfaceMuted,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: accountUi.text,
  },
  username: {
    fontSize: 15,
    color: accountUi.textSecondary,
  },
  segmented: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: accountUi.surfaceMuted,
    borderRadius: 18,
    padding: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  segmentTab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: accountUi.surface,
  },
  segmentTabInactive: {
    backgroundColor: 'transparent',
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: accountUi.text,
  },
  segmentLabelInactive: {
    color: accountUi.textSecondary,
  },
  resultsBar: {
    paddingHorizontal: 4,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  resultsInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  resultsText: {
    color: accountUi.text,
    fontWeight: '600',
  },
  resultsHint: {
    color: accountUi.textSecondary,
    fontWeight: '600',
  },
  layoutSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  layoutSwitcherButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: accountUi.surfaceMuted,
  },
  layoutSwitcherButtonActive: {
    backgroundColor: accountUi.surface,
  },
  editorialWrap: {
    gap: 18,
  },
  card: {
    gap: 12,
    borderRadius: 24,
  },
  cardImage: {
    height: 188,
    justifyContent: 'space-between',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardImageStyle: {
    resizeMode: 'cover',
    borderRadius: 24,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  cardImageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardImageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardBody: {
    gap: 8,
    paddingHorizontal: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: accountUi.text,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLocationText: {
    fontSize: 14,
    fontWeight: '400',
    color: accountUi.textSecondary,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  feedMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  feedMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  feedPriceInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  feedMetaText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    color: accountUi.textSecondary,
  },
  accountLikeText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    color: accountUi.accent,
  },
  categoryChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(20,20,23,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryChipImage: {
    width: 24,
    height: 24,
  },
  cardSupportText: {
    fontSize: 13,
    fontWeight: '700',
    color: accountUi.text,
  },
  cardLikes: {
    fontSize: 13,
    fontWeight: '600',
    color: accountUi.accent,
    backgroundColor: accountUi.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridCard: {
    width: '48%',
    gap: 10,
  },
  gridCardImage: {
    height: 150,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  gridCardImageStyle: {
    resizeMode: 'cover',
    borderRadius: 22,
  },
  gridCardMeta: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  gridCardBody: {
    gap: 8,
    paddingHorizontal: 2,
  },
  gridCardTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: accountUi.text,
  },
  gridCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  listWrap: {
    gap: 0,
  },
  listCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e7eb',
  },
  listCardImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    backgroundColor: accountUi.surfaceMuted,
  },
  listCardImageStyle: {
    resizeMode: 'cover',
    borderRadius: 16,
  },
  listCardImageMeta: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  listCardBody: {
    flex: 1,
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  listCardTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '600',
    color: accountUi.text,
  },
  listCardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    color: accountUi.textSecondary,
  },
  listCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  emptyCard: {
    borderRadius: 24,
    backgroundColor: accountUi.surface,
    padding: 22,
    gap: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: accountUi.text,
  },
  emptyMeta: {
    fontSize: 15,
    lineHeight: 22,
    color: accountUi.textSecondary,
  },
});
