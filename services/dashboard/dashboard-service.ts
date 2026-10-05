import {
  get_supplier_active_pools_list,
  get_supplier_overview_stats,
  get_supplier_top_commodities_data,
  get_umkm_inventory_with_recipes,
  get_umkm_procurement_stats,
  get_umkm_recent_orders_list,
  get_umkm_recent_waste_listings_list,
} from '../../repositories/dashboard/dashboard-repositories';
import { find_market_price_benchmarks } from '../../repositories/products/marketplace-repositories';
import type {
  SupplierDashboardSummary,
  UMKMDashboardSummary,
} from '../../types/dashboard-types';

export const get_supplier_dashboard_service = async (
  supplier_role_id: string
): Promise<SupplierDashboardSummary> => {
  const [overview, active_pools, top_commodities, benchmarks] = await Promise.all([
    get_supplier_overview_stats(supplier_role_id),
    get_supplier_active_pools_list(supplier_role_id),
    get_supplier_top_commodities_data(supplier_role_id, 5),
    find_market_price_benchmarks(supplier_role_id),
  ]);

  return {
    ...overview,
    active_pools,
    top_commodities,
    competitiveness_benchmarks: benchmarks.map((b) => ({
      commodity_name: b.commodity_name,
      your_price: b.your_base_price,
      market_average: b.market_average_price,
      status: b.price_competitiveness,
    })),
  };
};

export const get_umkm_dashboard_service = async (
  umkm_role_id: string
): Promise<UMKMDashboardSummary> => {
  const [stats, inventory_data, recent_orders, recent_waste] = await Promise.all([
    get_umkm_procurement_stats(umkm_role_id),
    get_umkm_inventory_with_recipes(umkm_role_id),
    get_umkm_recent_orders_list(umkm_role_id, 5),
    get_umkm_recent_waste_listings_list(umkm_role_id, 5),
  ]);

  // Hitung perkiraan laju konsumsi harian & hari sebelum stok habis (Kitchen Runout Predictor)
  const recipe_consumption_map = new Map<string, number>();
  for (const r of inventory_data.recipes) {
    const key = r.ingredient_name.toLowerCase().trim();
    const batch_units = r.expected_batch_units || 1;
    const qty_per_unit = Number(r.required_qty) || 0;
    const daily_est = qty_per_unit * batch_units;
    recipe_consumption_map.set(
      key,
      (recipe_consumption_map.get(key) || 0) + daily_est
    );
  }

  const runout_alerts = [];

  // 1. Dari stok inventori yang tercatat
  for (const stock of inventory_data.inventory) {
    const key = stock.ingredient_name.toLowerCase().trim();
    const daily_rate = recipe_consumption_map.get(key) || 2.5; // default 2.5 kg per hari
    const current = Number(stock.current_stock);
    const days_left = daily_rate > 0 ? Math.max(0, Math.round(current / daily_rate)) : 30;

    runout_alerts.push({
      ingredient_name: stock.ingredient_name,
      current_stock: current,
      unit: stock.unit,
      daily_consumption_rate: Math.round(daily_rate * 10) / 10,
      days_until_runout: days_left,
      is_urgent: days_left <= 3,
    });
  }

  // 2. Jika inventori kosong tapi ada resep
  if (runout_alerts.length === 0 && inventory_data.recipes.length > 0) {
    const seen = new Set<string>();
    for (const r of inventory_data.recipes) {
      if (!seen.has(r.ingredient_name)) {
        seen.add(r.ingredient_name);
        runout_alerts.push({
          ingredient_name: r.ingredient_name,
          current_stock: 0,
          unit: 'KG',
          daily_consumption_rate: Number(r.required_qty) || 1,
          days_until_runout: 0,
          is_urgent: true,
        });
      }
    }
  }

  return {
    ...stats,
    kitchen_runout_alerts: runout_alerts.sort((a, b) => a.days_until_runout - b.days_until_runout),
    recent_orders: recent_orders.map((o) => ({
      order_id: o.order_id,
      commodity_name: o.commodity_name,
      order_qty: Number(o.order_qty),
      grand_total: Number(o.grand_total),
      payment_status: o.payment_status,
      delivery_method: o.delivery_method,
      pickup_code: o.pickup_code,
      required_delivery_date: o.required_delivery_date,
    })),
    recent_waste_listings: recent_waste.map((w) => ({
      listing_id: w.listing_id,
      listing_title: w.listing_title,
      waste_category: w.waste_category,
      available_weight: Number(w.available_weight),
      listing_status: w.listing_status,
    })),
  };
};
