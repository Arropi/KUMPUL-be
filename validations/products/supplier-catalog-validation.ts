import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const create_commodity_schema = z.object({
  supplier_role_id: z.string().uuid({
    message: 'supplier_role_id harus berformat UUID valid',
  }),
  name: z
    .string({ message: 'name wajib diisi' })
    .min(2, { message: 'name minimal 2 karakter' }),
  wholesale_unit: z.enum(['KARUNG', 'SAK', 'KRAT', 'PAX', 'BAL'], {
    message: 'wholesale_unit harus salah satu dari: KARUNG, SAK, KRAT, PAX, BAL',
  }),
  base_moq: z.union([z.number(), z.string()], {
    message: 'base_moq wajib diisi',
  }),
  lead_time_days: z
    .number({ message: 'lead_time_days harus berupa angka' })
    .int({ message: 'lead_time_days harus berupa bilangan bulat' })
    .min(1, { message: 'lead_time_days minimal 1 hari' })
    .optional(),
  is_marketplace_active: z.boolean().optional(),
});

const update_commodity_schema = z.object({
  name: z.string().min(2, { message: 'name minimal 2 karakter' }).optional(),
  wholesale_unit: z
    .enum(['KARUNG', 'SAK', 'KRAT', 'PAX', 'BAL'], {
      message: 'wholesale_unit harus salah satu dari: KARUNG, SAK, KRAT, PAX, BAL',
    })
    .optional(),
  base_moq: z.union([z.number(), z.string()]).optional(),
  lead_time_days: z
    .number()
    .int()
    .min(1, { message: 'lead_time_days minimal 1 hari' })
    .optional(),
  is_marketplace_active: z.boolean().optional(),
});

const commodity_id_param_schema = z.object({
  id: z.string().uuid({ message: 'Parameter id harus berformat UUID valid' }),
});

export const create_supplier_commodity_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_commodity_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const update_supplier_commodity_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = commodity_id_param_schema.parse(req.params) as { id: string };
    req.body = update_commodity_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const get_supplier_commodity_by_id_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = commodity_id_param_schema.parse(req.params) as { id: string };
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
