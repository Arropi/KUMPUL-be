import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const create_order_schema = z.object({
  participant_id: z.string().uuid({
    message: 'participant_id harus berformat UUID valid',
  }),
  shipping_fee: z
    .union([z.number(), z.string()])
    .optional()
    .refine(
      (val) => val === undefined || (!isNaN(parseFloat(String(val))) && parseFloat(String(val)) >= 0),
      { message: 'shipping_fee harus berupa angka lebih besar dari atau sama dengan 0' }
    ),
});

const uuid_param_schema = z.object({
  id: z.string().uuid({
    message: 'Parameter ID harus berformat UUID valid',
  }),
});

export const create_procurement_order_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_order_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const uuid_param_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = uuid_param_schema.parse(req.params);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
