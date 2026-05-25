import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { executeSearch } from '../services/search.service.js';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../lib/logger.js';

export const searchRouter = Router();

const SearchSchema = z.object({
  category: z.string().min(1).max(100).trim(),
  location: z.string().min(1).max(200).trim(),
  forceRefresh: z.boolean().optional().default(false),
});

searchRouter.post('/', searchLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = SearchSchema.safeParse(req.body);

  if (!parsed.success) {
    return next(createError(
      `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      400,
      'VALIDATION_ERROR',
    ));
  }

  const { category, location, forceRefresh } = parsed.data;

  try {
    logger.info('POST /api/search', { category, location, forceRefresh });
    const result = await executeSearch(category, location, forceRefresh);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('Search failed', { error: String(err) });
    return next(createError(
      `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      500,
      'SEARCH_FAILED',
    ));
  }
});
