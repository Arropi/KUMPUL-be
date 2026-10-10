import type { Request, Response, NextFunction } from 'express';
import {
  get_marketplace_catalog_service,
  get_marketplace_commodity_detail_service,
  get_marketplace_recommendations_service,
} from '../../services/products/marketplace-service.ts';
import type { StorageTemperatureType } from '../../types/commodity-batch-tag-types.ts';
import { get_authenticated_role_id } from '../../utils/auth-utils.ts';
import {
  find_entity_by_auth_user_id,
  find_roles_by_entity_id,
} from '../../repositories/profile/profile-repositories.ts';

const resolve_user_entity_and_roles = async (req: Request) => {
  let entity_id = typeof req.user?.entity_id === 'string' ? req.user.entity_id : null;
  const raw_auth_uid = req.user?.auth_user_id || req.user?.user_id || req.user?.sub;
  const auth_uid = typeof raw_auth_uid === 'string' ? raw_auth_uid : undefined;
  if (!entity_id && auth_uid) {
    try {
      const entity = await find_entity_by_auth_user_id(auth_uid);
      if (entity) {
        entity_id = entity.id;
      }
    } catch {
      // Abaikan jika pencarian entitas gagal
    }
  }

  let role_ids: string[] = [];
  if (entity_id) {
    try {
      const roles = await find_roles_by_entity_id(entity_id);
      role_ids = roles.map((r) => r.id);
    } catch {
      // Abaikan jika pencarian roles gagal
    }
  }

  if (typeof req.user?.role_id === 'string' && !role_ids.includes(req.user.role_id)) {
    role_ids.push(req.user.role_id);
  }
  if (typeof req.user?.active_role?.id === 'string' && !role_ids.includes(req.user.active_role.id)) {
    role_ids.push(req.user.active_role.id);
  }

  return { entity_id, role_ids };
};

export const get_marketplace_catalog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { entity_id, role_ids } = await resolve_user_entity_and_roles(req);

    const filter = {
      search: req.query.search as string | undefined,
      category: req.query.category as string | undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      storage_temp: req.query.storage_temp as StorageTemperatureType | undefined,
      ready_stock: req.query.ready_stock === 'true',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      exclude_entity_id: entity_id,
      exclude_role_ids: role_ids,
    };

    const commodities = await get_marketplace_catalog_service(filter);

    res.status(200).json({
      status: 'success',
      message: 'Katalog komoditas marketplace berhasil diambil',
      data: commodities,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_marketplace_commodity_detail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commodity_id = req.params.id as string;
    const commodity = await get_marketplace_commodity_detail_service(commodity_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail komoditas marketplace berhasil diambil',
      data: commodity,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_marketplace_recommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role_type = (req.user?.active_role?.role_type ||
      req.user?.role ||
      'UMKM') as 'UMKM' | 'SUPPLIER';

    const { entity_id, role_ids } = await resolve_user_entity_and_roles(req);

    let role_id: string | null = null;
    try {
      role_id = await get_authenticated_role_id(req, role_type);
    } catch {
      role_id = null;
    }

    const recommendations = await get_marketplace_recommendations_service(
      role_id,
      role_type,
      entity_id,
      role_ids
    );

    res.status(200).json({
      status: 'success',
      message: `Rekomendasi cerdas untuk ${role_type} berhasil diambil`,
      data: recommendations,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
