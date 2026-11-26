const DEFAULT_OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MAX_RADIUS_METERS = 50000;

function assertCoordinates(lat, lng, radius) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new TypeError('lat must be a number between -90 and 90.');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new TypeError('lng must be a number between -180 and 180.');
  }
  if (
    !Number.isFinite(radius) ||
    radius < 1 ||
    radius > MAX_RADIUS_METERS
  ) {
    throw new TypeError(`radius must be between 1 and ${MAX_RADIUS_METERS} meters.`);
  }
}

function buildAddress(tags) {
  if (tags['addr:full']) return tags['addr:full'];

  const street = [tags['addr:housenumber'], tags['addr:street']]
    .filter(Boolean)
    .join(' ');
  const locality = [
    tags['addr:suburb'],
    tags['addr:city'] || tags['addr:town'],
  ]
    .filter(Boolean)
    .join(', ');

  return [street, locality].filter(Boolean).join(', ') || null;
}

function collectAmenities(tags, is24Hours) {
  const amenities = new Set();
  const sports = String(tags.sport || '')
    .split(/[;,]/)
    .map((value) => value.trim().toLowerCase());

  if (sports.includes('boxing')) amenities.add('Boxing');
  if (sports.includes('yoga')) amenities.add('Yoga');
  if (
    tags.swimming_pool === 'yes' ||
    tags.pool === 'yes' ||
    tags.leisure === 'swimming_pool'
  ) {
    amenities.add('Pool');
  }
  if (tags.parking && tags.parking !== 'no') amenities.add('Parking');
  if (
    tags.female === 'only' ||
    tags['female:only'] === 'yes' ||
    tags.female_only === 'yes'
  ) {
    amenities.add('Women-only');
  }
  if (is24Hours) amenities.add('24hrs');

  return [...amenities];
}

function normalizeElement(element) {
  const tags = element.tags || {};
  const coordinates = element.center || element;
  const latitude = Number(coordinates.lat);
  const longitude = Number(coordinates.lon);
  const name = String(tags.name || '').trim();

  if (
    !name ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const hours = tags.opening_hours || null;
  const is24Hours =
    typeof hours === 'string' &&
    /24\s*\/\s*7|24\s*hours|00:00\s*-\s*24:00/i.test(hours);
  const image = tags.image && /^https?:\/\//i.test(tags.image) ? tags.image : null;

  return {
    _id: `osm-${element.type}-${element.id}`,
    name,
    address: buildAddress(tags),
    barangay: tags['addr:suburb'] || tags['addr:neighbourhood'] || null,
    city: tags['addr:city'] || tags['addr:town'] || null,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    pricePerMonth: null,
    pricePerSession: null,
    rating: null,
    totalReviews: null,
    amenities: collectAmenities(tags, is24Hours),
    hours,
    is24Hours,
    phone: tags.phone || tags['contact:phone'] || null,
    image,
    source: 'osm',
    isActive: true,
    osmType: element.type,
    osmId: Number(element.id),
  };
}

// Public Overpass servers often take 30-45s for a 15 km radius query and
// intermittently reject requests with 429/502/503/504 when busy.
const OVERPASS_TOTAL_BUDGET_MS = 70000;
const OVERPASS_RETRY_DELAY_MS = 3000;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

async function runOverpassQuery(query) {
  const deadline = Date.now() + OVERPASS_TOTAL_BUDGET_MS;
  let lastError;

  while (Date.now() < deadline) {
    try {
      return await runOverpassAttempt(query, deadline - Date.now());
    } catch (error) {
      lastError = error;
      if (!error.retryable || Date.now() + OVERPASS_RETRY_DELAY_MS >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, OVERPASS_RETRY_DELAY_MS));
    }
  }

  throw lastError;
}

async function runOverpassAttempt(query, timeoutMs) {
  const endpoint = process.env.OVERPASS_URL || DEFAULT_OVERPASS_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GymFinder/1.0 (OpenStreetMap Overpass client)',
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw Object.assign(new Error(`Overpass returned HTTP ${response.status}.`), {
        retryable: RETRYABLE_STATUSES.has(response.status),
      });
    }

    const payload = await response.json();
    if (!Array.isArray(payload.elements)) {
      throw new Error('Overpass returned an invalid response.');
    }

    return payload.elements;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw Object.assign(new Error('Overpass request timed out.'), { status: 502 });
    }
    if (!error.status) error.status = 502;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const FITNESS_SPORTS = /fitness|bodybuilding|crossfit|weightlifting|boxing|yoga/i;
const FITNESS_NAME = /fitness|crossfit|boxing|yoga|bodyflex|muscle|\bgym\b/i;
// Barangay courts and gymnasiums are often tagged as sports/fitness centres.
const NOT_A_GYM_NAME = /covered court|gymnasium|basketball|badminton|tennis/i;

/**
 * Many PH gyms are tagged leisure=sports_centre or amenity=gym rather than
 * leisure=fitness_centre; sports centres only count when sport or name says fitness.
 */
function isFitnessGym(tags) {
  const name = String(tags.name || '');
  if (NOT_A_GYM_NAME.test(name)) return false;
  if (tags.leisure === 'fitness_centre' || tags.amenity === 'gym') return true;
  return FITNESS_SPORTS.test(String(tags.sport || '')) || FITNESS_NAME.test(name);
}

function distanceMeters(fromLat, fromLng, [toLng, toLat]) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const value =
    Math.sin(radians(toLat - fromLat) / 2) ** 2 +
    Math.cos(radians(fromLat)) *
      Math.cos(radians(toLat)) *
      Math.sin(radians(toLng - fromLng) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function fetchOsmGyms({ lat, lng, radius = 15000 }) {
  assertCoordinates(lat, lng, radius);
  // A bounding box with simple tag filters is far cheaper for Overpass than
  // `around` + regex; the precise radius and gym checks happen below.
  const latDelta = radius / 111320;
  const lngDelta = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  const bbox = [lat - latDelta, lng - lngDelta, lat + latDelta, lng + lngDelta]
    .map((value) => value.toFixed(6))
    .join(',');
  const query = `
    [out:json][timeout:55];
    (
      nwr["leisure"="fitness_centre"](${bbox});
      nwr["amenity"="gym"](${bbox});
      nwr["leisure"="sports_centre"](${bbox});
    );
    out center tags;
  `;
  const elements = await runOverpassQuery(query);
  return elements
    .filter((element) => isFitnessGym(element.tags || {}))
    .map(normalizeElement)
    .filter(
      (gym) => gym && distanceMeters(lat, lng, gym.location.coordinates) <= radius,
    );
}

export async function fetchOsmGymById(type, id) {
  if (!['node', 'way', 'relation'].includes(type) || !/^\d+$/.test(String(id))) {
    throw Object.assign(new TypeError('Invalid OpenStreetMap element ID.'), {
      status: 400,
    });
  }

  const query = `
    [out:json][timeout:55];
    ${type}(id:${id});
    out center tags;
  `;
  const elements = await runOverpassQuery(query);
  return elements.map(normalizeElement).find(Boolean) || null;
}
