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

async function runOverpassQuery(query) {
  const endpoint = process.env.OVERPASS_URL || DEFAULT_OVERPASS_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass returned HTTP ${response.status}.`);
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

export async function fetchOsmGyms({ lat, lng, radius = 15000 }) {
  assertCoordinates(lat, lng, radius);
  const query = `
    [out:json][timeout:20];
    nwr["leisure"="fitness_centre"](around:${radius},${lat},${lng});
    out center tags;
  `;
  const elements = await runOverpassQuery(query);
  return elements.map(normalizeElement).filter(Boolean);
}

export async function fetchOsmGymById(type, id) {
  if (!['node', 'way', 'relation'].includes(type) || !/^\d+$/.test(String(id))) {
    throw Object.assign(new TypeError('Invalid OpenStreetMap element ID.'), {
      status: 400,
    });
  }

  const query = `
    [out:json][timeout:20];
    ${type}(id:${id});
    out center tags;
  `;
  const elements = await runOverpassQuery(query);
  return elements.map(normalizeElement).find(Boolean) || null;
}
