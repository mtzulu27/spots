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

type LocationStoreValue = {
  userLocation: UserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
};

const LocationStoreContext = createContext<LocationStoreValue>({
  userLocation: null,
  loading: false,
  error: null,
  requestLocation: () => undefined,
});

export function LocationStoreProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
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
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
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
      loading,
      error,
      requestLocation,
    }),
    [error, loading, userLocation],
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
