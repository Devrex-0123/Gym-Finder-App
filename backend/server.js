import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import gymsRouter from './routes/gyms.js';

const app = express();
const port = Number(process.env.PORT) || 5000;
const allowedOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/gyms', gymsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error.' : error.message,
  });
});

async function startServer() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required in backend/.env.');
  }

  await mongoose.connect(mongoUri);
  app.listen(port, '0.0.0.0', () => {
    console.log(`GymFinder API listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start GymFinder API:', error);
  process.exitCode = 1;
});
