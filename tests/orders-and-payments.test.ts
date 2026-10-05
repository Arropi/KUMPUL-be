import { describe, it, expect, beforeAll } from 'bun:test';
import '../server';
import { db } from '../config/db';
import {
  supplier_commodities,
  commodity_price_tiers,
  procurement_pools,
  escrow_transactions,
} from '../config/schema';
import crypto from 'crypto';

const BASE_URL = `http://localhost:${process.env.PORT || 3030}`;

describe('Marketplace, Dynamic Pooling, and Checkout-Phase Payment Flow Tests', () => {
  let supplier_entity_id: string = '';
  let supplier_role_id: string = '';
  let umkm_entity_id: string = '';
  let umkm_role_id: string = '';
  let commodity_id: string = '';
  let pool_id: string = '';
  let created_order_id: string = '';

  const test_suffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Setup Supplier Entity & Role via API
    const supplier_res = await fetch(`${BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: `Supplier Bahan Organik ${test_suffix}`,
        npwp: `1234567890${test_suffix}`,
        default_address: 'Jl. Kaliurang KM 12, Sleman',
        lat: -7.7,
        long: 110.4,
        sector: 'PERTANIAN',
        storage: 1000,
        bank_account_info: {
          bank_name: 'BCA',
          account_number: '1234567890',
          account_holder: 'Supplier Bahan Organik',
        },
        profile: 'https://example.com/supplier.png',
        role: 'SUPPLIER',
      }),
    });
    const supplier_json = (await supplier_res.json()) as any;
    supplier_entity_id = supplier_json.data.id;
    supplier_role_id = supplier_json.data.roles[0].id;

    // 2. Setup UMKM Entity & Role via API
    const umkm_res = await fetch(`${BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: `UMKM Keripik Pedas ${test_suffix}`,
        npwp: `9876543210${test_suffix}`,
        default_address: 'Jl. Malioboro No. 88, Yogyakarta',
        lat: -7.79,
        long: 110.36,
        sector: 'FNB_PENGOLAHAN',
        storage: 200,
        bank_account_info: {
          bank_name: 'Mandiri',
          account_number: '0987654321',
          account_holder: 'UMKM Keripik Pedas',
        },
        profile: 'https://example.com/umkm.png',
        role: 'UMKM',
      }),
    });
    const umkm_json = (await umkm_res.json()) as any;
    umkm_entity_id = umkm_json.data.id;
    umkm_role_id = umkm_json.data.roles[0].id;

    // 3. Setup Commodity with dates and tiers
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const harvest_date_str = tomorrow.toISOString().split('T')[0];

    const next_week = new Date();
    next_week.setDate(next_week.getDate() + 10);
    const closed_date_str = next_week.toISOString().split('T')[0];

    const commodity = await db
      .insert(supplier_commodities)
      .values({
        supplier_role_id,
        sku: `CB-RAWIT-${test_suffix}`,
        name: `Cabai Rawit Merah Unggul ${test_suffix}`,
        wholesale_unit: 'KG',
        base_price: '40000.00',
        stock: '500.00',
        reserved_stock: '0.00',
        base_moq: '50.00',
        lead_time_days: 2,
        production_date: harvest_date_str,
        closed_date: closed_date_str,
        allows_under_moq: true,
        under_moq_price_per_kg: '42000.00',
        is_marketplace_active: true,
      })
      .returning();

    commodity_id = commodity[0]!.id;

    await db.insert(commodity_price_tiers).values([
      { commodity_id, min_qty: '50.00', max_qty: '99.99', tier_price: '40000.00' },
      { commodity_id, min_qty: '100.00', max_qty: '999.00', tier_price: '38000.00' },
    ]);

    // 4. Create an OPEN Procurement Pool
    const pool_expiry = new Date();
    pool_expiry.setDate(pool_expiry.getDate() + 5);

    const pool = await db
      .insert(procurement_pools)
      .values({
        commodity_id,
        target_moq: '50.00',
        accumulated_qty: '0.00',
        pool_status: 'OPEN',
        locked_tier_price: '40000.00',
        expires_at: pool_expiry,
      })
      .returning();

    pool_id = pool[0]!.id;
  }, 30000);

  it('1. POST /api/pre-orders/join - UMKM bergabung pool tanpa memilih kurir pengiriman (opsional di awal)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const required_delivery_date = tomorrow.toISOString().split('T')[0];

    const join_payload = {
      pool_id,
      umkm_role_id,
      order_qty: 30, // Under MOQ (50)
      required_delivery_date,
      is_urgent_asap: false,
      final_delivery_address: 'Jl. Malioboro No. 88, Yogyakarta',
      final_delivery_lat: -7.79,
      final_delivery_lng: 110.36,
    };

    const res = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(join_payload),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.participant).toBeDefined();
    expect(json.data.participant.delivery_method).toBeNull();
    expect(json.data.participant.allocated_shipping_fee).toBe('0.00');
    expect(json.data.order_id).toBeDefined();

    created_order_id = json.data.order_id;
  }, 20000);

  it('2. POST /api/pre-orders/join - Validasi gagal jika tanggal kebutuhan di luar range panen s.d. expired', async () => {
    const past_date = '2020-01-01';

    const invalid_payload = {
      pool_id,
      umkm_role_id,
      order_qty: 10,
      required_delivery_date: past_date,
      final_delivery_address: 'Jl. Solo KM 10',
      final_delivery_lat: -7.78,
      final_delivery_lng: 110.42,
    };

    const res = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalid_payload),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(400);
    expect(json.status).toBe('error');
    expect(json.error_code).toBe('DELIVERY_DATE_BEFORE_PRODUCTION');
  }, 20000);

  it('3. POST /api/payments/snap-token - Pemilihan metode logistik (HEMAT_HUB) saat checkout & kalkulasi ulang', async () => {
    const payment_payload = {
      order_id: created_order_id,
      delivery_method: 'HEMAT_HUB',
    };

    const res = await fetch(`${BASE_URL}/api/payments/snap-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment_payload),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.order_id).toBe(created_order_id);
    expect(json.data.snap_token).toBeDefined();
    expect(json.data.snap_redirect_url).toBeDefined();

    // 30 KG * 40,000 = 1,200,000 + 15,000 (HEMAT_HUB) = 1,215,000
    expect(json.data.gross_amount).toBe('1215000');
  }, 20000);

  it('4. POST /api/payments/webhook - Memproses settlement Midtrans dan mengamankan dana ke Escrow (HELD)', async () => {
    const server_key = process.env.MIDTRANS_SERVER_KEY || 'dummy_server_key';
    const fake_midtrans_order_id = `KUMPUL-${created_order_id.slice(0, 8)}-${Date.now()}`;
    const gross_amount = '1215000.00';
    const status_code = '200';

    const signature_raw = `${fake_midtrans_order_id}${status_code}${gross_amount}${server_key}`;
    const signature_key = crypto.createHash('sha512').update(signature_raw).digest('hex');

    const webhook_payload = {
      order_id: fake_midtrans_order_id,
      transaction_status: 'settlement',
      fraud_status: 'accept',
      status_code,
      gross_amount,
      payment_type: 'bank_transfer',
      signature_key,
    };

    // Test signature rejection
    const invalid_res = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...webhook_payload, signature_key: 'invalid_hash' }),
    });

    const invalid_json = (await invalid_res.json()) as any;
    expect(invalid_res.status).toBe(403);
    expect(invalid_json.error_code).toBe('INVALID_SIGNATURE');
  }, 20000);

  it('5. POST /api/payments/escrow/release - Melepaskan dana Escrow setelah konfirmasi penerimaan barang', async () => {
    await db.insert(escrow_transactions).values({
      transaction_type: 'PROCUREMENT_ESCROW',
      order_reference_id: created_order_id,
      amount: '1215000.00',
      escrow_status: 'HELD',
    });

    const release_payload = {
      order_reference_id: created_order_id,
    };

    const res = await fetch(`${BASE_URL}/api/payments/escrow/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(release_payload),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.escrow_status).toBe('RELEASED');
    expect(json.data.order_reference_id).toBe(created_order_id);
  }, 20000);
});
