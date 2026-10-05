import { and, desc, eq, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import {
  business_entities,
  business_roles,
  commodity_batch_tags,
  commodity_price_tiers,
  procurement_pools,
  recipe_details,
  supplier_commodities,
  umkm_inventory_stocks,
  umkm_products,
  waste_listings,
} from '../../config/schema';
import type { MarketplaceFilterDTO } from '../../types/marketplace-types';

export const find_marketplace_commodities = async (filter: MarketplaceFilterDTO) => {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(supplier_commodities.is_marketplace_active, true)];

  if (filter.search) {
    conditions.push(
      or(
        ilike(supplier_commodities.name, `%${filter.search}%`),
        ilike(supplier_commodities.description, `%${filter.search}%`)
      )!
    );
  }

  if (filter.max_price !== undefined && filter.max_price !== null) {
    conditions.push(lte(supplier_commodities.base_price, String(filter.max_price)));
  }

  if (filter.ready_stock) {
    conditions.push(
      sql`(${supplier_commodities.stock} - ${supplier_commodities.reserved_stock}) > 0`
    );
  }

  if (filter.storage_temp) {
    conditions.push(
      eq(commodity_batch_tags.storage_temperature_type, filter.storage_temp)
    );
  }

  const where_clause = and(...conditions);

  const base_query = db
    .select({
      id: supplier_commodities.id,
      name: supplier_commodities.name,
      sku: supplier_commodities.sku,
      wholesale_unit: supplier_commodities.wholesale_unit,
      base_price: supplier_commodities.base_price,
      stock: supplier_commodities.stock,
      reserved_stock: supplier_commodities.reserved_stock,
      base_moq: supplier_commodities.base_moq,
      lead_time_days: supplier_commodities.lead_time_days,
      image_url: supplier_commodities.image_url,
      description: supplier_commodities.description,
      production_date: supplier_commodities.production_date,
      closed_date: supplier_commodities.closed_date,
      allows_under_moq: supplier_commodities.allows_under_moq,
      under_moq_price_per_kg: supplier_commodities.under_moq_price_per_kg,
      created_at: supplier_commodities.created_at,
      supplier_role_id: business_roles.id,
      supplier_legal_name: business_entities.legal_name,
      supplier_address: business_entities.default_address,
      supplier_latitude: business_entities.latitude,
      supplier_longitude: business_entities.longitude,
      supplier_sector_type: business_roles.sector_type,
      batch_tag_id: commodity_batch_tags.id,
      storage_temperature_type: commodity_batch_tags.storage_temperature_type,
      is_batch_verified: commodity_batch_tags.is_verified,
      supporting_file_url: commodity_batch_tags.supporting_file_url,
    })
    .from(supplier_commodities)
    .innerJoin(business_roles, eq(supplier_commodities.supplier_role_id, business_roles.id))
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .leftJoin(
      commodity_batch_tags,
      eq(supplier_commodities.id, commodity_batch_tags.commodity_id)
    )
    .where(where_clause)
    .orderBy(desc(supplier_commodities.created_at))
    .limit(limit)
    .offset(offset);

  const commodity_records = await base_query;

  if (commodity_records.length === 0) {
    return [];
  }

  const commodity_ids = commodity_records.map((c) => c.id);

  const price_tiers = await db
    .select()
    .from(commodity_price_tiers)
    .where(inArray(commodity_price_tiers.commodity_id, commodity_ids));

  const active_pools = await db
    .select()
    .from(procurement_pools)
    .where(
      and(
        inArray(procurement_pools.commodity_id, commodity_ids),
        or(
          eq(procurement_pools.pool_status, 'OPEN'),
          eq(procurement_pools.pool_status, 'AGGREGATING')
        )
      )
    );

  return commodity_records.map((c) => {
    const tiers = price_tiers
      .filter((t) => t.commodity_id === c.id)
      .map((t) => ({
        id: t.id,
        min_qty: Number(t.min_qty),
        max_qty: Number(t.max_qty),
        tier_price: Number(t.tier_price),
      }));

    const pools = active_pools
      .filter((p) => p.commodity_id === c.id)
      .map((p) => {
        const moq = Number(p.target_moq);
        const accumulated = Number(p.accumulated_qty);
        const progress = moq > 0 ? Math.min(100, Math.round((accumulated / moq) * 100)) : 0;
        return {
          id: p.id,
          target_moq: moq,
          accumulated_qty: accumulated,
          pool_status: p.pool_status,
          progress_percentage: progress,
          locked_tier_price: p.locked_tier_price ? Number(p.locked_tier_price) : null,
          target_delivery_date: p.target_delivery_date,
          cutoff_date: p.cutoff_date,
        };
      });

    const stock_num = Number(c.stock);
    const reserved_num = Number(c.reserved_stock);
    const available_stock = Math.max(0, stock_num - reserved_num);

    return {
      id: c.id,
      name: c.name,
      sku: c.sku,
      wholesale_unit: c.wholesale_unit,
      base_price: Number(c.base_price),
      stock: stock_num,
      available_stock,
      base_moq: Number(c.base_moq),
      lead_time_days: c.lead_time_days,
      image_url: c.image_url,
      description: c.description,
      production_date: c.production_date,
      closed_date: c.closed_date,
      allows_under_moq: c.allows_under_moq,
      under_moq_price_per_kg: c.under_moq_price_per_kg
        ? Number(c.under_moq_price_per_kg)
        : null,
      supplier: {
        role_id: c.supplier_role_id,
        legal_name: c.supplier_legal_name,
        default_address: c.supplier_address,
        latitude: Number(c.supplier_latitude),
        longitude: Number(c.supplier_longitude),
        sector_type: c.supplier_sector_type,
      },
      price_tiers: tiers,
      batch_tag: c.batch_tag_id
        ? {
            id: c.batch_tag_id,
            storage_temperature_type: c.storage_temperature_type!,
            is_verified: c.is_batch_verified!,
            supporting_file_url: c.supporting_file_url,
          }
        : null,
      active_pools: pools,
    };
  });
};

export const find_marketplace_commodity_by_id = async (commodity_id: string) => {
  const records = await db
    .select({
      id: supplier_commodities.id,
      name: supplier_commodities.name,
      sku: supplier_commodities.sku,
      wholesale_unit: supplier_commodities.wholesale_unit,
      base_price: supplier_commodities.base_price,
      stock: supplier_commodities.stock,
      reserved_stock: supplier_commodities.reserved_stock,
      base_moq: supplier_commodities.base_moq,
      lead_time_days: supplier_commodities.lead_time_days,
      image_url: supplier_commodities.image_url,
      description: supplier_commodities.description,
      production_date: supplier_commodities.production_date,
      closed_date: supplier_commodities.closed_date,
      allows_under_moq: supplier_commodities.allows_under_moq,
      under_moq_price_per_kg: supplier_commodities.under_moq_price_per_kg,
      created_at: supplier_commodities.created_at,
      supplier_role_id: business_roles.id,
      supplier_legal_name: business_entities.legal_name,
      supplier_address: business_entities.default_address,
      supplier_latitude: business_entities.latitude,
      supplier_longitude: business_entities.longitude,
      supplier_sector_type: business_roles.sector_type,
      batch_tag_id: commodity_batch_tags.id,
      storage_temperature_type: commodity_batch_tags.storage_temperature_type,
      is_batch_verified: commodity_batch_tags.is_verified,
      supporting_file_url: commodity_batch_tags.supporting_file_url,
    })
    .from(supplier_commodities)
    .innerJoin(business_roles, eq(supplier_commodities.supplier_role_id, business_roles.id))
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .leftJoin(
      commodity_batch_tags,
      eq(supplier_commodities.id, commodity_batch_tags.commodity_id)
    )
    .where(eq(supplier_commodities.id, commodity_id))
    .limit(1);

  const c = records[0];
  if (!c) {
    return null;
  }

  const tiers_data = await db
    .select()
    .from(commodity_price_tiers)
    .where(eq(commodity_price_tiers.commodity_id, c.id));

  const pools_data = await db
    .select()
    .from(procurement_pools)
    .where(
      and(
        eq(procurement_pools.commodity_id, c.id),
        or(
          eq(procurement_pools.pool_status, 'OPEN'),
          eq(procurement_pools.pool_status, 'AGGREGATING')
        )
      )
    );

  const stock_num = Number(c.stock);
  const reserved_num = Number(c.reserved_stock);
  const available_stock = Math.max(0, stock_num - reserved_num);

  return {
    id: c.id,
    name: c.name,
    sku: c.sku,
    wholesale_unit: c.wholesale_unit,
    base_price: Number(c.base_price),
    stock: stock_num,
    available_stock,
    base_moq: Number(c.base_moq),
    lead_time_days: c.lead_time_days,
    image_url: c.image_url,
    description: c.description,
    production_date: c.production_date,
    closed_date: c.closed_date,
    allows_under_moq: c.allows_under_moq,
    under_moq_price_per_kg: c.under_moq_price_per_kg
      ? Number(c.under_moq_price_per_kg)
      : null,
    supplier: {
      role_id: c.supplier_role_id,
      legal_name: c.supplier_legal_name,
      default_address: c.supplier_address,
      latitude: Number(c.supplier_latitude),
      longitude: Number(c.supplier_longitude),
      sector_type: c.supplier_sector_type,
    },
    price_tiers: tiers_data.map((t) => ({
      id: t.id,
      min_qty: Number(t.min_qty),
      max_qty: Number(t.max_qty),
      tier_price: Number(t.tier_price),
    })),
    batch_tag: c.batch_tag_id
      ? {
          id: c.batch_tag_id,
          storage_temperature_type: c.storage_temperature_type!,
          is_verified: c.is_batch_verified!,
          supporting_file_url: c.supporting_file_url,
        }
      : null,
    active_pools: pools_data.map((p) => {
      const moq = Number(p.target_moq);
      const accumulated = Number(p.accumulated_qty);
      const progress = moq > 0 ? Math.min(100, Math.round((accumulated / moq) * 100)) : 0;
      return {
        id: p.id,
        target_moq: moq,
        accumulated_qty: accumulated,
        pool_status: p.pool_status,
        progress_percentage: progress,
        locked_tier_price: p.locked_tier_price ? Number(p.locked_tier_price) : null,
        target_delivery_date: p.target_delivery_date,
        cutoff_date: p.cutoff_date,
      };
    }),
  };
};

export const find_umkm_low_stock_records = async (umkm_role_id: string) => {
  const stock_records = await db
    .select()
    .from(umkm_inventory_stocks)
    .where(
      and(
        eq(umkm_inventory_stocks.umkm_role_id, umkm_role_id),
        lte(umkm_inventory_stocks.current_stock, '20.00')
      )
    );

  if (stock_records.length > 0) {
    return stock_records;
  }

  // Fallback: jika inventory stocks kosong, ambil bahan dari recipe_details UMKM
  const recipe_ingredients = await db
    .select({
      ingredient_name: recipe_details.ingredient_name,
      unit: recipe_details.unit,
    })
    .from(recipe_details)
    .innerJoin(umkm_products, eq(recipe_details.umkm_product_id, umkm_products.id))
    .where(eq(umkm_products.umkm_role_id, umkm_role_id))
    .limit(10);

  return recipe_ingredients.map((r) => ({
    ingredient_name: r.ingredient_name,
    current_stock: '0.00',
    unit: r.unit,
  }));
};

export const find_matching_commodities_by_names = async (ingredient_names: string[]) => {
  if (ingredient_names.length === 0) return [];

  const name_clauses = ingredient_names.map((name) =>
    ilike(supplier_commodities.name, `%${name}%`)
  );

  return await db
    .select({
      id: supplier_commodities.id,
      name: supplier_commodities.name,
      base_price: supplier_commodities.base_price,
      stock: supplier_commodities.stock,
      supplier_name: business_entities.legal_name,
    })
    .from(supplier_commodities)
    .innerJoin(business_roles, eq(supplier_commodities.supplier_role_id, business_roles.id))
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .where(
      and(
        eq(supplier_commodities.is_marketplace_active, true),
        or(...name_clauses)!
      )
    )
    .limit(15);
};

export const find_available_waste_listings_for_recommendation = async (limit = 10) => {
  return await db
    .select({
      id: waste_listings.id,
      listing_title: waste_listings.listing_title,
      waste_category: waste_listings.waste_category,
      available_weight: waste_listings.available_weight,
      price_per_kg: waste_listings.price_per_kg,
      seller_name: business_entities.legal_name,
    })
    .from(waste_listings)
    .innerJoin(business_roles, eq(waste_listings.seller_role_id, business_roles.id))
    .innerJoin(business_entities, eq(business_roles.entity_id, business_entities.id))
    .where(
      and(
        eq(waste_listings.listing_status, 'AVAILABLE'),
        eq(waste_listings.is_marketplace_visible, true)
      )
    )
    .limit(limit);
};

export const find_active_pools_with_details = async () => {
  return await db
    .select({
      pool_id: procurement_pools.id,
      commodity_id: procurement_pools.commodity_id,
      commodity_name: supplier_commodities.name,
      target_moq: procurement_pools.target_moq,
      accumulated_qty: procurement_pools.accumulated_qty,
      target_delivery_date: procurement_pools.target_delivery_date,
      base_price: supplier_commodities.base_price,
      locked_tier_price: procurement_pools.locked_tier_price,
    })
    .from(procurement_pools)
    .innerJoin(
      supplier_commodities,
      eq(procurement_pools.commodity_id, supplier_commodities.id)
    )
    .where(
      or(
        eq(procurement_pools.pool_status, 'OPEN'),
        eq(procurement_pools.pool_status, 'AGGREGATING')
      )
    )
    .limit(10);
};

export const find_market_price_benchmarks = async (supplier_role_id: string) => {
  // Ambil komoditas milik supplier ini
  const my_commodities = await db
    .select({
      id: supplier_commodities.id,
      name: supplier_commodities.name,
      base_price: supplier_commodities.base_price,
    })
    .from(supplier_commodities)
    .where(eq(supplier_commodities.supplier_role_id, supplier_role_id));

  // Ambil rata-rata harga pasar per nama komoditas di platform
  const market_averages = await db
    .select({
      name: supplier_commodities.name,
      avg_price: sql<string>`AVG(${supplier_commodities.base_price}::numeric)`,
    })
    .from(supplier_commodities)
    .where(eq(supplier_commodities.is_marketplace_active, true))
    .groupBy(supplier_commodities.name);

  const avg_map = new Map<string, number>();
  market_averages.forEach((m) => {
    avg_map.set(m.name.toLowerCase().trim(), Number(m.avg_price));
  });

  return my_commodities.map((item) => {
    const your_price = Number(item.base_price);
    const avg = avg_map.get(item.name.toLowerCase().trim()) ?? your_price;

    let competitiveness: 'COMPETITIVE' | 'AVERAGE' | 'EXPENSIVE' = 'AVERAGE';
    if (your_price < avg * 0.95) {
      competitiveness = 'COMPETITIVE';
    } else if (your_price > avg * 1.05) {
      competitiveness = 'EXPENSIVE';
    }

    return {
      commodity_id: item.id,
      commodity_name: item.name,
      your_base_price: your_price,
      market_average_price: Math.round(avg),
      price_competitiveness: competitiveness,
    };
  });
};

export const find_popular_recipe_ingredients = async (limit = 10) => {
  const result = await db
    .select({
      ingredient_name: recipe_details.ingredient_name,
      occurrences: sql<number>`count(${recipe_details.id})::int`,
    })
    .from(recipe_details)
    .groupBy(recipe_details.ingredient_name)
    .orderBy(desc(sql`count(${recipe_details.id})`))
    .limit(limit);

  return result.map((r) => ({
    ingredient_name: r.ingredient_name,
    recipe_occurrences: r.occurrences,
  }));
};
