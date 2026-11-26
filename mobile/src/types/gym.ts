export interface Gym {
  _id: string;
  name: string;
  address: string | null;
  barangay: string | null;
  city: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  pricePerMonth: number | null;
  pricePerSession: number | null;
  rating: number | null;
  totalReviews: number | null;
  amenities: string[];
  hours: string | null;
  is24Hours: boolean;
  phone: string | null;
  image: string | null;
  source: 'manual' | 'osm';
  isActive: boolean;
  distanceMeters?: number;
  osmType?: string;
  osmId?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GymFilters {
  search?: string;
  amenity?: string | null;
  maxPrice?: number | null;
}
