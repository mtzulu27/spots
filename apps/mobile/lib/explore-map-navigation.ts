import { DEFAULT_FILTERS, serializeFilters, type ExploreFilters } from './explore-filters';

export type ExploreResultsSnapshot = {
  filters: ExploreFilters;
  query: string;
  resultsMode: boolean;
};

export function captureExploreResults(filters: ExploreFilters, query: string, resultsMode: boolean): ExploreResultsSnapshot {
  return {
    filters: { ...filters, interests: [...filters.interests], hubName: [...filters.hubName], days: [...filters.days] },
    query,
    resultsMode,
  };
}

export function getExploreResultsParams(snapshot: ExploreResultsSnapshot) {
  return { ...serializeFilters(snapshot.filters), tab: 'places', query: snapshot.query,
    results: snapshot.resultsMode ? '1' : '', view: '' };
}

export function getExploreHomeParams() {
  return { ...serializeFilters(DEFAULT_FILTERS), tab: 'places', query: '', results: '', view: '' };
}
