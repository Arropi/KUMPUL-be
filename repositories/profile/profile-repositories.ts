import { eq, or, and, ilike, inArray, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../config/db.ts';
import {
  business_entities,
  business_roles,
  umkm_procurement_orders,
  consolidated_pos,
  supplier_commodities,
  umkm_products,
  procurement_pools,
  pool_participants,
  waste_listings,
  waste_transactions,
} from '../../config/schema.ts';
import type {
  BusinessEntityRecord,
  NewBusinessEntity,
  BusinessRoleRecord,
  NewBusinessRole,
  RoleType,
  SectorType,
} from '../../types/profile-types.ts';
import type { ProductDTO } from '../../types/profile-types.ts';

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

export const find_all_active_roles = async (
  role_type?: RoleType
): Promise<BusinessRoleRecord[]> => {
  if (role_type) {
    return await db
      .select()
      .from(business_roles)
      .where(and(eq(business_roles.is_active, true), eq(business_roles.role_type, role_type)))
      .limit(100);
  }
  return await db
    .select()
    .from(business_roles)
    .where(eq(business_roles.is_active, true))
    .limit(100);
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

/**
 * Get total sales amount for an entity.
 * Definition: sum of grand_total from umkm_procurement_orders where the supplier role belongs to the entity.
 */
export const get_total_sales_by_entity_id = async (
  entity_id: string
): Promise<number> => {
  // Join: business_entities -> business_roles -> consolidated_pos (as supplier) -> umkm_procurement_orders
  // We'll sum grand_total of umkm_procurement_orders where the supplier_role_id matches a role of the entity.
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${umkm_procurement_orders.grand_total}), 0)` })
    .from(umkm_procurement_orders)
    .innerJoin(
      consolidated_pos,
      eq(umkm_procurement_orders.participant_id, consolidated_pos.id)
    )
    .innerJoin(
      business_roles,
      eq(consolidated_pos.supplier_role_id, business_roles.id)
    )
    .where(eq(business_roles.entity_id, entity_id));

  return Number(result[0]?.total ?? 0);
};

/**
 * Get list of products/commodities associated with an entity.
 * If entity has SUPPLIER role -> return supplier_commodities.
 * If entity has UMKM role -> return umkm_products.
 * If both, return combined list (supplier first).
 * Each item mapped to ProductDTO shape.
 */
export const get_products_by_entity_id = async (
  entity_id: string
): Promise<ProductDTO[]> => {
  // Fetch roles for the entity
  const roles = await find_roles_by_entity_id(entity_id);
  const hasSupplierRole = roles.some(r => r.role_type === 'SUPPLIER');
  const hasUmkmRole = roles.some(r => r.role_type === 'UMKM');

  const products: ProductDTO[] = [];

  if (hasSupplierRole) {
    const supplierComm = await db
      .select({
        id: supplier_commodities.id,
        name: supplier_commodities.name,
        sku: supplier_commodities.sku,
        base_price: supplier_commodities.base_price,
        stock: supplier_commodities.stock,
        unit: supplier_commodities.wholesale_unit,
      })
      .from(supplier_commodities)
      .innerJoin(
        business_roles,
        eq(supplier_commodities.supplier_role_id, business_roles.id)
      )
      .where(eq(business_roles.entity_id, entity_id));

    for (const sc of supplierComm) {
      products.push({
        id: sc.id,
        name: sc.name,
        sku: sc.sku,
        base_price: Number(sc.base_price),
        stock: Number(sc.stock),
        unit: sc.unit,
      });
    }
  }

  if (hasUmkmRole) {
    const umkmProd = await db
      .select({
        id: umkm_products.id,
        name: umkm_products.product_name,
        sku: umkm_products.id, // fallback: use id as sku? maybe we don't have sku; we can leave empty string or use id.
        base_price: umkm_products.target_selling_price_per_unit,
        stock: umkm_products.expected_batch_units, // not exactly stock; we'll use expected_batch_units as placeholder
        unit: umkm_products.unit,
      })
      .from(umkm_products)
      .innerJoin(
        business_roles,
        eq(umkm_products.umkm_role_id, business_roles.id)
      )
      .where(eq(business_roles.entity_id, entity_id));

    for (const up of umkmProd) {
      products.push({
        id: up.id,
        name: up.name,
        sku: up.sku ?? '',
        base_price: Number(up.base_price),
        stock: Number(up.stock),
        unit: up.unit,
      });
    }
  }

  return products;
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

export const delete_business_role_by_id = async (
  role_id: string
): Promise<boolean> => {
  const deleted = await db
    .delete(business_roles)
    .where(eq(business_roles.id, role_id))
    .returning();

  return deleted.length > 0;
};

export const check_role_has_active_transactions = async (
  role_id: string
): Promise<{ has_active: boolean; reason?: string }> => {
  // 1. Cek apakah UMKM masih terdaftar dalam pool aktif
  const active_participant = await db
    .select({ id: pool_participants.id })
    .from(pool_participants)
    .innerJoin(procurement_pools, eq(pool_participants.pool_id, procurement_pools.id))
    .where(
      and(
        eq(pool_participants.umkm_role_id, role_id),
        inArray(procurement_pools.pool_status, ['OPEN', 'AGGREGATING', 'LOCKED'])
      )
    )
    .limit(1);

  if (active_participant.length > 0) {
    return {
      has_active: true,
      reason: 'Masih terdaftar sebagai peserta dalam sesi pooling yang sedang berjalan',
    };
  }

  // 2. Cek apakah Supplier memiliki PO terkonsolidasi yang belum delivered
  const active_po = await db
    .select({ id: consolidated_pos.id })
    .from(consolidated_pos)
    .where(
      and(
        eq(consolidated_pos.supplier_role_id, role_id),
        inArray(consolidated_pos.po_status, ['ISSUED', 'PAID_TO_ESCROW', 'SHIPPED'])
      )
    )
    .limit(1);

  if (active_po.length > 0) {
    return {
      has_active: true,
      reason: 'Masih memiliki pesanan pasokan grosir (PO) yang sedang diproses atau dikirim',
    };
  }

  // 3. Cek apakah ada transaksi limbah yang tertahan di escrow
  const active_waste_tx = await db
    .select({ id: waste_transactions.id })
    .from(waste_transactions)
    .where(
      and(
        or(
          eq(waste_transactions.buyer_role_id, role_id),
          sql`${waste_transactions.listing_id} IN (SELECT id FROM ${waste_listings} WHERE seller_role_id = ${role_id})`
        ),
        eq(waste_transactions.fulfillment_status, 'PAID_HELD_IN_ESCROW')
      )
    )
    .limit(1);

  if (active_waste_tx.length > 0) {
    return {
      has_active: true,
      reason: 'Masih memiliki transaksi limbah aktif dengan dana tertahan di escrow',
    };
  }

  return { has_active: false };
};

export const check_entity_has_active_transactions = async (
  entity_id: string
): Promise<{ has_active: boolean; reason?: string }> => {
  const roles = await find_roles_by_entity_id(entity_id);
  if (roles.length === 0) return { has_active: false };

  for (const role of roles) {
    const role_check = await check_role_has_active_transactions(role.id);
    if (role_check.has_active) {
      return role_check;
    }
  }

  return { has_active: false };
};