# GymFinder

GymFinder is an Android-first Expo app for discovering nearby gyms. The mobile app uses MapLibre GL JS inside `react-native-webview`, so the map does not require Google Maps credentials or MapLibre native modules. Gym records and search are served by an Express API backed by MongoDB Atlas.

## Project layout

```text
backend/
  models/Gym.js
  routes/gyms.js
  services/
  seed.js
  server.js
mobile/
  App.tsx
  app.json
  src/
```

## Requirements

- Node.js 20 or later
- MongoDB Atlas database and connection string
- Expo Go on an Android phone, or Android Studio and an emulator

## Start the backend

In PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set `MONGO_URI` to your Atlas connection string. Replace `SEED_API_KEY` with a private value. Keep `.env` local; it is ignored by Git.

Then install and start the API:

```powershell
npm install
npm run dev
```

The API listens on port `5000` by default. Check it at `http://localhost:5000/health`.

### Import OpenStreetMap gyms

The seed command fetches named fitness centres from Overpass within 15 km of Lapu-Lapu City Hall and saves up to 15 records:

```powershell
npm run seed
```

The public `POST /api/gyms/seed` endpoint uses the same importer. When `SEED_API_KEY` is configured, send it in an `x-seed-key` header. The importer may find fewer than 15 gyms; it reports the actual count and never invents listings or unsupported prices, ratings, hours, or amenities.

OpenStreetMap data is community-maintained and may be incomplete. Overpass is a shared public service with usage limits; do not repeatedly seed in a tight loop.

## Start the mobile app

Open a second PowerShell terminal:

```powershell
cd mobile
Copy-Item .env.example .env
npm install
npx expo start
```

The default `EXPO_PUBLIC_API_URL` (`http://10.0.2.2:5000`) is for an Android Studio emulator. For a physical Android phone, set it in `mobile/.env` to the computer's LAN address, for example `http://192.168.1.25:5000`. Keep the phone and computer on the same network and allow the backend port through Windows Firewall.

Open Expo Go on Android and scan the QR code. Android Studio is only needed if you want to run an emulator or build locally; it is not required to preview the app on a physical phone using Expo Go.

For a deployed backend, set `EXPO_PUBLIC_API_URL` to its HTTPS base URL before starting Expo.

## API

- `GET /api/gyms/nearby?lat=10.3109&lng=123.9494&radius=15000&search=&amenity=&maxPrice=`
- `GET /api/gyms?search=&amenity=&maxPrice=`
- `GET /api/gyms/:id`
- `GET /api/gyms/osm?lat=&lng=&radius=`
- `POST /api/gyms/seed`

The nearby endpoint uses MongoDB's 2dsphere index and returns `distanceMeters`. Radius is limited to 50 km.

## Map attribution and data limitations

The app loads MapLibre GL JS 4.0.2 from the unpkg CDN and uses the OpenFreeMap Liberty style. It displays OpenStreetMap/OpenFreeMap attribution on the map. Map styles and tiles need an internet connection and are subject to their providers' terms and availability.

Gym names and coordinates imported from OpenStreetMap are attributed to OpenStreetMap contributors. Price and review information is not generally available from OSM and is returned as unknown unless provided by another verified source. Check the listing details before relying on them.
