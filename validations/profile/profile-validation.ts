import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const sector_enum = z.enum([
  'PERTANIAN',
  'PETERNAKAN',
  'PERIKANAN',
  'PERKEBUNAN',
  'FNB_PENGOLAHAN',
  'RITEL',
  'LOGISTIK',
]);

const role_enum = z.enum(['SUPPLIER', 'UMKM']);

const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const bank_account_schema = z
  .object({
    bank_name: z.string().optional(),
    account_number: z.string().optional(),
    account_holder: z.string().optional(),
  })
  .passthrough();

/**
 * Skema validasi untuk pembuatan profil baru (POST /api/profile)
 * Mendukung alias nama:
 * - business_name / legal_name
 * - npwp / npwp_nib
 * - lat / latitude
 * - long / longitude
 * - profile / profile_picture_url
 * - storage / storage_capacity
 * - sector / sector_type
 * - role / role_type
 */
const create_profile_raw_schema = z
  .object({
    business_name: z.string().min(1, 'Nama bisnis (business_name) tidak boleh kosong').optional(),
    legal_name: z.string().min(1, 'Nama bisnis (legal_name) tidak boleh kosong').optional(),
    npwp: z.string().min(1, 'NPWP (npwp) tidak boleh kosong').optional(),
    npwp_nib: z.string().min(1, 'NPWP (npwp_nib) tidak boleh kosong').optional(),
    default_address: z.string().min(1, 'default_address tidak boleh kosong'),
    lat: z.coerce.number().optional(),
    latitude: z.coerce.number().optional(),
    long: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    bank_account_info: bank_account_schema.optional().default({}),
    profile: z.string().url('Format URL foto profil tidak valid').or(z.literal('')).optional().nullable(),
    profile_picture_url: z.string().url('Format URL foto profil tidak valid').or(z.literal('')).optional().nullable(),
    storage: z.coerce.number().int().min(0, 'Kapasitas penyimpanan minimal 0').optional(),
    storage_capacity: z.coerce.number().int().min(0, 'Kapasitas penyimpanan minimal 0').optional(),
    sector: sector_enum.optional().nullable(),
    sector_type: sector_enum.optional().nullable(),
    role: role_enum.optional().default('SUPPLIER'),
    role_type: role_enum.optional(),
    auth_user_id: z.string().uuid('auth_user_id harus berformat UUID').optional().nullable(),
  })
  .refine((data) => data.business_name || data.legal_name, {
    message: 'business_name atau legal_name wajib diisi',
    path: ['business_name'],
  })
  .refine((data) => data.npwp || data.npwp_nib, {
    message: 'npwp atau npwp_nib wajib diisi',
    path: ['npwp'],
  })
  .refine((data) => data.lat !== undefined || data.latitude !== undefined, {
    message: 'lat atau latitude wajib diisi',
    path: ['lat'],
  })
  .refine((data) => data.long !== undefined || data.longitude !== undefined, {
    message: 'long atau longitude wajib diisi',
    path: ['long'],
  });

export const create_profile_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const parsed = create_profile_raw_schema.parse(req.body);

    const business_name = (parsed.business_name || parsed.legal_name)!.trim();
    const npwp = (parsed.npwp || parsed.npwp_nib)!.trim();
    const latitude = parsed.lat !== undefined ? parsed.lat : parsed.latitude!;
    const longitude = parsed.long !== undefined ? parsed.long : parsed.longitude!;
    const profile_picture_url = parsed.profile || parsed.profile_picture_url || null;
    const storage_capacity = parsed.storage !== undefined ? parsed.storage : (parsed.storage_capacity ?? 0);
    const sector_type = parsed.sector ?? parsed.sector_type ?? null;
    const role_type = parsed.role_type ?? parsed.role ?? 'SUPPLIER';

    req.body = {
      business_name,
      legal_name: business_name,
      npwp,
      npwp_nib: npwp,
      default_address: parsed.default_address.trim(),
      latitude,
      longitude,
      bank_account_info: parsed.bank_account_info ?? {},
      profile_picture_url,
      storage_capacity,
      sector_type,
      role_type,
      auth_user_id: parsed.auth_user_id ?? null,
    };

    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

/**
 * Skema validasi untuk pembaruan profil secara penuh (PUT /api/profile/:id)
 */
const update_profile_raw_schema = z.object({
  business_name: z.string().min(1, 'business_name tidak boleh kosong').optional(),
  legal_name: z.string().min(1, 'legal_name tidak boleh kosong').optional(),
  npwp: z.string().min(1, 'npwp tidak boleh kosong').optional(),
  npwp_nib: z.string().min(1, 'npwp_nib tidak boleh kosong').optional(),
  default_address: z.string().min(1, 'default_address tidak boleh kosong').optional(),
  lat: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  long: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  bank_account_info: bank_account_schema.optional(),
  profile: z.string().url('Format URL foto profil tidak valid').or(z.literal('')).optional().nullable(),
  profile_picture_url: z.string().url('Format URL foto profil tidak valid').or(z.literal('')).optional().nullable(),
  storage: z.coerce.number().int().min(0).optional(),
  storage_capacity: z.coerce.number().int().min(0).optional(),
  sector: sector_enum.optional().nullable(),
  sector_type: sector_enum.optional().nullable(),
  role: role_enum.optional(),
  role_type: role_enum.optional(),
  is_active: z.boolean().optional(),
});

export const update_profile_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const parsed = update_profile_raw_schema.parse(req.body);

    const business_name = parsed.business_name || parsed.legal_name;
    const npwp = parsed.npwp || parsed.npwp_nib;
    const latitude = parsed.lat !== undefined ? parsed.lat : parsed.latitude;
    const longitude = parsed.long !== undefined ? parsed.long : parsed.longitude;
    const profile_picture_url = parsed.profile !== undefined ? parsed.profile : parsed.profile_picture_url;
    const storage_capacity = parsed.storage !== undefined ? parsed.storage : parsed.storage_capacity;
    const sector_type = parsed.sector !== undefined ? parsed.sector : parsed.sector_type;
    const role_type = parsed.role !== undefined ? parsed.role : parsed.role_type;

    req.body = {
      ...(business_name !== undefined ? { business_name } : {}),
      ...(npwp !== undefined ? { npwp } : {}),
      ...(parsed.default_address !== undefined ? { default_address: parsed.default_address } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
      ...(parsed.bank_account_info !== undefined ? { bank_account_info: parsed.bank_account_info } : {}),
      ...(profile_picture_url !== undefined ? { profile_picture_url } : {}),
      ...(storage_capacity !== undefined ? { storage_capacity } : {}),
      ...(sector_type !== undefined ? { sector_type } : {}),
      ...(role_type !== undefined ? { role_type } : {}),
      ...(parsed.is_active !== undefined ? { is_active: parsed.is_active } : {}),
    };

    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

/**
 * Skema validasi untuk pembaruan profil parsial (PATCH /api/profile/:id)
 */
export const patch_profile_validation = update_profile_validation;

/**
 * Validasi parameter :id pada URL (GET, PUT, PATCH, DELETE)
 */
const id_param_schema = z.object({
  id: z
    .string()
    .refine((val) => val === 'me' || uuid_regex.test(val), {
      message: 'Parameter ID harus berupa UUID valid atau "me"',
    }),
});

export const get_profile_by_id_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = id_param_schema.parse(req.params);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

/**
 * Validasi query parameter untuk daftar profil (GET /api/profile)
 */
const list_profiles_query_schema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  role_type: role_enum.optional(),
  sector_type: sector_enum.optional(),
});

export const list_profiles_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    list_profiles_query_schema.parse(req.query);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
