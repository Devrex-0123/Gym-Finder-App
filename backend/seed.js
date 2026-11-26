import 'dotenv/config';
import mongoose from 'mongoose';
import { seedOsmGyms } from './services/seedGyms.js';

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required in backend/.env.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const result = await seedOsmGyms();
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
