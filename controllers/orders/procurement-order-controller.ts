import type { Request, Response, NextFunction } from 'express';
import {
  create_procurement_order_service,
  get_procurement_order_by_id_service,
  list_orders_by_umkm_role_service,
  list_orders_by_entity_service,
  cancel_procurement_order_service,
  list_supplier_pos_service,
  get_supplier_po_detail_service,
  update_supplier_po_status_service,
  get_supplier_grouped_orders_service,
  get_umkm_all_orders_service,
  confirm_order_pickup_service,
  assign_pool_host_service,
  ship_supplier_po_service,
} from '../../services/orders/procurement-order-service.ts';
import { get_authenticated_role_id } from '../../utils/auth-utils.ts';
import { AppError } from '../../middleware/error-middleware.ts';

export const create_procurement_order = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formatted_payload = {
      participant_id: req.body.participant_id,
      shipping_fee: req.body.shipping_fee,
    };

    const new_order = await create_procurement_order_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Pesanan pengadaan berhasil dibuat',
      data: new_order,
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
    const order_detail = await get_procurement_order_by_id_service(order_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail pesanan pengadaan berhasil diambil',
      data: order_detail,
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
    let umkm_role_id: string | undefined;
    if (req.user) {
      try {
        umkm_role_id = await get_authenticated_role_id(req, 'UMKM');
      } catch {
        // Fallback jika bukan user terautentikasi UMKM langsung
      }
    }

    const cancelled_order = await cancel_procurement_order_service(order_id, umkm_role_id);

    res.status(200).json({
      status: 'success',
      message: 'Pesanan berhasil dibatalkan',
      data: cancelled_order,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_supplier_grouped_orders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const supplier_role_id = await get_authenticated_role_id(req, 'SUPPLIER');
    const grouped_orders = await get_supplier_grouped_orders_service(supplier_role_id);

    res.status(200).json({
      status: 'success',
      message: 'Daftar pesanan supplier terkelompok berhasil diambil',
      data: grouped_orders,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_umkm_all_orders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const umkm_role_id = await get_authenticated_role_id(req, 'UMKM');
    const orders = await get_umkm_all_orders_service(umkm_role_id);

    res.status(200).json({
      status: 'success',
      message: 'Seluruh pesanan pengadaan UMKM berhasil diambil',
      data: orders,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_supplier_pos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let supplier_role_id = req.query.supplier_role_id as string | undefined;
    if (!supplier_role_id && req.user) {
      try {
        supplier_role_id = await get_authenticated_role_id(req, 'SUPPLIER');
      } catch {
        // Fallback jika bukan session supplier aktif
      }
    }

    if (!supplier_role_id) {
      throw new AppError('Query parameter supplier_role_id wajib disertakan atau autentikasi sebagai Supplier', 400, 'MISSING_SUPPLIER_ROLE_ID');
    }

    const limit_count = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset_count = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const pos = await list_supplier_pos_service(supplier_role_id, limit_count, offset_count);

    res.status(200).json({
      status: 'success',
      message: 'Daftar Purchase Order (PO) konsolidasi supplier berhasil diambil',
      data: pos,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_supplier_po_detail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const po_id = req.params.id as string;
    const po_detail = await get_supplier_po_detail_service(po_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail Purchase Order (PO) supplier berhasil diambil',
      data: po_detail,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const confirm_order_pickup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order_id = req.params.id as string;
    const pickup_code = req.body.pickup_code as string;
    let umkm_role_id: string | undefined;

    if (req.user) {
      try {
        umkm_role_id = await get_authenticated_role_id(req, 'UMKM');
      } catch {
        // Fallback
      }
    }

    const updated_order = await confirm_order_pickup_service(order_id, pickup_code, umkm_role_id);

    res.status(200).json({
      status: 'success',
      message: 'Pengambilan barang berhasil dikonfirmasi dan pesanan selesai',
      data: updated_order,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const assign_pool_host = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool_id = req.params.pool_id as string;
    const host_umkm_role_id = req.body.host_umkm_role_id as string;

    const result = await assign_pool_host_service(pool_id, host_umkm_role_id);

    res.status(200).json({
      status: 'success',
      message: result.warning
        ? `Titik Host Hub berhasil diubah dengan catatan: ${result.warning}`
        : 'Titik Host Hub berhasil diubah',
      data: result,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const ship_supplier_po = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const po_id = (req.params.po_id || req.params.id) as string;
    const payload = {
      driver_name: req.body.driver_name,
      tracking_number: req.body.tracking_number,
      delivery_proof_url: req.body.delivery_proof_url,
    };

    const updated_po = await ship_supplier_po_service(po_id, payload);

    res.status(200).json({
      status: 'success',
      message: 'Bukti pengiriman berhasil dicatat dan status PO diperbarui ke SHIPPED',
      data: updated_po,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_supplier_po_status = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const po_id = req.params.id as string;
    const new_status = req.body.status as 'SHIPPED' | 'DELIVERED';
    if (!new_status || (new_status !== 'SHIPPED' && new_status !== 'DELIVERED')) {
      res.status(400).json({
        status: 'error',
        error_code: 'INVALID_STATUS',
        message: 'Status harus bernilai SHIPPED atau DELIVERED',
      });
      return;
    }

    const updated_po = await update_supplier_po_status_service(po_id, new_status);

    res.status(200).json({
      status: 'success',
      message: `Status PO berhasil diubah menjadi ${new_status}`,
      data: updated_po,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
