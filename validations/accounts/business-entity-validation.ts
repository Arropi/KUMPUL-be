import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const create_entity_schema = z.object({
  legal_name: z
    .string({ message: 'legal_name wajib diisi' })
    .min(2, { message: 'legal_name minimal 2 karakter' }),
  npwp_nib: z
    .string({ message: 'npwp_nib wajib diisi' })
    .min(5, { message: 'npwp_nib minimal 5 karakter' }),
  default_address: z
    .string({ message: 'default_address wajib diisi' })
    .min(5, { message: 'default_address minimal 5 karakter' }),
  latitude: z.union([z.number(), z.string()], {
    message: 'latitude wajib diisi',
  }),
  longitude: z.union([z.number(), z.string()], {
    message: 'longitude wajib diisi',
  }),
  bank_account_info: z.record(z.string(), z.unknown()).optional(),
  profile_picture_url: z.string().url({ message: 'profile_picture_url harus berupa URL valid' }).optional().or(z.literal('')),
  auth_user_id: z.string().uuid({ message: 'auth_user_id harus berformat UUID valid' }).optional(),
});

const update_entity_schema = z.object({
  legal_name: z.string().min(2, { message: 'legal_name minimal 2 karakter' }).optional(),
  npwp_nib: z.string().min(5, { message: 'npwp_nib minimal 5 karakter' }).optional(),
  default_address: z.string().min(5, { message: 'default_address minimal 5 karakter' }).optional(),
  latitude: z.union([z.number(), z.string()]).optional(),
  longitude: z.union([z.number(), z.string()]).optional(),
  bank_account_info: z.record(z.string(), z.unknown()).optional(),
  profile_picture_url: z.string().url({ message: 'profile_picture_url harus berupa URL valid' }).optional().or(z.literal('')),
});

const update_profile_schema = z.object({
  legal_name: z.string().min(2, { message: 'legal_name minimal 2 karakter' }).optional(),
  default_address: z.string().min(5, { message: 'default_address minimal 5 karakter' }).optional(),
  latitude: z.union([z.number(), z.string()]).optional(),
  longitude: z.union([z.number(), z.string()]).optional(),
  bank_account_info: z.record(z.string(), z.unknown()).optional(),
  profile_picture_url: z.string().url({ message: 'profile_picture_url harus berupa URL valid' }).optional().or(z.literal('')),
});

const entity_id_param_schema = z.object({
  id: z.string().uuid({ message: 'Parameter id harus berformat UUID valid' }),
});

export const create_business_entity_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_entity_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const update_business_entity_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = entity_id_param_schema.parse(req.params) as { id: string };
    req.body = update_entity_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const update_entity_profile_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = entity_id_param_schema.parse(req.params) as { id: string };
    req.body = update_profile_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};

export const get_business_entity_by_id_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.params = entity_id_param_schema.parse(req.params) as { id: string };
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
