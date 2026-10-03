import {
  find_pool_by_id,
  find_pools_by_status,
  find_participants_by_pool_id,
  find_consolidated_po_by_pool_id,
  find_commodity_with_tiers_by_id,
  find_business_role_by_id,
  insert_procurement_pool,
  update_procurement_pool,
  insert_pool_participant,
  insert_consolidated_po,
} from '../../repositories/orders/procurement-pool-repositories';
import { insert_procurement_order } from '../../repositories/orders/procurement-order-repositories';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateProcurementPoolDTO,
  JoinProcurementPoolDTO,
  ProcurementPoolRecord,
  PoolWithParticipants,
  PoolParticipantRecord,
  PoolStatus,
  DeliveryMethod,
} from '../../types/procurement-order-types';

export const create_procurement_pool_service = async (
  payload: CreateProcurementPoolDTO
): Promise<ProcurementPoolRecord> => {
  const commodity = await find_commodity_with_tiers_by_id(payload.commodity_id);
  if (!commodity) {
    throw new AppError('Komoditas supplier tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  const numeric_target_moq = parseFloat(String(payload.target_moq));
  if (isNaN(numeric_target_moq) || numeric_target_moq <= 0) {
    throw new AppError('Target MOQ harus berupa angka lebih besar dari 0', 400, 'INVALID_TARGET_MOQ');
  }

  const expiry_date = new Date(payload.expires_at);
  if (isNaN(expiry_date.getTime()) || expiry_date <= new Date()) {
    throw new AppError('Tanggal kedaluwarsa pool harus di masa depan', 400, 'INVALID_EXPIRY_DATE');
  }

  const insert_payload = {
    commodity_id: payload.commodity_id,
    target_moq: String(numeric_target_moq),
    accumulated_qty: '0.00',
    pool_status: 'OPEN' as PoolStatus,
    locked_tier_price: commodity.base_price,
    expires_at: expiry_date,
    default_hub_address: payload.default_hub_address ?? null,
    hub_latitude: payload.hub_latitude !== undefined ? String(payload.hub_latitude) : null,
    hub_longitude: payload.hub_longitude !== undefined ? String(payload.hub_longitude) : null,
  };

  return await insert_procurement_pool(insert_payload);
};

export const list_procurement_pools_service = async (
  status?: PoolStatus,
  limit_count = 20,
  offset_count = 0
): Promise<ProcurementPoolRecord[]> => {
  return await find_pools_by_status(status, limit_count, offset_count);
};

export const get_procurement_pool_by_id_service = async (
  pool_id: string
): Promise<PoolWithParticipants> => {
  const pool = await find_pool_by_id(pool_id);
  if (!pool) {
    throw new AppError('Procurement pool tidak ditemukan', 404, 'POOL_NOT_FOUND');
  }

  const participants = await find_participants_by_pool_id(pool_id);
  const consolidated_po = await find_consolidated_po_by_pool_id(pool_id);
  const commodity = await find_commodity_with_tiers_by_id(pool.commodity_id);

  return {
    ...pool,
    commodity_name: commodity?.name,
    wholesale_unit: commodity?.wholesale_unit,
    participants,
    consolidated_po,
  };
};

export const join_procurement_pool_service = async (
  payload: JoinProcurementPoolDTO
): Promise<{
  participant: PoolParticipantRecord;
  pool: ProcurementPoolRecord;
  order_id: string;
}> => {
  // 1. Validasi pool yang aktif
  const pool = await find_pool_by_id(payload.pool_id);
  if (!pool) {
    throw new AppError('Procurement pool tidak ditemukan', 404, 'POOL_NOT_FOUND');
  }

  if (pool.pool_status !== 'OPEN' && pool.pool_status !== 'AGGREGATING') {
    throw new AppError(
      `Tidak dapat bergabung, pool saat ini berstatus ${pool.pool_status}`,
      400,
      'POOL_NOT_JOINABLE'
    );
  }

  if (new Date(pool.expires_at) <= new Date()) {
    await update_procurement_pool(pool.id, { pool_status: 'FAILED' });
    throw new AppError('Pool telah kedaluwarsa dan tidak menerima pesanan baru', 400, 'POOL_EXPIRED');
  }

  // 2. Validasi role UMKM
  const role = await find_business_role_by_id(payload.umkm_role_id);
  if (!role) {
    throw new AppError('Role UMKM tidak ditemukan', 404, 'ROLE_NOT_FOUND');
  }
  if (role.role_type !== 'UMKM') {
    throw new AppError('Hanya entitas bisnis dengan role UMKM yang dapat memesan', 403, 'FORBIDDEN_ROLE');
  }

  // 3. Validasi kuantitas pesanan
  const order_qty_num = parseFloat(String(payload.order_qty));
  if (isNaN(order_qty_num) || order_qty_num <= 0) {
    throw new AppError('Kuantitas pesanan harus lebih besar dari 0', 400, 'INVALID_ORDER_QTY');
  }

  // 4. Kalkulasi alokasi ongkos kirim berdasarkan metode pengiriman
  const allocated_shipping = calculate_allocated_shipping(payload.delivery_method);

  // 5. Simpan partisipan pool
  const participant_payload = {
    pool_id: pool.id,
    umkm_role_id: payload.umkm_role_id,
    order_qty: String(order_qty_num),
    delivery_method: payload.delivery_method,
    final_delivery_address: payload.final_delivery_address.trim(),
    final_delivery_lat: String(payload.final_delivery_lat),
    final_delivery_lng: String(payload.final_delivery_lng),
    allocated_shipping_fee: String(allocated_shipping),
  };
  const created_participant = await insert_pool_participant(participant_payload);

  // 6. Akumulasi kuantitas baru dan tentukan harga tier komoditas
  const commodity = await find_commodity_with_tiers_by_id(pool.commodity_id);
  const current_accumulated = parseFloat(pool.accumulated_qty || '0');
  const new_accumulated = current_accumulated + order_qty_num;
  const target_moq_num = parseFloat(pool.target_moq);

  let best_unit_price = parseFloat(commodity?.base_price || '0');
  if (commodity && commodity.price_tiers && commodity.price_tiers.length > 0) {
    for (const tier of commodity.price_tiers) {
      const min_tier_qty = parseFloat(tier.min_qty);
      if (new_accumulated >= min_tier_qty) {
        best_unit_price = parseFloat(tier.tier_price);
      }
    }
  }

  // 7. Update status pool: jika kuantitas mencapai target MOQ, kunci pool (LOCKED)
  const is_target_met = new_accumulated >= target_moq_num;
  const new_pool_status: PoolStatus = is_target_met ? 'LOCKED' : 'AGGREGATING';

  const updated_pool = await update_procurement_pool(pool.id, {
    accumulated_qty: String(new_accumulated),
    locked_tier_price: String(best_unit_price),
    pool_status: new_pool_status,
  });

  // 8. Jika target terpenuhi (LOCKED), buatkan otomatis Consolidated PO untuk Supplier
  if (is_target_met && commodity) {
    const existing_po = await find_consolidated_po_by_pool_id(pool.id);
    if (!existing_po) {
      const total_po_amount = new_accumulated * best_unit_price;
      await insert_consolidated_po({
        pool_id: pool.id,
        supplier_role_id: commodity.supplier_role_id,
        total_amount: String(total_po_amount),
        po_status: 'ISSUED',
      });
    }
  }

  // 9. Buat otomatis pesanan pengadaan UMKM (UMKM Procurement Order)
  const subtotal = order_qty_num * best_unit_price;
  const grand_total = subtotal + allocated_shipping;

  const created_order = await insert_procurement_order({
    participant_id: created_participant.id,
    raw_material_subtotal: String(subtotal),
    shipping_fee: String(allocated_shipping),
    grand_total: String(grand_total),
    payment_status: 'PENDING',
  });

  return {
    participant: created_participant,
    pool: updated_pool ?? pool,
    order_id: created_order.id,
  };
};

const calculate_allocated_shipping = (delivery_method: DeliveryMethod): number => {
  // Metode Hemat Hub (Konsolidasi pengiriman) mendapat tarif flat bersubsidi
  if (delivery_method === 'HEMAT_HUB') {
    return 15000;
  }
  // Direct Door-to-Door pengiriman langsung
  return 35000;
};
