import { eq, desc } from 'drizzle-orm';
import { db } from '../../config/db';
import {
  umkm_procurement_orders,
  pool_participants,
  procurement_pools,
  supplier_commodities,
  business_roles,
} from '../../config/schema';
import type {
  UmkmProcurementOrderRecord,
  UmkmProcurementOrderInsertPayload,
  PaymentStatus,
} from '../../types/procurement-order-types';

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
