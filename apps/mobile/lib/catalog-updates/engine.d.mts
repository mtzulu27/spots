export type CatalogRecord = { spotId: number; branchId: number | null; active: boolean; name: string; slug: string; facts: Record<string, unknown> };
export type CatalogSnapshot = Record<string, CatalogRecord>;
export type CatalogEvent = { id: string; firstOccurredAt?: string; memberIds?: string[]; type: 'newPlace' | 'newBranch' | 'updatedPlace'; name: string; slug: string; spotId: number; branchId: number | null; occurredAt: string; description: string; fields: string[] };
export function projectCatalog(catalog: unknown): CatalogSnapshot;
export function diffCatalog(previous: CatalogSnapshot | null, next: CatalogSnapshot, occurredAt: string): CatalogEvent[];
export function mergeEvents(...lists: CatalogEvent[][]): CatalogEvent[];

export function condenseUpdates(events: CatalogEvent[]): CatalogEvent[];
