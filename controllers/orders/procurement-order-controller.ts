import type { Request, Response, NextFunction } from 'express';
import {
  create_procurement_order_service,
  get_procurement_order_by_id_service,
  list_orders_by_umkm_role_service,
  list_orders_by_entity_service,
  cancel_procurement_order_service,
} from '../../services/orders/procurement-order-service';

export const create_procurement_order = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = {
      participant_id: req.body.participant_id,
      shipping_fee: req.body.shipping_fee,
    };

    const created_order = await create_procurement_order_service(payload);

    res.status(201).json({
      status: 'success',
      message: 'Pesanan pengadaan berhasil dibuat',
      data: created_order,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_procurement_order_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order_id = req.params.id as string;
    const order_data = await get_procurement_order_by_id_service(order_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail pesanan berhasil diambil',
      data: order_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_orders_by_umkm_role = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role_id = req.params.role_id as string;
    const limit_count = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset_count = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const orders = await list_orders_by_umkm_role_service(role_id, limit_count, offset_count);

    res.status(200).json({
      status: 'success',
      message: 'Daftar pesanan UMKM berhasil diambil',
      data: orders,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_orders_by_entity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entity_id = req.params.entity_id as string;
    const limit_count = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset_count = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const orders = await list_orders_by_entity_service(entity_id, limit_count, offset_count);

    res.status(200).json({
      status: 'success',
      message: 'Daftar pesanan entitas bisnis berhasil diambil',
      data: orders,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const cancel_procurement_order = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order_id = req.params.id as string;
    const cancelled_order = await cancel_procurement_order_service(order_id);

    res.status(200).json({
      status: 'success',
      message: 'Pesanan berhasil dibatalkan',
      data: cancelled_order,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
