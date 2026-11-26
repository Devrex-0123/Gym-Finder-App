import 'dotenv/config';
import mongoose from 'mongoose';
import { seedOsmGyms } from './services/seedGyms.js';

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required in backend/.env.');
  }

  // Optional area: npm run seed -- --lat 11.0064 --lng 124.6075
  const arg = (name) => {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? undefined : Number(process.argv[index + 1]);
  };
  const area = Object.fromEntries(
    Object.entries({ lat: arg('lat'), lng: arg('lng') }).filter(([, value]) => value !== undefined),
  );

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const result = await seedOsmGyms(area);
    console.log(
      `Saved ${result.saved} of ${result.requested} requested gyms from ${result.available} named OSM listings.`,
    );
    if (result.saved < result.requested) {
      console.warn('Overpass returned fewer gyms than requested; no records were invented.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Gym seed failed:', error);
  process.exitCode = 1;
});
