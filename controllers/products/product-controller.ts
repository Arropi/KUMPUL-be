import type { Request, Response, NextFunction } from 'express';
import {
  create_product_service,
  get_product_by_id_service,
  list_products_service,
  get_products_by_entity_id_service,
  update_product_service,
  delete_product_service,
  create_recipe_service,
  get_recipe_by_id_service,
  list_recipes_by_product_service,
  update_recipe_service,
  delete_recipe_service,
} from '../../services/products/product-service';

// ==========================================
// PRODUCT CONTROLLERS
// ==========================================

export const create_product = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formatted_payload = {
      umkm_role_id: req.body.umkm_role_id,
      product_name: req.body.product_name,
      unit: req.body.unit,
      target_selling_price_per_unit: req.body.target_selling_price_per_unit,
      expected_batch_units: req.body.expected_batch_units,
    };

    const created_item = await create_product_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Produk UMKM berhasil dibuat',
      data: created_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_product_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product_id = req.params.id as string;
    const item_data = await get_product_by_id_service(product_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail produk UMKM berhasil diambil',
      data: item_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_products = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const umkm_role_id = req.query.umkm_role_id as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const items_data = await list_products_service(umkm_role_id, limit, offset);

    res.status(200).json({
      status: 'success',
      message: 'Daftar produk UMKM berhasil diambil',
      data: items_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_products_by_entity_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entity_id = req.params.id as string;
    const items_data = await get_products_by_entity_id_service(entity_id);

    res.status(200).json({
      status: 'success',
      message: 'Daftar produk entitas bisnis berhasil diambil',
      data: items_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_product = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product_id = req.params.id as string;
    const formatted_payload = {
      product_name: req.body.product_name,
      unit: req.body.unit,
      target_selling_price_per_unit: req.body.target_selling_price_per_unit,
      expected_batch_units: req.body.expected_batch_units,
    };

    const updated_item = await update_product_service(product_id, formatted_payload);

    res.status(200).json({
      status: 'success',
      message: 'Produk UMKM berhasil diperbarui',
      data: updated_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const delete_product = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product_id = req.params.id as string;
    await delete_product_service(product_id);

    res.status(200).json({
      status: 'success',
      message: 'Produk UMKM berhasil dihapus',
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

// ==========================================
// RECIPE CONTROLLERS
// ==========================================

export const create_recipe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product_id = (req.params.product_id || req.body.umkm_product_id) as string;

    const formatted_payload = {
      umkm_product_id: product_id,
      ingredient_name: req.body.ingredient_name,
      required_qty_per_unit: req.body.required_qty_per_unit,
      unit: req.body.unit,
      estimated_cost_per_unit: req.body.estimated_cost_per_unit,
    };

    const created_item = await create_recipe_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Resep bahan berhasil ditambahkan dan HPP produk diperbarui',
      data: created_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_recipe_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recipe_id = req.params.id as string;
    const item_data = await get_recipe_by_id_service(recipe_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail resep bahan berhasil diambil',
      data: item_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_recipes_by_product = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product_id = req.params.product_id as string;
    const items_data = await list_recipes_by_product_service(product_id);

    res.status(200).json({
      status: 'success',
      message: 'Daftar resep bahan produk berhasil diambil',
      data: items_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_recipe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recipe_id = req.params.id as string;
    const formatted_payload = {
      ingredient_name: req.body.ingredient_name,
      required_qty_per_unit: req.body.required_qty_per_unit,
      unit: req.body.unit,
      estimated_cost_per_unit: req.body.estimated_cost_per_unit,
    };

    const updated_item = await update_recipe_service(recipe_id, formatted_payload);

    res.status(200).json({
      status: 'success',
      message: 'Resep bahan berhasil diperbarui dan HPP produk disesuaikan',
      data: updated_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const delete_recipe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const recipe_id = req.params.id as string;
    await delete_recipe_service(recipe_id);

    res.status(200).json({
      status: 'success',
      message: 'Resep bahan berhasil dihapus dan HPP produk disesuaikan',
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
