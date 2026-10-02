import type { Request, Response, NextFunction } from 'express';
import {
  create_procurement_pool_service,
  list_procurement_pools_service,
  get_procurement_pool_by_id_service,
  join_procurement_pool_service,
} from '../../services/orders/pre-order-service';
import type { PoolStatus } from '../../types/procurement-order-types';

export const create_procurement_pool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool_payload = {
      commodity_id: req.body.commodity_id,
      target_moq: req.body.target_moq,
      expires_at: req.body.expires_at,
      default_hub_address: req.body.default_hub_address,
      hub_latitude: req.body.hub_latitude,
      hub_longitude: req.body.hub_longitude,
    };

    const created_pool = await create_procurement_pool_service(pool_payload);

    res.status(201).json({
      status: 'success',
      message: 'Procurement pool berhasil dibuat',
      data: created_pool,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_procurement_pools = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool_status = req.query.status as PoolStatus | undefined;
    const limit_count = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset_count = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const pools = await list_procurement_pools_service(pool_status, limit_count, offset_count);

    res.status(200).json({
      status: 'success',
      message: 'Daftar procurement pool berhasil diambil',
      data: pools,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_procurement_pool_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool_id = req.params.id as string;
    const pool_detail = await get_procurement_pool_by_id_service(pool_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail procurement pool berhasil diambil',
      data: pool_detail,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const join_procurement_pool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const join_payload = {
      pool_id: req.body.pool_id,
      umkm_role_id: req.body.umkm_role_id,
      order_qty: req.body.order_qty,
      delivery_method: req.body.delivery_method,
      final_delivery_address: req.body.final_delivery_address,
      final_delivery_lat: req.body.final_delivery_lat,
      final_delivery_lng: req.body.final_delivery_lng,
    };

    const result = await join_procurement_pool_service(join_payload);

    res.status(201).json({
      status: 'success',
      message: 'Berhasil bergabung ke dalam procurement pool',
      data: result,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
