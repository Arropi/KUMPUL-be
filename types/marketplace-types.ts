import type { StorageTemperatureType } from './commodity-batch-tag-types.ts';

export interface MarketplaceFilterDTO {
  search?: string;
  category?: string;
  max_price?: number;
  storage_temp?: StorageTemperatureType;
  ready_stock?: boolean;
  page?: number;
  limit?: number;
  exclude_role_id?: string | null;
  exclude_role_ids?: string[];
  exclude_entity_id?: string | null;
}

export interface MarketplacePriceTierItem {
  id: string;
  min_qty: number;
  max_qty: number;
  tier_price: number;
}

export interface MarketplaceBatchTagItem {
  id: string;
  storage_temperature_type: StorageTemperatureType;
  is_verified: boolean;
  supporting_file_url?: string | null;
}

export interface ActivePoolSummaryItem {
  id: string;
  target_moq: number;
  accumulated_qty: number;
  pool_status: string;
  progress_percentage: number;
  locked_tier_price?: number | null;
  target_delivery_date?: string | null;
  cutoff_date?: string | null;
}

export interface MarketplaceCommodityItem {
  id: string;
  name: string;
  sku: string;
  wholesale_unit: string;
  base_price: number;
  stock: number;
  available_stock: number;
  base_moq: number;
  lead_time_days: number;
  image_url?: string | null;
  description?: string | null;
  production_date?: string | null;
  closed_date?: string | null;
  allows_under_moq: boolean;
  under_moq_price_per_kg?: number | null;
  supplier_role_id?: string;
  supplier_entity_id?: string;
  supplier: {
    role_id: string;
    entity_id?: string;
    legal_name: string;
    default_address: string;
    latitude: number;
    longitude: number;
    sector_type?: string | null;
  };
  price_tiers: MarketplacePriceTierItem[];
  batch_tag?: MarketplaceBatchTagItem | null;
  active_pools: ActivePoolSummaryItem[];
  has_tiering_price: boolean;
  has_open_pools: boolean;
  open_pools_count: number;
  is_verified: boolean;
  source_type: 'SUPPLIER' | 'WASTE';
  seller_city: string;
  distance_km?: number | null;
}

export interface UMKMRecommendationResponse {
  low_stock_recommendations: {
    ingredient_name: string;
    current_stock: number;
    unit: string;
    matching_commodities: {
      commodity_id: string;
      commodity_name: string;
      base_price: number;
      supplier_name: string;
      stock: number;
    }[];
  }[];
  healthy_verified_alternatives: {
    commodity_id: string;
    commodity_name: string;
    base_price: number;
    wholesale_unit: string;
    supplier_name: string;
    seller_city: string;
    storage_temp: StorageTemperatureType;
    is_verified: boolean;
    verification_notes?: string | null;
    image_url?: string | null;
  }[];
  nearest_suppliers: {
    commodity_id: string;
    commodity_name: string;
    base_price: number;
    wholesale_unit: string;
    supplier_name: string;
    seller_city: string;
    distance_km?: number | null;
    stock: number;
    image_url?: string | null;
  }[];
  circular_waste_matches: {
    listing_id: string;
    listing_title: string;
    waste_category: string;
    available_weight: number;
    price_per_kg: number;
    seller_name: string;
    distance_km?: number | null;
  }[];
  cost_saving_active_pools: {
    pool_id: string;
    commodity_id: string;
    commodity_name: string;
    target_moq: number;
    accumulated_qty: number;
    target_delivery_date: string | null;
    estimated_savings_percentage: number;
  }[];
}

export interface SupplierRecommendationResponse {
  price_benchmarks: {
    commodity_id: string;
    commodity_name: string;
    your_base_price: number;
    market_average_price: number;
    price_competitiveness: 'COMPETITIVE' | 'AVERAGE' | 'EXPENSIVE';
    image_url?: string | null;
    sku?: string | null;
    wholesale_unit?: string | null;
    base_moq?: number | null;
    stock?: number | null;
  }[];
  high_demand_ingredients: {
    ingredient_name: string;
    recipe_occurrences: number;
  }[];
  low_stock_recommendations?: UMKMRecommendationResponse['low_stock_recommendations'];
  healthy_verified_alternatives?: UMKMRecommendationResponse['healthy_verified_alternatives'];
  nearest_suppliers?: UMKMRecommendationResponse['nearest_suppliers'];
  circular_waste_matches?: UMKMRecommendationResponse['circular_waste_matches'];
  cost_saving_active_pools?: UMKMRecommendationResponse['cost_saving_active_pools'];
}
