import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateExport } from '../services/export.service.js';
import { createError } from '../middleware/errorHandler.js';

export const exportRouter = Router();

const ExportSchema = z.object({
  format: z.enum(['xlsx', 'csv']).default('xlsx'),
  selectedIds: z.array(z.string().uuid()).optional(),
});

exportRouter.post('/:searchId', async (req: Request<{ searchId: string }>, res: Response, next: NextFunction) => {
  const { searchId } = req.params;

  const parsed = ExportSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(createError('Invalid export params', 400, 'VALIDATION_ERROR'));
  }

  try {
    const { format, selectedIds } = parsed.data;
    const result = await generateExport(searchId, format, selectedIds);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    return res.status(200).send(result.buffer);
  } catch (err) {
    return next(createError(
      `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      500,
      'EXPORT_FAILED',
    ));
  }
});
