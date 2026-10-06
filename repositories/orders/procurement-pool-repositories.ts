import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/db.ts';
import {
  procurement_pools,
  pool_participants,
  consolidated_pos,
  supplier_commodities,
  commodity_price_tiers,
  business_roles,
} from '../../config/schema.ts';
import type {
  ProcurementPoolRecord,
  ProcurementPoolInsertPayload,
  PoolParticipantRecord,
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
): Promise<PoolParticipantRecord[]> => {
  const records = await db
    .select()
    .from(pool_participants)
    .where(eq(pool_participants.pool_id, pool_id))
    .orderBy(desc(pool_participants.created_at));

  return records;
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
): Promise<ConsolidatedPORecord[]> => {
  const records = await db
    .select()
    .from(consolidated_pos)
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
