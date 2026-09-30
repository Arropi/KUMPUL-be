import { eq, desc } from 'drizzle-orm';
import { db } from '../../config/db';
import { business_entities } from '../../config/schema';
import type {
  BusinessEntityRecord,
  BusinessEntityInsertPayload,
} from '../../types/business-entity-types';

export const find_entity_by_id = async (
  entity_id: string
): Promise<BusinessEntityRecord | null> => {
  const records = await db
    .select()
    .from(business_entities)
    .where(eq(business_entities.id, entity_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_entity_by_npwp = async (
  npwp_nib_value: string
): Promise<BusinessEntityRecord | null> => {
  const records = await db
    .select()
    .from(business_entities)
    .where(eq(business_entities.npwp_nib, npwp_nib_value))
    .limit(1);

  return records[0] ?? null;
};

export const find_entities_list = async (
  limit_count = 20,
  offset_count = 0
): Promise<BusinessEntityRecord[]> => {
  const records = await db
    .select()
    .from(business_entities)
    .orderBy(desc(business_entities.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const insert_business_entity = async (
  insert_payload: BusinessEntityInsertPayload
): Promise<BusinessEntityRecord> => {
  const inserted_records = await db
    .insert(business_entities)
    .values(insert_payload)
    .returning();

  const created_entity = inserted_records[0];
  if (!created_entity) {
    throw new Error('Gagal menyimpan business entity ke database');
  }

  return created_entity;
};

export const update_business_entity_by_id = async (
  entity_id: string,
  update_payload: Partial<BusinessEntityInsertPayload>
): Promise<BusinessEntityRecord | null> => {
  const updated_records = await db
    .update(business_entities)
    .set({
      ...update_payload,
      updated_at: new Date(),
    })
    .where(eq(business_entities.id, entity_id))
    .returning();

  return updated_records[0] ?? null;
};
