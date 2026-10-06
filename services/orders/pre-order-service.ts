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
  find_pools_past_cutoff_or_expired,
} from '../../repositories/orders/procurement-pool-repositories';
import { update_commodity_by_id } from '../../repositories/products/supplier-catalog-repositories';
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

export const evaluate_pool_cutoffs_service = async (): Promise<{ updated_count: number }> => {
  const expired_pools = await find_pools_past_cutoff_or_expired();
  for (const pool_item of expired_pools) {
    await update_procurement_pool(pool_item.id, { pool_status: 'FAILED' });
  }
  return { updated_count: expired_pools.length };
};

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

  let calculated_cutoff = payload.cutoff_date ?? null;
  if (payload.target_delivery_date && !calculated_cutoff) {
    const lead_time = commodity.lead_time_days || 1;
    const cutoff_ms = new Date(payload.target_delivery_date).getTime() - lead_time * 86400000;
    calculated_cutoff = new Date(cutoff_ms).toISOString().slice(0, 10);
  }

  const insert_payload = {
    commodity_id: payload.commodity_id,
    target_moq: String(numeric_target_moq),
    accumulated_qty: '0.00',
    pool_status: 'OPEN' as PoolStatus,
    locked_tier_price: commodity.base_price,
    target_delivery_date: payload.target_delivery_date ?? null,
    cutoff_date: calculated_cutoff,
    is_asap_allowed: payload.is_asap_allowed ?? true,
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
  offset_count = 0,
  commodity_id?: string
): Promise<ProcurementPoolRecord[]> => {
  // Evaluasi otomatis cut-off pool
  await evaluate_pool_cutoffs_service();
  return await find_pools_by_status(status, limit_count, offset_count, commodity_id);
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
  const today_str = new Date().toISOString().slice(0, 10);
  let pool: ProcurementPoolRecord;
  let commodity: any;

  // 1. Tentukan apakah UMKM Gabung Kamar yang Ada atau Buka Kamar Baru
  if (payload.pool_id && !payload.create_new_pool) {
    // Skenario A: Gabung Kamar Patungan yang Sudah Ada
    const existing_pool = await find_pool_by_id(payload.pool_id);
    if (!existing_pool) {
      throw new AppError('Procurement pool tidak ditemukan', 404, 'POOL_NOT_FOUND');
    }

    if (existing_pool.pool_status !== 'OPEN' && existing_pool.pool_status !== 'AGGREGATING') {
      throw new AppError(
        `Tidak dapat bergabung, pool saat ini berstatus ${existing_pool.pool_status}`,
        400,
        'POOL_NOT_JOINABLE'
      );
    }

    // Periksa apakah kamar telah melewati cut-off atau tanggal expired
    const is_past_cutoff = existing_pool.cutoff_date && existing_pool.cutoff_date <= today_str;
    const is_expired = new Date(existing_pool.expires_at) <= new Date();

    if (is_past_cutoff || is_expired) {
      await update_procurement_pool(existing_pool.id, { pool_status: 'FAILED' });
      throw new AppError(
        'Kamar patungan ini telah melewati batas waktu persiapan (cut-off) dan tidak menerima pesanan baru',
        400,
        'POOL_CUTOFF_EXPIRED'
      );
    }

    pool = existing_pool;
    commodity = await find_commodity_with_tiers_by_id(pool.commodity_id);
    if (!commodity) {
      throw new AppError('Komoditas supplier tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
    }

    if (payload.required_delivery_date) {
      const req_date = new Date(payload.required_delivery_date);
      if (commodity.production_date && req_date < new Date(commodity.production_date)) {
        throw new AppError(
          `Tanggal kebutuhan tidak boleh mendahului tanggal panen/produksi supplier (${commodity.production_date})`,
          400,
          'DELIVERY_DATE_BEFORE_PRODUCTION'
        );
      }
      if (commodity.closed_date && req_date > new Date(commodity.closed_date)) {
        throw new AppError(
          `Tanggal kebutuhan melampaui batas kedaluwarsa komoditas (${commodity.closed_date})`,
          400,
          'DELIVERY_DATE_AFTER_EXPIRY'
        );
      }
    }
  } else {
    // Skenario B: Buka Kamar Patungan Baru Mandiri
    if (!payload.commodity_id) {
      throw new AppError('commodity_id diperlukan untuk membuka kamar patungan baru', 400, 'COMMODITY_ID_REQUIRED');
    }
    if (!payload.required_delivery_date) {
      throw new AppError('required_delivery_date diperlukan untuk membuka kamar patungan baru', 400, 'DELIVERY_DATE_REQUIRED');
    }

    commodity = await find_commodity_with_tiers_by_id(payload.commodity_id);
    if (!commodity) {
      throw new AppError('Komoditas supplier tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
    }

    const req_date_str = payload.required_delivery_date;
    const req_date = new Date(req_date_str);

    if (commodity.production_date && req_date < new Date(commodity.production_date)) {
      throw new AppError(
        `Tanggal kebutuhan tidak boleh mendahului tanggal panen/produksi supplier (${commodity.production_date})`,
        400,
        'DELIVERY_DATE_BEFORE_PRODUCTION'
      );
    }
    if (commodity.closed_date && req_date > new Date(commodity.closed_date)) {
      throw new AppError(
        `Tanggal kebutuhan melampaui batas kedaluwarsa komoditas (${commodity.closed_date})`,
        400,
        'DELIVERY_DATE_AFTER_EXPIRY'
      );
    }

    const lead_time = commodity.lead_time_days || 1;
    const cutoff_ms = req_date.getTime() - lead_time * 86400000;
    const cutoff_date_str = new Date(cutoff_ms).toISOString().slice(0, 10);

    if (cutoff_date_str <= today_str) {
      throw new AppError(
        `Tanggal kebutuhan terlalu mepet dengan waktu persiapan supplier (${lead_time} hari lead time). Batas cut-off (${cutoff_date_str}) telah lewat.`,
        400,
        'CUTOFF_ALREADY_PASSED'
      );
    }

    pool = await insert_procurement_pool({
      commodity_id: commodity.id,
      target_moq: String(commodity.base_moq),
      accumulated_qty: '0.00',
      pool_status: 'OPEN' as PoolStatus,
      locked_tier_price: commodity.base_price,
      target_delivery_date: req_date_str,
      cutoff_date: cutoff_date_str,
      is_asap_allowed: payload.is_urgent_asap ?? true,
      expires_at: new Date(cutoff_date_str + 'T23:59:59.999Z'),
    });
  }

  // 2. Validasi role UMKM
  const role = await find_business_role_by_id(payload.umkm_role_id);
  if (!role) {
    throw new AppError('Role UMKM tidak ditemukan', 404, 'ROLE_NOT_FOUND');
  }
  if (role.role_type !== 'UMKM') {
    throw new AppError('Hanya entitas bisnis dengan role UMKM yang dapat memesan', 403, 'FORBIDDEN_ROLE');
  }

  // 3. Validasi kuantitas pesanan dan sisa stok
  const order_qty_num = parseFloat(String(payload.order_qty));
  if (isNaN(order_qty_num) || order_qty_num <= 0) {
    throw new AppError('Kuantitas pesanan harus lebih besar dari 0', 400, 'INVALID_ORDER_QTY');
  }

  const current_stock = parseFloat(commodity.stock || '0');
  const reserved_stock = parseFloat(commodity.reserved_stock || '0');
  if (current_stock - reserved_stock < order_qty_num) {
    throw new AppError('Sisa kuota stok komoditas supplier tidak mencukupi', 400, 'INSUFFICIENT_STOCK');
  }

  // 4. Kalkulasi alokasi ongkos kirim (jika sudah dipilih)
  const allocated_shipping = payload.delivery_method
    ? calculate_allocated_shipping(payload.delivery_method)
    : 0;

  // 5. Simpan partisipan pool
  const participant_payload = {
    pool_id: pool.id,
    umkm_role_id: payload.umkm_role_id,
    order_qty: String(order_qty_num),
    delivery_method: payload.delivery_method ?? null,
    required_delivery_date: payload.required_delivery_date || pool.target_delivery_date || null,
    is_urgent_asap: payload.is_urgent_asap ?? false,
    final_delivery_address: payload.final_delivery_address.trim(),
    final_delivery_lat: String(payload.final_delivery_lat),
    final_delivery_lng: String(payload.final_delivery_lng),
    allocated_shipping_fee: String(allocated_shipping),
  };
  const created_participant = await insert_pool_participant(participant_payload as any);

  // 6. Akumulasi kuantitas baru dan tentukan harga tier komoditas
  const current_accumulated = parseFloat(pool.accumulated_qty || '0');
  const new_accumulated = current_accumulated + order_qty_num;
  const target_moq_num = parseFloat(pool.target_moq);

  let best_unit_price = parseFloat(commodity.base_price || '0');
  if (commodity.price_tiers && commodity.price_tiers.length > 0) {
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

  let final_delivery_date: string | null = pool.target_delivery_date ?? null;
  if (is_target_met) {
    const lead_time = commodity.lead_time_days || 1;
    const now = new Date();
    const prod_date = commodity.production_date ? new Date(commodity.production_date) : now;
    const base_time = now.getTime() > prod_date.getTime() ? now.getTime() : prod_date.getTime();
    const earliest_ship_str = new Date(base_time + lead_time * 86400000).toISOString().slice(0, 10);

    const wants_asap = payload.is_urgent_asap || pool.is_asap_allowed;
    if (wants_asap && pool.target_delivery_date && earliest_ship_str < pool.target_delivery_date) {
      final_delivery_date = earliest_ship_str;
    } else {
      final_delivery_date = pool.target_delivery_date || earliest_ship_str;
    }
  }

  const updated_pool = await update_procurement_pool(pool.id, {
    accumulated_qty: String(new_accumulated),
    locked_tier_price: String(best_unit_price),
    pool_status: new_pool_status,
    estimated_delivery_date: final_delivery_date,
  });

  // 8. Jika target terpenuhi (LOCKED), buatkan otomatis Consolidated PO untuk Supplier & cadangkan stok
  if (is_target_met) {
    const existing_po = await find_consolidated_po_by_pool_id(pool.id);
    if (!existing_po) {
      const total_po_amount = new_accumulated * best_unit_price;
      await insert_consolidated_po({
        pool_id: pool.id,
        supplier_role_id: commodity.supplier_role_id,
        total_amount: String(total_po_amount),
        po_status: 'ISSUED',
        delivery_date: final_delivery_date,
      });

      // Cadangkan stok pada komoditas supplier
      await update_commodity_by_id(commodity.id, {
        reserved_stock: String(reserved_stock + new_accumulated),
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

export const calculate_allocated_shipping = (delivery_method: DeliveryMethod): number => {
  if (delivery_method === 'HEMAT_HUB') {
    return 15000;
  }
  return 35000;
};
