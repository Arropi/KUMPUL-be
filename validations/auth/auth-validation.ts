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

export const register_user_schema = z
  .object({
    user_id: z.string().uuid({
      message: 'user_id harus berformat UUID valid',
    }),
    role: z.enum(role_type_values, {
      message: 'role harus salah satu dari: SUPPLIER, UMKM',
    }),
    sector: z.enum(sector_type_values, {
      message:
        'sector harus salah satu dari: PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK',
    }),
    legal_name: z
      .string({ message: 'legal_name wajib diisi' })
      .min(2, { message: 'legal_name minimal 2 karakter' })
      .refine(
        (name) => {
          const lower = name.trim().toLowerCase();
          return (
            lower !== 'nama usaha belum disetel' &&
            lower !== 'nama usaha belum di setel'
          );
        },
        { message: 'legal_name tidak boleh menggunakan nama default placeholder' }
      ),
    npwp_nib: z
      .string({ message: 'npwp_nib wajib diisi' })
      .min(5, { message: 'npwp_nib minimal 5 karakter' })
      .refine(
        (val) => !val.trim().toUpperCase().startsWith('PENDING-'),
        { message: 'npwp_nib tidak boleh menggunakan nilai default placeholder (PENDING-...)' }
      ),
    default_address: z
      .string({ message: 'default_address wajib diisi' })
      .min(3, { message: 'default_address minimal 3 karakter' })
      .refine(
        (val) => val.trim() !== '-',
        { message: 'default_address wajib diisi alamat lengkap dan tidak boleh hanya tanda strip (-)' }
      ),
    latitude: z.union([z.number(), z.string()], {
      message: 'latitude wajib diisi',
    }),
    longitude: z.union([z.number(), z.string()], {
      message: 'longitude wajib diisi',
    }),
    bank_account_info: z.record(z.string(), z.unknown(), {
      message: 'bank_account_info wajib diisi berupa objek data perbankan',
    }).optional(),
    profile_picture_url: z
      .string({ message: 'profile_picture_url wajib diisi' })
      .url({ message: 'profile_picture_url harus berupa URL valid' })
      .nullable()
      .optional(),
    storage_capacity: z
      .number({ message: 'storage_capacity harus berupa angka' })
      .int({ message: 'storage_capacity harus berupa bilangan bulat' })
      .min(0, { message: 'storage_capacity tidak boleh negatif' })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const lat = typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude);
    const lng = typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude);

    if (isNaN(lat)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitude'],
        message: 'latitude harus bernilai angka valid',
      });
    }

    if (isNaN(lng)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['longitude'],
        message: 'longitude harus bernilai angka valid',
      });
    }

    if (!isNaN(lat) && !isNaN(lng) && lat === 0 && lng === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitude'],
        message: 'Koordinat latitude dan longitude tidak boleh (0, 0)',
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['longitude'],
        message: 'Koordinat latitude dan longitude tidak boleh (0, 0)',
      });
    }
  });

export const register_user_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = register_user_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const login_user_schema = z.object({
  user_id: z.string().uuid({
    message: 'user_id harus berformat UUID valid',
  }),
  role: z
    .enum(role_type_values, {
      message: 'role harus salah satu dari: SUPPLIER, UMKM',
    })
    .optional(),
});

export const login_user_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = login_user_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
