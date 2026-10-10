import {
  find_commodity_by_id,
  update_commodity_by_id,
  find_active_marketplace_commodities,
  find_price_tiers_by_commodity_ids,
  find_business_roles_with_entities_by_role_ids,
} from '../../repositories/products/supplier-catalog-repositories.ts';
import {
  find_batch_tags_by_commodity_id,
  find_batch_tags_by_commodity_ids,
} from '../../repositories/products/commodity-batch-tag-repositories.ts';
import {
  find_active_pools_by_commodity_id,
  find_active_pools_by_commodity_ids,
  insert_procurement_pool,
} from '../../repositories/orders/procurement-pool-repositories.ts';
import { AppError } from '../../middleware/error-middleware.ts';
import type { SupplierCommodityRecord } from '../../types/supplier-catalog-types.ts';
import type { CommodityBatchTagRecord } from '../../types/commodity-batch-tag-types.ts';
import type { ProcurementPoolRecord } from '../../types/procurement-order-types.ts';

export interface PublishCommodityResponse {
  commodity: SupplierCommodityRecord;
  quality_verification: {
    is_quality_certified: boolean;
    total_tags: number;
    verified_tags: number;
    tags: CommodityBatchTagRecord[];
  };
  procurement_pool: ProcurementPoolRecord;
}

export interface MarketplaceCommodityItem {
  commodity: SupplierCommodityRecord & { available_stock: string };
  price_tiers: any[];
  quality_verification: {
    is_quality_certified: boolean;
    verified_tags: CommodityBatchTagRecord[];
  };
  active_pool: ProcurementPoolRecord | null;
  supplier: {
    role_id: string;
    entity_id: string;
    business_name: string;
    city?: string;
  } | null;
}

/**
 * Mempublikasikan komoditas ke Marketplace publik setelah memeriksa tanggal panen, batas tutup, dan mutu
 */
export const publish_commodity_service = async (
  commodity_id: string
): Promise<PublishCommodityResponse> => {
  const commodity = await find_commodity_by_id(commodity_id);
  if (!commodity) {
    throw new AppError('Komoditas katalog tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  // Validasi tanggal produksi/panen dan tanggal tutup/expired
  if (!commodity.production_date) {
    throw new AppError(
      'Komoditas belum memiliki tanggal panen/produksi (production_date). Lengkapi terlebih dahulu.',
      400,
      'MISSING_PRODUCTION_DATE'
    );
  }

  if (!commodity.closed_date) {
    throw new AppError(
      'Komoditas belum memiliki tanggal batas penutupan/kadaluarsa (closed_date). Lengkapi terlebih dahulu.',
      400,
      'MISSING_CLOSED_DATE'
    );
  }

  const prod_time = new Date(commodity.production_date).getTime();
  const closed_time = new Date(commodity.closed_date).getTime();
  if (closed_time <= prod_time) {
    throw new AppError(
      'closed_date harus berada setelah tanggal produksi/panen (production_date)',
      400,
      'INVALID_DATE_RANGE'
    );
  }

  const stock_num = parseFloat(commodity.stock || '0');
  if (stock_num <= 0) {
    throw new AppError('Stok komoditas harus lebih besar dari 0 untuk dipublikasikan', 400, 'INSUFFICIENT_STOCK');
  }

  // Periksa data mutu / batch tags
  const batch_tags = await find_batch_tags_by_commodity_id(commodity_id);
  const verified_tags = batch_tags.filter((tag) => tag.is_verified);
  const is_quality_certified = verified_tags.length > 0;

  // Aktifkan komoditas di marketplace
  const updated_commodity = await update_commodity_by_id(commodity_id, {
    is_marketplace_active: true,
  });

  if (!updated_commodity) {
    throw new AppError('Gagal memperbarui status komoditas ke marketplace', 500, 'PUBLISH_FAILED');
  }

  // Buatkan atau hubungkan Procurement Pool aktif untuk komoditas ini
  const active_pools = await find_active_pools_by_commodity_id(commodity_id);
  let procurement_pool = active_pools[0];

  if (!procurement_pool) {
    const pool_expiry = new Date(commodity.closed_date);
    const lead_time = commodity.lead_time_days || 1;
    const target_delivery_str = commodity.closed_date;
    const cutoff_ms = new Date(commodity.closed_date).getTime() - lead_time * 86400000;
    const cutoff_date_str = new Date(cutoff_ms).toISOString().slice(0, 10);

    procurement_pool = await insert_procurement_pool({
      commodity_id,
      target_moq: String(commodity.base_moq),
      accumulated_qty: '0.00',
      pool_status: 'OPEN',
      locked_tier_price: String(commodity.base_price),
      target_delivery_date: target_delivery_str,
      cutoff_date: cutoff_date_str,
      is_asap_allowed: true,
      expires_at: pool_expiry,
    });
  }

  return {
    commodity: updated_commodity,
    quality_verification: {
      is_quality_certified,
      total_tags: batch_tags.length,
      verified_tags: verified_tags.length,
      tags: batch_tags,
    },
    procurement_pool,
  };
};

/**
 * Menarik komoditas dari peredaran publik Marketplace
 */
export const unpublish_commodity_service = async (
  commodity_id: string
): Promise<SupplierCommodityRecord> => {
  const commodity = await find_commodity_by_id(commodity_id);
  if (!commodity) {
    throw new AppError('Komoditas katalog tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  const updated_commodity = await update_commodity_by_id(commodity_id, {
    is_marketplace_active: false,
  });

  if (!updated_commodity) {
    throw new AppError('Gagal mengubah status komoditas', 500, 'UNPUBLISH_FAILED');
  }

  return updated_commodity;
};

/**
 * Mengambil daftar seluruh komoditas aktif di Marketplace publik
 */
export const get_marketplace_catalog_service = async (
  limit_count = 20,
  offset_count = 0
): Promise<MarketplaceCommodityItem[]> => {
  const commodities = await find_active_marketplace_commodities(limit_count, offset_count);
  if (commodities.length === 0) {
    return [];
  }

  const commodity_ids = commodities.map((item) => item.id);
  const supplier_role_ids = Array.from(new Set(commodities.map((item) => item.supplier_role_id)));

  const [tiers_by_commodity, batch_tags_by_commodity, pools_by_commodity, suppliers_by_role] =
    await Promise.all([
      find_price_tiers_by_commodity_ids(commodity_ids),
      find_batch_tags_by_commodity_ids(commodity_ids),
      find_active_pools_by_commodity_ids(commodity_ids),
      find_business_roles_with_entities_by_role_ids(supplier_role_ids),
    ]);

  return commodities.map((commodity) => {
    const total_stock_num = parseFloat(commodity.stock || '0');
    const reserved_stock_num = parseFloat(commodity.reserved_stock || '0');
    const available_stock_num = Math.max(0, total_stock_num - reserved_stock_num);

    const batch_tags = batch_tags_by_commodity[commodity.id] || [];
    const verified_tags = batch_tags.filter((tag_item) => tag_item.is_verified);
    const active_pool = pools_by_commodity[commodity.id] || null;
    const supplier_info = suppliers_by_role[commodity.supplier_role_id] || null;

    return {
      commodity: {
        ...commodity,
        available_stock: String(available_stock_num),
      },
      price_tiers: tiers_by_commodity[commodity.id] || [],
      quality_verification: {
        is_quality_certified: verified_tags.length > 0,
        verified_tags,
      },
      active_pool,
      supplier: supplier_info
        ? {
            role_id: supplier_info.role_id,
            entity_id: supplier_info.entity_id,
            business_name: supplier_info.business_name,
            city: supplier_info.city || undefined,
          }
        : null,
    };
  });
};
