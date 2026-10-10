import { AppError } from '../../middleware/error-middleware.ts';
import {
  find_active_pools_with_details,
  find_available_waste_listings_for_recommendation,
  find_healthy_verified_commodities,
  find_market_price_benchmarks,
  find_marketplace_commodities,
  find_marketplace_commodity_by_id,
  find_matching_commodities_by_names,
  find_nearest_suppliers_commodities,
  find_popular_recipe_ingredients,
  find_umkm_low_stock_records,
} from '../../repositories/products/marketplace-repositories.ts';
import type {
  MarketplaceCommodityItem,
  MarketplaceFilterDTO,
  SupplierRecommendationResponse,
  UMKMRecommendationResponse,
} from '../../types/marketplace-types.ts';

export const get_marketplace_catalog_service = async (
  filter: MarketplaceFilterDTO
): Promise<MarketplaceCommodityItem[]> => {
  return await find_marketplace_commodities(filter);
};

export const get_marketplace_commodity_detail_service = async (
  commodity_id: string
): Promise<MarketplaceCommodityItem> => {
  const commodity = await find_marketplace_commodity_by_id(commodity_id);
  if (!commodity) {
    throw new AppError(
      'Komoditas marketplace tidak ditemukan',
      404,
      'COMMODITY_NOT_FOUND'
    );
  }
  return commodity;
};

import { gemini_client, DEFAULT_GEMINI_MODEL } from '../../config/gemini.ts';

/**
 * Fungsi analisis rekomendasi bertenaga Google Gemini AI.
 * KETENTUAN PENTING: Data komoditas milik akun pengguna itu sendiri (berdasarkan role_id & entity_id)
 * telah dikecualikan secara ketat pada level database query sebelum data diberikan ke Google AI.
 */
export const analyze_recommendations_with_google_ai = async (
  candidate_commodities: Array<{ id: string; name: string; price: number }>,
  user_context: { role: string; low_stocks?: string[] }
): Promise<string | null> => {
  if (!candidate_commodities.length || !gemini_client) {
    return null;
  }
  try {
    const prompt = `Anda adalah Mesin Rekomendasi Cerdas KUMPUL. Analisis komoditas kandidat berikut untuk pengadaan UMKM (semua komoditas telah diverifikasi bukan milik akun pengguna sendiri):
${JSON.stringify(candidate_commodities.slice(0, 5))}
Konteks Kebutuhan: ${JSON.stringify(user_context)}
Berikan panduan kurasi pengadaan 1 kalimat singkat.`;

    const response = await gemini_client.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: prompt,
    });
    return response?.text || null;
  } catch (error) {
    console.warn('[Google AI Recommendation]: Gagal memproses AI insight:', error);
    return null;
  }
};

export const get_marketplace_recommendations_service = async (
  role_id: string | null | undefined,
  role_type: 'UMKM' | 'SUPPLIER',
  entity_id?: string | null | undefined,
  role_ids?: string[]
): Promise<UMKMRecommendationResponse | SupplierRecommendationResponse> => {
  let low_stocks = (role_id && role_type === 'UMKM') ? await find_umkm_low_stock_records(role_id) : [];
  if (low_stocks.length === 0) {
    low_stocks = [
      { ingredient_name: 'Daging Ayam Fillet', current_stock: '3.50', unit: 'KG' },
      { ingredient_name: 'Minyak Goreng', current_stock: '4.00', unit: 'LITER' },
      { ingredient_name: 'Cabe Rawit', current_stock: '1.20', unit: 'KG' },
      { ingredient_name: 'Biji Kopi', current_stock: '2.50', unit: 'KG' },
    ];
  }
  const ingredient_names = low_stocks.map((s) => s.ingredient_name);

  // KECUALIKAN komoditas milik akun sendiri (berdasarkan role_id, entity_id, dan seluruh role_ids akun)
  const matching_commodities = await find_matching_commodities_by_names(
    ingredient_names,
    role_id,
    entity_id,
    role_ids
  );

  const low_stock_recommendations = low_stocks.map((stock) => {
    const matched = matching_commodities
      .filter((c) =>
        c.name.toLowerCase().includes(stock.ingredient_name.toLowerCase())
      )
      .map((c) => ({
        commodity_id: c.id,
        commodity_name: c.name,
        base_price: Number(c.base_price),
        supplier_name: c.supplier_name,
        stock: Number(c.stock),
      }));

    return {
      ingredient_name: stock.ingredient_name,
      current_stock: Number(stock.current_stock),
      unit: stock.unit,
      matching_commodities: matched,
    };
  });

  // KECUALIKAN komoditas & listing limbah milik akun sendiri dari seluruh rekomendasi
  const [healthy_verified_alternatives, nearest_suppliers, waste_listings, active_pools] =
    await Promise.all([
      find_healthy_verified_commodities(6, role_id, entity_id, role_ids),
      find_nearest_suppliers_commodities(6, role_id, entity_id, role_ids),
      find_available_waste_listings_for_recommendation(6, role_id, entity_id, role_ids),
      find_active_pools_with_details(role_id, entity_id, role_ids),
    ]);

  const circular_waste_matches = waste_listings.map((w) => ({
    listing_id: w.id,
    listing_title: w.listing_title,
    waste_category: w.waste_category,
    available_weight: Number(w.available_weight),
    price_per_kg: Number(w.price_per_kg),
    seller_name: w.seller_name,
    distance_km: null,
  }));

  const cost_saving_active_pools = active_pools.map((p) => {
    const base = Number(p.base_price);
    const locked = p.locked_tier_price ? Number(p.locked_tier_price) : base;
    const savings_pct =
      base > 0 && locked < base ? Math.round(((base - locked) / base) * 100) : 0;

    return {
      pool_id: p.pool_id,
      commodity_id: p.commodity_id,
      commodity_name: p.commodity_name,
      target_moq: Number(p.target_moq),
      accumulated_qty: Number(p.accumulated_qty),
      target_delivery_date: p.target_delivery_date,
      estimated_savings_percentage: savings_pct,
    };
  });

  if (role_type === 'UMKM') {
    const umkm_response: UMKMRecommendationResponse = {
      low_stock_recommendations,
      healthy_verified_alternatives,
      nearest_suppliers,
      circular_waste_matches,
      cost_saving_active_pools,
    };
    return umkm_response;
  }

  // SUPPLIER Recommendation Engine: Tetap sediakan rekomendasi bursa dari supplier lain
  const price_benchmarks = role_id ? await find_market_price_benchmarks(role_id, entity_id, role_ids) : [];

  const supplier_response: SupplierRecommendationResponse = {
    price_benchmarks,
    high_demand_ingredients: [],
    low_stock_recommendations,
    healthy_verified_alternatives,
    nearest_suppliers,
    circular_waste_matches,
    cost_saving_active_pools,
  };

  return supplier_response;
};
