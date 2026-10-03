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
  pool_id: z.string().uuid({
    message: 'pool_id harus berformat UUID valid',
  }),
  umkm_role_id: z.string().uuid({
    message: 'umkm_role_id harus berformat UUID valid',
  }),
  order_qty: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(parseFloat(String(val))) && parseFloat(String(val)) > 0, {
      message: 'order_qty harus bernilai angka lebih besar dari 0',
    }),
  delivery_method: z.enum(['HEMAT_HUB', 'DIRECT_DOOR_TO_DOOR'], {
    message: 'delivery_method harus bernilai HEMAT_HUB atau DIRECT_DOOR_TO_DOOR',
  }),
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
});

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
