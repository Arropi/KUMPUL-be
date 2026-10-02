import {
  find_product_by_id,
  update_product_by_id,
  find_recipe_by_id,
  find_recipes_by_product_id,
  insert_recipe,
  update_recipe_by_id,
  delete_recipe_by_id,
} from '../../repositories/products/product-repositories';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateRecipeDTO,
  UpdateRecipeDTO,
  RecipeRecord,
} from '../../types/product-types';

/**
 * Helper untuk menghitung ulang HPP dan Margin Produk secara otomatis berdasarkan komponen resep.
 */
export const recalculate_product_financials = async (
  product_id: string
): Promise<void> => {
  const product = await find_product_by_id(product_id);
  if (!product) return;

  const recipes = await find_recipes_by_product_id(product_id);
  const total_hpp = recipes.reduce((sum, item) => {
    const cost = parseFloat(item.estimated_cost_per_unit ?? '0');
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);

  const selling_price = parseFloat(product.target_selling_price_per_unit);
  let margin_pct = 0;
  if (!isNaN(selling_price) && selling_price > 0) {
    margin_pct = ((selling_price - total_hpp) / selling_price) * 100;
  }

  await update_product_by_id(product_id, {
    calculated_hpp_per_unit: total_hpp.toFixed(2),
    projected_margin_percentage: margin_pct.toFixed(2),
  });
};

export const create_recipe_service = async (
  payload: CreateRecipeDTO
): Promise<RecipeRecord> => {
  const product = await find_product_by_id(payload.umkm_product_id);
  if (!product) {
    throw new AppError('Produk UMKM tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  const req_qty_num =
    typeof payload.required_qty_per_unit === 'number'
      ? payload.required_qty_per_unit
      : parseFloat(payload.required_qty_per_unit);

  if (isNaN(req_qty_num) || req_qty_num <= 0) {
    throw new AppError(
      'Kuantitas bahan per unit harus lebih besar dari 0',
      400,
      'INVALID_QTY'
    );
  }

  const cost_num =
    payload.estimated_cost_per_unit !== undefined
      ? typeof payload.estimated_cost_per_unit === 'number'
        ? payload.estimated_cost_per_unit
        : parseFloat(payload.estimated_cost_per_unit)
      : 0;

  if (isNaN(cost_num) || cost_num < 0) {
    throw new AppError(
      'Estimasi biaya tidak boleh bernilai negatif',
      400,
      'INVALID_COST'
    );
  }

  const total_batch_qty = req_qty_num * product.expected_batch_units;

  const created_recipe = await insert_recipe({
    umkm_product_id: payload.umkm_product_id,
    ingredient_name: payload.ingredient_name.trim(),
    required_qty_per_unit: req_qty_num.toFixed(4),
    unit: payload.unit,
    total_batch_required_qty: total_batch_qty.toFixed(4),
    estimated_cost_per_unit: cost_num.toFixed(2),
  });

  // Otomatis hitung ulang HPP dan Margin pada produk
  await recalculate_product_financials(payload.umkm_product_id);

  return created_recipe;
};

export const get_recipe_by_id_service = async (
  recipe_id: string
): Promise<RecipeRecord> => {
  const recipe = await find_recipe_by_id(recipe_id);
  if (!recipe) {
    throw new AppError('Resep detail tidak ditemukan', 404, 'RECIPE_NOT_FOUND');
  }

  return recipe;
};

export const list_recipes_by_product_service = async (
  product_id: string
): Promise<RecipeRecord[]> => {
  const product = await find_product_by_id(product_id);
  if (!product) {
    throw new AppError('Produk UMKM tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  const recipes = await find_recipes_by_product_id(product_id);
  return recipes;
};

export const update_recipe_service = async (
  recipe_id: string,
  payload: UpdateRecipeDTO
): Promise<RecipeRecord> => {
  const existing_recipe = await find_recipe_by_id(recipe_id);
  if (!existing_recipe) {
    throw new AppError('Resep detail tidak ditemukan', 404, 'RECIPE_NOT_FOUND');
  }

  const product = await find_product_by_id(existing_recipe.umkm_product_id);
  if (!product) {
    throw new AppError('Produk UMKM tidak ditemukan', 404, 'PRODUCT_NOT_FOUND');
  }

  const update_payload: any = {};
  if (payload.ingredient_name !== undefined) {
    update_payload.ingredient_name = payload.ingredient_name.trim();
  }
  if (payload.unit !== undefined) {
    update_payload.unit = payload.unit;
  }
  if (payload.required_qty_per_unit !== undefined) {
    const qty_num =
      typeof payload.required_qty_per_unit === 'number'
        ? payload.required_qty_per_unit
        : parseFloat(payload.required_qty_per_unit);
    if (isNaN(qty_num) || qty_num <= 0) {
      throw new AppError(
        'Kuantitas bahan per unit harus lebih besar dari 0',
        400,
        'INVALID_QTY'
      );
    }
    update_payload.required_qty_per_unit = qty_num.toFixed(4);
    update_payload.total_batch_required_qty = (
      qty_num * product.expected_batch_units
    ).toFixed(4);
  }
  if (payload.estimated_cost_per_unit !== undefined) {
    const cost_num =
      typeof payload.estimated_cost_per_unit === 'number'
        ? payload.estimated_cost_per_unit
        : parseFloat(payload.estimated_cost_per_unit);
    if (isNaN(cost_num) || cost_num < 0) {
      throw new AppError(
        'Estimasi biaya tidak boleh bernilai negatif',
        400,
        'INVALID_COST'
      );
    }
    update_payload.estimated_cost_per_unit = cost_num.toFixed(2);
  }

  const updated_recipe = await update_recipe_by_id(recipe_id, update_payload);
  if (!updated_recipe) {
    throw new AppError('Gagal memperbarui resep detail', 500, 'UPDATE_FAILED');
  }

  // Otomatis hitung ulang HPP dan Margin pada produk
  await recalculate_product_financials(existing_recipe.umkm_product_id);

  return updated_recipe;
};

export const delete_recipe_service = async (
  recipe_id: string
): Promise<void> => {
  const existing_recipe = await find_recipe_by_id(recipe_id);
  if (!existing_recipe) {
    throw new AppError('Resep detail tidak ditemukan', 404, 'RECIPE_NOT_FOUND');
  }

  const product_id = existing_recipe.umkm_product_id;
  const is_deleted = await delete_recipe_by_id(recipe_id);
  if (!is_deleted) {
    throw new AppError('Gagal menghapus resep detail', 500, 'DELETE_FAILED');
  }

  // Otomatis hitung ulang HPP dan Margin pada produk setelah bahan dihapus
  await recalculate_product_financials(product_id);
};
