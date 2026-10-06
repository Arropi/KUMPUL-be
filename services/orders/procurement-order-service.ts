import {
  find_order_by_id,
  find_order_with_details_by_id,
  find_order_by_participant_id,
  find_orders_by_umkm_role_id,
  find_orders_by_entity_id,
  insert_procurement_order,
  update_procurement_order,
  find_all_orders_for_umkm,
  find_grouped_orders_for_supplier,
} from '../../repositories/orders/procurement-order-repositories.ts';
import {
  find_participant_by_id,
  find_participants_by_pool_id,
  find_pool_by_id,
  find_commodity_with_tiers_by_id,
  find_consolidated_po_by_id,
  find_consolidated_pos_by_supplier,
  update_consolidated_po_status,
} from '../../repositories/orders/procurement-pool-repositories.ts';
import { AppError } from '../../middleware/error-middleware.ts';
import type {
  CreateProcurementOrderDTO,
  UmkmProcurementOrderRecord,
} from '../../types/procurement-order-types.ts';

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
  order_id: string,
  umkm_role_id?: string
): Promise<UmkmProcurementOrderRecord> => {
  const order_data = await find_order_with_details_by_id(order_id);
  if (!order_data) {
    throw new AppError('Pesanan tidak ditemukan', 404, 'ORDER_NOT_FOUND');
  }

  if (umkm_role_id && order_data.participant.umkm_role_id !== umkm_role_id) {
    throw new AppError('Anda tidak berhak membatalkan pesanan ini', 403, 'UNAUTHORIZED_CANCELLATION');
  }

  if (order_data.order.payment_status === 'SETTLED') {
    throw new AppError(
      'Pesanan yang sudah dibayar tidak dapat dibatalkan secara langsung',
      400,
      'CANNOT_CANCEL_SETTLED_ORDER'
    );
  }

  // Validasi batas waktu pembatalan berbasis lead-time pengiriman supplier
  if (order_data.participant.required_delivery_date) {
    const required_date = new Date(order_data.participant.required_delivery_date);
    const lead_time_days = order_data.commodity.lead_time_days ?? 1;
    const cancellation_deadline = new Date(
      required_date.getTime() - lead_time_days * 24 * 60 * 60 * 1000
    );

    const now = new Date();
    if (now > cancellation_deadline) {
      throw new AppError(
        `Pesanan tidak dapat dibatalkan karena telah memasuki periode persiapan & pengiriman supplier (lead time: ${lead_time_days} hari)`,
        400,
        'CANNOT_CANCEL_WITHIN_LEAD_TIME'
      );
    }
  }

  const updated = await update_procurement_order(order_id, {
    payment_status: 'REFUNDED',
  });

  if (!updated) {
    throw new AppError('Gagal membatalkan pesanan', 500, 'CANCEL_FAILED');
  }

  return updated;
};

export const get_supplier_grouped_orders_service = async (supplier_role_id: string) => {
  const raw_rows = await find_grouped_orders_for_supplier(supplier_role_id);
  const pool_map = new Map<string, any>();

  for (const row of raw_rows) {
    if (!pool_map.has(row.pool_id)) {
      pool_map.set(row.pool_id, {
        pool_id: row.pool_id,
        pool_status: row.pool_status,
        target_moq: Number(row.target_moq),
        accumulated_qty: Number(row.accumulated_qty),
        target_delivery_date: row.target_delivery_date,
        is_direct_order: row.is_direct_order,
        commodity: {
          id: row.commodity_id,
          name: row.commodity_name,
          wholesale_unit: row.wholesale_unit,
          base_price: Number(row.base_price),
          lead_time_days: row.lead_time_days,
        },
        participants: [],
        total_participants_count: 0,
        total_orders_revenue: 0,
      });
    }

    if (row.order_id && row.participant_id) {
      const group = pool_map.get(row.pool_id);
      group.participants.push({
        order_id: row.order_id,
        participant_id: row.participant_id,
        umkm_role_id: row.umkm_role_id,
        order_qty: Number(row.order_qty),
        delivery_method: row.delivery_method,
        required_delivery_date: row.required_delivery_date,
        final_delivery_address: row.final_delivery_address,
        grand_total: Number(row.grand_total),
        payment_status: row.payment_status,
        created_at: row.created_at,
      });
      group.total_participants_count += 1;
      group.total_orders_revenue += Number(row.grand_total);
    }
  }

  return Array.from(pool_map.values());
};

export const get_umkm_all_orders_service = async (umkm_role_id: string) => {
  return await find_all_orders_for_umkm(umkm_role_id);
};

export const list_supplier_pos_service = async (
  supplier_role_id: string,
  limit_count = 20,
  offset_count = 0
) => {
  return await find_consolidated_pos_by_supplier(supplier_role_id, limit_count, offset_count);
};

export const get_supplier_po_detail_service = async (po_id: string) => {
  const po = await find_consolidated_po_by_id(po_id);
  if (!po) {
    throw new AppError('Consolidated PO supplier tidak ditemukan', 404, 'PO_NOT_FOUND');
  }

  const pool = await find_pool_by_id(po.pool_id);
  const commodity = pool ? await find_commodity_with_tiers_by_id(pool.commodity_id) : null;
  const participants = pool ? await find_participants_by_pool_id(pool.id) : [];

  return {
    po,
    pool,
    commodity,
    participants,
  };
};

export const update_supplier_po_status_service = async (
  po_id: string,
  new_status: 'SHIPPED' | 'DELIVERED'
) => {
  const po = await find_consolidated_po_by_id(po_id);
  if (!po) {
    throw new AppError('Consolidated PO supplier tidak ditemukan', 404, 'PO_NOT_FOUND');
  }

  if (po.po_status !== 'PAID_TO_ESCROW' && po.po_status !== 'SHIPPED') {
    throw new AppError(
      `PO tidak dapat diubah statusnya ke ${new_status} karena status saat ini ${po.po_status}`,
      400,
      'INVALID_PO_STATUS_TRANSITION'
    );
  }

  const updated_po = await update_consolidated_po_status(po_id, new_status);
  return updated_po;
};
