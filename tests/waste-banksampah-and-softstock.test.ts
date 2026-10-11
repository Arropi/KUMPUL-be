import { describe, it, expect, beforeAll } from 'bun:test';
import jwt from 'jsonwebtoken';
import '../index.ts';
import { db } from '../config/db.ts';
import {
  business_entities,
  business_roles,
  supplier_commodities,
  procurement_pools,
  waste_listings,
} from '../config/schema.ts';

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Bank Sampah Waste Settlement & Soft Stock Real-Time Reservation Tests', () => {
  let supplier_role_id = '';
  let supplier_token = '';
  let umkm_role_id = '';
  let umkm_token = '';
  let commodity_id = '';
  let pool_id = '';
  let waste_listing_id = '';

  const test_suffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Setup Supplier
    const [supplier_entity] = await db
      .insert(business_entities)
      .values({
        legal_name: `Supplier Padi Berkah ${test_suffix}`,
        npwp_nib: `8881234567${test_suffix}`,
        default_address: 'Jl. Magelang KM 5, Sleman, DIY',
        latitude: '-7.7300',
        longitude: '110.3700',
      })
      .returning();

    const [supplier_role] = await db
      .insert(business_roles)
      .values({
        entity_id: supplier_entity!.id,
        role_type: 'SUPPLIER',
        sector_type: 'PERTANIAN',
        storage_capacity: 10000,
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
        legal_name: `Warung Sirkular Enak ${test_suffix}`,
        npwp_nib: `7771234567${test_suffix}`,
        default_address: 'Jl. Kaliurang KM 8, Sleman, DIY',
        latitude: '-7.7200',
        longitude: '110.4000',
      })
      .returning();

    const [umkm_role] = await db
      .insert(business_roles)
      .values({
        entity_id: umkm_entity!.id,
        role_type: 'UMKM',
        sector_type: 'FNB_PENGOLAHAN',
        storage_capacity: 800,
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

    // 3. Setup Komoditas Supplier: Stok = 500, Reserved = 0 -> Sisa Stok Awal = 500
    const [comm] = await db
      .insert(supplier_commodities)
      .values({
        supplier_role_id,
        name: `Tepung Beras Super ${test_suffix}`,
        sku: `TPB-${test_suffix}`,
        wholesale_unit: 'KG',
        base_price: '12000.00',
        stock: '500.00',
        reserved_stock: '0.00',
        base_moq: '100.00',
        lead_time_days: 1,
        is_marketplace_active: true,
      })
      .returning();

    commodity_id = comm!.id;

    // 4. Setup Pool untuk Komoditas
    const future_date = new Date();
    future_date.setDate(future_date.getDate() + 5);

    const [pool] = await db
      .insert(procurement_pools)
      .values({
        commodity_id,
        target_moq: '100.00',
        accumulated_qty: '0.00',
        pool_status: 'OPEN',
        target_delivery_date: future_date.toISOString().split('T')[0],
        expires_at: future_date,
      })
      .returning();

    pool_id = pool!.id;

    // 5. Setup Listing Residu Dapur UMKM: Berat 30 kg
    const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const [listing] = await db
      .insert(waste_listings)
      .values({
        seller_role_id: umkm_role_id,
        listing_title: `Kulit Buah & Sayur Segar ${test_suffix}`,
        waste_category: 'ORGANIK_BASAH',
        available_weight: '30.00',
        price_per_kg: '2000.00',
        expired_at: new Date(expiry),
        listing_status: 'AVAILABLE',
      })
      .returning();

    waste_listing_id = listing!.id;
  }, 30000);

  it('Verifikasi sisa stok awal komoditas supplier di marketplace sebelum ada pemesanan', async () => {
    const res = await fetch(`${BASE_URL}/api/marketplace/${commodity_id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('success');
    expect(body.data.stock).toBe(500);
    expect(body.data.available_stock).toBe(500);
  }, 20000);

  it('Pemesanan / join pool UMKM langsung mencadangkan kuota soft stock di marketplace', async () => {
    // UMKM memesan 40 kg di pool
    const join_res = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${umkm_token}`,
      },
      body: JSON.stringify({
        pool_id,
        umkm_role_id,
        order_qty: 40,
        delivery_method: 'HEMAT_HUB',
        final_delivery_address: 'Jl. Kaliurang KM 8, Sleman, DIY',
        final_delivery_lat: -7.7200,
        final_delivery_lng: 110.4000,
      }),
    });


    expect(join_res.status).toBe(201);
    const join_body = (await join_res.json()) as any;

    expect(join_body.status).toBe('success');

    // Verifikasi seketika di marketplace: available_stock harus berkurang menjadi 460 (500 - 40)
    const market_res = await fetch(`${BASE_URL}/api/marketplace/${commodity_id}`);
    expect(market_res.status).toBe(200);
    const market_body = (await market_res.json()) as any;
    expect(market_body.data.stock).toBe(500);
    expect(market_body.data.available_stock).toBe(460);
  }, 20000);

  it('POST /api/waste-listings/:id/bank-sampah mencatat penyetoran limbah dan memotong stok limbah', async () => {
    // Setor 30 kg limbah ke Bank Sampah dengan pendapatan Rp 60.000
    const deposit_res = await fetch(`${BASE_URL}/api/waste-listings/${waste_listing_id}/bank-sampah`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${umkm_token}`,
      },
      body: JSON.stringify({
        bank_sampah_name: 'Bank Sampah Berkah Sleman',
        revenue_amount: 60000,
        weight_kg: 30,
        notes: 'Disetor langsung dalam karung terpilah',
      }),
    });

    expect(deposit_res.status).toBe(200);
    const deposit_body = (await deposit_res.json()) as any;
    expect(deposit_body.status).toBe('success');
    expect(deposit_body.data.deposited_weight).toBe(30);
    expect(deposit_body.data.remaining_weight).toBe(0);
    expect(deposit_body.data.revenue_earned).toBe(60000);
    expect(deposit_body.data.listing.listing_status).toBe('SOLD_OUT');

    // Pastikan listing berstatus SOLD_OUT dan stoknya habis
    const check_res = await fetch(`${BASE_URL}/api/waste-listings/${waste_listing_id}`);
    const check_body = (await check_res.json()) as any;
    expect(Number(check_body.data.available_weight)).toBe(0);
    expect(check_body.data.listing_status).toBe('SOLD_OUT');
  }, 20000);

  it('GET /api/dashboards/umkm langsung memperbarui metrik keuntungan kas limbah dan bobot residu', async () => {
    const dash_res = await fetch(`${BASE_URL}/api/dashboards/umkm`, {
      headers: { Authorization: `Bearer ${umkm_token}` },
    });

    expect(dash_res.status).toBe(200);
    const dash_body = (await dash_res.json()) as any;
    expect(dash_body.status).toBe('success');

    // Memverifikasi bahwa penjualan ke bank sampah langsung tercatat di dashboard
    expect(dash_body.data.waste_revenue_earned).toBeGreaterThanOrEqual(60000);
    expect(dash_body.data.waste_diverted_kg).toBeGreaterThanOrEqual(30);
  }, 20000);
});
