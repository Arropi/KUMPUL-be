import { eq, and, desc, type SQL } from 'drizzle-orm';
import { db } from '../../config/db';
import { business_roles, business_entities } from '../../config/schema';
import type {
  BusinessRoleRecord,
  BusinessRoleInsertPayload,
  BusinessRoleFilterDTO,
  RoleType,
  SectorType,
} from '../../types/business-role-types';
import type { BusinessEntityRecord } from '../../types/business-entity-types';

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

export const find_role_by_id = async (
  role_id: string
): Promise<BusinessRoleRecord | null> => {
  const records = await db
    .select()
    .from(business_roles)
    .where(eq(business_roles.id, role_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_role_with_entity_by_id = async (role_id: string) => {
  const records = await db
    .select({
      id: business_roles.id,
      entity_id: business_roles.entity_id,
      role_type: business_roles.role_type,
      sector_type: business_roles.sector_type,
      storage_capacity: business_roles.storage_capacity,
      is_active: business_roles.is_active,
      created_at: business_roles.created_at,
      updated_at: business_roles.updated_at,
      entity_legal_name: business_entities.legal_name,
      entity_npwp_nib: business_entities.npwp_nib,
      entity_default_address: business_entities.default_address,
      entity_profile_picture_url: business_entities.profile_picture_url,
    })
    .from(business_roles)
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .where(eq(business_roles.id, role_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_duplicate_role = async (
  entity_id: string,
  role_type: RoleType,
  sector_type: SectorType
): Promise<BusinessRoleRecord | null> => {
  const records = await db
    .select()
    .from(business_roles)
    .where(
      and(
        eq(business_roles.entity_id, entity_id),
        eq(business_roles.role_type, role_type),
        eq(business_roles.sector_type, sector_type)
      )
    )
    .limit(1);

  return records[0] ?? null;
};

export const find_roles_by_filter = async (
  filter: BusinessRoleFilterDTO
): Promise<BusinessRoleRecord[]> => {
  const conditions: SQL[] = [];

  if (filter.entity_id) {
    conditions.push(eq(business_roles.entity_id, filter.entity_id));
  }
  if (filter.role_type) {
    conditions.push(eq(business_roles.role_type, filter.role_type));
  }
  if (filter.sector_type) {
    conditions.push(eq(business_roles.sector_type, filter.sector_type));
  }
  if (filter.is_active !== undefined) {
    conditions.push(eq(business_roles.is_active, filter.is_active));
  }

  const query_builder = db
    .select()
    .from(business_roles)
    .orderBy(desc(business_roles.created_at))
    .limit(filter.limit ?? 20)
    .offset(filter.offset ?? 0);

  if (conditions.length > 0) {
    return query_builder.where(and(...conditions));
  }

  return query_builder;
};

export const insert_business_role = async (
  insert_payload: BusinessRoleInsertPayload
): Promise<BusinessRoleRecord> => {
  const inserted_records = await db
    .insert(business_roles)
    .values(insert_payload)
    .returning();

  const created_data = inserted_records[0];
  if (!created_data) {
    throw new Error('Gagal menyimpan business entity role ke database');
  }

  return created_data;
};

export const update_business_role_by_id = async (
  role_id: string,
  update_payload: Partial<BusinessRoleInsertPayload>
): Promise<BusinessRoleRecord | null> => {
  const updated_records = await db
    .update(business_roles)
    .set({
      ...update_payload,
      updated_at: new Date(),
    })
    .where(eq(business_roles.id, role_id))
    .returning();

  return updated_records[0] ?? null;
};

export const delete_business_role_by_id = async (
  role_id: string
): Promise<boolean> => {
  const deleted_records = await db
    .delete(business_roles)
    .where(eq(business_roles.id, role_id))
    .returning({ id: business_roles.id });

  return deleted_records.length > 0;
};
