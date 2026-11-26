import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Gym } from '../types/gym';

const FAVORITES_KEY = 'gymfinder:favorites:v1';

function isGym(value: unknown): value is Gym {
  if (!value || typeof value !== 'object') return false;
  const gym = value as Partial<Gym>;
  return (
    typeof gym._id === 'string' &&
    typeof gym.name === 'string' &&
    typeof gym.location?.coordinates?.[0] === 'number' &&
    typeof gym.location?.coordinates?.[1] === 'number' &&
    Array.isArray(gym.amenities) &&
    typeof gym.is24Hours === 'boolean'
  );
}

export async function getFavorites(): Promise<Gym[]> {
  const saved = await AsyncStorage.getItem(FAVORITES_KEY);
  if (saved === null) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isGym)) {
    throw new Error('Saved favorites are invalid. Clear app storage and try again.');
  }
  return parsed;
}

export async function saveFavorites(gyms: readonly Gym[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(gyms));
}

export async function setFavorite(
  gym: Gym,
  shouldBeFavorite: boolean,
): Promise<Gym[]> {
  const current = await getFavorites();
  const next = current.filter((saved) => saved._id !== gym._id);
  if (shouldBeFavorite) next.unshift(gym);
  await saveFavorites(next);
  return next;
}
