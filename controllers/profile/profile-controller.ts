import type { Request, Response, NextFunction } from 'express';
import {
  create_profile_service,
  get_profile_by_id_service,
  update_profile_service,
  patch_profile_service,
  delete_profile_service,
  list_profiles_service,
  create_role_service,
  update_role_service,
  delete_role_service,
  list_roles_service,
} from '../../services/profile/profile-service.ts';
import { AppError } from '../../middleware/error-middleware.ts';

/**
 * Controller untuk membuat profil entitas bisnis baru (POST /api/profile)
 */
export const create_profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = {
      business_name: req.body.business_name,
      npwp: req.body.npwp,
      default_address: req.body.default_address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      phone_number: req.body.phone_number,
      bank_account_info: req.body.bank_account_info,
      profile_picture_url: req.body.profile_picture_url,
      storage_capacity: req.body.storage_capacity,
      sector_type: req.body.sector_type,
      role_type: req.body.role_type,
      auth_user_id: req.body.auth_user_id || req.user?.auth_user_id || req.user?.user_id,
    };

    const created_profile = await create_profile_service(payload);

    res.status(201).json({
      status: 'success',
      message: 'Profil entitas bisnis berhasil didaftarkan',
      data: created_profile,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Helper untuk menyelesaikan entity_id dari parameter URL (termasuk alias "me")
 */
const resolve_entity_id = (req: Request): string => {
  const param_id = req.params.id as string;
  if (param_id === 'me') {
    const user_entity_id = req.user?.entity_id || req.user?.auth_user_id || req.user?.user_id;
    if (!user_entity_id) {
      throw new AppError(
        'Akses profil pribadi memerlukan autentikasi login',
        401,
        'UNAUTHORIZED'
      );
    }
    return user_entity_id;
  }
  return param_id;
};

/**
 * Controller untuk mendapatkan detail profil berdasarkan entity_id / id business_entities (GET /api/profile/:id)
 */
export const get_profile_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const target_id = resolve_entity_id(req);
    const profile_data = await get_profile_by_id_service(target_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail profil entitas bisnis berhasil diambil',
      data: profile_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Controller untuk memperbarui profil secara penuh (PUT /api/profile/:id)
 */
export const update_profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const target_id = resolve_entity_id(req);
    const updated_profile = await update_profile_service(target_id, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Profil entitas bisnis berhasil diperbarui',
      data: updated_profile,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Controller untuk memperbarui profil secara parsial (PATCH /api/profile/:id)
 */
export const patch_profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const target_id = resolve_entity_id(req);
    const patched_profile = await patch_profile_service(target_id, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Profil entitas bisnis berhasil diperbarui',
      data: patched_profile,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Controller untuk menghapus profil entitas bisnis dan role terkait (DELETE /api/profile/:id)
 */
export const delete_profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const target_id = resolve_entity_id(req);
    await delete_profile_service(target_id);

    res.status(200).json({
      status: 'success',
      message: 'Profil entitas bisnis berhasil dihapus',
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Controller untuk mendapatkan daftar profil entitas bisnis dengan paginasi (GET /api/profile)
 */
export const list_profiles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter = {
      search: req.query.search as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      role_type: req.query.role_type as any,
      sector_type: req.query.sector_type as any,
    };

    const paginated_data = await list_profiles_service(filter);

    res.status(200).json({
      status: 'success',
      message: 'Daftar profil entitas bisnis berhasil diambil',
      data: paginated_data.profiles,
      pagination: {
        total: paginated_data.total,
        limit: paginated_data.limit,
        offset: paginated_data.offset,
      },
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Controller untuk menambahkan peran usaha baru (POST /api/profile/roles atau /api/business/roles)
 */
export const create_business_role = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entity_id = req.body.entity_id || resolve_entity_id(req);
    const new_role = await create_role_service({
      entity_id,
      role_type: req.body.role_type,
      sector_type: req.body.sector_type,
      storage_capacity: req.body.storage_capacity,
      is_active: req.body.is_active,
    });

    res.status(201).json({
      status: 'success',
      message: 'Peran usaha berhasil ditambahkan',
      data: new_role,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Controller untuk memperbarui peran usaha (PUT /api/profile/roles/:role_id atau /api/business/roles/:role_id)
 */
export const update_business_role = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role_id = (req.params.role_id || req.params.id) as string;
    const updated_role = await update_role_service(role_id, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Peran usaha berhasil diperbarui',
      data: updated_role,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Controller untuk menghapus peran usaha (DELETE /api/profile/roles/:role_id atau /api/business/roles/:role_id)
 */
export const delete_business_role = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role_id = (req.params.role_id || req.params.id) as string;
    await delete_role_service(role_id);

    res.status(200).json({
      status: 'success',
      message: 'Peran usaha berhasil dihapus',
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

/**
 * Controller untuk mendapatkan daftar peran usaha (GET /api/profile/roles atau /api/business/roles)
 */
export const list_business_roles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entity_id = req.query.entity_id as string | undefined;
    const role_type = req.query.role_type as string | undefined;
    const roles = await list_roles_service({ entity_id, role_type });

    res.status(200).json({
      status: 'success',
      message: 'Daftar peran usaha berhasil diambil',
      data: roles,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

