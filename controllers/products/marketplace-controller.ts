import type { Request, Response, NextFunction } from 'express';
import {
  get_marketplace_catalog_service,
  get_marketplace_commodity_detail_service,
  get_marketplace_recommendations_service,
} from '../../services/products/marketplace-service';
import type { StorageTemperatureType } from '../../types/commodity-batch-tag-types';
import { get_authenticated_role_id } from '../../utils/auth-utils';

export const get_marketplace_catalog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter = {
      search: req.query.search as string | undefined,
      category: req.query.category as string | undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      storage_temp: req.query.storage_temp as StorageTemperatureType | undefined,
      ready_stock: req.query.ready_stock === 'true',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
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

    const role_id = await get_authenticated_role_id(req, role_type);

    const recommendations = await get_marketplace_recommendations_service(
      role_id,
      role_type
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
