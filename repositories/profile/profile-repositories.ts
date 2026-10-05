import { eq, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../config/db';
import { business_entities, business_roles } from '../../config/schema';
import type {
  BusinessEntityRecord,
  NewBusinessEntity,
  BusinessRoleRecord,
  NewBusinessRole,
  RoleType,
  SectorType,
} from '../../types/profile-types';

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

export const find_entity_by_id_or_auth_id = async (
  identifier: string
): Promise<BusinessEntityRecord | null> => {
  const records = await db
    .select()
    .from(business_entities)
    .where(
      or(
        eq(business_entities.id, identifier),
        eq(business_entities.auth_user_id, identifier)
      )
    )
    .limit(1);

  return records[0] ?? null;
};

export const find_entity_by_npwp = async (
  npwp_value: string
): Promise<BusinessEntityRecord | null> => {
  const records = await db
    .select()
    .from(business_entities)
    .where(eq(business_entities.npwp_nib, npwp_value))
    .limit(1);

  return records[0] ?? null;
};

export const find_entity_by_auth_user_id = async (
  auth_user_id: string
): Promise<BusinessEntityRecord | null> => {
  const records = await db
    .select()
    .from(business_entities)
    .where(eq(business_entities.auth_user_id, auth_user_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_roles_by_entity_id = async (
  entity_id: string
): Promise<BusinessRoleRecord[]> => {
  const roles = await db
    .select()
    .from(business_roles)
    .where(eq(business_roles.entity_id, entity_id))
    .orderBy(asc(business_roles.created_at));

  return roles;
};

export const find_active_role_by_entity_and_type = async (
  entity_id: string,
  role_type: RoleType
): Promise<BusinessRoleRecord | null> => {
  const records = await db
    .select()
    .from(business_roles)
    .where(
      eq(business_roles.entity_id, entity_id)
    )
    .limit(10);

  const matched = records.find(
    (item) => item.role_type === role_type && item.is_active === true
  );

  return matched ?? records[0] ?? null;
};

export const insert_business_entity = async (
  payload: NewBusinessEntity
): Promise<BusinessEntityRecord> => {
  const inserted = await db
    .insert(business_entities)
    .values(payload)
    .returning();

  const record = inserted[0];
  if (!record) {
    throw new Error('Gagal menyimpan business entity ke database');
  }

  return record;
};

export const insert_business_role = async (
  payload: NewBusinessRole
): Promise<BusinessRoleRecord> => {
  const inserted = await db
    .insert(business_roles)
    .values(payload)
    .returning();

  const record = inserted[0];
  if (!record) {
    throw new Error('Gagal menyimpan business role ke database');
  }

  return record;
};

export const update_business_entity = async (
  entity_id: string,
  payload: Partial<NewBusinessEntity>
): Promise<BusinessEntityRecord | null> => {
  const updated = await db
    .update(business_entities)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(eq(business_entities.id, entity_id))
    .returning();

  return updated[0] ?? null;
};

export const update_business_role_by_id = async (
  role_id: string,
  payload: Partial<NewBusinessRole>
): Promise<BusinessRoleRecord | null> => {
  const updated = await db
    .update(business_roles)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(eq(business_roles.id, role_id))
    .returning();

  return updated[0] ?? null;
};

export const upsert_business_role_for_entity = async (
  entity_id: string,
  role_data: {
    role_type?: RoleType;
    sector_type?: SectorType | null;
    storage_capacity?: number;
    is_active?: boolean;
  }
): Promise<BusinessRoleRecord> => {
  const existing_roles = await find_roles_by_entity_id(entity_id);

  if (existing_roles.length > 0 && existing_roles[0]) {
    const primary_role = existing_roles[0];
    const update_payload: Partial<NewBusinessRole> = {};

    if (role_data.role_type !== undefined) {
      update_payload.role_type = role_data.role_type;
    }
    if (role_data.sector_type !== undefined) {
      update_payload.sector_type = role_data.sector_type;
    }
    if (role_data.storage_capacity !== undefined) {
      update_payload.storage_capacity = role_data.storage_capacity;
    }
    if (role_data.is_active !== undefined) {
      update_payload.is_active = role_data.is_active;
    }

    const updated = await update_business_role_by_id(primary_role.id, update_payload);
    if (!updated) {
      throw new Error('Gagal memperbarui role business entity');
    }
    return updated;
  }

  const new_role_payload: NewBusinessRole = {
    entity_id,
    role_type: role_data.role_type ?? 'SUPPLIER',
    sector_type: role_data.sector_type ?? null,
    storage_capacity: role_data.storage_capacity ?? 0,
    is_active: role_data.is_active ?? true,
  };

  return await insert_business_role(new_role_payload);
};

export const delete_roles_by_entity_id = async (
  entity_id: string
): Promise<number> => {
  const deleted = await db
    .delete(business_roles)
    .where(eq(business_roles.entity_id, entity_id))
    .returning();

  return deleted.length;
};

export const delete_business_entity = async (
  entity_id: string
): Promise<boolean> => {
  const deleted = await db
    .delete(business_entities)
    .where(eq(business_entities.id, entity_id))
    .returning();

  return deleted.length > 0;
};

export const find_entities_list = async (
  limit_count: number,
  offset_count: number,
  search_keyword?: string
): Promise<BusinessEntityRecord[]> => {
  if (search_keyword && search_keyword.trim() !== '') {
    const pattern = `%${search_keyword.trim()}%`;
    return await db
      .select()
      .from(business_entities)
      .where(
        or(
          ilike(business_entities.legal_name, pattern),
          ilike(business_entities.npwp_nib, pattern),
          ilike(business_entities.default_address, pattern)
        )
      )
      .limit(limit_count)
      .offset(offset_count)
      .orderBy(desc(business_entities.created_at));
  }

  return await db
    .select()
    .from(business_entities)
    .limit(limit_count)
    .offset(offset_count)
    .orderBy(desc(business_entities.created_at));
};

export const count_entities = async (
  search_keyword?: string
): Promise<number> => {
  if (search_keyword && search_keyword.trim() !== '') {
    const pattern = `%${search_keyword.trim()}%`;
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(business_entities)
      .where(
        or(
          ilike(business_entities.legal_name, pattern),
          ilike(business_entities.npwp_nib, pattern),
          ilike(business_entities.default_address, pattern)
        )
      );
    return Number(result[0]?.count ?? 0);
  }

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(business_entities);

  return Number(result[0]?.count ?? 0);
};
