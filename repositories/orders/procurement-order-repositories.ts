import { eq, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../config/db.ts';
import {
  umkm_procurement_orders,
  pool_participants,
  procurement_pools,
  supplier_commodities,
  consolidated_pos,
  business_roles,
  business_entities,
} from '../../config/schema.ts';
import type {
  UmkmProcurementOrderRecord,
  UmkmProcurementOrderInsertPayload,
  PaymentStatus,
} from '../../types/procurement-order-types.ts';

export const find_order_by_id = async (
  order_id: string
): Promise<UmkmProcurementOrderRecord | null> => {
  const records = await db
    .select()
    .from(umkm_procurement_orders)
    .where(eq(umkm_procurement_orders.id, order_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_order_by_participant_id = async (
  participant_id: string
): Promise<UmkmProcurementOrderRecord | null> => {
  const records = await db
    .select()
    .from(umkm_procurement_orders)
    .where(eq(umkm_procurement_orders.participant_id, participant_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_order_with_details_by_id = async (order_id: string) => {
  const records = await db
    .select({
      order: umkm_procurement_orders,
      participant: pool_participants,
      pool: procurement_pools,
      commodity: {
        id: supplier_commodities.id,
        name: supplier_commodities.name,
        wholesale_unit: supplier_commodities.wholesale_unit,
        base_price: supplier_commodities.base_price,
        lead_time_days: supplier_commodities.lead_time_days,
        stock: supplier_commodities.stock,
        reserved_stock: supplier_commodities.reserved_stock,
      },
    })
    .from(umkm_procurement_orders)
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(eq(umkm_procurement_orders.id, order_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_orders_by_umkm_role_id = async (
  umkm_role_id: string,
  limit_count = 20,
  offset_count = 0
) => {
  const records = await db
    .select({
      order: umkm_procurement_orders,
      participant: pool_participants,
      pool: procurement_pools,
      commodity_name: supplier_commodities.name,
      wholesale_unit: supplier_commodities.wholesale_unit,
    })
    .from(umkm_procurement_orders)
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(eq(pool_participants.umkm_role_id, umkm_role_id))
    .orderBy(desc(umkm_procurement_orders.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const find_orders_by_entity_id = async (
  entity_id: string,
  limit_count = 20,
  offset_count = 0
) => {
  const records = await db
    .select({
      order: umkm_procurement_orders,
      participant: pool_participants,
      pool: procurement_pools,
      commodity_name: supplier_commodities.name,
      wholesale_unit: supplier_commodities.wholesale_unit,
    })
    .from(umkm_procurement_orders)
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .innerJoin(
      business_roles,
      eq(pool_participants.umkm_role_id, business_roles.id)
    )
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(eq(business_roles.entity_id, entity_id))
    .orderBy(desc(umkm_procurement_orders.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const insert_procurement_order = async (
  payload: UmkmProcurementOrderInsertPayload
): Promise<UmkmProcurementOrderRecord> => {
  const inserted = await db
    .insert(umkm_procurement_orders)
    .values(payload)
    .returning();

  const data = inserted[0];
  if (!data) {
    throw new Error('Gagal membuat pesanan pengadaan UMKM di database');
  }

  return data;
};

export const update_procurement_order = async (
  order_id: string,
  payload: Partial<UmkmProcurementOrderInsertPayload>
): Promise<UmkmProcurementOrderRecord | null> => {
  const updated = await db
    .update(umkm_procurement_orders)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(eq(umkm_procurement_orders.id, order_id))
    .returning();

  return updated[0] ?? null;
};

export const update_order_payment_status = async (
  order_id: string,
  payment_status: PaymentStatus,
  settlement_time?: Date | null,
  payment_method?: string | null
): Promise<UmkmProcurementOrderRecord | null> => {
  const updated = await db
    .update(umkm_procurement_orders)
    .set({
      payment_status,
      ...(settlement_time !== undefined ? { settlement_time } : {}),
      ...(payment_method !== undefined ? { payment_method } : {}),
      updated_at: new Date(),
    })
    .where(eq(umkm_procurement_orders.id, order_id))
    .returning();

  return updated[0] ?? null;
};

export const find_expired_pending_procurement_orders = async () => {
  return await db
    .select({
      order_id: umkm_procurement_orders.id,
      participant_id: pool_participants.id,
      pool_id: procurement_pools.id,
      commodity_id: supplier_commodities.id,
      order_qty: pool_participants.order_qty,
      payment_deadline: umkm_procurement_orders.payment_deadline,
      created_at: umkm_procurement_orders.created_at,
    })
    .from(umkm_procurement_orders)
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(
      eq(umkm_procurement_orders.payment_status, 'PENDING')
    );
};

export const find_all_orders_for_umkm = async (umkm_role_id: string) => {
  const host_roles = alias(business_roles, 'host_roles');
  const host_entities = alias(business_entities, 'host_entities');
  const supplier_roles = alias(business_roles, 'supplier_roles');
  const supplier_entities = alias(business_entities, 'supplier_entities');

  return await db
    .select({
      order_id: umkm_procurement_orders.id,
      participant_id: pool_participants.id,
      order_qty: pool_participants.order_qty,
      raw_material_subtotal: umkm_procurement_orders.raw_material_subtotal,
      shipping_fee: umkm_procurement_orders.shipping_fee,
      grand_total: umkm_procurement_orders.grand_total,
      payment_status: umkm_procurement_orders.payment_status,
      payment_deadline: umkm_procurement_orders.payment_deadline,
      snap_token: umkm_procurement_orders.snap_token,
      snap_redirect_url: umkm_procurement_orders.snap_redirect_url,
      settlement_time: umkm_procurement_orders.settlement_time,
      payment_method: umkm_procurement_orders.payment_method,
      delivery_method: pool_participants.delivery_method,
      required_delivery_date: pool_participants.required_delivery_date,
      pickup_code: pool_participants.pickup_code,
      is_picked_up: pool_participants.is_picked_up,
      picked_up_at: pool_participants.picked_up_at,
      final_delivery_address: pool_participants.final_delivery_address,
      pool_id: procurement_pools.id,
      pool_status: procurement_pools.pool_status,
      target_moq: procurement_pools.target_moq,
      accumulated_qty: procurement_pools.accumulated_qty,
      target_delivery_date: procurement_pools.target_delivery_date,
      cutoff_date: procurement_pools.cutoff_date,
      is_direct_order: procurement_pools.is_direct_order,
      host_umkm_role_id: procurement_pools.host_umkm_role_id,
      default_hub_address: procurement_pools.default_hub_address,
      commodity_id: supplier_commodities.id,
      commodity_name: supplier_commodities.name,
      wholesale_unit: supplier_commodities.wholesale_unit,
      base_price: supplier_commodities.base_price,
      image_url: supplier_commodities.image_url,
      lead_time_days: supplier_commodities.lead_time_days,
      supplier_role_id: supplier_commodities.supplier_role_id,
      po_id: consolidated_pos.id,
      po_status: consolidated_pos.po_status,
      driver_name: consolidated_pos.driver_name,
      tracking_number: consolidated_pos.tracking_number,
      delivery_proof_url: consolidated_pos.delivery_proof_url,
      host_name: host_entities.legal_name,
      host_phone: host_entities.phone_number,
      host_address: host_entities.default_address,
      supplier_name: supplier_entities.legal_name,
      supplier_phone: supplier_entities.phone_number,
      created_at: umkm_procurement_orders.created_at,
    })
    .from(umkm_procurement_orders)
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .leftJoin(
      consolidated_pos,
      eq(procurement_pools.id, consolidated_pos.pool_id)
    )
    .leftJoin(
      host_roles,
      eq(procurement_pools.host_umkm_role_id, host_roles.id)
    )
    .leftJoin(
      host_entities,
      eq(host_roles.entity_id, host_entities.id)
    )
    .leftJoin(
      supplier_roles,
      eq(supplier_commodities.supplier_role_id, supplier_roles.id)
    )
    .leftJoin(
      supplier_entities,
      eq(supplier_roles.entity_id, supplier_entities.id)
    )
    .where(eq(pool_participants.umkm_role_id, umkm_role_id))
    .orderBy(desc(umkm_procurement_orders.created_at));
};

export const find_grouped_orders_for_supplier = async (supplier_role_id: string) => {
  return await db
    .select({
      pool_id: procurement_pools.id,
      pool_status: procurement_pools.pool_status,
      target_moq: procurement_pools.target_moq,
      accumulated_qty: procurement_pools.accumulated_qty,
      target_delivery_date: procurement_pools.target_delivery_date,
      is_direct_order: procurement_pools.is_direct_order,
      commodity_id: supplier_commodities.id,
      commodity_name: supplier_commodities.name,
      wholesale_unit: supplier_commodities.wholesale_unit,
      base_price: supplier_commodities.base_price,
      lead_time_days: supplier_commodities.lead_time_days,
      order_id: umkm_procurement_orders.id,
      participant_id: pool_participants.id,
      umkm_role_id: pool_participants.umkm_role_id,
      order_qty: pool_participants.order_qty,
      delivery_method: pool_participants.delivery_method,
      required_delivery_date: pool_participants.required_delivery_date,
      final_delivery_address: pool_participants.final_delivery_address,
      grand_total: umkm_procurement_orders.grand_total,
      payment_status: umkm_procurement_orders.payment_status,
      created_at: umkm_procurement_orders.created_at,
    })
    .from(procurement_pools)
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .leftJoin(
      pool_participants,
      eq(procurement_pools.id, pool_participants.pool_id)
    )
    .leftJoin(
      umkm_procurement_orders,
      eq(pool_participants.id, umkm_procurement_orders.participant_id)
    )
    .where(eq(supplier_commodities.supplier_role_id, supplier_role_id))
    .orderBy(desc(procurement_pools.created_at));
};

