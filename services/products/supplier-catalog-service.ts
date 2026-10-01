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
} from '../../repositories/products/supplier-catalog-repositories';
import { generate_sku_from_name } from '../../utils/sku-utils';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateSupplierCommodityDTO,
  UpdateSupplierCommodityDTO,
  SupplierCommodityWithTiers,
  PriceTierInputDTO,
  CommodityPriceTierRecord,
  CommodityPriceTierInsertPayload,
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

/**
 * Validasi dan konversi tier harga komoditas
 */
const format_and_validate_price_tiers = (
  raw_tiers: PriceTierInputDTO[]
): { min_qty: string; max_qty: string; tier_price: string }[] => {
  return raw_tiers.map((tier_item, tier_index) => {
    const min_numeric =
      typeof tier_item.min_qty === 'number'
        ? tier_item.min_qty
        : parseFloat(tier_item.min_qty);
    const max_numeric =
      typeof tier_item.max_qty === 'number'
        ? tier_item.max_qty
        : parseFloat(tier_item.max_qty);
    const price_numeric =
      typeof tier_item.tier_price === 'number'
        ? tier_item.tier_price
        : parseFloat(tier_item.tier_price);

    if (isNaN(min_numeric) || min_numeric <= 0) {
      throw new AppError(
        `Tier index ${tier_index}: min_qty harus bernilai angka lebih besar dari 0`,
        400,
        'INVALID_TIER_MIN_QTY'
      );
    }
    if (isNaN(max_numeric) || max_numeric <= 0) {
      throw new AppError(
        `Tier index ${tier_index}: max_qty harus bernilai angka lebih besar dari 0`,
        400,
        'INVALID_TIER_MAX_QTY'
      );
    }
    if (max_numeric <= min_numeric) {
      throw new AppError(
        `Tier index ${tier_index}: max_qty harus lebih besar dari min_qty`,
        400,
        'INVALID_TIER_RANGE'
      );
    }
    if (isNaN(price_numeric) || price_numeric <= 0) {
      throw new AppError(
        `Tier index ${tier_index}: tier_price harus bernilai angka lebih besar dari 0`,
        400,
        'INVALID_TIER_PRICE'
      );
    }

    return {
      min_qty: String(min_numeric),
      max_qty: String(max_numeric),
      tier_price: String(price_numeric),
    };
  });
};

export const create_supplier_commodity_service = async (
  payload: CreateSupplierCommodityDTO
): Promise<SupplierCommodityWithTiers> => {
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

  // 2. Validasi nilai base_price (harga utama per wholesale unit)
  const numeric_base_price =
    typeof payload.base_price === 'number'
      ? payload.base_price
      : parseFloat(payload.base_price);

  if (isNaN(numeric_base_price) || numeric_base_price <= 0) {
    throw new AppError(
      'base_price harus bernilai angka lebih besar dari 0',
      400,
      'INVALID_BASE_PRICE'
    );
  }

  // 3. Validasi nilai stock (kuantitas persediaan)
  const numeric_stock =
    typeof payload.stock === 'number'
      ? payload.stock
      : parseFloat(payload.stock);

  if (isNaN(numeric_stock) || numeric_stock < 0) {
    throw new AppError(
      'stock harus bernilai angka tidak boleh negatif',
      400,
      'INVALID_STOCK'
    );
  }

  // 4. Validasi nilai base_moq
  const numeric_base_moq =
    typeof payload.base_moq === 'number'
      ? payload.base_moq
      : parseFloat(payload.base_moq);

  if (isNaN(numeric_base_moq) || numeric_base_moq <= 0) {
    throw new AppError(
      'base_moq harus bernilai angka lebih besar dari 0',
      400,
      'INVALID_BASE_MOQ'
    );
  }

  // 5. Validasi fitur accepting under MOQ
  const is_under_moq_allowed = payload.allows_under_moq ?? false;
  let formatted_under_moq_price: string | null = null;

  if (is_under_moq_allowed) {
    if (
      payload.under_moq_price_per_kg === undefined ||
      payload.under_moq_price_per_kg === null ||
      payload.under_moq_price_per_kg === ''
    ) {
      throw new AppError(
        'under_moq_price_per_kg wajib diisi jika allows_under_moq bernilai true',
        400,
        'MISSING_UNDER_MOQ_PRICE'
      );
    }

    const numeric_under_moq_price =
      typeof payload.under_moq_price_per_kg === 'number'
        ? payload.under_moq_price_per_kg
        : parseFloat(payload.under_moq_price_per_kg);

    if (isNaN(numeric_under_moq_price) || numeric_under_moq_price <= 0) {
      throw new AppError(
        'under_moq_price_per_kg harus bernilai angka lebih besar dari 0',
        400,
        'INVALID_UNDER_MOQ_PRICE'
      );
    }

    formatted_under_moq_price = String(numeric_under_moq_price);
  }

  // 6. Logika otomatisasi is_marketplace_active berdasarkan perkiraan tanggal panen/produksi
  const should_auto_activate = payload.auto_activate_marketplace ?? false;
  const estimated_date_val = payload.estimated_harvest_date ?? null;
  let initial_marketplace_active: boolean;

  if (should_auto_activate && estimated_date_val) {
    const current_date_string = new Date().toISOString().slice(0, 10);
    initial_marketplace_active = estimated_date_val <= current_date_string;
  } else {
    initial_marketplace_active = payload.is_marketplace_active ?? true;
  }

  // 7. Validasi price tiers jika disediakan (sebelum insert commodity untuk mencegah baris yatim/orphan)
  let validated_tiers: { min_qty: string; max_qty: string; tier_price: string }[] = [];
  if (payload.price_tiers && payload.price_tiers.length > 0) {
    validated_tiers = format_and_validate_price_tiers(payload.price_tiers);
  }

  // 8. Generate SKU otomatis dari nama produk pada layer service
  const base_generated_sku = generate_sku_from_name(payload.name);
  const final_unique_sku = await resolve_unique_sku(base_generated_sku);

  // 9. Susun payload insert komoditas katalog
  const insert_payload = {
    supplier_role_id: payload.supplier_role_id,
    name: payload.name.trim(),
    sku: final_unique_sku,
    wholesale_unit: payload.wholesale_unit,
    base_price: String(numeric_base_price),
    stock: String(numeric_stock),
    base_moq: String(numeric_base_moq),
    lead_time_days: payload.lead_time_days ?? 1,
    image_url: payload.image_url ?? null,
    description: payload.description ? payload.description.trim() : null,
    estimated_harvest_date: estimated_date_val,
    auto_activate_marketplace: should_auto_activate,
    allows_under_moq: is_under_moq_allowed,
    under_moq_price_per_kg: formatted_under_moq_price,
    is_marketplace_active: initial_marketplace_active,
  };

  const created_commodity = await insert_supplier_commodity(insert_payload);

  // 10. Simpan tiers harga yang telah tervalidasi
  let created_tiers: CommodityPriceTierRecord[] = [];
  if (validated_tiers.length > 0) {
    const tiers_payload = validated_tiers.map((tier_item) => ({
      commodity_id: created_commodity.id,
      min_qty: tier_item.min_qty,
      max_qty: tier_item.max_qty,
      tier_price: tier_item.tier_price,
    }));

    created_tiers = await insert_commodity_price_tiers(tiers_payload);
  }

  return {
    ...created_commodity,
    price_tiers: created_tiers,
  };
};

export const get_commodity_by_id_service = async (
  commodity_id: string
): Promise<SupplierCommodityWithTiers> => {
  // Eksekusi sinkronisasi otomatis status komoditas panen yang telah tiba masanya
  await activate_due_harvest_commodities();

  const commodity_record = await find_commodity_by_id(commodity_id);
  if (!commodity_record) {
    throw new AppError(
      'Komoditas katalog supplier tidak ditemukan',
      404,
      'COMMODITY_NOT_FOUND'
    );
  }

  const commodity_tiers = await find_price_tiers_by_commodity_id(commodity_id);

  return {
    ...commodity_record,
    price_tiers: commodity_tiers,
  };
};

export const list_commodities_by_supplier_service = async (
  supplier_role_id: string,
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityWithTiers[]> => {
  await activate_due_harvest_commodities();

  const supplier_items = await find_commodities_by_supplier(
    supplier_role_id,
    limit_count,
    offset_count
  );

  const commodity_ids = supplier_items.map((item) => item.id);
  const tiers_by_commodity = await find_price_tiers_by_commodity_ids(commodity_ids);

  return supplier_items.map((item) => ({
    ...item,
    price_tiers: tiers_by_commodity[item.id] ?? [],
  }));
};

export const list_all_catalog_commodities_service = async (
  limit_count = 20,
  offset_count = 0
): Promise<SupplierCommodityWithTiers[]> => {
  await activate_due_harvest_commodities();

  const all_catalog_items = await find_all_commodities(limit_count, offset_count);

  const commodity_ids = all_catalog_items.map((item) => item.id);
  const tiers_by_commodity = await find_price_tiers_by_commodity_ids(commodity_ids);

  return all_catalog_items.map((item) => ({
    ...item,
    price_tiers: tiers_by_commodity[item.id] ?? [],
  }));
};

export const update_supplier_commodity_service = async (
  commodity_id: string,
  payload: UpdateSupplierCommodityDTO
): Promise<SupplierCommodityWithTiers> => {
  const existing_item = await find_commodity_by_id(commodity_id);
  if (!existing_item) {
    throw new AppError(
      'Komoditas katalog supplier tidak ditemukan',
      404,
      'COMMODITY_NOT_FOUND'
    );
  }

  let formatted_base_price: string | undefined;
  if (payload.base_price !== undefined) {
    const parsed_price =
      typeof payload.base_price === 'number'
        ? payload.base_price
        : parseFloat(payload.base_price);
    if (isNaN(parsed_price) || parsed_price <= 0) {
      throw new AppError(
        'base_price harus bernilai lebih dari 0',
        400,
        'INVALID_BASE_PRICE'
      );
    }
    formatted_base_price = String(parsed_price);
  }

  let formatted_stock: string | undefined;
  if (payload.stock !== undefined) {
    const parsed_stock =
      typeof payload.stock === 'number'
        ? payload.stock
        : parseFloat(payload.stock);
    if (isNaN(parsed_stock) || parsed_stock < 0) {
      throw new AppError(
        'stock harus bernilai angka tidak boleh negatif',
        400,
        'INVALID_STOCK'
      );
    }
    formatted_stock = String(parsed_stock);
  }

  let formatted_moq: string | undefined;
  if (payload.base_moq !== undefined) {
    const parsed_moq =
      typeof payload.base_moq === 'number'
        ? payload.base_moq
        : parseFloat(payload.base_moq);

    if (isNaN(parsed_moq) || parsed_moq <= 0) {
      throw new AppError('base_moq harus bernilai lebih dari 0', 400, 'INVALID_BASE_MOQ');
    }
    formatted_moq = String(parsed_moq);
  }

  let final_under_moq_allowed = existing_item.allows_under_moq;
  if (payload.allows_under_moq !== undefined) {
    final_under_moq_allowed = payload.allows_under_moq;
  }

  let formatted_under_moq_price: string | null | undefined;
  if (final_under_moq_allowed) {
    if (payload.under_moq_price_per_kg !== undefined) {
      if (payload.under_moq_price_per_kg === null || payload.under_moq_price_per_kg === '') {
        throw new AppError(
          'under_moq_price_per_kg wajib diisi jika allows_under_moq bernilai true',
          400,
          'MISSING_UNDER_MOQ_PRICE'
        );
      }
      const parsed_under_moq_price =
        typeof payload.under_moq_price_per_kg === 'number'
          ? payload.under_moq_price_per_kg
          : parseFloat(payload.under_moq_price_per_kg);
      if (isNaN(parsed_under_moq_price) || parsed_under_moq_price <= 0) {
        throw new AppError(
          'under_moq_price_per_kg harus bernilai lebih dari 0',
          400,
          'INVALID_UNDER_MOQ_PRICE'
        );
      }
      formatted_under_moq_price = String(parsed_under_moq_price);
    } else if (!existing_item.under_moq_price_per_kg) {
      throw new AppError(
        'under_moq_price_per_kg wajib diisi jika allows_under_moq bernilai true',
        400,
        'MISSING_UNDER_MOQ_PRICE'
      );
    }
  } else {
    formatted_under_moq_price = null;
  }

  // Update marketplace status bila auto-activate aktif
  let updated_marketplace_active = payload.is_marketplace_active;
  const target_auto_activate =
    payload.auto_activate_marketplace ?? existing_item.auto_activate_marketplace;
  const target_harvest_date =
    payload.estimated_harvest_date !== undefined
      ? payload.estimated_harvest_date
      : existing_item.estimated_harvest_date;

  if (target_auto_activate && target_harvest_date && payload.is_marketplace_active === undefined) {
    const current_date_string = new Date().toISOString().slice(0, 10);
    updated_marketplace_active = target_harvest_date <= current_date_string;
  }

  const update_payload = {
    ...(payload.name ? { name: payload.name.trim() } : {}),
    ...(payload.wholesale_unit ? { wholesale_unit: payload.wholesale_unit } : {}),
    ...(formatted_base_price !== undefined ? { base_price: formatted_base_price } : {}),
    ...(formatted_stock !== undefined ? { stock: formatted_stock } : {}),
    ...(formatted_moq !== undefined ? { base_moq: formatted_moq } : {}),
    ...(payload.lead_time_days !== undefined ? { lead_time_days: payload.lead_time_days } : {}),
    ...(payload.image_url !== undefined ? { image_url: payload.image_url } : {}),
    ...(payload.description !== undefined
      ? { description: payload.description ? payload.description.trim() : null }
      : {}),
    ...(payload.estimated_harvest_date !== undefined
      ? { estimated_harvest_date: payload.estimated_harvest_date }
      : {}),
    ...(payload.auto_activate_marketplace !== undefined
      ? { auto_activate_marketplace: payload.auto_activate_marketplace }
      : {}),
    ...(payload.allows_under_moq !== undefined
      ? { allows_under_moq: payload.allows_under_moq }
      : {}),
    ...(formatted_under_moq_price !== undefined
      ? { under_moq_price_per_kg: formatted_under_moq_price }
      : {}),
    ...(updated_marketplace_active !== undefined
      ? { is_marketplace_active: updated_marketplace_active }
      : {}),
  };

  const updated_item = await update_commodity_by_id(commodity_id, update_payload);
  if (!updated_item) {
    throw new AppError('Gagal memperbarui komoditas katalog', 500, 'UPDATE_FAILED');
  }

  // Update tiers jika disediakan
  if (payload.price_tiers !== undefined) {
    await delete_price_tiers_by_commodity_id(commodity_id);
    if (payload.price_tiers.length > 0) {
      const validated_new_tiers = format_and_validate_price_tiers(payload.price_tiers);
      const tiers_payload = validated_new_tiers.map((tier_item) => ({
        commodity_id: commodity_id,
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

  await delete_price_tiers_by_commodity_id(commodity_id);
  const is_deleted = await delete_commodity_by_id(commodity_id);
  if (!is_deleted) {
    throw new AppError('Gagal menghapus komoditas katalog', 500, 'DELETE_FAILED');
  }
};
