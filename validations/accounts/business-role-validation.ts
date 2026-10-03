import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const role_type_values = ['SUPPLIER', 'UMKM'] as const;
const sector_type_values = [
  'PERTANIAN',
  'PETERNAKAN',
  'PERIKANAN',
  'PERKEBUNAN',
  'FNB_PENGOLAHAN',
  'RITEL',
  'LOGISTIK',
] as const;

const create_role_schema = z.object({
  entity_id: z.string().uuid({
    message: 'entity_id harus berformat UUID valid',
  }),
  role_type: z.enum(role_type_values, {
    message: 'role_type harus salah satu dari: SUPPLIER, UMKM',
  }),
  sector_type: z
    .enum(sector_type_values, {
      message:
        'sector_type harus salah satu dari: PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK',
    })
    .nullable()
    .optional(),
  sector: z
    .enum(sector_type_values, {
      message:
        'sector harus salah satu dari: PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK',
    })
    .nullable()
    .optional(),
  storage_capacity: z
    .number({ message: 'storage_capacity harus berupa angka' })
    .int({ message: 'storage_capacity harus berupa bilangan bulat' })
    .min(0, { message: 'storage_capacity tidak boleh negatif' })
    .optional(),
  is_active: z.boolean().optional(),
});

const update_role_schema = z.object({
  sector_type: z
    .enum(sector_type_values, {
      message:
        'sector_type harus salah satu dari: PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK',
    })
    .nullable()
    .optional(),
  sector: z
    .enum(sector_type_values, {
      message:
        'sector harus salah satu dari: PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK',
    })
    .nullable()
    .optional(),
  storage_capacity: z
    .number({ message: 'storage_capacity harus berupa angka' })
    .int({ message: 'storage_capacity harus berupa bilangan bulat' })
    .min(0, { message: 'storage_capacity tidak boleh negatif' })
    .optional(),
  is_active: z.boolean().optional(),
});

const role_id_param_schema = z.object({
  id: z.string().uuid({ message: 'Parameter id harus berformat UUID valid' }),
});

export const create_business_role_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_role_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const update_business_role_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = role_id_param_schema.parse(req.params) as { id: string };
    req.body = update_role_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const get_business_role_by_id_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = role_id_param_schema.parse(req.params) as { id: string };
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
