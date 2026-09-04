import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAvatar, AppSegmentedTabs } from '@/components/app-ui';
import { useAuthStore } from '@/lib/auth-store';
import { ExploreGridCard } from '@/components/explore-grid-card';
import { GridColumnSelector } from '@/components/grid-column-selector';
import { Entrance } from '@/components/entrance';
import { getDiscoveryStatus } from '@/lib/discovery-ranking';
import { useLocationStore } from '@/lib/location-store';
import { accountUi } from '@/lib/account-ui';
import { useBookmarksStore } from '@/lib/bookmarks-store';
import { getEffectiveSpotDistanceKm } from '@/lib/explore-filters';
import {
  aggregatePlaceSpotsFromList,
  type Spot,
} from '@/lib/mock-spots';
import { useRelayoutSubscription } from '@/lib/relayout';
import { useSpotsStore } from '@/lib/spots-store';

type AccountTab = 'saved' | 'parches';
type RemovedBookmark = { id: string | number; name: string };
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

export default function AccountScreen() {
  useRelayoutSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { avatarUrl, fullName, signOut, user } = useAuthStore();
  const { spots } = useSpotsStore();
  const { isBookmarked, toggleBookmark } = useBookmarksStore();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<AccountTab>(params.tab === 'parches' ? 'parches' : 'saved');
  useEffect(() => { if (params.tab === 'parches') setActiveTab('parches'); }, [params.tab]);
  const [columns, setColumns] = useState<1 | 2>(1);
  const { userLocation } = useLocationStore();
  const [contentWidth, setContentWidth] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [removedBookmark, setRemovedBookmark] = useState<RemovedBookmark | null>(null);
  const pendingUndo = useRef<RemovedBookmark | null>(null);
  const dismissUndo = useCallback(() => {
    pendingUndo.current = null;
    setRemovedBookmark(null);
  }, []);

  useEffect(() => {
    if (!removedBookmark) return;
    const timer = setTimeout(dismissUndo, 8000);
    return () => clearTimeout(timer);
  }, [removedBookmark, dismissUndo]);

  useEffect(dismissUndo, [user?.id, dismissUndo]);
  useFocusEffect(useCallback(() => () => dismissUndo(), [dismissUndo]));

  async function removeBookmark(spot: Spot) {
    if (!isBookmarked(spot.likeTargetId)) return;
    const removal = { id: spot.likeTargetId, name: spot.brandName || spot.name };
    pendingUndo.current = removal;
    setRemovedBookmark(removal);
    await toggleBookmark(spot.likeTargetId);
  }

  async function undoRemoval() {
    const removal = pendingUndo.current;
    if (!removal) return;
    dismissUndo();
    if (!isBookmarked(removal.id)) await toggleBookmark(removal.id);
  }

  const headerOpacity = useState(() => new Animated.Value(0))[0];
  const headerTranslateY = useState(() => new Animated.Value(14))[0];
  const profileOpacity = useState(() => new Animated.Value(0))[0];
  const profileTranslateY = useState(() => new Animated.Value(18))[0];
  const contentOpacity = useState(() => new Animated.Value(0))[0];
  const contentTranslateY = useState(() => new Animated.Value(24))[0];

  const profileName = useMemo(() => {
    const registeredName = fullName.trim() || user?.user_metadata?.name;
    if (typeof registeredName === 'string' && registeredName.trim()) return registeredName.trim();
    return user?.email?.split('@')[0] || (!user ? 'Mateo' : 'Tu cuenta');
  }, [fullName, user]);

  const savedSpots = useMemo(
    () =>
      aggregatePlaceSpotsFromList(
        spots.filter((spot) => spot.type === 'place' && isBookmarked(spot.likeTargetId)),
      ),
    [isBookmarked, spots],
  );
  const parches = useMemo(
    () => spots.filter((spot) => spot.type === 'event' && isBookmarked(spot.likeTargetId)),
    [isBookmarked, spots],
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

  function renderSavedSpots(items: Spot[]) {
    const now = new Date();
    return <View style={styles.savedGrid}>{contentWidth > 0 && items.map((spot, index) => (
      <Entrance key={spot.id} index={index} trigger={`${activeTab}:${columns}`} style={{ width: (contentWidth - 16 * (columns - 1)) / columns }}>
        <ExploreGridCard
          spot={spot}
          columnCount={columns}
          distance={getEffectiveSpotDistanceKm(spot, userLocation)}
          label={getDiscoveryStatus(spot, now).label}
          bookmarked={isBookmarked(spot.likeTargetId)}
          onPress={() => router.push(getSpotHref(spot))}
          onToggleBookmark={() => removeBookmark(spot)}
        />
      </Entrance>
    ))}</View>;
  }

  return (
    <View style={styles.screen}>
      <Modal
        animationType="fade"
        transparent
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={[styles.menuBackdrop, { paddingTop: insets.top + 64 }]} onPress={() => setMenuOpen(false)}>
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
            paddingBottom: (removedBookmark ? 120 : 32) + insets.bottom,
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
            style={({ pressed }) => [styles.backButton, pressed && styles.controlPressed]}
          >
            <Ionicons name="chevron-back" size={20} color={accountUi.text} />
          </Pressable>

          <Text accessibilityRole="header" style={styles.headerTitle}>Mi cuenta</Text>
          <View style={styles.headerMenuWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir acciones de cuenta"
              hitSlop={10}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.menuButton, pressed && styles.controlPressed]}
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
          <AppAvatar uri={avatarUrl} size={42} />
          <View style={styles.profileCopy}>
            <Text numberOfLines={2} style={styles.name}>{profileName}</Text>
            <Text numberOfLines={1} style={styles.username}>{user?.email || 'Correo no disponible'}</Text>
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
        <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
        {(activeTab === 'saved' ? savedSpots : parches).length > 0 ? (
          <>
            <View style={styles.resultsBar}>
              <View style={styles.resultsInfo}>
                <Text style={styles.resultsText}>
                  {(activeTab === 'saved' ? savedSpots : parches).length}{' '}
                  {(activeTab === 'saved' ? savedSpots : parches).length === 1 ? 'resultado' : 'resultados'}
                </Text>
                <Text style={styles.resultsHint}>
                  {activeTab === 'saved' ? 'Tus lugares guardados' : 'Tus parches guardados'}
                </Text>
              </View>
              <GridColumnSelector columns={columns} onChange={setColumns} />
            </View>
            {renderSavedSpots(activeTab === 'saved' ? savedSpots : parches)}
          </>
        ) : (
          <View style={styles.emptyState} accessibilityLiveRegion="polite">
            <View accessible={false} importantForAccessibility="no-hide-descendants">
              <Ionicons name="bookmark-outline" size={64} color={accountUi.textTertiary} />
            </View>
            <View style={styles.emptyCopy}>
              <Text accessibilityRole="header" style={styles.emptyTitle}>
                {activeTab === 'saved' ? 'Aún no tienes lugares guardados' : 'Aún no tienes parches guardados'}
              </Text>
              <Text style={styles.emptyMeta}>
                {activeTab === 'saved'
                  ? 'Guarda los lugares que quieras visitar y encuéntralos aquí.'
                  : 'Guarda los parches que te interesen y encuéntralos aquí.'}
              </Text>
            </View>
          </View>
        )}
        </View>
        </Animated.View>

      </ScrollView>
      {removedBookmark && (
        <Entrance trigger={String(removedBookmark.id)} style={[styles.undoBar, { bottom: insets.bottom + 16 }]}>
          <Text accessibilityLiveRegion="polite" numberOfLines={2} style={styles.undoMessage}>
            Quitaste {removedBookmark.name} de guardados
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Deshacer: volver a guardar ${removedBookmark.name}`}
            onPress={() => void undoRemoval()}
            style={({ pressed }) => [styles.undoButton, pressed && styles.undoButtonPressed]}
          >
            <Text style={styles.undoLabel}>Deshacer</Text>
          </Pressable>
        </Entrance>
      )}
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
    paddingRight: 20,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 28,
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: accountUi.text,
    textAlign: 'center',
  },
  controlPressed: {
    backgroundColor: accountUi.surfaceMuted,
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
    borderRadius: 16,
    backgroundColor: accountUi.surface,
    padding: 8,
    gap: 4,
    shadowColor: accountUi.text,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
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
    gap: 12,
    marginBottom: 28,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: accountUi.text,
  },
  username: {
    fontSize: 12,
    lineHeight: 17,
    color: accountUi.textSecondary,
  },
  resultsBar: {
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  resultsInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  resultsText: {
    fontSize: 18,
    lineHeight: 24,
    color: accountUi.text,
    fontWeight: '600',
  },
  resultsHint: {
    fontSize: 12,
    lineHeight: 17,
    color: accountUi.textSecondary,
  },
  savedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  undoBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 16,
    backgroundColor: accountUi.textSecondary,
    padding: 12,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  undoMessage: {
    flex: 1,
    minWidth: 0,
    color: accountUi.surface,
    fontSize: 14,
    lineHeight: 20,
  },
  undoButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: accountUi.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoButtonPressed: { opacity: 0.7 },
  undoLabel: { color: accountUi.surface, fontSize: 14, fontWeight: '600' },
  emptyState: {
    minHeight: 300,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  emptyCopy: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: accountUi.text,
    textAlign: 'center',
  },
  emptyMeta: {
    fontSize: 14,
    lineHeight: 21,
    color: accountUi.textSecondary,
    textAlign: 'center',
  },
});
