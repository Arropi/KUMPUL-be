import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const create_batch_tag_schema = z.object({
  commodity_id: z.string().uuid({
    message: 'commodity_id harus berformat UUID valid',
  }),
  supporting_file_url: z
    .string()
    .trim()
    .optional()
    .nullable(),
  storage_temperature_type: z
    .enum(['AMBIENT', 'CHILLED', 'FROZEN'], {
      message: 'storage_temperature_type harus berupa AMBIENT, CHILLED, atau FROZEN',
    })
    .optional(),
  is_verified: z
    .boolean({
      message: 'is_verified harus berupa boolean',
    })
    .optional(),
});

const update_batch_tag_schema = z.object({
  commodity_id: z
    .string()
    .uuid({
      message: 'commodity_id harus berformat UUID valid',
    })
    .optional(),
  supporting_file_url: z
    .string()
    .trim()
    .optional()
    .nullable(),
  storage_temperature_type: z
    .enum(['AMBIENT', 'CHILLED', 'FROZEN'], {
      message: 'storage_temperature_type harus berupa AMBIENT, CHILLED, atau FROZEN',
    })
    .optional(),
  is_verified: z
    .boolean({
      message: 'is_verified harus berupa boolean',
    })
    .optional(),
});

const batch_tag_id_param_schema = z.object({
  id: z.string().uuid({
    message: 'id batch tag harus berformat UUID valid',
  }),
});

const commodity_id_param_schema = z.object({
  commodity_id: z.string().uuid({
    message: 'commodity_id harus berformat UUID valid',
  }),
});

export const create_commodity_batch_tag_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_batch_tag_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const update_commodity_batch_tag_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = batch_tag_id_param_schema.parse(req.params) as { id: string };
    req.body = update_batch_tag_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const batch_tag_id_param_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = batch_tag_id_param_schema.parse(req.params) as { id: string };
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const commodity_batch_tags_by_commodity_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = commodity_id_param_schema.parse(req.params) as { commodity_id: string };
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
