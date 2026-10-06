import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const marketplace_query_schema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  max_price: z.coerce.number().positive().optional(),
  storage_temp: z.enum(['AMBIENT', 'CHILLED', 'FROZEN']).optional(),
  ready_stock: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const get_marketplace_catalog_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    marketplace_query_schema.parse(req.query);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
