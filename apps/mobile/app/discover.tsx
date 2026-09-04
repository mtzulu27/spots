import { useLocalSearchParams } from 'expo-router';
import { ExploreDiscovery } from '@/components/explore-discovery';
import { useSpotsStore } from '@/lib/spots-store';
import { useBookmarksStore } from '@/lib/bookmarks-store';
import { aggregatePlaceSpotsFromList } from '@/lib/mock-spots';
import { matchesSpotToFilters, parseFiltersFromParams } from '@/lib/explore-filters';

export default function DiscoverScreen() {
  const params = useLocalSearchParams();
  const { spots } = useSpotsStore();
  const { isBookmarked, toggleBookmark } = useBookmarksStore();
  const filters = parseFiltersFromParams(params);
  const query = typeof params.query === 'string' ? params.query : '';
  const places = aggregatePlaceSpotsFromList(spots.filter(spot => spot.type === 'place' && matchesSpotToFilters(spot, filters, query)));
  return <ExploreDiscovery listing avatar={null} name="" query={query} onQuery={() => {}} onFilters={() => {}} onNotifications={() => {}} onCategory={() => {}} selected={filters.interests} spots={places} isSaved={isBookmarked} toggleSaved={toggleBookmark} href={spot => `/spot/${spot.id}`} onAll={() => {}} onMap={() => {}} onSuggest={() => {}} />;
}
