import { AppError } from '../../middleware/error-middleware';
import {
  find_active_pools_with_details,
  find_available_waste_listings_for_recommendation,
  find_market_price_benchmarks,
  find_marketplace_commodities,
  find_marketplace_commodity_by_id,
  find_matching_commodities_by_names,
  find_popular_recipe_ingredients,
  find_umkm_low_stock_records,
} from '../../repositories/products/marketplace-repositories';
import type {
  MarketplaceCommodityItem,
  MarketplaceFilterDTO,
  SupplierRecommendationResponse,
  UMKMRecommendationResponse,
} from '../../types/marketplace-types';

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

export const get_marketplace_recommendations_service = async (
  role_id: string,
  role_type: 'UMKM' | 'SUPPLIER'
): Promise<UMKMRecommendationResponse | SupplierRecommendationResponse> => {
  if (role_type === 'UMKM') {
    const low_stocks = await find_umkm_low_stock_records(role_id);
    const ingredient_names = low_stocks.map((s) => s.ingredient_name);

    const matching_commodities = await find_matching_commodities_by_names(
      ingredient_names
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

    const waste_listings = await find_available_waste_listings_for_recommendation(6);
    const circular_waste_matches = waste_listings.map((w) => ({
      listing_id: w.id,
      listing_title: w.listing_title,
      waste_category: w.waste_category,
      available_weight: Number(w.available_weight),
      price_per_kg: Number(w.price_per_kg),
      seller_name: w.seller_name,
      distance_km: null,
    }));

    const active_pools = await find_active_pools_with_details();
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

    const umkm_response: UMKMRecommendationResponse = {
      low_stock_recommendations,
      circular_waste_matches,
      cost_saving_active_pools,
    };

    return umkm_response;
  }

  // SUPPLIER Recommendation Engine
  const price_benchmarks = await find_market_price_benchmarks(role_id);
  const high_demand_ingredients = await find_popular_recipe_ingredients(10);

  const supplier_response: SupplierRecommendationResponse = {
    price_benchmarks,
    high_demand_ingredients,
  };

  return supplier_response;
};
