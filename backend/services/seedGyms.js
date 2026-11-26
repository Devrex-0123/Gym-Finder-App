import Gym from '../models/Gym.js';
import { fetchOsmGyms } from './overpass.js';

export const DEFAULT_SEED_CENTER = {
  lat: 10.3109,
  lng: 123.9494,
};

function distanceMeters(fromLat, fromLng, coordinates) {
  const [toLng, toLat] = coordinates;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(toLat - fromLat);
  const longitudeDifference = radians(toLng - fromLng);
  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(fromLat)) *
      Math.cos(radians(toLat)) *
      Math.sin(longitudeDifference / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function seedOsmGyms({
  lat = DEFAULT_SEED_CENTER.lat,
  lng = DEFAULT_SEED_CENTER.lng,
  radius = 15000,
  limit = 15,
} = {}) {
  const requested = Math.min(Math.max(Number(limit) || 15, 1), 15);
  const osmGyms = await fetchOsmGyms({ lat, lng, radius });
  const gymsToSave = [...osmGyms]
    .sort(
      (left, right) =>
        distanceMeters(lat, lng, left.location.coordinates) -
        distanceMeters(lat, lng, right.location.coordinates),
    )
    .slice(0, requested);

  if (gymsToSave.length === 0) {
    return {
      requested,
      available: 0,
      saved: 0,
      gyms: [],
    };
  }

  const operations = gymsToSave.map((gym) => {
    const { _id, ...fields } = gym;
    return {
      updateOne: {
        filter: { source: 'osm', osmType: gym.osmType, osmId: gym.osmId },
        update: { $set: fields },
        upsert: true,
      },
    };
  });

  await Gym.bulkWrite(operations, { ordered: false });

  const gyms = await Gym.find({
    source: 'osm',
    $or: gymsToSave.map((gym) => ({
      osmType: gym.osmType,
      osmId: gym.osmId,
    })),
  })
    .sort({ name: 1 })
    .lean();

  return {
    requested,
    available: osmGyms.length,
    saved: gyms.length,
    gyms,
  };
}
