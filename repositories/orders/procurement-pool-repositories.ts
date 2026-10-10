import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../config/db.ts';
import {
  procurement_pools,
  pool_participants,
  consolidated_pos,
  supplier_commodities,
  commodity_price_tiers,
  business_roles,
  business_entities,
} from '../../config/schema.ts';
import type {
  ProcurementPoolRecord,
  ProcurementPoolInsertPayload,
  PoolParticipantRecord,
  PoolParticipantWithUmkm,
  PoolParticipantInsertPayload,
  ConsolidatedPORecord,
  ConsolidatedPOInsertPayload,
  PoolStatus,
} from '../../types/procurement-order-types.ts';
import type { CommodityPriceTierRecord } from '../../types/supplier-catalog-types.ts';

export const find_pool_by_id = async (
  pool_id: string
): Promise<ProcurementPoolRecord | null> => {
  const records = await db
    .select()
    .from(procurement_pools)
    .where(eq(procurement_pools.id, pool_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_active_pools_by_commodity_id = async (
  commodity_id: string
): Promise<ProcurementPoolRecord[]> => {
  const records = await db
    .select()
    .from(procurement_pools)
    .where(
      and(
        eq(procurement_pools.commodity_id, commodity_id),
        eq(procurement_pools.pool_status, 'OPEN')
      )
    )
    .orderBy(desc(procurement_pools.created_at));

  return records;
};

export const find_active_pools_by_commodity_ids = async (
  commodity_ids: string[]
): Promise<Record<string, ProcurementPoolRecord>> => {
  if (commodity_ids.length === 0) {
    return {};
  }
  const records = await db
    .select()
    .from(procurement_pools)
    .where(
      and(
        inArray(procurement_pools.commodity_id, commodity_ids),
        eq(procurement_pools.pool_status, 'OPEN')
      )
    )
    .orderBy(desc(procurement_pools.created_at));

  const pool_by_commodity: Record<string, ProcurementPoolRecord> = {};
  for (const pool_item of records) {
    if (!pool_by_commodity[pool_item.commodity_id]) {
      pool_by_commodity[pool_item.commodity_id] = pool_item;
    }
  }

  return pool_by_commodity;
};

export const find_pools_by_status = async (
  status?: PoolStatus,
  limit_count = 20,
  offset_count = 0,
  commodity_id?: string
): Promise<ProcurementPoolRecord[]> => {
  const conditions = [];
  if (status) {
    conditions.push(eq(procurement_pools.pool_status, status));
  }
  if (commodity_id) {
    conditions.push(eq(procurement_pools.commodity_id, commodity_id));
  }

  if (conditions.length > 0) {
    return await db
      .select()
      .from(procurement_pools)
      .where(and(...conditions))
      .orderBy(desc(procurement_pools.created_at))
      .limit(limit_count)
      .offset(offset_count);
  }

  return await db
    .select()
    .from(procurement_pools)
    .orderBy(desc(procurement_pools.created_at))
    .limit(limit_count)
    .offset(offset_count);
};

export const find_pools_past_cutoff_or_expired = async (): Promise<ProcurementPoolRecord[]> => {
  const current_date_string = new Date().toISOString().slice(0, 10);
  const records = await db
    .select()
    .from(procurement_pools)
    .where(
      and(
        eq(procurement_pools.pool_status, 'OPEN'),
        sql`(${procurement_pools.cutoff_date} <= ${current_date_string}::date OR ${procurement_pools.expires_at} <= NOW())`
      )
    );
  return records;
};

export const insert_procurement_pool = async (
  payload: ProcurementPoolInsertPayload
): Promise<ProcurementPoolRecord> => {
  const inserted = await db
    .insert(procurement_pools)
    .values(payload)
    .returning();

  const data = inserted[0];
  if (!data) {
    throw new Error('Gagal membuat procurement pool baru di database');
  }

  return data;
};

export const update_procurement_pool = async (
  pool_id: string,
  payload: Partial<ProcurementPoolInsertPayload>
): Promise<ProcurementPoolRecord | null> => {
  const updated = await db
    .update(procurement_pools)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(eq(procurement_pools.id, pool_id))
    .returning();

  return updated[0] ?? null;
};

// ==========================================
// POOL PARTICIPANTS REPOSITORY
// ==========================================

export const find_participant_by_id = async (
  participant_id: string
): Promise<PoolParticipantRecord | null> => {
  const records = await db
    .select()
    .from(pool_participants)
    .where(eq(pool_participants.id, participant_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_participants_by_pool_id = async (
  pool_id: string
): Promise<PoolParticipantWithUmkm[]> => {
  const records = await db
    .select({
      id: pool_participants.id,
      pool_id: pool_participants.pool_id,
      umkm_role_id: pool_participants.umkm_role_id,
      order_qty: pool_participants.order_qty,
      delivery_method: pool_participants.delivery_method,
      required_delivery_date: pool_participants.required_delivery_date,
      is_urgent_asap: pool_participants.is_urgent_asap,
      final_delivery_address: pool_participants.final_delivery_address,
      final_delivery_lat: pool_participants.final_delivery_lat,
      final_delivery_lng: pool_participants.final_delivery_lng,
      allocated_shipping_fee: pool_participants.allocated_shipping_fee,
      pickup_code: pool_participants.pickup_code,
      is_picked_up: pool_participants.is_picked_up,
      picked_up_at: pool_participants.picked_up_at,
      created_at: pool_participants.created_at,
      umkm_name: business_entities.legal_name,
      entity_address: business_entities.default_address,
      storage_capacity: business_roles.storage_capacity,
      phone_number: business_entities.phone_number,
    })
    .from(pool_participants)
    .leftJoin(business_roles, eq(pool_participants.umkm_role_id, business_roles.id))
    .leftJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .where(eq(pool_participants.pool_id, pool_id))
    .orderBy(desc(pool_participants.created_at));

  return records as PoolParticipantWithUmkm[];
};

export const find_participants_by_umkm_role = async (
  umkm_role_id: string
): Promise<PoolParticipantRecord[]> => {
  const records = await db
    .select()
    .from(pool_participants)
    .where(eq(pool_participants.umkm_role_id, umkm_role_id))
    .orderBy(desc(pool_participants.created_at));

  return records;
};

export const insert_pool_participant = async (
  payload: PoolParticipantInsertPayload
): Promise<PoolParticipantRecord> => {
  const inserted = await db
    .insert(pool_participants)
    .values(payload)
    .returning();

  const data = inserted[0];
  if (!data) {
    throw new Error('Gagal menyimpan partisipan pool ke database');
  }

  return data;
};

export const update_pool_participant = async (
  participant_id: string,
  payload: Partial<PoolParticipantInsertPayload>
): Promise<PoolParticipantRecord | null> => {
  const updated = await db
    .update(pool_participants)
    .set(payload)
    .where(eq(pool_participants.id, participant_id))
    .returning();

  return updated[0] ?? null;
};

// ==========================================
// CONSOLIDATED POS REPOSITORY
// ==========================================

export const find_consolidated_po_by_pool_id = async (
  pool_id: string
): Promise<ConsolidatedPORecord | null> => {
  const records = await db
    .select()
    .from(consolidated_pos)
    .where(eq(consolidated_pos.pool_id, pool_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_consolidated_po_by_id = async (
  po_id: string
): Promise<ConsolidatedPORecord | null> => {
  const records = await db
    .select()
    .from(consolidated_pos)
    .where(eq(consolidated_pos.id, po_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_consolidated_pos_by_supplier = async (
  supplier_role_id: string,
  limit_count = 20,
  offset_count = 0
) => {
  const host_roles = alias(business_roles, 'host_roles');
  const host_entities = alias(business_entities, 'host_entities');

  const records = await db
    .select({
      id: consolidated_pos.id,
      pool_id: consolidated_pos.pool_id,
      supplier_role_id: consolidated_pos.supplier_role_id,
      total_amount: consolidated_pos.total_amount,
      po_status: consolidated_pos.po_status,
      delivery_date: consolidated_pos.delivery_date,
      driver_name: consolidated_pos.driver_name,
      tracking_number: consolidated_pos.tracking_number,
      delivery_proof_url: consolidated_pos.delivery_proof_url,
      created_at: consolidated_pos.created_at,
      updated_at: consolidated_pos.updated_at,
      commodity_id: supplier_commodities.id,
      commodity_name: supplier_commodities.name,
      wholesale_unit: supplier_commodities.wholesale_unit,
      total_quantity: procurement_pools.accumulated_qty,
      hub_name: host_entities.legal_name,
      hub_address: procurement_pools.default_hub_address,
      host_umkm_role_id: procurement_pools.host_umkm_role_id,
      target_delivery_date: procurement_pools.target_delivery_date,
      estimated_delivery_date: procurement_pools.estimated_delivery_date,
    })
    .from(consolidated_pos)
    .innerJoin(procurement_pools, eq(consolidated_pos.pool_id, procurement_pools.id))
    .innerJoin(supplier_commodities, eq(procurement_pools.commodity_id, supplier_commodities.id))
    .leftJoin(host_roles, eq(procurement_pools.host_umkm_role_id, host_roles.id))
    .leftJoin(host_entities, eq(host_roles.entity_id, host_entities.id))
    .where(eq(consolidated_pos.supplier_role_id, supplier_role_id))
    .orderBy(desc(consolidated_pos.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const insert_consolidated_po = async (
  payload: ConsolidatedPOInsertPayload
): Promise<ConsolidatedPORecord> => {
  const inserted = await db
    .insert(consolidated_pos)
    .values(payload)
    .returning();

  const data = inserted[0];
  if (!data) {
    throw new Error('Gagal membuat consolidated PO di database');
  }

  return data;
};

export const update_consolidated_po_status = async (
  po_id: string,
  po_status: ConsolidatedPORecord['po_status']
): Promise<ConsolidatedPORecord | null> => {
  const updated = await db
    .update(consolidated_pos)
    .set({
      po_status,
      updated_at: new Date(),
    })
    .where(eq(consolidated_pos.id, po_id))
    .returning();

  return updated[0] ?? null;
};

export const update_consolidated_po = async (
  po_id: string,
  payload: Partial<ConsolidatedPOInsertPayload>
): Promise<ConsolidatedPORecord | null> => {
  const updated = await db
    .update(consolidated_pos)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(eq(consolidated_pos.id, po_id))
    .returning();

  return updated[0] ?? null;
};

// ==========================================
// HELPER QUERY COMMODITY & TIERS
// ==========================================

export const find_commodity_with_tiers_by_id = async (
  commodity_id: string
) => {
  const commodity_records = await db
    .select()
    .from(supplier_commodities)
    .where(eq(supplier_commodities.id, commodity_id))
    .limit(1);

  const commodity = commodity_records[0] ?? null;
  if (!commodity) return null;

  const tiers: CommodityPriceTierRecord[] = await db
    .select()
    .from(commodity_price_tiers)
    .where(eq(commodity_price_tiers.commodity_id, commodity_id))
    .orderBy(commodity_price_tiers.min_qty);

  return {
    ...commodity,
    price_tiers: tiers,
  };
};

export const find_business_role_by_id = async (role_id: string) => {
  const records = await db
    .select()
    .from(business_roles)
    .where(eq(business_roles.id, role_id))
    .limit(1);

  return records[0] ?? null;
};
