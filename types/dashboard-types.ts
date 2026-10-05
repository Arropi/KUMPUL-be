export interface SupplierDashboardSummary {
  total_commodities: number;
  total_orders_received: number;
  total_revenue: number;
  active_pools_count: number;
  escrow_balance_held: number;
  top_commodities: {
    commodity_id: string;
    name: string;
    total_sold_qty: number;
    total_revenue: number;
  }[];
  active_pools: {
    pool_id: string;
    commodity_name: string;
    target_moq: number;
    accumulated_qty: number;
    progress_percentage: number;
    pool_status: string;
    target_delivery_date: string | null;
  }[];
  competitiveness_benchmarks: {
    commodity_name: string;
    your_price: number;
    market_average: number;
    status: 'COMPETITIVE' | 'AVERAGE' | 'EXPENSIVE';
  }[];
}

export interface UMKMDashboardSummary {
  total_procurement_spent: number;
  estimated_procurement_savings: number;
  active_participations_count: number;
  waste_revenue_earned: number;
  waste_diverted_kg: number;
  kitchen_runout_alerts: {
    ingredient_name: string;
    current_stock: number;
    unit: string;
    daily_consumption_rate: number;
    days_until_runout: number;
    is_urgent: boolean;
  }[];
  recent_orders: {
    order_id: string;
    commodity_name: string;
    order_qty: number;
    grand_total: number;
    payment_status: string;
    delivery_method: string | null;
    pickup_code?: string | null;
    required_delivery_date: string | null;
  }[];
  recent_waste_listings: {
    listing_id: string;
    listing_title: string;
    waste_category: string;
    available_weight: number;
    listing_status: string;
  }[];
}
