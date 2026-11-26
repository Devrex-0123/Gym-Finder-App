// Upserts hand-curated gyms (real listings not yet on OpenStreetMap) from
// data/manual-gyms.json. Re-running is safe: gyms are matched by name + city.
//
//   npm run import:manual
//
// Only add gyms you can point to a real source for (sourceUrl). Leave prices,
// ratings and hours null unless the source states them.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import Gym from './models/Gym.js';

const DATA_FILE = new URL('./data/manual-gyms.json', import.meta.url);

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required in backend/.env.');
  }

  const entries = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const operations = entries.map(({ coordinates, ...fields }) => ({
      updateOne: {
        filter: { source: 'manual', name: fields.name, city: fields.city },
        update: {
          $set: {
            ...fields,
            location: { type: 'Point', coordinates },
            source: 'manual',
            isActive: true,
          },
        },
        upsert: true,
        runValidators: true,
      },
    }));

    const result = await Gym.bulkWrite(operations, { ordered: false });
    console.log(
      `Manual gyms: ${result.upsertedCount} added, ${result.modifiedCount} updated, ${entries.length} in file.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Manual gym import failed:', error);
  process.exitCode = 1;
});
