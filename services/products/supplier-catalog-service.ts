import {
  find_business_role_by_id,
  find_commodity_by_id,
  find_commodity_by_sku,
  find_existing_skus_by_prefix,
  find_commodities_by_supplier,
  find_all_commodities,
  insert_supplier_commodity,
  update_commodity_by_id,
  delete_commodity_by_id,
  insert_commodity_price_tiers,
  find_price_tiers_by_commodity_id,
  find_price_tiers_by_commodity_ids,
  delete_price_tiers_by_commodity_id,
  activate_due_harvest_commodities,
  find_entity_by_id,
  find_commodities_by_entity_id,
} from '../../repositories/products/supplier-catalog-repositories.ts';
import { generate_sku_from_name } from '../../utils/sku-utils.ts';
import { format_and_validate_price_tiers } from '../../utils/tier-utils.ts';
import {
  find_batch_tags_by_commodity_id,
  delete_batch_tags_by_commodity_id,
} from '../../repositories/products/commodity-batch-tag-repositories.ts';
import { AppError } from '../../middleware/error-middleware.ts';
import type {
  CreateSupplierCommodityDTO,
  UpdateSupplierCommodityDTO,
  SupplierCommodityWithTiers,
  SupplierCommodityInsertPayload,
} from '../../types/supplier-catalog-types.ts';

/**
 * Menghasilkan SKU unik dengan suffix counter bertahap jika terjadi kolisi
 */
const resolve_unique_sku = async (base_sku: string): Promise<string> => {
  const existing_exact_sku = await find_commodity_by_sku(base_sku);
  if (!existing_exact_sku) {
    return base_sku;
  }

  const existing_prefix_skus = await find_existing_skus_by_prefix(base_sku);
  const existing_set = new Set(existing_prefix_skus);

  let counter = 1;
  while (counter <= 999) {
    const formatted_counter = counter.toString().padStart(2, '0');
    const candidate_sku = `${base_sku}-${formatted_counter}`;

    if (!existing_set.has(candidate_sku)) {
      return candidate_sku;
    }
    counter += 1;
  }

  return `${base_sku}-${Date.now().toString().slice(-4)}`;
};

export const create_supplier_commodity_service = async (
  payload: CreateSupplierCommodityDTO
): Promise<SupplierCommodityWithTiers> => {
  const target_role = await find_business_role_by_id(payload.supplier_role_id);
  if (!target_role) {
    throw new AppError('Role entitas bisnis tidak ditemukan', 404, 'BUSINESS_ROLE_NOT_FOUND');
  }

  if (target_role.role_type !== 'SUPPLIER') {
    throw new AppError('Entitas bisnis ini bukan merupakan SUPPLIER', 400, 'INVALID_SUPPLIER_ROLE');
  }

  const numeric_base_price = parseFloat(String(payload.base_price));
  if (isNaN(numeric_base_price) || numeric_base_price <= 0) {
    throw new AppError('base_price harus bernilai angka lebih besar dari 0', 400, 'INVALID_BASE_PRICE');
  }

  const numeric_stock = parseFloat(String(payload.stock));
  if (isNaN(numeric_stock) || numeric_stock < 0) {
    throw new AppError('stock harus bernilai angka tidak boleh negatif', 400, 'INVALID_STOCK');
  }

  const numeric_base_moq = parseFloat(String(payload.base_moq));
  if (isNaN(numeric_base_moq) || numeric_base_moq <= 0) {
    throw new AppError('base_moq harus bernilai angka lebih besar dari 0', 400, 'INVALID_BASE_MOQ');
  }

  let formatted_under_moq_price: string | null = null;
  if (payload.allows_under_moq) {
    if (!payload.under_moq_price_per_kg) {
      throw new AppError('under_moq_price_per_kg wajib diisi jika allows_under_moq bernilai true', 400, 'MISSING_UNDER_MOQ_PRICE');
    }
    const numeric_under_moq_price = parseFloat(String(payload.under_moq_price_per_kg));
    if (isNaN(numeric_under_moq_price) || numeric_under_moq_price <= 0) {
      throw new AppError('under_moq_price_per_kg harus bernilai angka lebih besar dari 0', 400, 'INVALID_UNDER_MOQ_PRICE');
    }
    formatted_under_moq_price = String(numeric_under_moq_price);
  }

  let initial_marketplace_active = payload.is_marketplace_active ?? false;
  if (payload.auto_activate_marketplace && payload.production_date) {
    const current_date_string = new Date().toISOString().slice(0, 10);
    initial_marketplace_active = payload.production_date <= current_date_string;
  }

  const base_generated_sku = generate_sku_from_name(payload.name);
  const final_unique_sku = await resolve_unique_sku(base_generated_sku);

  let formatted_price_tiers: { min_qty: string; max_qty: string; tier_price: string }[] = [];
  if (payload.price_tiers && payload.price_tiers.length > 0) {
    formatted_price_tiers = format_and_validate_price_tiers(payload.price_tiers);
  }

  const commodity_insert_payload: SupplierCommodityInsertPayload = {
    supplier_role_id: payload.supplier_role_id,
    sku: final_unique_sku,
    name: payload.name.trim(),
    wholesale_unit: payload.wholesale_unit,
    base_price: String(numeric_base_price),
    stock: String(numeric_stock),
    reserved_stock: '0.00',
    base_moq: String(numeric_base_moq),
    lead_time_days: payload.lead_time_days ?? 1,
    image_url: payload.image_url ?? null,
    description: payload.description ? payload.description.trim() : null,
    production_date: payload.production_date ? payload.production_date : null,
    closed_date: payload.closed_date ? payload.closed_date : null,
    auto_activate_marketplace: payload.auto_activate_marketplace ?? false,
    allows_under_moq: payload.allows_under_moq ?? false,
    under_moq_price_per_kg: formatted_under_moq_price,
    is_marketplace_active: initial_marketplace_active,
  };

  const created_commodity = await insert_supplier_commodity(commodity_insert_payload);

  let created_price_tiers: any[] = [];
  if (formatted_price_tiers.length > 0) {
    const tiers_payload = formatted_price_tiers.map((tier_item) => ({
      commodity_id: created_commodity.id,
      min_qty: tier_item.min_qty,
      max_qty: tier_item.max_qty,
      tier_price: tier_item.tier_price,
    }));
    created_price_tiers = await insert_commodity_price_tiers(tiers_payload);
  }

  return {
    ...created_commodity,
    price_tiers: created_price_tiers,
  };
};

export const get_supplier_commodity_by_id_service = async (
  commodity_id: string
): Promise<SupplierCommodityWithTiers> => {
  const commodity = await find_commodity_by_id(commodity_id);
  if (!commodity) {
    throw new AppError('Komoditas katalog supplier tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  const [price_tiers, batch_tags] = await Promise.all([
    find_price_tiers_by_commodity_id(commodity_id),
    find_batch_tags_by_commodity_id(commodity_id),
  ]);

  const latest_batch_tag = batch_tags && batch_tags.length > 0 ? batch_tags[0] : null;

  return {
    ...commodity,
    price_tiers,
    batch_tag: latest_batch_tag,
    batch_tags,
  };
};

export const list_supplier_commodities_service = async (
  supplier_role_id?: string,
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityWithTiers[]> => {
  let commodities;
  if (supplier_role_id) {
    const existing_role = await find_business_role_by_id(supplier_role_id);
    if (!existing_role) {
      throw new AppError('Role supplier tidak ditemukan', 404, 'BUSINESS_ROLE_NOT_FOUND');
    }
    commodities = await find_commodities_by_supplier(supplier_role_id, limit_count, offset_count);
  } else {
    commodities = await find_all_commodities(limit_count, offset_count);
  }

  if (commodities.length === 0) {
    return [];
  }

  const commodity_ids = commodities.map((item) => item.id);
  const tiers_by_commodity = await find_price_tiers_by_commodity_ids(commodity_ids);

  return commodities.map((commodity_item) => ({
    ...commodity_item,
    price_tiers: tiers_by_commodity[commodity_item.id] || [],
  }));
};

export const update_supplier_commodity_service = async (
  commodity_id: string,
  payload: UpdateSupplierCommodityDTO
): Promise<SupplierCommodityWithTiers> => {
  const existing_item = await find_commodity_by_id(commodity_id);
  if (!existing_item) {
    throw new AppError('Komoditas katalog supplier tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  let formatted_under_moq_price: string | null | undefined = undefined;
  const target_allows_under_moq = payload.allows_under_moq ?? existing_item.allows_under_moq;
  if (target_allows_under_moq) {
    if (payload.under_moq_price_per_kg !== undefined) {
      const parsed_price = parseFloat(String(payload.under_moq_price_per_kg));
      if (isNaN(parsed_price) || parsed_price <= 0) {
        throw new AppError('under_moq_price_per_kg harus bernilai lebih dari 0', 400, 'INVALID_UNDER_MOQ_PRICE');
      }
      formatted_under_moq_price = String(parsed_price);
    }
  } else if (payload.allows_under_moq === false) {
    formatted_under_moq_price = null;
  }

  const update_payload = {
    ...(payload.name ? { name: payload.name.trim() } : {}),
    ...(payload.wholesale_unit ? { wholesale_unit: payload.wholesale_unit } : {}),
    ...(payload.base_price !== undefined ? { base_price: String(payload.base_price) } : {}),
    ...(payload.stock !== undefined ? { stock: String(payload.stock) } : {}),
    ...(payload.base_moq !== undefined ? { base_moq: String(payload.base_moq) } : {}),
    ...(payload.lead_time_days !== undefined ? { lead_time_days: payload.lead_time_days } : {}),
    ...(payload.image_url !== undefined ? { image_url: payload.image_url } : {}),
    ...(payload.description !== undefined ? { description: payload.description ? payload.description.trim() : null } : {}),
    ...(payload.production_date !== undefined ? { production_date: payload.production_date } : {}),
    ...(payload.closed_date !== undefined ? { closed_date: payload.closed_date } : {}),
    ...(payload.auto_activate_marketplace !== undefined ? { auto_activate_marketplace: payload.auto_activate_marketplace } : {}),
    ...(payload.allows_under_moq !== undefined ? { allows_under_moq: payload.allows_under_moq } : {}),
    ...(formatted_under_moq_price !== undefined ? { under_moq_price_per_kg: formatted_under_moq_price } : {}),
    ...(payload.is_marketplace_active !== undefined ? { is_marketplace_active: payload.is_marketplace_active } : {}),
  };

  const updated_item = await update_commodity_by_id(commodity_id, update_payload);
  if (!updated_item) {
    throw new AppError('Gagal memperbarui komoditas katalog', 500, 'UPDATE_FAILED');
  }

  if (payload.price_tiers !== undefined) {
    await delete_price_tiers_by_commodity_id(commodity_id);
    if (payload.price_tiers.length > 0) {
      const validated_new_tiers = format_and_validate_price_tiers(payload.price_tiers);
      const tiers_payload = validated_new_tiers.map((tier_item) => ({
        commodity_id,
        min_qty: tier_item.min_qty,
        max_qty: tier_item.max_qty,
        tier_price: tier_item.tier_price,
      }));
      await insert_commodity_price_tiers(tiers_payload);
    }
  }

  const latest_tiers = await find_price_tiers_by_commodity_id(commodity_id);
  return {
    ...updated_item,
    price_tiers: latest_tiers,
  };
};

export const delete_supplier_commodity_service = async (commodity_id: string): Promise<void> => {
  const target_item = await find_commodity_by_id(commodity_id);
  if (!target_item) {
    throw new AppError('Komoditas katalog supplier tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  await delete_price_tiers_by_commodity_id(commodity_id);
  await delete_batch_tags_by_commodity_id(commodity_id);
  const is_deleted = await delete_commodity_by_id(commodity_id);
  if (!is_deleted) {
    throw new AppError('Gagal menghapus komoditas katalog', 500, 'DELETE_FAILED');
  }
};

export const get_commodities_by_entity_id_service = async (
  entity_id: string
): Promise<SupplierCommodityWithTiers[]> => {
  const existing_entity = await find_entity_by_id(entity_id);
  if (!existing_entity) {
    throw new AppError('Entitas bisnis tidak ditemukan', 404, 'ENTITY_NOT_FOUND');
  }

  const commodities = await find_commodities_by_entity_id(entity_id);
  if (commodities.length === 0) {
    return [];
  }

  const commodity_ids = commodities.map((item) => item.id);
  const tiers_by_commodity = await find_price_tiers_by_commodity_ids(commodity_ids);

  return commodities.map((commodity_item) => ({
    ...commodity_item,
    price_tiers: tiers_by_commodity[commodity_item.id] || [],
  }));
};

export const get_commodity_by_id_service = get_supplier_commodity_by_id_service;
export const list_commodities_by_supplier_service = list_supplier_commodities_service;
export const list_all_catalog_commodities_service = async (
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityWithTiers[]> => {
  return await list_supplier_commodities_service(undefined, limit_count, offset_count);
};
