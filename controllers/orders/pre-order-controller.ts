import type { Request, Response, NextFunction } from 'express';
import {
  create_procurement_pool_service,
  list_procurement_pools_service,
  get_procurement_pool_by_id_service,
  join_procurement_pool_service,
  evaluate_pool_cutoffs_service,
} from '../../services/orders/pre-order-service.ts';
import type { PoolStatus } from '../../types/procurement-order-types.ts';

export const create_procurement_pool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool_payload = {
      commodity_id: req.body.commodity_id,
      target_moq: req.body.target_moq,
      target_delivery_date: req.body.target_delivery_date,
      cutoff_date: req.body.cutoff_date,
      is_asap_allowed: req.body.is_asap_allowed,
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
    const commodity_id = req.query.commodity_id as string | undefined;
    const limit_count = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset_count = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const pools = await list_procurement_pools_service(pool_status, limit_count, offset_count, commodity_id);

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
      commodity_id: req.body.commodity_id,
      create_new_pool: req.body.create_new_pool,
      umkm_role_id: req.body.umkm_role_id,
      order_qty: req.body.order_qty,
      delivery_method: req.body.delivery_method,
      required_delivery_date: req.body.required_delivery_date,
      is_urgent_asap: req.body.is_urgent_asap,
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

export const evaluate_pool_cutoffs = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await evaluate_pool_cutoffs_service();

    res.status(200).json({
      status: 'success',
      message: 'Evaluasi batas waktu (cut-off) pool selesai diproses',
      data: result,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
