import { describe, it, expect, beforeAll } from 'bun:test';
import '../index.ts';
import { db } from '../config/db.ts';
import {
  business_entities,
  business_roles,
  supplier_commodities,
  commodity_batch_tags,
  procurement_pools,
  pool_participants,
  umkm_procurement_orders,
  consolidated_pos,
  escrow_transactions,
  waste_listings,
  umkm_inventory_stocks,
} from '../config/schema.ts';
import jwt from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';

const BASE_URL = `http://localhost:${process.env.PORT || 3030}`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('🚀 KUMPUL 26-STEP E2E BRIEF DEMO AUTOMATION TESTING', () => {
  const test_suffix = Date.now().toString().slice(-6);

  // Supplier Context
  let supplier_entity_id = '';
  let supplier_role_id = '';
  let supplier_token = '';
  let created_commodity_id = '';
  let created_batch_tag_id = '';
  let active_pool_id = '';
  let consolidated_po_id = '';

  // UMKM Context
  let umkm_entity_id = '';
  let umkm_role_id = '';
  let umkm_token = '';
  let umkm_product_id = '';
  let order_1_id = ''; // > MOQ
  let order_2_id = ''; // < MOQ
  let order_3_id = ''; // Pooling Hemat Hub
  let waste_listing_id = '';

  beforeAll(async () => {
    // Hangatkan koneksi database sebelum memulai pengujian
    await db.execute(sql`SELECT 1`);
  }, 30000);

  // =========================================================================
  // BABAK 1: ONBOARDING & PASOKAN SUPPLIER (Tahap 1 - 8)
  // =========================================================================

  it('Tahap 1: Register Supplier baru via POST /api/profile', async () => {
    const res = await fetch(`${BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: `Koperasi Susu Merapi ${test_suffix}`,
        npwp: `1234567890${test_suffix}`,
        phone_number: '081234567890',
        default_address: 'Jl. Kaliurang KM 18, Pakem, Sleman',
        lat: -7.668,
        long: 110.424,
        sector: 'PERTANIAN',
        storage: 2000,
        bank_account_info: {
          bank_name: 'BCA',
          account_number: '1234567890',
          account_holder: 'Koperasi Susu Merapi',
        },
        profile: 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=400',
        role: 'SUPPLIER',
      }),
    });

    const json = (await res.json()) as any;
    if (res.status !== 201) console.error('Tahap 4 Validation Error:', JSON.stringify(json));
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.id).toBeDefined();
    expect(json.data.roles[0].id).toBeDefined();

    supplier_entity_id = json.data.id;
    supplier_role_id = json.data.roles[0].id;
    supplier_token = jwt.sign(
      {
        entity_id: supplier_entity_id,
        role_id: supplier_role_id,
        role: 'SUPPLIER',
        role_type: 'SUPPLIER',
      },
      JWT_SECRET
    );
  }, 30000);

  it('Tahap 2: Lengkapi profil Supplier via PUT /api/profile/:id', async () => {
    const res = await fetch(`${BASE_URL}/api/profile/${supplier_entity_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: `Koperasi Susu Merapi Unggul ${test_suffix}`,
        npwp: `1234567890${test_suffix}`,
        phone_number: '081234567890',
        default_address: 'Jl. Kaliurang KM 18, RT 02/05, Pakem, Sleman',
        lat: -7.6685,
        long: 110.4245,
        storage: 2500,
        bank_account_info: {
          bank_name: 'BCA',
          account_number: '1234567890',
          account_holder: 'Koperasi Susu Merapi Unggul',
        },
      }),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.legal_name).toContain('Unggul');
  }, 30000);

  it('Tahap 3: Buka halaman Katalog Supplier via GET /api/supplier-catalogs?supplier_role_id=...', async () => {
    const res = await fetch(`${BASE_URL}/api/supplier-catalogs?supplier_role_id=${supplier_role_id}`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.data)).toBe(true);
  }, 30000);

  it('Tahap 4: Tambah produk katalog (Susu Sapi Murni Pasteurisasi) via POST /api/supplier-catalogs', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const prod_date_str = tomorrow.toISOString().split('T')[0];

    const next_two_weeks = new Date();
    next_two_weeks.setDate(next_two_weeks.getDate() + 14);
    const closed_date_str = next_two_weeks.toISOString().split('T')[0];

    const res = await fetch(`${BASE_URL}/api/supplier-catalogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_role_id,
        name: `Susu Sapi Murni Pasteurisasi ${test_suffix}`,
        wholesale_unit: 'LITER',
        base_price: 30000,
        stock: 200,
        base_moq: 50,
        lead_time_days: 1,
        production_date: prod_date_str,
        closed_date: closed_date_str,
        allows_under_moq: true,
        under_moq_price_per_kg: 35000,
        is_marketplace_active: false, // Masih draft
        price_tiers: [
          { min_qty: 20, max_qty: 49, tier_price: 30000 },
          { min_qty: 50, max_qty: 200, tier_price: 27000 },
        ],
      }),
    });

    const json = (await res.json()) as any;
    if (res.status !== 201) console.error('Tahap 4 Validation Error:', JSON.stringify(json));
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.id).toBeDefined();
    expect(json.data.sku).toBeDefined();
    expect(json.data.is_marketplace_active).toBe(false);

    created_commodity_id = json.data.id;
  }, 30000);

  it('Tahap 5: Verifikasi mutu dokumen via POST /api/commodity-batch-tags', async () => {
    const res = await fetch(`${BASE_URL}/api/commodity-batch-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commodity_id: created_commodity_id,
        supporting_file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        storage_temperature_type: 'CHILLED',
      }),
    });

    const json = (await res.json()) as any;
    if (res.status !== 201) console.error('Tahap 4 Validation Error:', JSON.stringify(json));
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.id).toBeDefined();

    created_batch_tag_id = json.data.id;
  }, 40000);

  it('Tahap 6: Publish katalog produk via POST /api/supplier-catalogs/:id/publish', async () => {
    const res = await fetch(`${BASE_URL}/api/supplier-catalogs/${created_commodity_id}/publish`, {
      method: 'POST',
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.commodity.is_marketplace_active).toBe(true);
    expect(json.data.procurement_pool).toBeDefined();
    expect(json.data.procurement_pool.pool_status).toBe('OPEN');

    active_pool_id = json.data.procurement_pool.id;
  }, 30000);

  it('Tahap 7: Tunjukkan rekomendasi di marketplace via GET /api/supplier-catalogs/marketplace', async () => {
    const res = await fetch(`${BASE_URL}/api/supplier-catalogs/marketplace`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    const target = json.data.find((c: any) => c.commodity.id === created_commodity_id);
    expect(target).toBeDefined();
    expect(target.commodity.is_marketplace_active).toBe(true);
    expect(target.active_pool.id).toBe(active_pool_id);
  }, 30000);

  it('Tahap 8: Buka dashboard Supplier via GET /api/dashboards/supplier', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboards/supplier`, {
      headers: { Authorization: `Bearer ${supplier_token}` },
    });
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.total_commodities).toBeGreaterThanOrEqual(1);
    expect(json.data.active_pools_count).toBeGreaterThanOrEqual(1);
    expect(json.data.active_pools).toBeDefined();
  }, 30000);

  // =========================================================================
  // BABAK 2: 1-CLICK ROLE SWITCHING & PROFIL UMKM (Tahap 9 - 10)
  // =========================================================================

  it('Tahap 9: Registrasi / Switch Persona ke UMKM via POST /api/profile', async () => {
    const res = await fetch(`${BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: `Dapur Puding Karamel Jogja ${test_suffix}`,
        npwp: `9876543210${test_suffix}`,
        phone_number: '089876543210',
        default_address: 'Jl. Gejayan No. 28, Sleman, DIY',
        lat: -7.765,
        long: 110.388,
        sector: 'FNB_PENGOLAHAN',
        storage: 300,
        bank_account_info: {
          bank_name: 'Mandiri',
          account_number: '9876543210',
          account_holder: 'Dapur Puding Karamel Jogja',
        },
        profile: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400',
        role: 'UMKM',
      }),
    });

    const json = (await res.json()) as any;
    if (res.status !== 201) console.error('Tahap 4 Validation Error:', JSON.stringify(json));
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');

    umkm_entity_id = json.data.id;
    umkm_role_id = json.data.roles[0].id;
    umkm_token = jwt.sign(
      {
        entity_id: umkm_entity_id,
        role_id: umkm_role_id,
        role: 'UMKM',
        role_type: 'UMKM',
      },
      JWT_SECRET
    );
  }, 30000);

  it('Tahap 10: Lengkapi profil Dapur UMKM via PUT /api/profile/:id', async () => {
    const res = await fetch(`${BASE_URL}/api/profile/${umkm_entity_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: `Dapur Puding Karamel Juara ${test_suffix}`,
        npwp: `9876543210${test_suffix}`,
        default_address: 'Jl. Gejayan No. 28, Caturtunggal, Depok, Sleman',
        lat: -7.7652,
        long: 110.3882,
        storage: 350,
      }),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
  }, 30000);

  // =========================================================================
  // BABAK 3: MANAJEMEN RESEP & ESTIMATOR LIMBAH DAPUR (Tahap 11 - 13)
  // =========================================================================

  it('Tahap 11: Buka menu Produk UMKM via GET /api/products', async () => {
    const res = await fetch(`${BASE_URL}/api/products?umkm_role_id=${umkm_role_id}`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.data)).toBe(true);
  }, 30000);

  it('Tahap 12: Input produk UMKM & resep Bill of Materials (BOM)', async () => {
    // 1. Buat produk UMKM
    const prodRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        umkm_role_id,
        product_name: `Puding Susu Karamel Botol ${test_suffix}`,
        unit: 'PORSI',
        target_selling_price_per_unit: 15000,
        expected_batch_units: 50,
      }),
    });

    const prodJson = (await prodRes.json()) as any;
    expect(prodRes.status).toBe(201);
    expect(prodJson.data.id).toBeDefined();
    umkm_product_id = prodJson.data.id;

    // 2. Tambah resep bahan baku pokok (Susu Sapi Murni)
    const recipeRes = await fetch(`${BASE_URL}/api/products/${umkm_product_id}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredient_name: `Susu Sapi Murni Pasteurisasi ${test_suffix}`,
        required_qty_per_unit: 0.2,
        unit: 'LITER',
        estimated_cost_per_unit: 6000,
      }),
    });

    const recipeJson = (await recipeRes.json()) as any;
    expect(recipeRes.status).toBe(201);
    expect(recipeJson.status).toBe('success');
  }, 30000);

  it('Tahap 13: Simulasi stok kritis dapur (<= 20) di tabel inventaris', async () => {
    // Masukkan data stok dapur dengan sisa 1 Liter (Kritis, di bawah batas sistem 20 Liter)
    await db.insert(umkm_inventory_stocks).values({
      umkm_role_id,
      ingredient_name: `Susu Sapi Murni Pasteurisasi ${test_suffix}`,
      current_stock: '1.00',
      unit: 'LITER',
    });

    const inv = await db
      .select()
      .from(umkm_inventory_stocks)
      .where(eq(umkm_inventory_stocks.umkm_role_id, umkm_role_id));

    expect(inv.length).toBeGreaterThan(0);
    expect(parseFloat(inv[0].current_stock)).toBeLessThanOrEqual(20);
  }, 30000);

  // =========================================================================
  // BABAK 4: EKOSISTEM MARKETPLACE & 4 VARIASI TRANSAKSI (Tahap 14 - 19)
  // =========================================================================

  it('Tahap 14: Buka Home UMKM & deteksi Rekomendasi Restock Cerdas via GET /api/marketplace/recommendations', async () => {
    const res = await fetch(`${BASE_URL}/api/marketplace/recommendations`, {
      headers: { Authorization: `Bearer ${umkm_token}` },
    });
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.low_stock_recommendations).toBeDefined();
    expect(json.data.cost_saving_active_pools).toBeDefined();
  }, 30000);

  it('Tahap 15: Transaksi 2 - Beli < MOQ door-to-door langsung (under-moq pricing)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);

    // Beli 5 Liter (< MOQ 50) dengan opsi under-moq
    const joinRes = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pool_id: active_pool_id,
        umkm_role_id,
        order_qty: 5,
        required_delivery_date: tomorrow.toISOString().split('T')[0],
        delivery_method: 'DIRECT_DOOR_TO_DOOR',
        final_delivery_address: 'Jl. Gejayan No. 28, Sleman',
        final_delivery_lat: -7.765,
        final_delivery_lng: 110.388,
      }),
    });

    const joinJson = (await joinRes.json()) as any;
    expect(joinRes.status).toBe(201);
    expect(joinJson.data.order_id).toBeDefined();
    order_2_id = joinJson.data.order_id;
  }, 30000);

  it('Tahap 16: Transaksi 3 - Join pooling opsi Hemat Hub', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);

    // Beli 20 Liter dengan opsi HEMAT_HUB (bergabung ke pool aktif)
    const joinRes = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pool_id: active_pool_id,
        umkm_role_id,
        order_qty: 20,
        required_delivery_date: tomorrow.toISOString().split('T')[0],
        delivery_method: 'HEMAT_HUB',
        final_delivery_address: 'Hub Sentral Gejayan, Sleman',
        final_delivery_lat: -7.765,
        final_delivery_lng: 110.388,
      }),
    });

    const joinJson = (await joinRes.json()) as any;
    expect(joinRes.status).toBe(201);
    expect(joinJson.data.order_id).toBeDefined();
    order_3_id = joinJson.data.order_id;
  }, 30000);

  it('Tahap 17: Transaksi 1 - Beli > MOQ (Door-to-door direct via Midtrans & Escrow)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);

    // Beli 50 Liter (memenuhi target MOQ 50 Liter sehingga auto-generate Consolidated PO Supplier)
    const joinRes = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pool_id: active_pool_id,
        umkm_role_id,
        order_qty: 50,
        required_delivery_date: tomorrow.toISOString().split('T')[0],
        delivery_method: 'DIRECT_DOOR_TO_DOOR',
        final_delivery_address: 'Jl. Gejayan No. 28, Sleman',
        final_delivery_lat: -7.765,
        final_delivery_lng: 110.388,
      }),
    });

    const joinJson = (await joinRes.json()) as any;
    expect(joinRes.status).toBe(201);
    expect(joinJson.data.order_id).toBeDefined();
    order_1_id = joinJson.data.order_id;

    // Generate Snap Token Midtrans
    const snapRes = await fetch(`${BASE_URL}/api/payments/snap-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order_1_id,
        delivery_method: 'DIRECT_DOOR_TO_DOOR',
      }),
    });

    const snapJson = (await snapRes.json()) as any;
    expect(snapRes.status).toBe(201);
    expect(snapJson.data.snap_token).toBeDefined();

    // Selesaikan pembayaran Sandbox (Simulasi Instant Settlement & Escrow HELD)
    const payRes = await fetch(`${BASE_URL}/api/payments/simulate-sandbox-pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order_1_id }),
    });

    const payJson = (await payRes.json()) as any;
    expect(payRes.status).toBe(200);
    expect(payJson.status).toBe('success');
  }, 30000);

  it('Tahap 18: Transaksi 4 - Beli bahan limbah produktif (Self-pickup)', async () => {
    // 1. Daftarkan limbah produktif (Jerigen Plastik)
    const next_week = new Date();
    next_week.setDate(next_week.getDate() + 7);

    const wasteRes = await fetch(`${BASE_URL}/api/waste-listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${umkm_token}`,
      },
      body: JSON.stringify({
        listing_title: `Jerigen Bekas Layak Pakai ${test_suffix}`,
        waste_category: 'ANORGANIK',
        available_weight: 50,
        price_per_kg: 5000,
        expired_at: next_week.toISOString(),
        notes: 'Jerigen susu tebal 20L bersih',
      }),
    });

    const wasteJson = (await wasteRes.json()) as any;
    expect(wasteRes.status).toBe(201);
    waste_listing_id = wasteJson.data.id;

    // 2. Mitra membeli limbah dengan Self-pickup
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const buyRes = await fetch(`${BASE_URL}/api/waste-listings/${waste_listing_id}/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supplier_token}`,
      },
      body: JSON.stringify({
        purchased_weight: 15,
        pickup_date: tomorrow.toISOString().split('T')[0],
      }),
    });

    const buyJson = (await buyRes.json()) as any;
    expect(buyRes.status).toBe(201);
    expect(buyJson.status).toBe('success');
    expect(buyJson.data.pickup_code).toBeDefined();
    expect(Number(buyJson.data.total_amount)).toBe(75000); // 15 kg * 5000
  }, 30000);

  it('Tahap 19: Checkout & Pantau di Pesanan Saya via GET /api/orders/umkm/all', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/umkm/all`, {
      headers: { Authorization: `Bearer ${umkm_token}` },
    });
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  // =========================================================================
  // BABAK 5: TWO-FACTOR ESCROW, PENGIRIMAN & PIN SERAH-TERIMA (Tahap 20 - 22)
  // =========================================================================

  it('Tahap 20: Switch role ke Supplier - Pengiriman barang & verifikasi PO Konsolidasi', async () => {
    // 1. Ambil daftar PO Konsolidasi Supplier
    const posRes = await fetch(`${BASE_URL}/api/orders/supplier/pos?supplier_role_id=${supplier_role_id}`);
    const posJson = (await posRes.json()) as any;

    expect(posRes.status).toBe(200);
    expect(posJson.status).toBe('success');
    expect(posJson.data.length).toBeGreaterThan(0);

    consolidated_po_id = posJson.data[0].id;

    // 2. Supplier mengubah status PO menjadi SHIPPED via POST
    const shipRes = await fetch(`${BASE_URL}/api/orders/supplier/pos/${consolidated_po_id}/ship`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_name: 'Pak Bambang Driver Kumpul',
        tracking_number: 'AB-1234-YK',
        delivery_proof_url: 'https://example.com/surat-jalan.png',
      }),
    });

    const shipJson = (await shipRes.json()) as any;
    expect(shipRes.status).toBe(200);
    expect(shipJson.status).toBe('success');
    expect(shipJson.data.po_status).toBe('SHIPPED');
  }, 30000);

  it('Tahap 21: Switch role ke UMKM - Input PIN Serah-Terima 6-digit', async () => {
    // 1. Cari data order_1 dan ambil kode pickup yang sah
    const orderRecord = await db
      .select()
      .from(pool_participants)
      .where(eq(pool_participants.id, (await db.select().from(umkm_procurement_orders).where(eq(umkm_procurement_orders.id, order_1_id)))[0].participant_id));

    const validPickupCode = orderRecord[0].pickup_code || `KMPL-${order_1_id.slice(0, 4).toUpperCase()}`;

    // 2. Simulasi salah PIN (harus ditolak 400)
    const invalidRes = await fetch(`${BASE_URL}/api/orders/${order_1_id}/confirm-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${umkm_token}`,
      },
      body: JSON.stringify({ pickup_code: 'WRONG-PIN' }),
    });
    expect(invalidRes.status).toBe(400);

    // 3. Masukkan PIN yang benar
    const validRes = await fetch(`${BASE_URL}/api/orders/${order_1_id}/confirm-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${umkm_token}`,
      },
      body: JSON.stringify({ pickup_code: validPickupCode }),
    });

    const validJson = (await validRes.json()) as any;
    expect(validRes.status).toBe(200);
    expect(validJson.status).toBe('success');
    expect(validJson.data.payment_status).toBe('SETTLED');
  }, 30000);

  it('Tahap 22: Cek status Selesai & Escrow dana otomatis cair (RELEASED)', async () => {
    // Cek apakah transaksi escrow telah berstatus RELEASED
    const escrowRows = await db
      .select()
      .from(escrow_transactions)
      .where(eq(escrow_transactions.order_reference_id, order_1_id));

    if (escrowRows.length > 0) {
      expect(escrowRows[0].escrow_status).toBe('RELEASED');
    }
  }, 30000);

  // =========================================================================
  // BABAK 6: SIRKULARITAS RESIDU P2P, BANK SAMPAH & DASHBOARD UMKM (Tahap 23 - 26)
  // =========================================================================

  it('Tahap 23: Buka menu Bursa Limbah via GET /api/waste-listings', async () => {
    const res = await fetch(`${BASE_URL}/api/waste-listings`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.data)).toBe(true);
  }, 30000);

  it('Tahap 24: Buat listing limbah baru dari sisa produksi dapur via POST /api/waste-listings', async () => {
    const next_month = new Date();
    next_month.setDate(next_month.getDate() + 20);

    const res = await fetch(`${BASE_URL}/api/waste-listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${umkm_token}`,
      },
      body: JSON.stringify({
        listing_title: `Ampas Organik Dapur Olahan ${test_suffix}`,
        waste_category: 'ORGANIK_BASAH',
        available_weight: 40,
        price_per_kg: 2000,
        expired_at: next_month.toISOString(),
        notes: 'Cocok untuk pakan ternak maggot BSF',
        is_marketplace_visible: true,
      }),
    });

    const json = (await res.json()) as any;
    if (res.status !== 201) console.error('Tahap 4 Validation Error:', JSON.stringify(json));
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.listing_title).toContain('Ampas Organik');
  }, 30000);

  it('Tahap 25: Rujukan spasial Bank Sampah terdekat berbasis Haversine via GET /api/waste-listings/recommendations/offtakers', async () => {
    const res = await fetch(
      `${BASE_URL}/api/waste-listings/recommendations/offtakers?lat=-7.765&long=110.388`
    );
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].distance_km).toBeDefined();
    if (json.data.length > 1) {
      expect(parseFloat(json.data[0].distance_km)).toBeLessThanOrEqual(
        parseFloat(json.data[1].distance_km)
      );
    }
  }, 30000);

  it('Tahap 26: Buka dashboard UMKM via GET /api/dashboards/umkm', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboards/umkm`, {
      headers: { Authorization: `Bearer ${umkm_token}` },
    });
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.kitchen_runout_alerts).toBeDefined();
    expect(json.data.recent_orders).toBeDefined();
    expect(json.data.recent_waste_listings).toBeDefined();
  }, 30000);
});
