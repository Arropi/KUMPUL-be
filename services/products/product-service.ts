import {
  find_business_role_by_id,
  find_entity_by_id,
  find_product_by_id,
  find_products_by_umkm,
  find_all_products,
  find_products_by_entity_id,
  insert_product,
  update_product_by_id,
  delete_product_by_id,
  find_recipe_by_id,
  find_recipes_by_product_id,
  find_recipes_by_product_ids,
  insert_recipe,
  update_recipe_by_id,
  delete_recipe_by_id,
  delete_recipes_by_product_id,
} from '../../repositories/products/product-repositories';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateProductDTO,
  UpdateProductDTO,
  ProductRecord,
  ProductWithRecipes,
  CreateRecipeDTO,
  UpdateRecipeDTO,
  RecipeRecord,
} from '../../types/product-types';

import { recalculate_product_financials } from './recipe-service';


// ==========================================
// PRODUCT SERVICES
// ==========================================

export const create_product_service = async (
  payload: CreateProductDTO
): Promise<ProductRecord> => {
  const role = await find_business_role_by_id(payload.umkm_role_id);
  if (!role) {
    throw new AppError('Role UMKM tidak ditemukan', 404, 'ROLE_NOT_FOUND');
  }

  if (role.role_type !== 'UMKM') {
    throw new AppError(
      'Role yang digunakan harus bertipe UMKM untuk membuat produk',
      400,
      'INVALID_ROLE_TYPE'
    );
  }

  const selling_price_num =
    typeof payload.target_selling_price_per_unit === 'number'
      ? payload.target_selling_price_per_unit
      : parseFloat(payload.target_selling_price_per_unit);

  if (isNaN(selling_price_num) || selling_price_num <= 0) {
    throw new AppError(
      'Target harga jual harus bernilai angka lebih besar dari 0',
      400,
      'INVALID_PRICE'
    );
  }

  const batch_units = payload.expected_batch_units ?? 1;
  if (batch_units < 1) {
    throw new AppError(
      'Target unit per batch minimal 1',
      400,
      'INVALID_BATCH_UNITS'
    );
  }

  const created_product = await insert_product({
    umkm_role_id: payload.umkm_role_id,
    product_name: payload.product_name.trim(),
    unit: payload.unit ?? 'PCS',
    target_selling_price_per_unit: selling_price_num.toFixed(2),
    expected_batch_units: batch_units,
    calculated_hpp_per_unit: '0.00',
    projected_margin_percentage: '0.00',
  });

  return created_product;
};

export const get_product_by_id_service = async (
  product_id: string
): Promise<ProductWithRecipes> => {
  const product = await find_product_by_id(product_id);
  if (!product) {
    throw new AppError('Produk UMKM tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  const recipes = await find_recipes_by_product_id(product_id);
  return {
    ...product,
    recipes,
  };
};

export const list_products_service = async (
  umkm_role_id?: string,
  limit_count = 20,
  offset_count = 0
): Promise<ProductWithRecipes[]> => {
  const products = umkm_role_id
    ? await find_products_by_umkm(umkm_role_id, limit_count, offset_count)
    : await find_all_products(limit_count, offset_count);

  if (products.length === 0) {
    return [];
  }

  const product_ids = products.map((item) => item.id);
  const recipes_by_product = await find_recipes_by_product_ids(product_ids);

  return products.map((product_item) => ({
    ...product_item,
    recipes: recipes_by_product[product_item.id] || [],
  }));
};

export const get_products_by_entity_id_service = async (
  entity_id: string
): Promise<ProductWithRecipes[]> => {
  const entity = await find_entity_by_id(entity_id);
  if (!entity) {
    throw new AppError('Entitas bisnis tidak ditemukan', 404, 'ENTITY_NOT_FOUND');
  }

  const products = await find_products_by_entity_id(entity_id);
  if (products.length === 0) {
    return [];
  }

  const product_ids = products.map((item) => item.id);
  const recipes_by_product = await find_recipes_by_product_ids(product_ids);

  return products.map((product_item) => ({
    ...product_item,
    recipes: recipes_by_product[product_item.id] || [],
  }));
};

export const update_product_service = async (
  product_id: string,
  payload: UpdateProductDTO
): Promise<ProductWithRecipes> => {
  const existing_product = await find_product_by_id(product_id);
  if (!existing_product) {
    throw new AppError('Produk UMKM tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  const update_payload: any = {};
  if (payload.product_name !== undefined) {
    update_payload.product_name = payload.product_name.trim();
  }
  if (payload.unit !== undefined) {
    update_payload.unit = payload.unit;
  }
  if (payload.target_selling_price_per_unit !== undefined) {
    const price_num =
      typeof payload.target_selling_price_per_unit === 'number'
        ? payload.target_selling_price_per_unit
        : parseFloat(payload.target_selling_price_per_unit);
    if (isNaN(price_num) || price_num <= 0) {
      throw new AppError(
        'Target harga jual harus bernilai angka lebih besar dari 0',
        400,
        'INVALID_PRICE'
      );
    }
    update_payload.target_selling_price_per_unit = price_num.toFixed(2);
  }
  if (payload.expected_batch_units !== undefined) {
    if (payload.expected_batch_units < 1) {
      throw new AppError(
        'Target unit per batch minimal 1',
        400,
        'INVALID_BATCH_UNITS'
      );
    }
    update_payload.expected_batch_units = payload.expected_batch_units;
  }

  const updated_product = await update_product_by_id(product_id, update_payload);
  if (!updated_product) {
    throw new AppError('Gagal memperbarui produk UMKM', 500, 'UPDATE_FAILED');
  }

  // Jika expected_batch_units berubah, update total_batch_required_qty pada semua resep terkait
  if (
    payload.expected_batch_units !== undefined &&
    payload.expected_batch_units !== existing_product.expected_batch_units
  ) {
    const recipes = await find_recipes_by_product_id(product_id);
    for (const recipe of recipes) {
      const per_unit = parseFloat(recipe.required_qty_per_unit);
      const new_batch_qty = per_unit * payload.expected_batch_units;
      await update_recipe_by_id(recipe.id, {
        total_batch_required_qty: new_batch_qty.toFixed(2),
      });
    }
  }

  // Recalculate margin jika harga jual berubah
  await recalculate_product_financials(product_id);

  const refreshed_product = await find_product_by_id(product_id);
  const recipes = await find_recipes_by_product_id(product_id);

  return {
    ...(refreshed_product ?? updated_product),
    recipes,
  };
};

export const delete_product_service = async (
  product_id: string
): Promise<void> => {
  const existing_product = await find_product_by_id(product_id);
  if (!existing_product) {
    throw new AppError('Produk UMKM tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  // Hapus resep-resep terkait terlebih dahulu
  await delete_recipes_by_product_id(product_id);

  const is_deleted = await delete_product_by_id(product_id);
  if (!is_deleted) {
    throw new AppError('Gagal menghapus produk UMKM', 500, 'DELETE_FAILED');
  }
};

// ==========================================
// RE-EXPORT RECIPE SERVICES
// ==========================================
export {
  recalculate_product_financials,
  create_recipe_service,
  get_recipe_by_id_service,
  list_recipes_by_product_service,
  update_recipe_service,
  delete_recipe_service,
} from './recipe-service';

