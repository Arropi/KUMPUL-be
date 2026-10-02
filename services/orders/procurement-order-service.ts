import {
  find_order_by_id,
  find_order_with_details_by_id,
  find_order_by_participant_id,
  find_orders_by_umkm_role_id,
  find_orders_by_entity_id,
  insert_procurement_order,
  update_procurement_order,
} from '../../repositories/orders/procurement-order-repositories';
import {
  find_participant_by_id,
  find_pool_by_id,
  find_commodity_with_tiers_by_id,
} from '../../repositories/orders/procurement-pool-repositories';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateProcurementOrderDTO,
  UmkmProcurementOrderRecord,
} from '../../types/procurement-order-types';

export const create_procurement_order_service = async (
  payload: CreateProcurementOrderDTO
): Promise<UmkmProcurementOrderRecord> => {
  const existing_order = await find_order_by_participant_id(payload.participant_id);
  if (existing_order) {
    return existing_order;
  }

  const participant = await find_participant_by_id(payload.participant_id);
  if (!participant) {
    throw new AppError('Data partisipan pesanan tidak ditemukan', 404, 'PARTICIPANT_NOT_FOUND');
  }

  const pool = await find_pool_by_id(participant.pool_id);
  if (!pool) {
    throw new AppError('Data pool pengadaan tidak ditemukan', 404, 'POOL_NOT_FOUND');
  }

  const commodity = await find_commodity_with_tiers_by_id(pool.commodity_id);
  const unit_price = parseFloat(pool.locked_tier_price || commodity?.base_price || '0');
  const qty = parseFloat(participant.order_qty);
  const raw_subtotal = qty * unit_price;

  const shipping =
    payload.shipping_fee !== undefined
      ? parseFloat(String(payload.shipping_fee))
      : parseFloat(participant.allocated_shipping_fee || '0');

  const grand_total = raw_subtotal + shipping;

  const new_order = await insert_procurement_order({
    participant_id: participant.id,
    raw_material_subtotal: String(raw_subtotal),
    shipping_fee: String(shipping),
    grand_total: String(grand_total),
    payment_status: 'PENDING',
  });

  return new_order;
};

export const get_procurement_order_by_id_service = async (order_id: string) => {
  const order_record = await find_order_with_details_by_id(order_id);
  if (!order_record) {
    throw new AppError('Pesanan pengadaan tidak ditemukan', 404, 'ORDER_NOT_FOUND');
  }

  return order_record;
};

export const list_orders_by_umkm_role_service = async (
  umkm_role_id: string,
  limit_count = 20,
  offset_count = 0
) => {
  return await find_orders_by_umkm_role_id(umkm_role_id, limit_count, offset_count);
};

export const list_orders_by_entity_service = async (
  entity_id: string,
  limit_count = 20,
  offset_count = 0
) => {
  return await find_orders_by_entity_id(entity_id, limit_count, offset_count);
};

export const cancel_procurement_order_service = async (
  order_id: string
): Promise<UmkmProcurementOrderRecord> => {
  const order = await find_order_by_id(order_id);
  if (!order) {
    throw new AppError('Pesanan tidak ditemukan', 404, 'ORDER_NOT_FOUND');
  }

  if (order.payment_status === 'SETTLED') {
    throw new AppError(
      'Pesanan yang sudah dibayar tidak dapat dibatalkan secara langsung',
      400,
      'CANNOT_CANCEL_SETTLED_ORDER'
    );
  }

  const updated = await update_procurement_order(order_id, {
    payment_status: 'REFUNDED',
  });

  if (!updated) {
    throw new AppError('Gagal membatalkan pesanan', 500, 'CANCEL_FAILED');
  }

  return updated;
};
