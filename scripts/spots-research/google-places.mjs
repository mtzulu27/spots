import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_ROOT = 'https://places.googleapis.com/v1';
const SEARCH_FIELDS = ['places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.businessStatus', 'places.googleMapsUri'];
const DETAIL_FIELDS = ['id', 'displayName', 'formattedAddress', 'addressComponents', 'location', 'businessStatus', 'googleMapsUri', 'nationalPhoneNumber', 'internationalPhoneNumber', 'regularOpeningHours', 'currentOpeningHours', 'websiteUri', 'priceLevel', 'types', 'primaryType', 'primaryTypeDisplayName', 'photos'];

function required(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function normalizePlace(place) {
  return {
    placeId: place.id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    businessStatus: place.businessStatus || 'BUSINESS_STATUS_UNSPECIFIED',
    googleMapsUrl: place.googleMapsUri || '',
    phone: place.nationalPhoneNumber || '',
    internationalPhone: place.internationalPhoneNumber || '',
    website: place.websiteUri || '',
    priceLevel: place.priceLevel || '',
    primaryType: place.primaryType || '',
    primaryTypeLabel: place.primaryTypeDisplayName?.text || '',
    types: place.types || [],
    regularHours: place.regularOpeningHours?.weekdayDescriptions || [],
    currentHours: place.currentOpeningHours?.weekdayDescriptions || [],
    addressComponents: place.addressComponents || [],
    photos: (place.photos || []).map(photo => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      authorAttributions: photo.authorAttributions || [],
    })),
  };
}

export async function searchPlaces({ query, apiKey, latitude, longitude, radiusMeters = 40000, fetchImpl = fetch }) {
  required(query, 'Falta query');
  required(apiKey, 'Falta GOOGLE_PLACES_API_KEY');
  const body = { textQuery: query, languageCode: 'es', regionCode: 'CO', maxResultCount: 5 };
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    body.locationBias = { circle: { center: { latitude, longitude }, radius: radiusMeters } };
  }
  const response = await fetchImpl(`${API_ROOT}/places:searchText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': SEARCH_FIELDS.join(',') },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Google Places search ${response.status}: ${await response.text()}`);
  return (await response.json()).places?.map(normalizePlace) || [];
}

export async function getPlaceDetails({ placeId, apiKey, fetchImpl = fetch }) {
  required(placeId, 'Falta placeId');
  required(apiKey, 'Falta GOOGLE_PLACES_API_KEY');
  const response = await fetchImpl(`${API_ROOT}/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=CO`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': DETAIL_FIELDS.join(',') },
  });
  if (!response.ok) throw new Error(`Google Places details ${response.status}: ${await response.text()}`);
  return normalizePlace(await response.json());
}

export function createEvidence({ query, candidates, selected, checkedAt = new Date().toISOString() }) {
  return {
    version: 1,
    provider: 'google_places_new',
    query,
    checkedAt,
    candidateCount: candidates.length,
    candidates,
    selected: selected || null,
    selectionStatus: selected ? 'candidate_selected' : 'needs_identity_review',
    note: 'La API aporta evidencia publica; la coincidencia de identidad y sede debe validarse antes de editar el catalogo.',
  };
}

function parseArgs(args) {
  const result = { radiusMeters: 40000 };
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (key === '--query') result.query = value;
    else if (key === '--output') result.output = value;
    else if (key === '--place-id') result.placeId = value;
    else if (key === '--lat') result.latitude = Number(value);
    else if (key === '--lng') result.longitude = Number(value);
    else if (key === '--radius') result.radiusMeters = Number(value);
    else throw new Error(`Argumento desconocido: ${key}`);
    index += 1;
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    required(options.query, 'Uso: google-places.mjs --query "Lugar Cali" --output evidencia.json [--place-id ID] [--lat N --lng N]');
    required(options.output, 'Falta --output');
    const apiKey = required(process.env.GOOGLE_PLACES_API_KEY, 'Falta GOOGLE_PLACES_API_KEY en el entorno');
    const candidates = await searchPlaces({ ...options, apiKey });
    const selectedId = options.placeId || (candidates.length === 1 ? candidates[0].placeId : null);
    const selected = selectedId ? await getPlaceDetails({ placeId: selectedId, apiKey }) : null;
    const evidence = createEvidence({ query: options.query, candidates, selected });
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    const temporary = `${options.output}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`);
    fs.renameSync(temporary, options.output);
    console.log(JSON.stringify({ output: options.output, candidateCount: candidates.length, selected: selected?.placeId || null }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
