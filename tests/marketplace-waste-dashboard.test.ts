import { describe, it, expect, beforeAll } from 'bun:test';
import jwt from 'jsonwebtoken';
import '../server';
import { db } from '../config/db';
import {
  business_entities,
  business_roles,
  supplier_commodities,
  commodity_price_tiers,
  commodity_batch_tags,
  procurement_pools,
  pool_participants,
  umkm_procurement_orders,
  umkm_inventory_stocks,
  waste_listings,
  waste_transactions,
} from '../config/schema';

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Marketplace, Waste Exchange, Order Management & Dashboard Integration Tests', () => {
  let supplier_role_id = '';
  let supplier_token = '';
  let umkm_role_id = '';
  let umkm_token = '';
  let commodity_id = '';
  let pool_id = '';
  let order_id = '';
  let waste_listing_id = '';

  const test_suffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Setup Supplier
    const [supplier_entity] = await db
      .insert(business_entities)
      .values({
        legal_name: `PT Agro Maju Bersama ${test_suffix}`,
        npwp_nib: `9876543210${test_suffix}`,
        default_address: 'Jl. Kaliurang KM 10, Sleman, DIY',
        latitude: '-7.7120',
        longitude: '110.4050',
      })
      .returning();

    const [supplier_role] = await db
      .insert(business_roles)
      .values({
        entity_id: supplier_entity!.id,
        role_type: 'SUPPLIER',
        sector_type: 'PERTANIAN',
        storage_capacity: 5000,
      })
      .returning();

    supplier_role_id = supplier_role!.id;
    supplier_token = jwt.sign(
      {
        entity_id: supplier_entity!.id,
        role_id: supplier_role!.id,
        role: 'SUPPLIER',
        role_type: 'SUPPLIER',
      },
      JWT_SECRET
    );

    // 2. Setup UMKM
    const [umkm_entity] = await db
      .insert(business_entities)
      .values({
        legal_name: `Dapur Lestari Katering ${test_suffix}`,
        npwp_nib: `1234567890${test_suffix}`,
        default_address: 'Jl. Gejayan No. 25, Sleman, DIY',
        latitude: '-7.7600',
        longitude: '110.3900',
      })
      .returning();

    const [umkm_role] = await db
      .insert(business_roles)
      .values({
        entity_id: umkm_entity!.id,
        role_type: 'UMKM',
        sector_type: 'FNB_PENGOLAHAN',
        storage_capacity: 500,
      })
      .returning();

    umkm_role_id = umkm_role!.id;
    umkm_token = jwt.sign(
      {
        entity_id: umkm_entity!.id,
        role_id: umkm_role!.id,
        role: 'UMKM',
        role_type: 'UMKM',
      },
      JWT_SECRET
    );

    // 3. Create Commodity with Tiers & Batch Tag
    const [comm] = await db
      .insert(supplier_commodities)
      .values({
        supplier_role_id,
        name: `Beras Pandan Wangi Super ${test_suffix}`,
        sku: `BRS-${test_suffix}`,
        wholesale_unit: 'KARUNG',
        base_price: '14000.00',
        stock: '1000.00',
        reserved_stock: '100.00',
        base_moq: '200.00',
        lead_time_days: 2,
        is_marketplace_active: true,
        allows_under_moq: true,
        under_moq_price_per_kg: '16000.00',
      })
      .returning();

    commodity_id = comm!.id;

    await db.insert(commodity_price_tiers).values([
      {
        commodity_id,
        min_qty: '200',
        max_qty: '499',
        tier_price: '13500.00',
      },
      {
        commodity_id,
        min_qty: '500',
        max_qty: '1000',
        tier_price: '12800.00',
      },
    ]);

    await db.insert(commodity_batch_tags).values({
      commodity_id,
      storage_temperature_type: 'AMBIENT',
      is_verified: true,
    });

    // 4. Create Active Pool
    const future_date = new Date();
    future_date.setDate(future_date.getDate() + 7);
    const target_delivery = future_date.toISOString().split('T')[0];

    const [pool] = await db
      .insert(procurement_pools)
      .values({
        commodity_id,
        target_moq: '200.00',
        accumulated_qty: '50.00',
        pool_status: 'OPEN',
        target_delivery_date: target_delivery,
        expires_at: future_date,
      })
      .returning();

    pool_id = pool!.id;

    // 5. Add Participant & Order
    const [participant] = await db
      .insert(pool_participants)
      .values({
        pool_id,
        umkm_role_id,
        order_qty: '50.00',
        delivery_method: 'HEMAT_HUB',
        required_delivery_date: target_delivery,
        final_delivery_address: 'Jl. Gejayan No. 25, Sleman',
        final_delivery_lat: '-7.7600',
        final_delivery_lng: '110.3900',
        pickup_code: 'PCK-1234',
      })
      .returning();

    const [order] = await db
      .insert(umkm_procurement_orders)
      .values({
        participant_id: participant!.id,
        raw_material_subtotal: '700000.00',
        shipping_fee: '15000.00',
        grand_total: '715000.00',
        payment_status: 'PENDING',
        payment_deadline: new Date(Date.now() + 12 * 60 * 60 * 1000),
      })
      .returning();

    order_id = order!.id;

    // 6. Setup UMKM Inventory Stock for Recommender
    await db.insert(umkm_inventory_stocks).values({
      umkm_role_id,
      ingredient_name: 'Beras Pandan Wangi',
      current_stock: '10.00',
      unit: 'KG',
    });
  }, 30000);

  // ==========================================
  // MODUL 1: Unified Marketplace & Recommender
  // ==========================================
  it('GET /api/marketplace should return commodity list with price tiers and active pools', async () => {
    const res = await fetch(`${BASE_URL}/api/marketplace?search=Pandan+Wangi`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);

    const match = body.data.find((c: any) => c.id === commodity_id);
    expect(match).toBeDefined();
    expect(match.name).toContain('Pandan Wangi');
    expect(match.available_stock).toBe(900); // 1000 - 100
    expect(match.price_tiers.length).toBeGreaterThan(0);
    expect(match.active_pools.length).toBeGreaterThan(0);
  });

  it('GET /api/marketplace/:id should return single commodity details', async () => {
    const res = await fetch(`${BASE_URL}/api/marketplace/${commodity_id}`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.id).toBe(commodity_id);
    expect(body.data.supplier.legal_name).toContain('PT Agro Maju');
  });

  it('GET /api/marketplace/recommendations (as UMKM) should return low stock alerts and pools', async () => {
    const res = await fetch(`${BASE_URL}/api/marketplace/recommendations`, {
      headers: { Authorization: `Bearer ${umkm_token}` },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.low_stock_recommendations).toBeDefined();
    expect(body.data.circular_waste_matches).toBeDefined();
    expect(body.data.cost_saving_active_pools).toBeDefined();
  });

  it('GET /api/marketplace/recommendations (as Supplier) should return market price benchmarks', async () => {
    const res = await fetch(`${BASE_URL}/api/marketplace/recommendations`, {
      headers: { Authorization: `Bearer ${supplier_token}` },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.price_benchmarks).toBeDefined();
    expect(body.data.high_demand_ingredients).toBeDefined();
  });

  // ==========================================
  // MODUL 2: Bursa Limbah Produktif
  // ==========================================
  it('POST /api/waste-listings should create a new productive waste listing', async () => {
    const expiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const payload = {
      listing_title: `Minyak Jelantah Kualitas Resto ${test_suffix}`,
      waste_category: 'ORGANIK_BASAH',
      available_weight: 40,
      price_per_kg: 5000,
      expired_at: expiry,
      notes: 'Minyak jelantah jernih dari sisa penggorengan pertama',
    };

    const res = await fetch(`${BASE_URL}/api/waste-listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${umkm_token}`,
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.id).toBeDefined();
    waste_listing_id = body.data.id;
  });

  it('GET /api/waste-listings/recommendations/offtakers should return 5 nearest bank sampah using Haversine', async () => {
    const res = await fetch(
      `${BASE_URL}/api/waste-listings/recommendations/offtakers?latitude=-7.7600&longitude=110.3900&limit=5`,
      {
        headers: { Authorization: `Bearer ${umkm_token}` },
      }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.data[0].distance_km).toBeDefined();
    // Verifikasi urutan terdekat
    if (body.data.length >= 2) {
      expect(body.data[0].distance_km).toBeLessThanOrEqual(body.data[1].distance_km);
    }
  });

  it('POST /api/waste-listings/:id/buy should purchase waste and deduct available weight', async () => {
    const buy_res = await fetch(`${BASE_URL}/api/waste-listings/${waste_listing_id}/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supplier_token}`, // Supplier beli limbah dari UMKM
      },
      body: JSON.stringify({
        purchased_weight: 15,
        pickup_date: '2026-10-10',
      }),
    });

    expect(buy_res.status).toBe(201);
    const buy_body = (await buy_res.json()) as any;
    expect(buy_body.status).toBe('success');
    expect(buy_body.data.pickup_code).toBeDefined();
    expect(buy_body.data.pickup_code).toContain('WST-');
    expect(Number(buy_body.data.total_amount)).toBe(75000); // 15 kg * 5000

    // Verifikasi sisa stok limbah berkurang
    const list_res = await fetch(`${BASE_URL}/api/waste-listings/${waste_listing_id}`);
    const list_body = (await list_res.json()) as any;
    expect(Number(list_body.data.available_weight)).toBe(25); // 40 - 15
  });

  // ==========================================
  // MODUL 3: Payment & Webhook Prefix Routing
  // ==========================================
  it('POST /api/payments/snap-token should create snap token with 12h payment deadline', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/snap-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id,
        delivery_method: 'HEMAT_HUB',
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.snap_token).toBeDefined();
    expect(body.data.midtrans_order_id).toContain('KMPL-ORD-');
  });

  it('POST /api/payments/evaluate-expired should run expired orders evaluator', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/evaluate-expired`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.evaluated_count).toBeDefined();
  });

  // ==========================================
  // MODUL 4: Grouped Orders & Lead Time
  // ==========================================
  it('GET /api/orders/supplier/grouped should return grouped orders for supplier', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/supplier/grouped`, {
      headers: { Authorization: `Bearer ${supplier_token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].pool_id).toBeDefined();
    expect(body.data[0].participants).toBeDefined();
  });

  it('GET /api/orders/umkm/all should return all procurement orders of the UMKM', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/umkm/all`, {
      headers: { Authorization: `Bearer ${umkm_token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  // ==========================================
  // MODUL 5: Executive Dashboard
  // ==========================================
  it('GET /api/dashboards/supplier should return supplier executive analytics', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboards/supplier`, {
      headers: { Authorization: `Bearer ${supplier_token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.total_commodities).toBeGreaterThanOrEqual(1);
    expect(body.data.active_pools_count).toBeGreaterThanOrEqual(1);
    expect(body.data.active_pools).toBeDefined();
    expect(body.data.competitiveness_benchmarks).toBeDefined();
  });

  it('GET /api/dashboards/umkm should return UMKM operational metrics and kitchen runout predictor', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboards/umkm`, {
      headers: { Authorization: `Bearer ${umkm_token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.kitchen_runout_alerts).toBeDefined();
    expect(body.data.active_participations_count).toBeGreaterThanOrEqual(1);
    expect(body.data.recent_orders).toBeDefined();
  });
});
