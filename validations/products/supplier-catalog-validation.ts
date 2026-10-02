import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const price_tier_schema = z
  .object({
    min_qty: z.union([z.number(), z.string()], {
      message: 'min_qty wajib diisi',
    }),
    max_qty: z.union([z.number(), z.string()], {
      message: 'max_qty wajib diisi',
    }),
    tier_price: z.union([z.number(), z.string()], {
      message: 'tier_price wajib diisi',
    }),
  })
  .superRefine((data, ctx) => {
    const min_num = typeof data.min_qty === 'number' ? data.min_qty : parseFloat(data.min_qty);
    const max_num = typeof data.max_qty === 'number' ? data.max_qty : parseFloat(data.max_qty);
    const price_num =
      typeof data.tier_price === 'number' ? data.tier_price : parseFloat(data.tier_price);

    if (isNaN(min_num) || min_num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['min_qty'],
        message: 'min_qty harus bernilai angka lebih besar dari 0',
      });
    }

    if (isNaN(max_num) || max_num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_qty'],
        message: 'max_qty harus bernilai angka lebih besar dari 0',
      });
    }

    if (!isNaN(min_num) && !isNaN(max_num) && max_num <= min_num) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_qty'],
        message: 'max_qty harus lebih besar dari min_qty',
      });
    }

    if (isNaN(price_num) || price_num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tier_price'],
        message: 'tier_price harus bernilai angka lebih besar dari 0',
      });
    }
  });

const create_commodity_schema = z
  .object({
    supplier_role_id: z.string().uuid({
      message: 'supplier_role_id harus berformat UUID valid',
    }),
    name: z
      .string({ message: 'name wajib diisi' })
      .min(2, { message: 'name minimal 2 karakter' }),
    wholesale_unit: z.enum(['KARUNG', 'SAK', 'KRAT', 'PAX', 'BAL'], {
      message: 'wholesale_unit harus salah satu dari: KARUNG, SAK, KRAT, PAX, BAL',
    }),
    base_price: z.union([z.number(), z.string()], {
      message: 'base_price wajib diisi',
    }),
    stock: z.union([z.number(), z.string()], {
      message: 'stock wajib diisi',
    }),
    base_moq: z.union([z.number(), z.string()], {
      message: 'base_moq wajib diisi',
    }),
    lead_time_days: z
      .number({ message: 'lead_time_days harus berupa angka' })
      .int({ message: 'lead_time_days harus berupa bilangan bulat' })
      .min(1, { message: 'lead_time_days minimal 1 hari' })
      .optional(),
    image_url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    production_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'production_date harus berformat YYYY-MM-DD',
      })
      .nullable()
      .optional(),
    auto_activate_marketplace: z.boolean().optional(),
    allows_under_moq: z.boolean().optional(),
    under_moq_price_per_kg: z.union([z.number(), z.string()]).nullable().optional(),
    is_marketplace_active: z.boolean().optional(),
    price_tiers: z.array(price_tier_schema).optional(),
  })
  .superRefine((data, ctx) => {
    const parsed_base_price =
      typeof data.base_price === 'number' ? data.base_price : parseFloat(data.base_price);
    if (isNaN(parsed_base_price) || parsed_base_price <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['base_price'],
        message: 'base_price harus bernilai angka lebih besar dari 0',
      });
    }

    const parsed_stock =
      typeof data.stock === 'number' ? data.stock : parseFloat(data.stock);
    if (isNaN(parsed_stock) || parsed_stock < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stock'],
        message: 'stock harus bernilai angka tidak boleh negatif (>= 0)',
      });
    }

    const parsed_moq =
      typeof data.base_moq === 'number' ? data.base_moq : parseFloat(data.base_moq);
    if (isNaN(parsed_moq) || parsed_moq <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['base_moq'],
        message: 'base_moq harus bernilai angka lebih besar dari 0',
      });
    }

    if (data.allows_under_moq === true) {
      if (
        data.under_moq_price_per_kg === undefined ||
        data.under_moq_price_per_kg === null ||
        data.under_moq_price_per_kg === ''
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['under_moq_price_per_kg'],
          message: 'under_moq_price_per_kg wajib diisi jika allows_under_moq bernilai true',
        });
      } else {
        const parsed_under_moq_price =
          typeof data.under_moq_price_per_kg === 'number'
            ? data.under_moq_price_per_kg
            : parseFloat(data.under_moq_price_per_kg);
        if (isNaN(parsed_under_moq_price) || parsed_under_moq_price <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['under_moq_price_per_kg'],
            message: 'under_moq_price_per_kg harus bernilai angka lebih besar dari 0',
          });
        }
      }
    }
  });

const update_commodity_schema = z
  .object({
    name: z.string().min(2, { message: 'name minimal 2 karakter' }).optional(),
    wholesale_unit: z
      .enum(['KARUNG', 'SAK', 'KRAT', 'PAX', 'BAL'], {
        message: 'wholesale_unit harus salah satu dari: KARUNG, SAK, KRAT, PAX, BAL',
      })
      .optional(),
    base_price: z.union([z.number(), z.string()]).optional(),
    stock: z.union([z.number(), z.string()]).optional(),
    base_moq: z.union([z.number(), z.string()]).optional(),
    lead_time_days: z
      .number()
      .int()
      .min(1, { message: 'lead_time_days minimal 1 hari' })
      .optional(),
    image_url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    production_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'production_date harus berformat YYYY-MM-DD',
      })
      .nullable()
      .optional(),
    auto_activate_marketplace: z.boolean().optional(),
    allows_under_moq: z.boolean().optional(),
    under_moq_price_per_kg: z.union([z.number(), z.string()]).nullable().optional(),
    is_marketplace_active: z.boolean().optional(),
    price_tiers: z.array(price_tier_schema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.base_price !== undefined) {
      const parsed_base_price =
        typeof data.base_price === 'number' ? data.base_price : parseFloat(data.base_price);
      if (isNaN(parsed_base_price) || parsed_base_price <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['base_price'],
          message: 'base_price harus bernilai angka lebih besar dari 0',
        });
      }
    }

    if (data.stock !== undefined) {
      const parsed_stock =
        typeof data.stock === 'number' ? data.stock : parseFloat(data.stock);
      if (isNaN(parsed_stock) || parsed_stock < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['stock'],
          message: 'stock harus bernilai angka tidak boleh negatif (>= 0)',
        });
      }
    }

    if (data.base_moq !== undefined) {
      const parsed_moq =
        typeof data.base_moq === 'number' ? data.base_moq : parseFloat(data.base_moq);
      if (isNaN(parsed_moq) || parsed_moq <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['base_moq'],
          message: 'base_moq harus bernilai angka lebih besar dari 0',
        });
      }
    }

    if (data.allows_under_moq === true) {
      if (data.under_moq_price_per_kg !== undefined && data.under_moq_price_per_kg !== null) {
        const parsed_under_moq_price =
          typeof data.under_moq_price_per_kg === 'number'
            ? data.under_moq_price_per_kg
            : parseFloat(data.under_moq_price_per_kg);
        if (isNaN(parsed_under_moq_price) || parsed_under_moq_price <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['under_moq_price_per_kg'],
            message: 'under_moq_price_per_kg harus bernilai angka lebih besar dari 0',
          });
        }
      }
    }
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
    if (!req.body.production_date && (req.body.estimated_harvest_date || req.body.estimated_harvest_day)) {
      req.body.production_date = req.body.estimated_harvest_date ?? req.body.estimated_harvest_day;
    }
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
    if (!req.body.production_date && (req.body.estimated_harvest_date || req.body.estimated_harvest_day)) {
      req.body.production_date = req.body.estimated_harvest_date ?? req.body.estimated_harvest_day;
    }
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
