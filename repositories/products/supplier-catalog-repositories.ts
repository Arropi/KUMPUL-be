import { eq, like, desc } from 'drizzle-orm';
import { db } from '../../config/db';
import { supplier_commodities, business_roles } from '../../config/schema';
import type {
  SupplierCommodityRecord,
  SupplierCommodityInsertPayload,
} from '../../types/supplier-catalog-types';
import type { BusinessRole } from '../../types/database-types';

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
