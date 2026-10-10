import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const create_waste_listing_schema = z.object({
  listing_title: z.string().min(3, { message: 'Judul listing minimal 3 karakter' }),
  waste_category: z.enum(['ORGANIK_BASAH', 'ORGANIK_KERING', 'TEKSTIL_PERCA', 'ANORGANIK'], {
    message: 'Kategori limbah tidak valid',
  }),
  available_weight: z.coerce.number().positive({ message: 'Berat tersedia harus lebih dari 0' }),
  price_per_kg: z.coerce.number().min(0, { message: 'Harga per kg tidak boleh bernilai negatif' }),
  expired_at: z.string().datetime({ message: 'expired_at harus berupa format tanggal ISO 8601' }),
  notes: z.string().optional(),
  umkm_product_id: z.string().uuid({ message: 'umkm_product_id harus berformat UUID valid' }).optional(),
  is_marketplace_visible: z.boolean().optional().default(true),
});

const update_waste_listing_schema = z.object({
  listing_title: z.string().min(3, { message: 'Judul listing minimal 3 karakter' }).optional(),
  waste_category: z
    .enum(['ORGANIK_BASAH', 'ORGANIK_KERING', 'TEKSTIL_PERCA', 'ANORGANIK'], {
      message: 'Kategori limbah tidak valid',
    })
    .optional(),
  available_weight: z.coerce
    .number()
    .positive({ message: 'Berat tersedia harus lebih dari 0' })
    .optional(),
  price_per_kg: z.coerce
    .number()
    .min(0, { message: 'Harga per kg tidak boleh bernilai negatif' })
    .optional(),
  expired_at: z
    .string()
    .datetime({ message: 'expired_at harus berupa format tanggal ISO 8601' })
    .optional(),
  notes: z.string().optional(),
  is_marketplace_visible: z.boolean().optional(),
  listing_status: z.enum(['AVAILABLE', 'SOLD_OUT', 'REFERRED_TO_OFFTAKER']).optional(),
});
const buy_waste_schema = z.object({
  purchased_weight: z.coerce.number().positive({ message: 'Berat pembelian harus lebih dari 0' }),
  pickup_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'pickup_date harus berformat YYYY-MM-DD' }),
});

const confirm_pickup_schema = z.object({
  pickup_code: z.string().min(4, { message: 'Kode pickup minimal 4 karakter' }),
});
const offtaker_referral_schema = z.object({
  offtaker_id: z.string().uuid({ message: 'offtaker_id harus berformat UUID valid' }),
});

const deposit_bank_sampah_schema = z.object({
  bank_sampah_name: z.string().min(2, { message: 'Nama Bank Sampah minimal 2 karakter' }),
  revenue_amount: z.coerce.number().min(0, { message: 'Penghasilan tidak boleh bernilai negatif' }),
  weight_kg: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
});
export const create_waste_listing_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_waste_listing_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const buy_waste_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = buy_waste_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const confirm_pickup_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = confirm_pickup_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const offtaker_referral_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = offtaker_referral_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const deposit_bank_sampah_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = deposit_bank_sampah_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};


export const update_waste_listing_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = update_waste_listing_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
