import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSearchResults } from '../services/search.service.js';
import { createError } from '../middleware/errorHandler.js';

export const resultsRouter = Router();

const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional().default('rating'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});

resultsRouter.get('/:searchId', async (req: Request<{ searchId: string }>, res: Response, next: NextFunction) => {
  const { searchId } = req.params;

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return next(createError('Invalid query params', 400, 'VALIDATION_ERROR'));
  }

  try {
    const result = await getSearchResults(searchId, parsed.data);
    return res.status(200).json(result);
  } catch (err) {
    return next(createError(
      `Failed to fetch results: ${err instanceof Error ? err.message : 'Unknown error'}`,
      500,
      'FETCH_FAILED',
    ));
  }
});
