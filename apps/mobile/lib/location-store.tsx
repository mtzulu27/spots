import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UserLocation = {
  latitude: number;
  longitude: number;
};

type LocationLabel = string | null;

type LocationStoreValue = {
  userLocation: UserLocation | null;
  locationLabel: LocationLabel;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
};

async function reverseGeocode(location: UserLocation) {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (token) {
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${location.longitude},${location.latitude}.json?types=place,country&limit=2&language=es&access_token=${token}`);
      if (response.ok) {
        const payload = await response.json();
        const features: Array<{ place_type?: string[]; text?: string; place_name?: string; context?: Array<{ id?: string; text?: string }> }> = Array.isArray(payload?.features) ? payload.features : [];
        const cityFeature = features.find(feature => feature?.place_type?.some(type => ['place', 'locality', 'district'].includes(type))) || features[0];
        const city = cityFeature?.text || cityFeature?.place_name?.split(',')[0]?.trim();
        const country = features.find(feature => feature?.place_type?.includes('country'))?.text || cityFeature?.context?.find(item => item.id?.startsWith('country.'))?.text || cityFeature?.place_name?.split(',').map(part => part.trim()).filter(Boolean).at(-1);
        if (city && country) return `${city}, ${country}`;
      }
    } catch {}
  }
  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.latitude}&longitude=${location.longitude}&localityLanguage=es`);
    if (!response.ok) return null;
    const payload = await response.json();
    const city = payload.city || payload.locality || payload.principalSubdivision;
    return city && payload.countryName ? `${city}, ${payload.countryName}` : null;
  } catch {
    return null;
  }
}

const LocationStoreContext = createContext<LocationStoreValue>({
  userLocation: null,
  locationLabel: null,
  loading: false,
  error: null,
  requestLocation: () => undefined,
});

export function LocationStoreProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState<LocationLabel>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function requestLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLoading(false);
      setError('Geolocalizacion no disponible en este dispositivo');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(nextLocation);
        setLocationLabel(null);
        void reverseGeocode(nextLocation).then(label => {
          if (label) setLocationLabel(label);
        });
        setError(null);
        setLoading(false);
      },
      (positionError) => {
        setError(positionError.message || 'No pudimos obtener tu ubicación');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      },
    );
  }

  useEffect(() => {
    requestLocation();
  }, []);

  const value = useMemo(
    () => ({
      userLocation,
      locationLabel,
      loading,
      error,
      requestLocation,
    }),
    [error, loading, locationLabel, userLocation],
  );

  return (
    <LocationStoreContext.Provider value={value}>
      {children}
    </LocationStoreContext.Provider>
  );
}

export function useLocationStore() {
  return useContext(LocationStoreContext);
}
