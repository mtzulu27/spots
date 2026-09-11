import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreMapDiscovery } from '@/components/explore-map-discovery';
import { FiltersSheet } from '@/components/filters-sheet';
import { useSpotsStore } from '@/lib/spots-store';
import { useBookmarksStore } from '@/lib/bookmarks-store';
import { useLocationStore } from '@/lib/location-store';
import { aggregatePlaceSpotsFromList } from '@/lib/mock-spots';
import { DEFAULT_FILTERS, matchesSpotToFilters } from '@/lib/explore-filters';

export default function PlaceMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ branch?: string; returnSpot?: string }>();
  const { spots } = useSpotsStore();
  const { isBookmarked, toggleBookmark } = useBookmarksStore();
  const { userLocation } = useLocationStore();
  // Opening a place on the map must not inherit filters from Explore.
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const places = useMemo(() => aggregatePlaceSpotsFromList(spots.filter(spot =>
    spot.type === 'place' && matchesSpotToFilters(spot, filters, '', userLocation),
  )), [spots, filters, userLocation]);
  const activeFiltersCount = [
    filters.interests.length > 0, filters.hubName.length > 0,
    filters.people !== DEFAULT_FILTERS.people,
    filters.minBudget !== DEFAULT_FILTERS.minBudget,
    filters.maxBudget !== DEFAULT_FILTERS.maxBudget,
    filters.time !== DEFAULT_FILTERS.time || filters.period !== DEFAULT_FILTERS.period,
    filters.days.length > 0, filters.distance !== DEFAULT_FILTERS.distance,
    filters.openNowOnly, filters.hideManuallyAdjusted,
  ].filter(Boolean).length;
  function returnToPlace() {
    if (router.canGoBack()) router.back();
    else if (params.returnSpot || params.branch) router.replace({
      pathname: '/spot/[id]',
      params: { id: params.returnSpot || params.branch!, branch: params.branch },
    });
    else router.replace('/(tabs)/explore');
  }
  return <View style={{ flex: 1 }}>
    <ExploreMapDiscovery
      spots={places}
      selected={filters.interests}
      activeFiltersCount={activeFiltersCount}
      locationFilters={filters.hubName}
      initialBranchId={params.branch}
      initialBranch={spots.find(spot => spot.id === params.branch)}
      onReturnToPlace={returnToPlace}
      onBack={() => router.navigate('/(tabs)/explore')}
      onCategory={value => setFilters(current => ({ ...current, interests: current.interests.includes(value) ? [] : [value] }))}
      onFilters={() => setFiltersOpen(true)}
      isSaved={isBookmarked}
      toggleSaved={toggleBookmark}
      href={spot => `/spot/${spot.id}`}
    />
    {filtersOpen && <FiltersSheet activeTab="places" initialFilters={filters} query="" hideSort onApply={next => { setFilters(next); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)} />}
  </View>;
}
