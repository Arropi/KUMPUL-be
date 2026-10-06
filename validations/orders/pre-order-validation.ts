import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const create_pool_schema = z.object({
  commodity_id: z.string().uuid({
    message: 'commodity_id harus berformat UUID valid',
  }),
  target_moq: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(parseFloat(String(val))) && parseFloat(String(val)) > 0, {
      message: 'target_moq harus bernilai angka lebih besar dari 0',
    }),
  target_delivery_date: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'target_delivery_date harus berupa tanggal valid (YYYY-MM-DD)',
    }),
  cutoff_date: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'cutoff_date harus berupa tanggal valid (YYYY-MM-DD)',
    }),
  is_asap_allowed: z.boolean().optional(),
  expires_at: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'expires_at harus berformat tanggal ISO valid',
  }),
  default_hub_address: z.string().optional().nullable(),
  hub_latitude: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .refine(
      (val) => val === undefined || val === null || !isNaN(parseFloat(String(val))),
      { message: 'hub_latitude harus berupa angka valid' }
    ),
  hub_longitude: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .refine(
      (val) => val === undefined || val === null || !isNaN(parseFloat(String(val))),
      { message: 'hub_longitude harus berupa angka valid' }
    ),
});

const join_pool_schema = z.object({
  pool_id: z
    .string()
    .uuid({
      message: 'pool_id harus berformat UUID valid',
    })
    .optional()
    .nullable(),
  commodity_id: z
    .string()
    .uuid({
      message: 'commodity_id harus berformat UUID valid',
    })
    .optional()
    .nullable(),
  create_new_pool: z.boolean().optional(),
  umkm_role_id: z.string().uuid({
    message: 'umkm_role_id harus berformat UUID valid',
  }),
  order_qty: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(parseFloat(String(val))) && parseFloat(String(val)) > 0, {
      message: 'order_qty harus bernilai angka lebih besar dari 0',
    }),
  delivery_method: z
    .enum(['HEMAT_HUB', 'DIRECT_DOOR_TO_DOOR'])
    .optional(),
  required_delivery_date: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'required_delivery_date harus berupa tanggal valid (YYYY-MM-DD)',
    }),
  is_urgent_asap: z.boolean().optional(),
  final_delivery_address: z.string().min(1, {
    message: 'final_delivery_address tidak boleh kosong',
  }),
  final_delivery_lat: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(parseFloat(String(val))), {
      message: 'final_delivery_lat harus berupa angka valid',
    }),
  final_delivery_lng: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(parseFloat(String(val))), {
      message: 'final_delivery_lng harus berupa angka valid',
    }),
}).refine(
  (data) => Boolean(data.pool_id) || Boolean(data.commodity_id && data.required_delivery_date),
  {
    message: 'Sertakan pool_id untuk gabung kamar yang ada, ATAU commodity_id dan required_delivery_date untuk membuka kamar patungan baru',
    path: ['pool_id'],
  }
);

export const create_procurement_pool_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_pool_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const join_procurement_pool_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = join_pool_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
