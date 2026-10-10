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
  update_procurement_pool,
  update_pool_participant,
  find_commodity_with_tiers_by_id,
  find_consolidated_po_by_id,
  find_consolidated_po_by_pool_id,
  find_consolidated_pos_by_supplier,
  update_consolidated_po_status,
  update_consolidated_po,
} from '../../repositories/orders/procurement-pool-repositories.ts';
import { update_escrow_status } from '../../repositories/payments/payment-repositories.ts';
import { calculate_hemat_hub_shipping_costs } from './pre-order-service.ts';
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
  const raw_orders = await find_all_orders_for_umkm(umkm_role_id);

  // Kumpulkan info partisipan pool untuk pool yang masih PENDING/AGGREGATING
  const pool_ids = Array.from(new Set(raw_orders.map((o) => o.pool_id).filter(Boolean)));
  const participants_by_pool = new Map<string, any[]>();

  for (const pid of pool_ids) {
    try {
      const parts = await find_participants_by_pool_id(pid);
      participants_by_pool.set(
        pid,
        parts.map((p) => ({
          id: p.id,
          name: p.umkm_name || 'UMKM Mitra',
          city: p.entity_address?.split(',')[0] || 'Kota Pemesan',
          qty: parseFloat(p.order_qty),
          deliveryMethod: p.delivery_method,
          isHost: p.umkm_role_id === p.pool_id, // fallback
        }))
      );
    } catch {
      // Abaikan jika query partisipan gagal
    }
  }

  return raw_orders.map((row) => {
    // Pemetaan 6 status terstandarisasi KUMPUL (PRD Halaman 7)
    let standard_status: 'PENDING' | 'WAITING_PAYMENT' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';
    if (row.payment_status === 'REFUNDED' || row.pool_status === 'FAILED') {
      standard_status = 'CANCELLED';
    } else if (row.is_picked_up || row.po_status === 'DELIVERED') {
      standard_status = 'COMPLETED';
    } else if (row.po_status === 'SHIPPED') {
      standard_status = 'READY_FOR_PICKUP';
    } else if (row.payment_status === 'SETTLED') {
      standard_status = 'PROCESSING';
    } else if (row.pool_status === 'LOCKED') {
      standard_status = 'WAITING_PAYMENT';
    } else {
      standard_status = 'PENDING';
    }

    const pickup_code = row.pickup_code || `KMPL-${row.order_id.slice(0, 4).toUpperCase()}`;

    return {
      id: row.order_id,
      orderNumber: `ORD-${row.order_id.slice(0, 8).toUpperCase()}`,
      participantId: row.participant_id,
      poolId: row.pool_id,
      commodityId: row.commodity_id,
      commodityName: row.commodity_name,
      wholesaleUnit: row.wholesale_unit,
      orderQty: parseFloat(row.order_qty),
      volumeKg: parseFloat(row.order_qty),
      unit: row.wholesale_unit,
      basePrice: parseFloat(row.base_price || '0'),
      rawMaterialSubtotal: parseFloat(row.raw_material_subtotal),
      shippingFee: parseFloat(row.shipping_fee),
      grandTotal: parseFloat(row.grand_total),
      totalWholesalePaid: parseFloat(row.grand_total),
      paymentStatus: row.payment_status,
      paymentDeadline: row.payment_deadline,
      snapToken: row.snap_token,
      snapRedirectUrl: row.snap_redirect_url,
      settlementTime: row.settlement_time,
      paymentMethod: row.payment_method,
      deliveryMethod: row.delivery_method,
      requiredDeliveryDate: row.required_delivery_date,
      pickupCode: pickup_code,
      hubPickupCode: pickup_code,
      isPickedUp: row.is_picked_up,
      pickedUpAt: row.picked_up_at,
      finalDeliveryAddress: row.final_delivery_address,
      deliveryLocation: row.default_hub_address || row.final_delivery_address,
      poolStatus: row.pool_status,
      targetMoq: parseFloat(row.target_moq || '0'),
      accumulatedQty: parseFloat(row.accumulated_qty || '0'),
      targetDeliveryDate: row.target_delivery_date,
      cutoffDate: row.cutoff_date,
      isDirectOrder: row.is_direct_order,
      orderType: row.is_direct_order ? 'DIRECT_OVER_MOQ' : 'POOLING_UNDER_MOQ',
      leadTimeDays: row.lead_time_days,
      imageUrl: row.image_url,
      poId: row.po_id,
      poNumber: row.po_id ? `PO-KUMPUL-${row.po_id.slice(0, 8).toUpperCase()}` : undefined,
      poStatus: row.po_status,
      driverName: row.driver_name,
      trackingNumber: row.tracking_number,
      deliveryProofUrl: row.delivery_proof_url,
      hostContact: row.host_name
        ? {
            name: row.host_name,
            phone: row.host_phone,
            address: row.host_address || row.default_hub_address,
          }
        : undefined,
      supplierContact: row.supplier_name
        ? {
            name: row.supplier_name,
            phone: row.supplier_phone,
          }
        : undefined,
      status: standard_status,
      standardStatus: standard_status,
      poolParticipants: participants_by_pool.get(row.pool_id) || [],
      createdAt: row.created_at,
      orderDate: row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : '',
    };
  });
};

export const confirm_order_pickup_service = async (
  order_id: string,
  pickup_code: string,
  current_umkm_role_id?: string
) => {
  const order_data = await find_order_with_details_by_id(order_id);
  if (!order_data) {
    throw new AppError('Pesanan pengadaan tidak ditemukan', 404, 'ORDER_NOT_FOUND');
  }

  if (order_data.participant.is_picked_up) {
    throw new AppError('Pesanan ini sudah selesai diambil sebelumnya', 400, 'ALREADY_PICKED_UP');
  }

  const valid_code =
    order_data.participant.pickup_code || `KMPL-${order_data.order.id.slice(0, 4).toUpperCase()}`;

  if (pickup_code.trim().toUpperCase() !== valid_code.trim().toUpperCase()) {
    throw new AppError('Kode pickup / PIN verifikasi serah-terima tidak valid atau tidak cocok', 400, 'INVALID_PICKUP_CODE');
  }

  // Update participant: status picked up
  await update_pool_participant(order_data.participant.id, {
    is_picked_up: true,
    picked_up_at: new Date(),
  });

  // Update order: settlement time
  const updated_order = await update_procurement_order(order_id, {
    payment_status: 'SETTLED',
    settlement_time: new Date(),
  });

  // Cek apakah seluruh partisipan di pool ini telah mengambil barang
  if (order_data.pool?.id) {
    const pool_participants_list = await find_participants_by_pool_id(order_data.pool.id);
    const all_picked_up = pool_participants_list.every(
      (p) => p.id === order_data.participant.id || p.is_picked_up
    );
    if (all_picked_up) {
      await update_procurement_pool(order_data.pool.id, { pool_status: 'COMPLETED' });
      const po = await find_consolidated_po_by_pool_id(order_data.pool.id);
      if (po) {
        await update_consolidated_po_status(po.id, 'DELIVERED');
      }
    }
  }

  // Lepaskan transaksi escrow ke supplier jika ada
  try {
    await update_escrow_status(order_id, 'RELEASED');
  } catch {
    // Abaikan jika order escrow tidak tercatat
  }

  return updated_order;
};

export const assign_pool_host_service = async (
  pool_id: string,
  host_umkm_role_id: string
) => {
  const pool = await find_pool_by_id(pool_id);
  if (!pool) {
    throw new AppError('Procurement pool tidak ditemukan', 404, 'POOL_NOT_FOUND');
  }

  const participants = await find_participants_by_pool_id(pool_id);
  const host_candidate = participants.find((p) => p.umkm_role_id === host_umkm_role_id);
  if (!host_candidate) {
    throw new AppError('UMKM yang dipilih bukan merupakan peserta di pool ini', 400, 'PARTICIPANT_NOT_IN_POOL');
  }

  const hemat_hub_participants = participants.filter((p) => p.delivery_method === 'HEMAT_HUB');
  const total_hub_volume = hemat_hub_participants.reduce((sum, p) => sum + parseFloat(p.order_qty), 0);

  const storage_capacity = host_candidate.storage_capacity ?? 0;
  let warning: string | null = null;
  if (storage_capacity < total_hub_volume) {
    warning = `Kapasitas penyimpanan UMKM ini (${storage_capacity} kg) lebih kecil dari total muatan hub (${total_hub_volume} kg)`;
  }

  const updated_pool = await update_procurement_pool(pool_id, {
    host_umkm_role_id,
    default_hub_address: host_candidate.final_delivery_address,
    hub_latitude: host_candidate.final_delivery_lat,
    hub_longitude: host_candidate.final_delivery_lng,
  });

  // Hitung ulang pembagian biaya pengiriman Hemat Hub dengan host baru
  await calculate_hemat_hub_shipping_costs(pool_id);

  return {
    pool: updated_pool,
    host_umkm_role_id,
    host_name: host_candidate.umkm_name,
    storage_capacity,
    total_hub_volume,
    warning,
  };
};

export const ship_supplier_po_service = async (
  po_id: string,
  payload: { driver_name: string; tracking_number: string; delivery_proof_url?: string | null }
) => {
  const po = await find_consolidated_po_by_id(po_id);
  if (!po) {
    throw new AppError('Consolidated PO supplier tidak ditemukan', 404, 'PO_NOT_FOUND');
  }

  const updated_po = await update_consolidated_po(po_id, {
    po_status: 'SHIPPED',
    driver_name: payload.driver_name,
    tracking_number: payload.tracking_number,
    delivery_proof_url: payload.delivery_proof_url ?? null,
  });

  return updated_po;
};

export const list_supplier_pos_service = async (
  supplier_role_id: string,
  limit_count = 20,
  offset_count = 0
) => {
  const records = await find_consolidated_pos_by_supplier(supplier_role_id, limit_count, offset_count);

  return records.map((po) => {
    const totalQty = parseFloat(po.total_quantity || '0');
    const grandTotal = parseFloat(po.total_amount || '0');
    const lockedPrice = totalQty > 0 ? Math.round(grandTotal / totalQty) : 0;

    return {
      id: po.id,
      poNumber: `PO-KUMPUL-${po.id.slice(0, 8).toUpperCase()}`,
      poolId: po.pool_id,
      commodityId: po.commodity_id,
      commodityName: po.commodity_name,
      wholesaleUnit: po.wholesale_unit,
      totalQuantity: totalQty,
      totalWeightKg: totalQty,
      grandTotalAmount: grandTotal,
      lockedTierPrice: lockedPrice,
      status: po.po_status,
      primaryDeliveryMethod: 'HEMAT_HUB',
      hubName: po.hub_name || 'Hub Konsolidasi UMKM',
      hubAddress: po.hub_address || '-',
      driverName: po.driver_name,
      trackingNumber: po.tracking_number,
      deliveryProofUrl: po.delivery_proof_url,
      createdAt: po.created_at,
      estimatedDeliveryDate: po.delivery_date || po.estimated_delivery_date,
      participants: [],
    };
  });
};

export const get_supplier_po_detail_service = async (po_id: string) => {
  const po = await find_consolidated_po_by_id(po_id);
  if (!po) {
    throw new AppError('Consolidated PO supplier tidak ditemukan', 404, 'PO_NOT_FOUND');
  }

  const pool = await find_pool_by_id(po.pool_id);
  const commodity = pool ? await find_commodity_with_tiers_by_id(pool.commodity_id) : null;
  const raw_participants = pool ? await find_participants_by_pool_id(pool.id) : [];

  const hemat_hub_participants = raw_participants.filter((p) => p.delivery_method === 'HEMAT_HUB');
  const total_hub_volume = hemat_hub_participants.reduce((sum, p) => sum + parseFloat(p.order_qty), 0);

  const host_participant = pool?.host_umkm_role_id
    ? raw_participants.find((p) => p.umkm_role_id === pool.host_umkm_role_id)
    : null;

  const participants = raw_participants.map((p) => ({
    id: p.id,
    umkmRoleId: p.umkm_role_id,
    umkmName: p.umkm_name || 'UMKM Anggota',
    ownerName: p.umkm_name || 'Pemilik Usaha',
    phone: p.phone_number || '-',
    orderQtyUnit: parseFloat(p.order_qty),
    orderWeightKg: parseFloat(p.order_qty),
    deliveryMethod: p.delivery_method || 'HEMAT_HUB',
    destinationAddress: p.final_delivery_address,
    allocatedShippingFee: parseFloat(p.allocated_shipping_fee || '0'),
    subtotalAmount:
      (parseFloat(p.order_qty) * parseFloat(po.total_amount)) /
      Math.max(1, parseFloat(pool?.accumulated_qty || '1')),
    storageCapacity: p.storage_capacity ?? 0,
    isHost: p.umkm_role_id === pool?.host_umkm_role_id,
    pickupCode: p.pickup_code || `KMPL-${p.id.slice(0, 4).toUpperCase()}`,
    isPickedUp: p.is_picked_up,
  }));

  const totalQty = pool ? parseFloat(pool.accumulated_qty) : 0;
  const grandTotal = parseFloat(po.total_amount || '0');
  const lockedPrice = totalQty > 0 ? Math.round(grandTotal / totalQty) : 0;

  return {
    po: {
      id: po.id,
      poNumber: `PO-KUMPUL-${po.id.slice(0, 8).toUpperCase()}`,
      poolId: po.pool_id,
      commodityId: commodity?.id,
      commodityName: commodity?.name,
      wholesaleUnit: commodity?.wholesale_unit,
      totalQuantity: totalQty,
      totalWeightKg: totalQty,
      grandTotalAmount: grandTotal,
      lockedTierPrice: lockedPrice,
      status: po.po_status,
      primaryDeliveryMethod: 'HEMAT_HUB',
      hubName: host_participant?.umkm_name || 'Hub Konsolidasi UMKM',
      hubAddress: pool?.default_hub_address || host_participant?.entity_address || '-',
      driverName: po.driver_name,
      trackingNumber: po.tracking_number,
      deliveryProofUrl: po.delivery_proof_url,
      createdAt: po.created_at,
      estimatedDeliveryDate: po.delivery_date,
      participants: participants,
    },
    pool,
    commodity,
    participants,
    hostParticipant: host_participant,
    totalHubVolume: total_hub_volume,
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

  if (po.po_status !== 'PAID_TO_ESCROW' && po.po_status !== 'SHIPPED' && po.po_status !== 'ISSUED') {
    throw new AppError(
      `PO tidak dapat diubah statusnya ke ${new_status} karena status saat ini ${po.po_status}`,
      400,
      'INVALID_PO_STATUS_TRANSITION'
    );
  }

  const updated_po = await update_consolidated_po_status(po_id, new_status);
  return updated_po;
};
