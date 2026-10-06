import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../../config/db';
import { commodity_batch_tags, supplier_commodities } from '../../config/schema';
import type {
  CommodityBatchTagRecord,
  CommodityBatchTagInsertPayload,
} from '../../types/commodity-batch-tag-types';
import type { SupplierCommodityRecord } from '../../types/supplier-catalog-types';

export const find_commodity_batch_tag_by_id = async (
  tag_id: string
): Promise<CommodityBatchTagRecord | null> => {
  const records = await db
    .select()
    .from(commodity_batch_tags)
    .where(eq(commodity_batch_tags.id, tag_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_batch_tags_by_commodity_id = async (
  commodity_id: string
): Promise<CommodityBatchTagRecord[]> => {
  const records = await db
    .select()
    .from(commodity_batch_tags)
    .where(eq(commodity_batch_tags.commodity_id, commodity_id))
    .orderBy(desc(commodity_batch_tags.created_at));

  return records;
};

export const find_batch_tags_by_commodity_ids = async (
  commodity_ids: string[]
): Promise<Record<string, CommodityBatchTagRecord[]>> => {
  if (commodity_ids.length === 0) {
    return {};
  }
  const records = await db
    .select()
    .from(commodity_batch_tags)
    .where(inArray(commodity_batch_tags.commodity_id, commodity_ids))
    .orderBy(desc(commodity_batch_tags.created_at));

  const tags_by_commodity: Record<string, CommodityBatchTagRecord[]> = {};
  for (const tag_item of records) {
    const list = tags_by_commodity[tag_item.commodity_id] ?? [];
    list.push(tag_item);
    tags_by_commodity[tag_item.commodity_id] = list;
  }

  return tags_by_commodity;
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

export const insert_commodity_batch_tag = async (
  payload: CommodityBatchTagInsertPayload
): Promise<CommodityBatchTagRecord> => {
  const inserted_records = await db
    .insert(commodity_batch_tags)
    .values(payload)
    .returning();

  const created_data = inserted_records[0];
  if (!created_data) {
    throw new Error('Gagal menyimpan commodity batch tag ke database');
  }

  return created_data;
};

export const update_commodity_batch_tag_by_id = async (
  tag_id: string,
  update_payload: Partial<CommodityBatchTagInsertPayload>
): Promise<CommodityBatchTagRecord | null> => {
  const updated_records = await db
    .update(commodity_batch_tags)
    .set(update_payload)
    .where(eq(commodity_batch_tags.id, tag_id))
    .returning();

  return updated_records[0] ?? null;
};

export const delete_commodity_batch_tag_by_id = async (
  tag_id: string
): Promise<CommodityBatchTagRecord | null> => {
  const deleted_records = await db
    .delete(commodity_batch_tags)
    .where(eq(commodity_batch_tags.id, tag_id))
    .returning();

  return deleted_records[0] ?? null;
};
