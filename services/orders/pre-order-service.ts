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
  update_pool_participant,
  insert_consolidated_po,
  find_pools_past_cutoff_or_expired,
} from '../../repositories/orders/procurement-pool-repositories.ts';
import { update_commodity_by_id } from '../../repositories/products/supplier-catalog-repositories.ts';
import {
  insert_procurement_order,
  find_order_by_participant_id,
  update_procurement_order,
} from '../../repositories/orders/procurement-order-repositories.ts';
import { AppError } from '../../middleware/error-middleware.ts';
import type {
  CreateProcurementPoolDTO,
  JoinProcurementPoolDTO,
  ProcurementPoolRecord,
  PoolWithParticipants,
  PoolParticipantRecord,
  PoolParticipantWithUmkm,
  PoolStatus,
  DeliveryMethod,
} from '../../types/procurement-order-types.ts';

/**
 * Menghitung dan mengupdate biaya ongkir untuk peserta Hemat Hub dalam pool
 * berdasarkan aturan pembagian biaya yang dinamis
 */
export const calculate_hemat_hub_shipping_costs = async (
  poolId: string
): Promise<void> => {
  // Ambil informasi pool untuk mendapatkan host UMKM
  const pool = await find_pool_by_id(poolId);
  if (!pool) {
    throw new AppError('Procurement pool tidak ditemukan', 404, 'POOL_NOT_FOUND');
  }

  // Ambil semua peserta pool
  const participants = await find_participants_by_pool_id(poolId);

  // Filter peserta yang memilih metode HEMAT_HUB
  const hematHubParticipants = participants.filter(
    p => p.delivery_method === 'HEMAT_HUB'
  );

  const hematHubCount = hematHubParticipants.length;

  // Jika tidak ada peserta Hemat Hub, tidak perlu menghitung
  if (hematHubCount === 0) {
    return;
  }

  // Biaya dasar ongkir Hemat Hub dan Direct Door
  const HEMAT_HUB_BASE_COST = 15000;
  const DIRECT_DOOR_BASE_COST = 35000;

  // Helper untuk update participant dan sinkronisasi pesanan (umkm_procurement_orders)
  const syncParticipantShipping = async (
    participantId: string,
    newFee: number,
    newMethod?: DeliveryMethod
  ) => {
    const updatePayload: Record<string, any> = {
      allocated_shipping_fee: String(newFee),
    };
    if (newMethod) {
      updatePayload.delivery_method = newMethod;
    }
    await update_pool_participant(participantId, updatePayload);

    // Sinkronisasi pesanan UMKM jika ada (status PENDING)
    const order = await find_order_by_participant_id(participantId);
    if (order && order.payment_status === 'PENDING') {
      const subtotal = parseFloat(order.raw_material_subtotal);
      const grandTotal = subtotal + newFee;
      await update_procurement_order(order.id, {
        shipping_fee: String(newFee),
        grand_total: String(grandTotal),
      });
    }
  };

  // Jika HANYA ADA 1 PESERTA yang memilih Hemat Hub hingga terpenuhi MOQ:
  // Otomatis ubah metode ke Direct Door dan kenakan tarif Direct Door (35.000)
  if (hematHubCount === 1) {
    const participant = hematHubParticipants[0];
    if (participant) {
      await syncParticipantShipping(
        participant.id,
        DIRECT_DOOR_BASE_COST,
        'DIRECT_DOOR_TO_DOOR' as DeliveryMethod
      );
    }
    return;
  }

  // Identifikasi host berdasarkan host_umkm_role_id dari pool
  let hostParticipant: PoolParticipantRecord | null = null;
  let regularParticipants: PoolParticipantRecord[] = [];

  if (pool.host_umkm_role_id) {
    hostParticipant = hematHubParticipants.find(
      p => p.umkm_role_id === pool.host_umkm_role_id
    ) ?? null;
  }

  // Jika tidak ditemukan host yang valid, gunakan peserta pertama sebagai fallback
  if (!hostParticipant && hematHubParticipants.length > 0) {
    hostParticipant = hematHubParticipants[0] ?? null;
  }

  if (hostParticipant) {
    regularParticipants = hematHubParticipants.filter(
      p => p.id !== hostParticipant!.id
    );
  } else {
    regularParticipants = [...hematHubParticipants];
    hostParticipant = null;
  }

  switch (hematHubCount) {
    case 2: {
      // Biaya dibagi 2 sama rata
      const sharePerPerson = Math.floor(HEMAT_HUB_BASE_COST / 2);
      for (const participant of hematHubParticipants) {
        await syncParticipantShipping(participant.id, sharePerPerson);
      }
      break;
    }

    case 3: {
      // Biaya dibagi 3, host hanya membayar 20% dari bagian mereka (diskon 80%)
      const normalShare = Math.floor(HEMAT_HUB_BASE_COST / 3);
      const hostShare = Math.floor(normalShare * 0.2);
      const remainingForOthers = HEMAT_HUB_BASE_COST - hostShare;
      const otherShare = Math.floor(remainingForOthers / 2);

      if (hostParticipant) {
        await syncParticipantShipping(hostParticipant.id, hostShare);
      }

      for (const participant of regularParticipants) {
        await syncParticipantShipping(participant.id, otherShare);
      }
      break;
    }

    default: {
      // Lebih dari 3 peserta: Host GRATIS ONGKIR (0), peserta biasa membagi biaya
      if (hematHubCount > 3 && regularParticipants.length > 0) {
        const sharePerPerson = Math.floor(HEMAT_HUB_BASE_COST / regularParticipants.length);

        if (hostParticipant) {
          await syncParticipantShipping(hostParticipant.id, 0);
        }

        for (const participant of regularParticipants) {
          await syncParticipantShipping(participant.id, sharePerPerson);
        }
      } else {
        const sharePerPerson = Math.floor(HEMAT_HUB_BASE_COST / hematHubCount);
        for (const participant of hematHubParticipants) {
          await syncParticipantShipping(participant.id, sharePerPerson);
        }
      }
      break;
    }
  }
};

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
): Promise<Array<ProcurementPoolRecord & { participants: PoolParticipantWithUmkm[] }>> => {
  // Evaluasi otomatis cut-off pool
  await evaluate_pool_cutoffs_service();
  const pools = await find_pools_by_status(status, limit_count, offset_count, commodity_id);
  const poolsWithParticipants = await Promise.all(
    pools.map(async (pool) => {
      const participants = await find_participants_by_pool_id(pool.id);
      return {
        ...pool,
        participants,
      };
    })
  );
  return poolsWithParticipants;
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
  snap_token?: string;
  snap_redirect_url?: string;
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

    if (cutoff_date_str < today_str) {
      throw new AppError(
        `Tanggal kebutuhan terlalu mepet dengan waktu persiapan supplier (${lead_time} hari lead time). Batas cut-off (${cutoff_date_str}) telah lewat.`,
        400,
        'CUTOFF_ALREADY_PASSED'
      );
    }

    pool = await insert_procurement_pool({
      commodity_id: commodity.id,
      host_umkm_role_id: payload.umkm_role_id,
      target_moq: String(commodity.base_moq),
      accumulated_qty: '0.00',
      pool_status: 'OPEN' as PoolStatus,
      locked_tier_price: commodity.base_price,
      target_delivery_date: req_date_str,
      cutoff_date: cutoff_date_str,
      is_asap_allowed: payload.is_urgent_asap ?? true,
      expires_at: new Date(cutoff_date_str + 'T23:59:59.999Z'),
      default_hub_address: payload.final_delivery_address?.trim() || null,
      hub_latitude: payload.final_delivery_lat !== undefined ? String(payload.final_delivery_lat) : null,
      hub_longitude: payload.final_delivery_lng !== undefined ? String(payload.final_delivery_lng) : null,
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

  // Cek apakah UMKM sudah bergabung di pool ini (tidak boleh duplikat di pool ID yang sama)
  const existing_participants_in_pool = await find_participants_by_pool_id(pool.id);
  const existing_participant = existing_participants_in_pool.find(
    (p) => p.umkm_role_id === payload.umkm_role_id
  );

  const old_order_qty = existing_participant ? parseFloat(existing_participant.order_qty) : 0;
  const delta_qty = order_qty_num - old_order_qty;

  const current_stock = parseFloat(commodity.stock || '0');
  const reserved_stock = parseFloat(commodity.reserved_stock || '0');
  if (delta_qty > 0 && current_stock - reserved_stock < delta_qty) {
    throw new AppError('Sisa kuota stok komoditas supplier tidak mencukupi', 400, 'INSUFFICIENT_STOCK');
  }

  // 4. Kalkulasi alokasi ongkos kirim (jika sudah dipilih)
  const allocated_shipping = payload.delivery_method
    ? calculate_allocated_shipping(payload.delivery_method)
    : 0;

  // 5. Simpan / Perbarui partisipan pool
  let active_participant: PoolParticipantRecord;

  if (existing_participant) {
    // Skenario A: Ubah Partisipasi (Update pool yang sudah diikuti sebelumnya)
    await update_pool_participant(existing_participant.id, {
      order_qty: String(order_qty_num),
      delivery_method: payload.delivery_method ?? existing_participant.delivery_method,
      required_delivery_date: payload.required_delivery_date || existing_participant.required_delivery_date,
      is_urgent_asap: payload.is_urgent_asap ?? existing_participant.is_urgent_asap,
      final_delivery_address: payload.final_delivery_address.trim(),
      final_delivery_lat: String(payload.final_delivery_lat),
      final_delivery_lng: String(payload.final_delivery_lng),
      allocated_shipping_fee: String(allocated_shipping),
    });

    active_participant = {
      ...existing_participant,
      order_qty: String(order_qty_num),
      delivery_method: (payload.delivery_method ?? existing_participant.delivery_method) as any,
      required_delivery_date: payload.required_delivery_date || existing_participant.required_delivery_date,
      is_urgent_asap: payload.is_urgent_asap ?? existing_participant.is_urgent_asap,
      final_delivery_address: payload.final_delivery_address.trim(),
      final_delivery_lat: String(payload.final_delivery_lat),
      final_delivery_lng: String(payload.final_delivery_lng),
      allocated_shipping_fee: String(allocated_shipping),
    };
  } else {
    // Skenario B: Partisipasi Baru (Belum pernah join di pool ID ini)
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
    active_participant = await insert_pool_participant(participant_payload as any);
  }

  // 6. Akumulasi kuantitas baru dan tentukan harga tier komoditas
  const current_accumulated = parseFloat(pool.accumulated_qty || '0');
  const new_accumulated = Math.max(0, current_accumulated + delta_qty);
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

    // Hitung dan update biaya ongkir Hemat Hub berdasarkan aturan pembagian biaya
    await calculate_hemat_hub_shipping_costs(pool.id);

    // Sinkronisasi harga terkunci dan shipping fee untuk semua pesanan partisipan sebelumnya di pool ini
    const all_participants = await find_participants_by_pool_id(pool.id);
    for (const p of all_participants) {
      if (p.id === active_participant.id) continue;
      const existing_order = await find_order_by_participant_id(p.id);
      if (existing_order && existing_order.payment_status === 'PENDING') {
        const p_qty = parseFloat(p.order_qty);
        const p_subtotal = p_qty * best_unit_price;
        const p_shipping = parseFloat(p.allocated_shipping_fee || '0');
        await update_procurement_order(existing_order.id, {
          raw_material_subtotal: String(p_subtotal),
          shipping_fee: String(p_shipping),
          grand_total: String(p_subtotal + p_shipping),
        });
      }
    }
  }

  // 9. Buat / Perbarui otomatis pesanan pengadaan UMKM (UMKM Procurement Order)
  const refreshed_participant =
    (await find_participants_by_pool_id(pool.id)).find((p) => p.id === active_participant.id) ?? active_participant;
  const final_shipping_fee = parseFloat(refreshed_participant.allocated_shipping_fee || String(allocated_shipping));
  const subtotal = order_qty_num * best_unit_price;
  const grand_total = subtotal + final_shipping_fee;

  let effective_order_id: string;
  const existing_order_record = await find_order_by_participant_id(active_participant.id);
  if (existing_order_record) {
    await update_procurement_order(existing_order_record.id, {
      raw_material_subtotal: String(subtotal),
      shipping_fee: String(final_shipping_fee),
      grand_total: String(grand_total),
    });
    effective_order_id = existing_order_record.id;
  } else {
    const created_order = await insert_procurement_order({
      participant_id: active_participant.id,
      raw_material_subtotal: String(subtotal),
      shipping_fee: String(final_shipping_fee),
      grand_total: String(grand_total),
      payment_status: 'PENDING',
    });
    effective_order_id = created_order.id;
  }

  let snap_token: string | undefined;
  let snap_redirect_url: string | undefined;

  if (is_target_met) {
    try {
      const { initiate_order_payment_service } = await import('../payments/payment-service.ts');
      const payment_init = await initiate_order_payment_service(effective_order_id);
      snap_token = payment_init.snap_token;
      snap_redirect_url = payment_init.snap_redirect_url;
    } catch (payment_err) {
      console.warn('[Auto Initiate Payment Warning]:', payment_err);
    }
  }

  return {
    participant: refreshed_participant,
    pool: updated_pool ?? pool,
    order_id: effective_order_id,
    snap_token,
    snap_redirect_url,
  };
};

export const calculate_allocated_shipping = (delivery_method: DeliveryMethod): number => {
  if (delivery_method === 'HEMAT_HUB') {
    return 15000;
  }
  return 35000;
};