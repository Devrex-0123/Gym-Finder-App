import axios from 'axios';
import type { Gym, GymFilters } from '../types/gym';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';

export const api = axios.create({
  baseURL,
  // The first nearby search in a new area can wait on OpenStreetMap
  // (backend retries for up to 70s).
  timeout: 90000,
  headers: { Accept: 'application/json' },
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected network error occurred.';
}

function toParams(filters: GymFilters = {}) {
  return {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.amenity ? { amenity: filters.amenity } : {}),
    ...(filters.maxPrice != null ? { maxPrice: filters.maxPrice } : {}),
  };
}

export async function getNearbyGyms(
  lat: number,
  lng: number,
  filters: GymFilters = {},
): Promise<Gym[]> {
  const { data } = await api.get<{ gyms: Gym[] }>('/api/gyms/nearby', {
    params: {
      lat,
      lng,
      radius: 15000,
      ...toParams(filters),
    },
  });
  return data.gyms;
}

export async function searchGyms(filters: GymFilters = {}): Promise<Gym[]> {
  const { data } = await api.get<{ gyms: Gym[] }>('/api/gyms', {
    params: toParams(filters),
  });
  return data.gyms;
}

export async function getGymById(id: string): Promise<Gym> {
  const { data } = await api.get<{ gym: Gym }>(
    `/api/gyms/${encodeURIComponent(id)}`,
  );
  return data.gym;
}

export async function getOSMGyms(
  lat: number,
  lng: number,
): Promise<Gym[]> {
  const { data } = await api.get<{ gyms: Gym[] }>('/api/gyms/osm', {
    params: { lat, lng },
  });
  return data.gyms;
}
