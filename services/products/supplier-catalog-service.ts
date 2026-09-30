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
} from '../../repositories/products/supplier-catalog-repositories';
import { generate_sku_from_name } from '../../utils/sku-utils';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateSupplierCommodityDTO,
  UpdateSupplierCommodityDTO,
  SupplierCommodityRecord,
} from '../../types/supplier-catalog-types';

/**
 * Menghasilkan SKU unik dengan menangani kolisi menggunakan suffix counter bertahap.
 * Contoh: Jika "BRS-20-KG" sudah ada, menghasilkan "BRS-20-KG-01", lalu "BRS-20-KG-02".
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

  // Fallback timestamp acak jika counter melebihi batas
  return `${base_sku}-${Date.now().toString().slice(-4)}`;
};

export const create_supplier_commodity_service = async (
  payload: CreateSupplierCommodityDTO
): Promise<SupplierCommodityRecord> => {
  // 1. Validasi eksistensi dan tipe role bisnis supplier
  const target_role = await find_business_role_by_id(payload.supplier_role_id);
  if (!target_role) {
    throw new AppError(
      'Role entitas bisnis tidak ditemukan',
      404,
      'BUSINESS_ROLE_NOT_FOUND'
    );
  }

  if (target_role.role_type !== 'SUPPLIER') {
    throw new AppError(
      'Entitas bisnis ini bukan merupakan SUPPLIER',
      400,
      'INVALID_SUPPLIER_ROLE'
    );
  }

  // 2. Validasi nilai base_moq
  const numeric_base_moq = typeof payload.base_moq === 'number'
    ? payload.base_moq
    : parseFloat(payload.base_moq);

  if (isNaN(numeric_base_moq) || numeric_base_moq <= 0) {
    throw new AppError(
      'base_moq harus bernilai angka lebih besar dari 0',
      400,
      'INVALID_BASE_MOQ'
    );
  }

  // 3. Generate SKU otomatis dari nama produk pada layer service
  const base_generated_sku = generate_sku_from_name(payload.name);
  const final_unique_sku = await resolve_unique_sku(base_generated_sku);

  // 4. Susun payload insert komoditas katalog
  const insert_payload = {
    supplier_role_id: payload.supplier_role_id,
    name: payload.name.trim(),
    sku: final_unique_sku,
    wholesale_unit: payload.wholesale_unit,
    base_moq: String(numeric_base_moq),
    lead_time_days: payload.lead_time_days ?? 1,
    is_marketplace_active: payload.is_marketplace_active ?? true,
  };

  const created_commodity = await insert_supplier_commodity(insert_payload);
  return created_commodity;
};

export const get_commodity_by_id_service = async (
  commodity_id: string
): Promise<SupplierCommodityRecord> => {
  const commodity_record = await find_commodity_by_id(commodity_id);
  if (!commodity_record) {
    throw new AppError(
      'Komoditas katalog supplier tidak ditemukan',
      404,
      'COMMODITY_NOT_FOUND'
    );
  }

  return commodity_record;
};

export const list_commodities_by_supplier_service = async (
  supplier_role_id: string,
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityRecord[]> => {
  const supplier_items = await find_commodities_by_supplier(
    supplier_role_id,
    limit_count,
    offset_count
  );
  return supplier_items;
};

export const list_all_catalog_commodities_service = async (
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityRecord[]> => {
  const all_catalog_items = await find_all_commodities(limit_count, offset_count);
  return all_catalog_items;
};

export const update_supplier_commodity_service = async (
  commodity_id: string,
  payload: UpdateSupplierCommodityDTO
): Promise<SupplierCommodityRecord> => {
  const existing_item = await find_commodity_by_id(commodity_id);
  if (!existing_item) {
    throw new AppError(
      'Komoditas katalog supplier tidak ditemukan',
      404,
      'COMMODITY_NOT_FOUND'
    );
  }

  let formatted_moq: string | undefined;
  if (payload.base_moq !== undefined) {
    const parsed_moq = typeof payload.base_moq === 'number'
      ? payload.base_moq
      : parseFloat(payload.base_moq);

    if (isNaN(parsed_moq) || parsed_moq <= 0) {
      throw new AppError('base_moq harus bernilai lebih dari 0', 400, 'INVALID_BASE_MOQ');
    }
    formatted_moq = String(parsed_moq);
  }

  const update_payload = {
    ...(payload.name ? { name: payload.name.trim() } : {}),
    ...(payload.wholesale_unit ? { wholesale_unit: payload.wholesale_unit } : {}),
    ...(formatted_moq !== undefined ? { base_moq: formatted_moq } : {}),
    ...(payload.lead_time_days !== undefined ? { lead_time_days: payload.lead_time_days } : {}),
    ...(payload.is_marketplace_active !== undefined
      ? { is_marketplace_active: payload.is_marketplace_active }
      : {}),
  };

  const updated_item = await update_commodity_by_id(commodity_id, update_payload);
  if (!updated_item) {
    throw new AppError('Gagal memperbarui komoditas katalog', 500, 'UPDATE_FAILED');
  }

  return updated_item;
};

export const delete_supplier_commodity_service = async (
  commodity_id: string
): Promise<void> => {
  const target_item = await find_commodity_by_id(commodity_id);
  if (!target_item) {
    throw new AppError(
      'Komoditas katalog supplier tidak ditemukan',
      404,
      'COMMODITY_NOT_FOUND'
    );
  }

  const is_deleted = await delete_commodity_by_id(commodity_id);
  if (!is_deleted) {
    throw new AppError('Gagal menghapus komoditas katalog', 500, 'DELETE_FAILED');
  }
};
