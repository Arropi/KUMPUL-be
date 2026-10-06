import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import {
  business_entities,
  business_roles,
  consolidated_pos,
  escrow_transactions,
  pool_participants,
  procurement_pools,
  recipe_details,
  supplier_commodities,
  umkm_inventory_stocks,
  umkm_procurement_orders,
  umkm_products,
  waste_listings,
  waste_transactions,
} from '../../config/schema';

export const get_supplier_overview_stats = async (supplier_role_id: string) => {
  const commodities_count = await db
    .select({
      count: sql<number>`count(${supplier_commodities.id})::int`,
    })
    .from(supplier_commodities)
    .where(eq(supplier_commodities.supplier_role_id, supplier_role_id));

  const active_pools_count = await db
    .select({
      count: sql<number>`count(${procurement_pools.id})::int`,
    })
    .from(procurement_pools)
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(
      and(
        eq(supplier_commodities.supplier_role_id, supplier_role_id),
        or(
          eq(procurement_pools.pool_status, 'OPEN'),
          eq(procurement_pools.pool_status, 'AGGREGATING')
        )
      )
    );

  const settled_revenue = await db
    .select({
      total_revenue: sql<string>`COALESCE(SUM(${umkm_procurement_orders.grand_total}::numeric), 0)`,
      total_orders: sql<number>`count(${umkm_procurement_orders.id})::int`,
    })
    .from(umkm_procurement_orders)
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(
      and(
        eq(supplier_commodities.supplier_role_id, supplier_role_id),
        eq(umkm_procurement_orders.payment_status, 'SETTLED')
      )
    );

  const escrow_held = await db
    .select({
      total_escrow: sql<string>`COALESCE(SUM(${escrow_transactions.amount}::numeric), 0)`,
    })
    .from(escrow_transactions)
    .innerJoin(
      umkm_procurement_orders,
      eq(escrow_transactions.order_reference_id, umkm_procurement_orders.id)
    )
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(
      and(
        eq(supplier_commodities.supplier_role_id, supplier_role_id),
        eq(escrow_transactions.escrow_status, 'HELD')
      )
    );

  return {
    total_commodities: commodities_count[0]?.count ?? 0,
    active_pools_count: active_pools_count[0]?.count ?? 0,
    total_revenue: Number(settled_revenue[0]?.total_revenue ?? 0),
    total_orders_received: settled_revenue[0]?.total_orders ?? 0,
    escrow_balance_held: Number(escrow_held[0]?.total_escrow ?? 0),
  };
};

export const get_supplier_active_pools_list = async (supplier_role_id: string) => {
  const pools = await db
    .select({
      pool_id: procurement_pools.id,
      commodity_name: supplier_commodities.name,
      target_moq: procurement_pools.target_moq,
      accumulated_qty: procurement_pools.accumulated_qty,
      pool_status: procurement_pools.pool_status,
      target_delivery_date: procurement_pools.target_delivery_date,
    })
    .from(procurement_pools)
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(
      and(
        eq(supplier_commodities.supplier_role_id, supplier_role_id),
        or(
          eq(procurement_pools.pool_status, 'OPEN'),
          eq(procurement_pools.pool_status, 'AGGREGATING')
        )
      )
    )
    .orderBy(desc(procurement_pools.created_at))
    .limit(10);

  return pools.map((p) => {
    const moq = Number(p.target_moq);
    const acc = Number(p.accumulated_qty);
    const progress = moq > 0 ? Math.min(100, Math.round((acc / moq) * 100)) : 0;
    return {
      pool_id: p.pool_id,
      commodity_name: p.commodity_name,
      target_moq: moq,
      accumulated_qty: acc,
      progress_percentage: progress,
      pool_status: p.pool_status,
      target_delivery_date: p.target_delivery_date,
    };
  });
};

export const get_supplier_top_commodities_data = async (supplier_role_id: string, limit = 5) => {
  const records = await db
    .select({
      commodity_id: supplier_commodities.id,
      name: supplier_commodities.name,
      total_sold_qty: sql<string>`COALESCE(SUM(${pool_participants.order_qty}::numeric), 0)`,
      total_revenue: sql<string>`COALESCE(SUM(${umkm_procurement_orders.grand_total}::numeric), 0)`,
    })
    .from(supplier_commodities)
    .innerJoin(
      procurement_pools,
      eq(supplier_commodities.id, procurement_pools.commodity_id)
    )
    .innerJoin(
      pool_participants,
      eq(procurement_pools.id, pool_participants.pool_id)
    )
    .innerJoin(
      umkm_procurement_orders,
      eq(pool_participants.id, umkm_procurement_orders.participant_id)
    )
    .where(
      and(
        eq(supplier_commodities.supplier_role_id, supplier_role_id),
        eq(umkm_procurement_orders.payment_status, 'SETTLED')
      )
    )
    .groupBy(supplier_commodities.id, supplier_commodities.name)
    .orderBy(desc(sql`SUM(${umkm_procurement_orders.grand_total}::numeric)`))
    .limit(limit);

  return records.map((r) => ({
    commodity_id: r.commodity_id,
    name: r.name,
    total_sold_qty: Number(r.total_sold_qty),
    total_revenue: Number(r.total_revenue),
  }));
};

export const get_umkm_procurement_stats = async (umkm_role_id: string) => {
  const spent_stats = await db
    .select({
      total_spent: sql<string>`COALESCE(SUM(${umkm_procurement_orders.grand_total}::numeric), 0)`,
    })
    .from(umkm_procurement_orders)
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .where(
      and(
        eq(pool_participants.umkm_role_id, umkm_role_id),
        eq(umkm_procurement_orders.payment_status, 'SETTLED')
      )
    );

  const active_participations = await db
    .select({
      count: sql<number>`count(${pool_participants.id})::int`,
    })
    .from(pool_participants)
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .where(
      and(
        eq(pool_participants.umkm_role_id, umkm_role_id),
        or(
          eq(procurement_pools.pool_status, 'OPEN'),
          eq(procurement_pools.pool_status, 'AGGREGATING')
        )
      )
    );

  const waste_sales = await db
    .select({
      total_waste_revenue: sql<string>`COALESCE(SUM(${waste_transactions.total_amount}::numeric), 0)`,
      total_diverted_kg: sql<string>`COALESCE(SUM(${waste_transactions.purchased_weight}::numeric), 0)`,
    })
    .from(waste_transactions)
    .innerJoin(
      waste_listings,
      eq(waste_transactions.listing_id, waste_listings.id)
    )
    .where(
      and(
        eq(waste_listings.seller_role_id, umkm_role_id),
        eq(waste_transactions.fulfillment_status, 'ACCEPTED_COMPLETED')
      )
    );

  const total_spent = Number(spent_stats[0]?.total_spent ?? 0);
  const estimated_savings = Math.round(total_spent * 0.12); // Rata-rata penghematan pooling vs eceran ~12%

  return {
    total_procurement_spent: total_spent,
    estimated_procurement_savings: estimated_savings,
    active_participations_count: active_participations[0]?.count ?? 0,
    waste_revenue_earned: Number(waste_sales[0]?.total_waste_revenue ?? 0),
    waste_diverted_kg: Number(waste_sales[0]?.total_diverted_kg ?? 0),
  };
};

export const get_umkm_inventory_with_recipes = async (umkm_role_id: string) => {
  const inventory = await db
    .select()
    .from(umkm_inventory_stocks)
    .where(eq(umkm_inventory_stocks.umkm_role_id, umkm_role_id));

  const recipes = await db
    .select({
      ingredient_name: recipe_details.ingredient_name,
      required_qty: recipe_details.required_qty_per_unit,
      expected_batch_units: umkm_products.expected_batch_units,
    })
    .from(recipe_details)
    .innerJoin(umkm_products, eq(recipe_details.umkm_product_id, umkm_products.id))
    .where(eq(umkm_products.umkm_role_id, umkm_role_id));

  return {
    inventory,
    recipes,
  };
};

export const get_umkm_recent_orders_list = async (umkm_role_id: string, limit = 5) => {
  return await db
    .select({
      order_id: umkm_procurement_orders.id,
      commodity_name: supplier_commodities.name,
      order_qty: pool_participants.order_qty,
      grand_total: umkm_procurement_orders.grand_total,
      payment_status: umkm_procurement_orders.payment_status,
      delivery_method: pool_participants.delivery_method,
      pickup_code: pool_participants.pickup_code,
      required_delivery_date: pool_participants.required_delivery_date,
    })
    .from(umkm_procurement_orders)
    .innerJoin(
      pool_participants,
      eq(umkm_procurement_orders.participant_id, pool_participants.id)
    )
    .innerJoin(
      procurement_pools,
      eq(pool_participants.pool_id, procurement_pools.id)
    )
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(eq(pool_participants.umkm_role_id, umkm_role_id))
    .orderBy(desc(umkm_procurement_orders.created_at))
    .limit(limit);
};

export const get_umkm_recent_waste_listings_list = async (umkm_role_id: string, limit = 5) => {
  return await db
    .select({
      listing_id: waste_listings.id,
      listing_title: waste_listings.listing_title,
      waste_category: waste_listings.waste_category,
      available_weight: waste_listings.available_weight,
      listing_status: waste_listings.listing_status,
    })
    .from(waste_listings)
    .where(eq(waste_listings.seller_role_id, umkm_role_id))
    .orderBy(desc(waste_listings.created_at))
    .limit(limit);
};
