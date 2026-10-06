import { eq, like, desc, inArray, and, sql } from 'drizzle-orm';
import { db } from '../../config/db.ts';
import {
  supplier_commodities,
  commodity_price_tiers,
  business_roles,
  business_entities,
} from '../../config/schema.ts';
import type {
  SupplierCommodityRecord,
  SupplierCommodityInsertPayload,
  CommodityPriceTierRecord,
  CommodityPriceTierInsertPayload,
} from '../../types/supplier-catalog-types.ts';
import type { BusinessRole } from '../../types/database-types.ts';

export const find_business_role_by_id = async (
  role_id: string
): Promise<BusinessRole | null> => {
  const records = await db
    .select()
    .from(business_roles)
    .where(eq(business_roles.id, role_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_commodity_by_id = async (
  commodity_id: string
): Promise<SupplierCommodityRecord | null> => {
  const records = await db
    .select()
    .from(supplier_commodities)
    .where(eq(supplier_commodities.id, commodity_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_commodity_by_sku = async (
  sku_value: string
): Promise<SupplierCommodityRecord | null> => {
  const records = await db
    .select()
    .from(supplier_commodities)
    .where(eq(supplier_commodities.sku, sku_value))
    .limit(1);

  return records[0] ?? null;
};

export const find_existing_skus_by_prefix = async (
  sku_prefix: string
): Promise<string[]> => {
  const records = await db
    .select({ sku: supplier_commodities.sku })
    .from(supplier_commodities)
    .where(like(supplier_commodities.sku, `${sku_prefix}%`));

  return records.map((record_item: { sku: string }) => record_item.sku);
};

export const find_commodities_by_supplier = async (
  supplier_role_id: string,
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityRecord[]> => {
  const records = await db
    .select()
    .from(supplier_commodities)
    .where(eq(supplier_commodities.supplier_role_id, supplier_role_id))
    .orderBy(desc(supplier_commodities.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const find_all_commodities = async (
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityRecord[]> => {
  const records = await db
    .select()
    .from(supplier_commodities)
    .orderBy(desc(supplier_commodities.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const find_active_marketplace_commodities = async (
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityRecord[]> => {
  const records = await db
    .select()
    .from(supplier_commodities)
    .where(eq(supplier_commodities.is_marketplace_active, true))
    .orderBy(desc(supplier_commodities.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const insert_supplier_commodity = async (
  insert_payload: SupplierCommodityInsertPayload
): Promise<SupplierCommodityRecord> => {
  const inserted_records = await db
    .insert(supplier_commodities)
    .values(insert_payload)
    .returning();

  const created_data = inserted_records[0];
  if (!created_data) {
    throw new Error('Gagal menyimpan komoditas katalog supplier ke database');
  }

  return created_data;
};

export const update_commodity_by_id = async (
  commodity_id: string,
  update_payload: Partial<SupplierCommodityInsertPayload>
): Promise<SupplierCommodityRecord | null> => {
  const updated_records = await db
    .update(supplier_commodities)
    .set({
      ...update_payload,
      updated_at: new Date(),
    })
    .where(eq(supplier_commodities.id, commodity_id))
    .returning();

  return updated_records[0] ?? null;
};

export const delete_commodity_by_id = async (
  commodity_id: string
): Promise<boolean> => {
  const deleted_records = await db
    .delete(supplier_commodities)
    .where(eq(supplier_commodities.id, commodity_id))
    .returning({ id: supplier_commodities.id });

  return deleted_records.length > 0;
};

export const insert_commodity_price_tiers = async (
  insert_payloads: CommodityPriceTierInsertPayload[]
): Promise<CommodityPriceTierRecord[]> => {
  if (insert_payloads.length === 0) {
    return [];
  }
  const inserted_tiers = await db
    .insert(commodity_price_tiers)
    .values(insert_payloads)
    .returning();

  return inserted_tiers;
};

export const find_price_tiers_by_commodity_id = async (
  commodity_id: string
): Promise<CommodityPriceTierRecord[]> => {
  const tiers = await db
    .select()
    .from(commodity_price_tiers)
    .where(eq(commodity_price_tiers.commodity_id, commodity_id))
    .orderBy(commodity_price_tiers.min_qty);

  return tiers;
};

export const find_price_tiers_by_commodity_ids = async (
  commodity_ids: string[]
): Promise<Record<string, CommodityPriceTierRecord[]>> => {
  if (commodity_ids.length === 0) {
    return {};
  }
  const tier_records = await db
    .select()
    .from(commodity_price_tiers)
    .where(inArray(commodity_price_tiers.commodity_id, commodity_ids))
    .orderBy(commodity_price_tiers.min_qty);

  const tiers_by_commodity_id: Record<string, CommodityPriceTierRecord[]> = {};
  for (const tier_item of tier_records) {
    const commodity_tier_list = tiers_by_commodity_id[tier_item.commodity_id] ?? [];
    commodity_tier_list.push(tier_item);
    tiers_by_commodity_id[tier_item.commodity_id] = commodity_tier_list;
  }

  return tiers_by_commodity_id;
};

export const delete_price_tiers_by_commodity_id = async (
  commodity_id: string
): Promise<boolean> => {
  const deleted_tiers = await db
    .delete(commodity_price_tiers)
    .where(eq(commodity_price_tiers.commodity_id, commodity_id))
    .returning({ id: commodity_price_tiers.id });

  return deleted_tiers.length > 0;
};

export const activate_due_harvest_commodities = async (): Promise<number> => {
  const current_date_string = new Date().toISOString().slice(0, 10);
  const activated_rows = await db
    .update(supplier_commodities)
    .set({
      is_marketplace_active: true,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(supplier_commodities.auto_activate_marketplace, true),
        eq(supplier_commodities.is_marketplace_active, false),
        sql`${supplier_commodities.production_date} <= ${current_date_string}::date`
      )
    )
    .returning({ id: supplier_commodities.id });

  return activated_rows.length;
};

export const find_entity_by_id = async (
  entity_id: string
) => {
  const records = await db
    .select()
    .from(business_entities)
    .where(eq(business_entities.id, entity_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_business_roles_with_entities_by_role_ids = async (
  role_ids: string[]
): Promise<Record<string, { role_id: string; entity_id: string; business_name: string; city: string | null }>> => {
  if (role_ids.length === 0) {
    return {};
  }
  const records = await db
    .select({
      role_id: business_roles.id,
      entity_id: business_entities.id,
      business_name: business_entities.legal_name,
      city: business_entities.default_address,
    })
    .from(business_roles)
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .where(inArray(business_roles.id, role_ids));

  const role_map: Record<string, { role_id: string; entity_id: string; business_name: string; city: string | null }> = {};
  for (const record_item of records) {
    role_map[record_item.role_id] = record_item;
  }

  return role_map;
};

export const find_commodities_by_entity_id = async (
  entity_id: string
): Promise<SupplierCommodityRecord[]> => {
  const records = await db
    .select({
      id: supplier_commodities.id,
      supplier_role_id: supplier_commodities.supplier_role_id,
      sku: supplier_commodities.sku,
      name: supplier_commodities.name,
      wholesale_unit: supplier_commodities.wholesale_unit,
      base_price: supplier_commodities.base_price,
      stock: supplier_commodities.stock,
      base_moq: supplier_commodities.base_moq,
      lead_time_days: supplier_commodities.lead_time_days,
      image_url: supplier_commodities.image_url,
      description: supplier_commodities.description,
      production_date: supplier_commodities.production_date,
      closed_date: supplier_commodities.closed_date,
      reserved_stock: supplier_commodities.reserved_stock,
      auto_activate_marketplace: supplier_commodities.auto_activate_marketplace,
      allows_under_moq: supplier_commodities.allows_under_moq,
      under_moq_price_per_kg: supplier_commodities.under_moq_price_per_kg,
      is_marketplace_active: supplier_commodities.is_marketplace_active,
      created_at: supplier_commodities.created_at,
      updated_at: supplier_commodities.updated_at,
    })
    .from(supplier_commodities)
    .innerJoin(
      business_roles,
      eq(supplier_commodities.supplier_role_id, business_roles.id)
    )
    .where(eq(business_roles.entity_id, entity_id))
    .orderBy(desc(supplier_commodities.created_at));

  return records;
};

