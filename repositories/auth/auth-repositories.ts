import { eq, or, and, isNull } from 'drizzle-orm';
import { db } from '../../config/db';
import { business_entities, business_roles } from '../../config/schema';
import type {
  BusinessEntityRecord,
  BusinessEntityInsertPayload,
  BusinessRoleRecord,
  BusinessRoleInsertPayload,
  RoleType,
  SectorType,
} from '../../types/profile-types';

export const find_entity_by_user_id = async (
  user_id: string
): Promise<BusinessEntityRecord | null> => {
  const records = await db
    .select()
    .from(business_entities)
    .where(
      or(
        eq(business_entities.auth_user_id, user_id),
        eq(business_entities.id, user_id)
      )
    )
    .limit(1);

  return records[0] ?? null;
};

export const create_default_business_entity = async (
  user_id: string
): Promise<BusinessEntityRecord> => {
  try {
    const inserted_records = await db
      .insert(business_entities)
      .values({
        auth_user_id: user_id,
        legal_name: 'Nama Usaha Belum Disetel',
        npwp_nib: `PENDING-${user_id}`,
        default_address: '-',
        latitude: '0.0',
        longitude: '0.0',
      })
      .returning();

    const created_entity = inserted_records[0];
    if (created_entity) {
      return created_entity;
    }
  } catch (db_error: any) {
    const error_string = String(
      db_error?.cause?.message || db_error?.message || db_error
    );
    const error_code = db_error?.cause?.code || db_error?.code;

    // Jika auth_user_id tidak ada di auth.users (misal lingkungan test / mock tanpa auth.users), simpan dengan id = user_id
    if (
      error_code === '23503' ||
      error_string.includes('business_entities_auth_user_id_fkey') ||
      error_string.includes('violates foreign key constraint')
    ) {
      const fallback_records = await db
        .insert(business_entities)
        .values({
          id: user_id,
          auth_user_id: null,
          legal_name: 'Nama Usaha Belum Disetel',
          npwp_nib: `PENDING-${user_id}`,
          default_address: '-',
          latitude: '0.0',
          longitude: '0.0',
        })
        .returning();

      if (fallback_records[0]) {
        return fallback_records[0];
      }
    }
    throw db_error;
  }

  throw new Error('Gagal membuat default business entity untuk user');
};

export const find_existing_role = async (
  entity_id: string,
  role_type: RoleType,
  sector_type?: SectorType | null
): Promise<BusinessRoleRecord | null> => {
  const sector_condition = sector_type
    ? eq(business_roles.sector_type, sector_type)
    : isNull(business_roles.sector_type);

  const records = await db
    .select()
    .from(business_roles)
    .where(
      and(
        eq(business_roles.entity_id, entity_id),
        eq(business_roles.role_type, role_type),
        sector_condition
      )
    )
    .limit(1);

  return records[0] ?? null;
};

export const insert_new_role = async (
  payload: BusinessRoleInsertPayload
): Promise<BusinessRoleRecord> => {
  const inserted_records = await db
    .insert(business_roles)
    .values(payload)
    .returning();

  const created_role = inserted_records[0];
  if (!created_role) {
    throw new Error('Gagal menyimpan role pengguna ke database');
  }

  return created_role;
};

export const find_active_roles_by_entity_id = async (
  entity_id: string
): Promise<BusinessRoleRecord[]> => {
  const records = await db
    .select()
    .from(business_roles)
    .where(
      and(
        eq(business_roles.entity_id, entity_id),
        eq(business_roles.is_active, true)
      )
    );

  return records;
};

export const update_entity_profile = async (
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

export const find_entity_by_npwp_value = async (
  npwp_nib: string
): Promise<BusinessEntityRecord | null> => {
  const records = await db
    .select()
    .from(business_entities)
    .where(eq(business_entities.npwp_nib, npwp_nib))
    .limit(1);

  return records[0] ?? null;
};

