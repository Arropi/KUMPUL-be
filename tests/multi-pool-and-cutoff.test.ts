import { describe, it, expect, beforeAll } from 'bun:test';
import '..';
import { db } from '../config/db';
import {
  business_entities,
  business_roles,
  supplier_commodities,
  procurement_pools,
  pool_participants,
  consolidated_pos,
} from '../config/schema';

const BASE_URL = `http://localhost:${process.env.PORT || 3030}`;

describe('Multi-Pool, Cut-Off Rules, and ASAP Delivery Flow Tests', () => {
  let supplier_role_id = '';
  let umkm_role_id_1 = '';
  let umkm_role_id_2 = '';
  let commodity_id = '';
  let created_pool_id = '';

  const test_suffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Setup Supplier
    const supplier_entity = await db
      .insert(business_entities)
      .values({
        legal_name: `PT Tani Multi Pool ${test_suffix}`,
        npwp_nib: `9988776655${test_suffix}`,
        default_address: 'Kawasan Agribisnis Sleman, DIY',
        latitude: '-7.7200',
        longitude: '110.3900',
      })
      .returning();

    const supplier_role = await db
      .insert(business_roles)
      .values({
        entity_id: supplier_entity[0]!.id,
        role_type: 'SUPPLIER',
        sector_type: 'PERTANIAN',
        storage_capacity: 1000,
      })
      .returning();

    supplier_role_id = supplier_role[0]!.id;

    // 2. Setup UMKM 1
    const umkm_1 = await db
      .insert(business_entities)
      .values({
        legal_name: `Warung Makan Berkah ${test_suffix}`,
        npwp_nib: `1122334455${test_suffix}`,
        default_address: 'Jl. Malioboro No. 10, Yogyakarta',
        latitude: '-7.7928',
        longitude: '110.3658',
      })
      .returning();

    const umkm_role_1 = await db
      .insert(business_roles)
      .values({
        entity_id: umkm_1[0]!.id,
        role_type: 'UMKM',
        sector_type: 'FNB_PENGOLAHAN',
      })
      .returning();

    umkm_role_id_1 = umkm_role_1[0]!.id;

    // 3. Setup UMKM 2
    const umkm_2 = await db
      .insert(business_entities)
      .values({
        legal_name: `Katering Sedap ${test_suffix}`,
        npwp_nib: `2233445566${test_suffix}`,
        default_address: 'Jl. Kaliurang KM 5, Sleman',
        latitude: '-7.7600',
        longitude: '110.3800',
      })
      .returning();

    const umkm_role_2 = await db
      .insert(business_roles)
      .values({
        entity_id: umkm_2[0]!.id,
        role_type: 'UMKM',
        sector_type: 'FNB_PENGOLAHAN',
      })
      .returning();

    umkm_role_id_2 = umkm_role_2[0]!.id;

    // 4. Create Commodity with 2 days lead time, panen date, and closed date
    const commodity = await db
      .insert(supplier_commodities)
      .values({
        supplier_role_id,
        name: `Cabai Rawit Merah Multi-Pool ${test_suffix}`,
        sku: `CR-MP-${test_suffix}`,
        wholesale_unit: 'KG',
        base_price: '45000',
        stock: '1000',
        base_moq: '100',
        lead_time_days: 2,
        production_date: '2026-10-01',
        closed_date: '2026-10-31',
        is_marketplace_active: true,
      })
      .returning();

    commodity_id = commodity[0]!.id;
  }, 30000);

  it('1. POST /api/pre-orders/join - Validasi gagal jika tanggal kebutuhan melanggar cut-off lead time', async () => {
    // Tanggal besok (H+1), padahal lead time supplier adalah 2 hari -> cutoff_date adalah kemarin (<= today)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const too_soon_date = tomorrow.toISOString().slice(0, 10);

    const res = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commodity_id,
        create_new_pool: true,
        umkm_role_id: umkm_role_id_1,
        order_qty: 30,
        required_delivery_date: too_soon_date,
        final_delivery_address: 'Jl. Malioboro No. 10',
        final_delivery_lat: -7.79,
        final_delivery_lng: 110.36,
      }),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(400);
    expect(json.status).toBe('error');
    expect(json.error_code).toBe('CUTOFF_ALREADY_PASSED');
  }, 20000);

  it('2. POST /api/pre-orders/join - UMKM 1 membuka kamar patungan baru (Multi-Pool) dengan tanggal kebutuhan kustom & opsi secepatnya', async () => {
    const custom_delivery_date = '2026-10-25';

    const res = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commodity_id,
        create_new_pool: true,
        umkm_role_id: umkm_role_id_1,
        order_qty: 40,
        required_delivery_date: custom_delivery_date,
        is_urgent_asap: true,
        final_delivery_address: 'Jl. Malioboro No. 10, Yogyakarta',
        final_delivery_lat: -7.7928,
        final_delivery_lng: 110.3658,
      }),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.pool).toBeDefined();
    expect(json.data.pool.commodity_id).toBe(commodity_id);
    expect(json.data.pool.target_delivery_date).toBe(custom_delivery_date);
    expect(json.data.pool.cutoff_date).toBe('2026-10-23'); // 25 Okt - 2 hari lead time
    expect(json.data.pool.is_asap_allowed).toBe(true);
    expect(json.data.pool.pool_status).toBe('AGGREGATING');
    expect(json.data.pool.accumulated_qty).toBe('40.00');

    created_pool_id = json.data.pool.id;
  }, 20000);

  it('3. GET /api/pre-orders/pools?commodity_id=... - Melihat daftar kamar patungan aktif untuk komoditas tertentu', async () => {
    const res = await fetch(`${BASE_URL}/api/pre-orders/pools?commodity_id=${commodity_id}`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.data)).toBe(true);

    const target_room = json.data.find((p: any) => p.id === created_pool_id);
    expect(target_room).toBeDefined();
    expect(target_room.target_delivery_date).toBe('2026-10-25');
    expect(target_room.cutoff_date).toBe('2026-10-23');
    expect(target_room.accumulated_qty).toBe('40.00');
  }, 20000);

  it('4. POST /api/pre-orders/join - UMKM 2 bergabung ke kamar yang ada hingga mencapai MOQ, mengunci status & menghitung estimasi kirim', async () => {
    const res = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pool_id: created_pool_id,
        umkm_role_id: umkm_role_id_2,
        order_qty: 60, // 40 + 60 = 100 (mencapai target MOQ 100)
        is_urgent_asap: true,
        final_delivery_address: 'Jl. Kaliurang KM 5, Sleman',
        final_delivery_lat: -7.76,
        final_delivery_lng: 110.38,
      }),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.pool.pool_status).toBe('LOCKED');
    expect(json.data.pool.accumulated_qty).toBe('100.00');

    // Estimasi tanggal kirim realistis (memperhitungkan panen 10 Okt dan 2 hari lead time)
    expect(json.data.pool.estimated_delivery_date).toBeDefined();
    expect(new Date(json.data.pool.estimated_delivery_date).getTime()).toBeLessThanOrEqual(
      new Date('2026-10-25').getTime()
    );
  }, 20000);

  it('5. POST /api/pre-orders/pools/evaluate-cutoffs - Evaluasi pembatalan otomatis kamar yang melewati cut-off', async () => {
    const res = await fetch(`${BASE_URL}/api/pre-orders/pools/evaluate-cutoffs`, {
      method: 'POST',
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.updated_count).toBeDefined();
  }, 20000);
});
