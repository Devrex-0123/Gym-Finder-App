import express from 'express';
import mongoose from 'mongoose';
import Gym from '../models/Gym.js';
import { fetchOsmGymById, fetchOsmGyms } from '../services/overpass.js';
import { saveOsmGyms, seedOsmGyms } from '../services/seedGyms.js';

const router = express.Router();
const DEFAULT_RADIUS_METERS = 15000;
const MAX_RADIUS_METERS = 50000;

function parseNumber(value, name, { min, max, fallback } = {}) {
  if (value === undefined && fallback !== undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw Object.assign(
      new TypeError(`${name} must be between ${min} and ${max}.`),
      { status: 400 },
    );
  }
  return parsed;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilters({ search, amenity, maxPrice }) {
  const clauses = [{ isActive: true }];

  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    clauses.push({
      $or: [
        { name: expression },
        { address: expression },
        { barangay: expression },
        { city: expression },
      ],
    });
  }

  if (amenity) {
    if (amenity.toLowerCase() === '24hrs') {
      clauses.push({ is24Hours: true });
    } else {
      clauses.push({
        amenities: { $regex: escapeRegex(amenity), $options: 'i' },
      });
    }
  }

  if (maxPrice !== undefined) {
    clauses.push({
      $or: [
        { pricePerMonth: { $lt: maxPrice } },
        { pricePerSession: { $lt: maxPrice } },
      ],
    });
  }

  return { $and: clauses };
}

function getDistanceMeters(fromLat, fromLng, coordinates) {
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

function requireSeedKey(req, res, next) {
  const configuredKey = process.env.SEED_API_KEY;

  if (!configuredKey) {
    return res.status(503).json({ error: 'Set SEED_API_KEY before enabling gym seeding.' });
  }
  if (configuredKey && req.get('x-seed-key') !== configuredKey) {
    return res.status(401).json({ error: 'A valid x-seed-key header is required.' });
  }
  next();
}

router.get('/nearby', async (req, res, next) => {
  try {
    const lat = parseNumber(req.query.lat, 'lat', { min: -90, max: 90 });
    const lng = parseNumber(req.query.lng, 'lng', { min: -180, max: 180 });
    const radius = parseNumber(req.query.radius, 'radius', {
      min: 1,
      max: MAX_RADIUS_METERS,
      fallback: DEFAULT_RADIUS_METERS,
    });
    const maxPrice =
      req.query.maxPrice === undefined
        ? undefined
        : parseNumber(req.query.maxPrice, 'maxPrice', { min: 0, max: 1000000 });
    const filters = buildFilters({
      search: String(req.query.search || '').trim(),
      amenity: String(req.query.amenity || '').trim(),
      maxPrice,
    });

    const findNearby = () =>
      Gym.find({
        ...filters,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: radius,
          },
        },
      })
        .limit(100)
        .lean();

    let gyms = await findNearby();

    // No gyms stored for this area yet: pull them from OpenStreetMap once,
    // cache them in MongoDB, then rerun the same filtered query.
    if (gyms.length === 0) {
      const radiusRadians = radius / 6378100;
      const hasAnyNearby = await Gym.exists({
        isActive: true,
        location: { $geoWithin: { $centerSphere: [[lng, lat], radiusRadians] } },
      });
      if (!hasAnyNearby) {
        await saveOsmGyms(await fetchOsmGyms({ lat, lng, radius }));
        gyms = await findNearby();
      }
    }

    res.json({
      gyms: gyms.map((gym) => ({
        ...gym,
        distanceMeters: getDistanceMeters(lat, lng, gym.location.coordinates),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/osm', async (req, res, next) => {
  try {
    const lat = parseNumber(req.query.lat, 'lat', { min: -90, max: 90 });
    const lng = parseNumber(req.query.lng, 'lng', { min: -180, max: 180 });
    const radius = parseNumber(req.query.radius, 'radius', {
      min: 1,
      max: MAX_RADIUS_METERS,
      fallback: DEFAULT_RADIUS_METERS,
    });
    const gyms = await fetchOsmGyms({ lat, lng, radius });
    res.json({ gyms });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const maxPrice =
      req.query.maxPrice === undefined
        ? undefined
        : parseNumber(req.query.maxPrice, 'maxPrice', { min: 0, max: 1000000 });
    const filters = buildFilters({
      search: String(req.query.search || '').trim(),
      amenity: String(req.query.amenity || '').trim(),
      maxPrice,
    });
    const gyms = await Gym.find(filters).sort({ name: 1 }).limit(200).lean();
    res.json({ gyms });
  } catch (error) {
    next(error);
  }
});

router.post('/seed', requireSeedKey, async (req, res, next) => {
  try {
    const result = await seedOsmGyms();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const osmIdMatch = /^osm-(node|way|relation)-(\d+)$/.exec(req.params.id);
    if (osmIdMatch) {
      const gym = await fetchOsmGymById(osmIdMatch[1], osmIdMatch[2]);
      if (!gym) return res.status(404).json({ error: 'Gym not found.' });
      return res.json({ gym });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid gym ID.' });
    }

    const gym = await Gym.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!gym) return res.status(404).json({ error: 'Gym not found.' });
    res.json({ gym });
  } catch (error) {
    next(error);
  }
});

export default router;
