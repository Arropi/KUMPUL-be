import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../../config/db';
import {
  umkm_products,
  recipe_details,
  business_roles,
  business_entities,
} from '../../config/schema';
import type {
  ProductRecord,
  ProductInsertPayload,
  RecipeRecord,
  RecipeInsertPayload,
} from '../../types/product-types';
import type { BusinessRole, BusinessEntity } from '../../types/database-types';

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

export const find_entity_by_id = async (
  entity_id: string
): Promise<BusinessEntity | null> => {
  const records = await db
    .select()
    .from(business_entities)
    .where(eq(business_entities.id, entity_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_product_by_id = async (
  product_id: string
): Promise<ProductRecord | null> => {
  const records = await db
    .select()
    .from(umkm_products)
    .where(eq(umkm_products.id, product_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_products_by_umkm = async (
  umkm_role_id: string,
  limit_count = 20,
  offset_count = 0
): Promise<ProductRecord[]> => {
  const records = await db
    .select()
    .from(umkm_products)
    .where(eq(umkm_products.umkm_role_id, umkm_role_id))
    .orderBy(desc(umkm_products.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const find_all_products = async (
  limit_count = 20,
  offset_count = 0
): Promise<ProductRecord[]> => {
  const records = await db
    .select()
    .from(umkm_products)
    .orderBy(desc(umkm_products.created_at))
    .limit(limit_count)
    .offset(offset_count);

  return records;
};

export const find_products_by_entity_id = async (
  entity_id: string
): Promise<ProductRecord[]> => {
  const records = await db
    .select({
      id: umkm_products.id,
      umkm_role_id: umkm_products.umkm_role_id,
      product_name: umkm_products.product_name,
      unit: umkm_products.unit,
      target_selling_price_per_unit: umkm_products.target_selling_price_per_unit,
      expected_batch_units: umkm_products.expected_batch_units,
      calculated_hpp_per_unit: umkm_products.calculated_hpp_per_unit,
      projected_margin_percentage: umkm_products.projected_margin_percentage,
      created_at: umkm_products.created_at,
      updated_at: umkm_products.updated_at,
    })
    .from(umkm_products)
    .innerJoin(
      business_roles,
      eq(umkm_products.umkm_role_id, business_roles.id)
    )
    .where(eq(business_roles.entity_id, entity_id))
    .orderBy(desc(umkm_products.created_at));

  return records;
};

export const insert_product = async (
  insert_payload: ProductInsertPayload
): Promise<ProductRecord> => {
  const inserted_records = await db
    .insert(umkm_products)
    .values(insert_payload)
    .returning();

  const created_data = inserted_records[0];
  if (!created_data) {
    throw new Error('Gagal menyimpan produk UMKM ke database');
  }

  return created_data;
};

export const update_product_by_id = async (
  product_id: string,
  update_payload: Partial<ProductInsertPayload>
): Promise<ProductRecord | null> => {
  const updated_records = await db
    .update(umkm_products)
    .set({
      ...update_payload,
      updated_at: new Date(),
    })
    .where(eq(umkm_products.id, product_id))
    .returning();

  return updated_records[0] ?? null;
};

export const delete_product_by_id = async (
  product_id: string
): Promise<ProductRecord | null> => {
  const deleted_records = await db
    .delete(umkm_products)
    .where(eq(umkm_products.id, product_id))
    .returning();

  return deleted_records[0] ?? null;
};

// ==========================================
// RECIPE DETAILS REPOSITORY
// ==========================================

export const find_recipe_by_id = async (
  recipe_id: string
): Promise<RecipeRecord | null> => {
  const records = await db
    .select()
    .from(recipe_details)
    .where(eq(recipe_details.id, recipe_id))
    .limit(1);

  return records[0] ?? null;
};

export const find_recipes_by_product_id = async (
  product_id: string
): Promise<RecipeRecord[]> => {
  const records = await db
    .select()
    .from(recipe_details)
    .where(eq(recipe_details.umkm_product_id, product_id))
    .orderBy(desc(recipe_details.created_at));

  return records;
};

export const find_recipes_by_product_ids = async (
  product_ids: string[]
): Promise<Record<string, RecipeRecord[]>> => {
  if (product_ids.length === 0) {
    return {};
  }

  const records = await db
    .select()
    .from(recipe_details)
    .where(inArray(recipe_details.umkm_product_id, product_ids))
    .orderBy(desc(recipe_details.created_at));

  const recipes_by_product: Record<string, RecipeRecord[]> = {};
  for (const item of records) {
    const p_id = item.umkm_product_id;
    if (!recipes_by_product[p_id]) {
      recipes_by_product[p_id] = [];
    }
    recipes_by_product[p_id]!.push(item);
  }

  return recipes_by_product;
};

export const insert_recipe = async (
  payload: RecipeInsertPayload
): Promise<RecipeRecord> => {
  const inserted_records = await db
    .insert(recipe_details)
    .values(payload)
    .returning();

  const created_data = inserted_records[0];
  if (!created_data) {
    throw new Error('Gagal menyimpan resep ke database');
  }

  return created_data;
};

export const update_recipe_by_id = async (
  recipe_id: string,
  payload: Partial<RecipeInsertPayload>
): Promise<RecipeRecord | null> => {
  const updated_records = await db
    .update(recipe_details)
    .set(payload)
    .where(eq(recipe_details.id, recipe_id))
    .returning();

  return updated_records[0] ?? null;
};

export const delete_recipe_by_id = async (
  recipe_id: string
): Promise<RecipeRecord | null> => {
  const deleted_records = await db
    .delete(recipe_details)
    .where(eq(recipe_details.id, recipe_id))
    .returning();

  return deleted_records[0] ?? null;
};

export const delete_recipes_by_product_id = async (
  product_id: string
): Promise<number> => {
  const deleted_records = await db
    .delete(recipe_details)
    .where(eq(recipe_details.umkm_product_id, product_id))
    .returning({ id: recipe_details.id });

  return deleted_records.length;
};
