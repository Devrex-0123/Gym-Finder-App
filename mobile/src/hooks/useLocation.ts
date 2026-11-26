import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Coordinates } from '../types/gym';

export const DEFAULT_LOCATION: Coordinates = {
  latitude: 10.3109,
  longitude: 123.9494,
};

export function useLocation() {
  const [location, setLocation] = useState<Coordinates>(DEFAULT_LOCATION);
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function locate() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (active) {
            setError('Location access was denied. Showing gyms near Lapu-Lapu City Hall.');
          }
          return;
        }

        const result = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (active) {
          setLocation({
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
          });
          setHasUserLocation(true);
        }
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error
              ? `Could not read your location: ${reason.message}`
              : 'Could not read your location. Showing Lapu-Lapu City.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void locate();
    return () => {
      active = false;
    };
  }, []);

  return { location, hasUserLocation, loading, error };
}
