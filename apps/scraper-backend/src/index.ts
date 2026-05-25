import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { searchRouter } from './routes/search.js';
import { resultsRouter } from './routes/results.js';
import { exportRouter } from './routes/export.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      // Allow Vercel preview URLs
      /https:\/\/.*\.vercel\.app$/,
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/search', searchRouter);
app.use('/api/results', resultsRouter);
app.use('/api/export', exportRouter);

// 404 & error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Scraper backend running on port ${PORT}`);
});

export default app;
