import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const unit_values = [
  'KG',
  'GRAM',
  'MG',
  'TON',
  'KUINTAL',
  'LITER',
  'ML',
  'KUBIK',
  'PCS',
  'EKOR',
  'BUTIR',
  'LEMBAR',
  'IKAT',
  'PORSI',
  'CUP',
  'BUNGKUS',
  'PACK',
  'PAX',
  'DUS',
  'BOX',
  'KARTON',
  'KARUNG',
  'SAK',
  'KRAT',
  'BAL',
  'BOTOL',
  'KALENG',
  'TRAY',
  'KERANJANG',
  'BASKOM',
  'LUSIN',
  'PALLET',
  'KOLI',
] as const;

export const create_product_schema = z.object({
  umkm_role_id: z.string().uuid({
    message: 'umkm_role_id harus berformat UUID valid',
  }),
  product_name: z
    .string({ message: 'product_name wajib diisi' })
    .min(2, { message: 'product_name minimal 2 karakter' }),
  unit: z
    .enum(unit_values, {
      message: 'unit tidak valid untuk 7 sektor yang didukung',
    })
    .optional(),
  target_selling_price_per_unit: z
    .union([z.number(), z.string()], {
      message: 'target_selling_price_per_unit wajib diisi',
    })
    .refine((val) => {
      const num = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: 'target_selling_price_per_unit harus lebih besar dari 0' }),
  expected_batch_units: z
    .number({ message: 'expected_batch_units harus berupa angka' })
    .int({ message: 'expected_batch_units harus berupa bilangan bulat' })
    .min(1, { message: 'expected_batch_units minimal 1' })
    .optional(),
});

export const update_product_schema = z.object({
  product_name: z
    .string()
    .min(2, { message: 'product_name minimal 2 karakter' })
    .optional(),
  unit: z
    .enum(unit_values, {
      message: 'unit tidak valid untuk 7 sektor yang didukung',
    })
    .optional(),
  target_selling_price_per_unit: z
    .union([z.number(), z.string()])
    .refine((val) => {
      if (val === undefined) return true;
      const num = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: 'target_selling_price_per_unit harus lebih besar dari 0' })
    .optional(),
  expected_batch_units: z
    .number({ message: 'expected_batch_units harus berupa angka' })
    .int({ message: 'expected_batch_units harus berupa bilangan bulat' })
    .min(1, { message: 'expected_batch_units minimal 1' })
    .optional(),
});

export const create_recipe_schema = z.object({
  umkm_product_id: z
    .string()
    .uuid({ message: 'umkm_product_id harus berformat UUID valid' })
    .optional(),
  ingredient_name: z
    .string({ message: 'ingredient_name wajib diisi' })
    .min(2, { message: 'ingredient_name minimal 2 karakter' }),
  required_qty_per_unit: z
    .union([z.number(), z.string()], {
      message: 'required_qty_per_unit wajib diisi',
    })
    .refine((val) => {
      const num = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: 'required_qty_per_unit harus lebih besar dari 0' }),
  unit: z.enum(unit_values, {
    message: 'unit bahan tidak valid untuk 7 sektor yang didukung',
  }),
  estimated_cost_per_unit: z
    .union([z.number(), z.string()])
    .refine((val) => {
      if (val === undefined) return true;
      const num = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, { message: 'estimated_cost_per_unit tidak boleh negatif' })
    .optional(),
});

export const update_recipe_schema = z.object({
  ingredient_name: z
    .string()
    .min(2, { message: 'ingredient_name minimal 2 karakter' })
    .optional(),
  required_qty_per_unit: z
    .union([z.number(), z.string()])
    .refine((val) => {
      if (val === undefined) return true;
      const num = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: 'required_qty_per_unit harus lebih besar dari 0' })
    .optional(),
  unit: z
    .enum(unit_values, {
      message: 'unit bahan tidak valid untuk 7 sektor yang didukung',
    })
    .optional(),
  estimated_cost_per_unit: z
    .union([z.number(), z.string()])
    .refine((val) => {
      if (val === undefined) return true;
      const num = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, { message: 'estimated_cost_per_unit tidak boleh negatif' })
    .optional(),
});

const id_param_schema = z.object({
  id: z.string().uuid({ message: 'id harus berformat UUID valid' }),
});

const product_id_param_schema = z.object({
  product_id: z.string().uuid({ message: 'product_id harus berformat UUID valid' }),
});

export const create_product_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_product_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const update_product_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = id_param_schema.parse(req.params) as { id: string };
    req.body = update_product_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const id_param_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = id_param_schema.parse(req.params) as { id: string };
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const product_id_param_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = product_id_param_schema.parse(req.params) as { product_id: string };
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const create_recipe_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // Jika product_id ada di params (route extends dari products), inject ke body
    if (req.params.product_id) {
      req.params = product_id_param_schema.parse(req.params) as { product_id: string };
      req.body.umkm_product_id = req.params.product_id;
    }
    req.body = create_recipe_schema.parse(req.body);
    if (!req.body.umkm_product_id) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ['umkm_product_id'],
          message: 'umkm_product_id wajib diisi',
        },
      ]);
    }
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const update_recipe_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = id_param_schema.parse(req.params) as { id: string };
    req.body = update_recipe_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
