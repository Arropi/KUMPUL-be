import { describe, it, expect, beforeAll } from 'bun:test';
import '..';
import { db } from '../config/db';
import {
  business_entities,
  business_roles,
  supplier_commodities,
  commodity_batch_tags,
  procurement_pools,
  consolidated_pos,
} from '../config/schema';

const BASE_URL = `http://localhost:${process.env.PORT || 3030}`;

describe('End-to-End Flow: Catalog Creation -> Quality/Mutu -> Publish -> PO System', () => {
  let supplier_role_id: string = '';
  let umkm_role_id: string = '';
  let created_commodity_id: string = '';
  let created_batch_tag_id: string = '';
  let active_pool_id: string = '';
  let supplier_po_id: string = '';

  const test_suffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // 1. Setup Supplier
    const supplier_entity = await db
      .insert(business_entities)
      .values({
        legal_name: `PT Petani Unggul ${test_suffix}`,
        npwp_nib: `8877665544${test_suffix}`,
        default_address: 'Jl. Agro Pertanian Sleman KM 15',
        latitude: '-7.7050',
        longitude: '110.4120',
        bank_account_info: {
          bank_name: 'BCA',
          account_number: '1122334455',
          account_holder: 'PT Petani Unggul',
        },
      })
      .returning();

    const supplier_role = await db
      .insert(business_roles)
      .values({
        entity_id: supplier_entity[0]!.id,
        role_type: 'SUPPLIER',
        sector_type: 'PERTANIAN',
        storage_capacity: 500,
      })
      .returning();

    supplier_role_id = supplier_role[0]!.id;

    // 2. Setup UMKM
    const umkm_entity = await db
      .insert(business_entities)
      .values({
        legal_name: `CV Sambal Juara ${test_suffix}`,
        npwp_nib: `5544332211${test_suffix}`,
        default_address: 'Jl. Gejayan No. 25, Sleman',
        latitude: '-7.7700',
        longitude: '110.3800',
        bank_account_info: {
          bank_name: 'Mandiri',
          account_number: '9988776655',
          account_holder: 'CV Sambal Juara',
        },
      })
      .returning();

    const umkm_role = await db
      .insert(business_roles)
      .values({
        entity_id: umkm_entity[0]!.id,
        role_type: 'UMKM',
        sector_type: 'FNB_PENGOLAHAN',
        storage_capacity: 100,
      })
      .returning();

    umkm_role_id = umkm_role[0]!.id;
  }, 30000);

  // ==========================================
  // TAHAP 1: PEMBUATAN KATALOG
  // ==========================================
  it('1. POST /api/supplier-catalogs - Berhasil membuat katalog komoditas baru (draft/belum publish)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const prod_date_str = tomorrow.toISOString().split('T')[0];

    const next_two_weeks = new Date();
    next_two_weeks.setDate(next_two_weeks.getDate() + 14);
    const closed_date_str = next_two_weeks.toISOString().split('T')[0];

    const catalog_payload = {
      supplier_role_id,
      name: `Bawang Merah Brebes Super ${test_suffix}`,
      wholesale_unit: 'KARUNG',
      base_price: 35000,
      stock: 300,
      base_moq: 50,
      lead_time_days: 2,
      production_date: prod_date_str,
      closed_date: closed_date_str,
      allows_under_moq: true,
      under_moq_price_per_kg: 38000,
      is_marketplace_active: false, // Draft awal
      price_tiers: [
        { min_qty: 50, max_qty: 99, tier_price: 35000 },
        { min_qty: 100, max_qty: 300, tier_price: 32000 },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/supplier-catalogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catalog_payload),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.id).toBeDefined();
    expect(json.data.sku).toBeDefined();
    expect(json.data.is_marketplace_active).toBe(false);
    expect(json.data.price_tiers.length).toBe(2);

    created_commodity_id = json.data.id;
  }, 20000);

  // ==========================================
  // TAHAP 2: PEMBUATAN MUTU & VERIFIKASI AI
  // ==========================================
  it('2. POST /api/commodity-batch-tags - Menambahkan dokumen mutu/batch tag komoditas', async () => {
    const tag_payload = {
      commodity_id: created_commodity_id,
      storage_temperature_type: 'AMBIENT',
      supporting_file_url: 'https://kumpul.id/storage/certs/gap-cleanliness-cert-2026.pdf',
    };

    const res = await fetch(`${BASE_URL}/api/commodity-batch-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag_payload),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.id).toBeDefined();
    expect(json.data.commodity_id).toBe(created_commodity_id);

    created_batch_tag_id = json.data.id;
  }, 40000);

  it('3. POST /api/commodity-batch-tags/:id/verify-ai - Verifikasi mutu, kebersihan, dan legalitas via AI', async () => {
    const res = await fetch(`${BASE_URL}/api/commodity-batch-tags/${created_batch_tag_id}/verify-ai`, {
      method: 'POST',
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.ai_result).toBeDefined();
    expect(json.data.ai_result.hygiene_assessment).toBeDefined();
    expect(json.data.ai_result.legality_assessment).toBeDefined();
    expect(json.data.tag.id).toBe(created_batch_tag_id);
  }, 30000);

  // ==========================================
  // TAHAP 3: PUBLISH KE MARKETPLACE
  // ==========================================
  it('4. POST /api/supplier-catalogs/:id/publish - Mempublikasikan komoditas & membuka procurement pool', async () => {
    const res = await fetch(`${BASE_URL}/api/supplier-catalogs/${created_commodity_id}/publish`, {
      method: 'POST',
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.commodity.is_marketplace_active).toBe(true);
    expect(json.data.procurement_pool).toBeDefined();
    expect(json.data.procurement_pool.pool_status).toBe('OPEN');
    expect(json.data.quality_verification).toBeDefined();

    active_pool_id = json.data.procurement_pool.id;
  }, 20000);

  it('5. GET /api/supplier-catalogs/marketplace - Menampilkan komoditas yang aktif di etalase publik', async () => {
    const res = await fetch(`${BASE_URL}/api/supplier-catalogs/marketplace`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.data)).toBe(true);

    const target_item = json.data.find((item: any) => item.commodity.id === created_commodity_id);
    expect(target_item).toBeDefined();
    expect(target_item.commodity.available_stock).toBe('300');
    expect(target_item.active_pool.id).toBe(active_pool_id);
  }, 20000);

  // ==========================================
  // TAHAP 4: SISTEM PO (POOLING, LOCKING, CONSOLIDATED PO, TRACKING)
  // ==========================================
  it('6. POST /api/pre-orders/join - UMKM memesan hingga mencapai target MOQ dan auto-generate PO Supplier', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const required_delivery_date = tomorrow.toISOString().split('T')[0];

    // Memesan 50 KG (langsung memenuhi target MOQ 50 KG)
    const join_payload = {
      pool_id: active_pool_id,
      umkm_role_id,
      order_qty: 50,
      required_delivery_date,
      is_urgent_asap: false,
      final_delivery_address: 'Jl. Gejayan No. 25, Sleman',
      final_delivery_lat: -7.77,
      final_delivery_lng: 110.38,
    };

    const res = await fetch(`${BASE_URL}/api/pre-orders/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(join_payload),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.status).toBe('success');
    expect(json.data.pool.pool_status).toBe('LOCKED');
    expect(json.data.order_id).toBeDefined();
  }, 20000);

  it('7. GET /api/orders/supplier/pos - Supplier melihat daftar Purchase Order (PO) konsolidasi yang diterbitkan', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/supplier/pos?supplier_role_id=${supplier_role_id}`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(Array.isArray(json.data)).toBe(true);

    const target_po = json.data.find((po: any) => po.pool_id === active_pool_id);
    expect(target_po).toBeDefined();
    expect(target_po.po_status).toBe('ISSUED');
    expect(parseFloat(target_po.total_amount)).toBeGreaterThan(0);

    supplier_po_id = target_po.id;
  }, 20000);

  it('8. GET /api/orders/supplier/pos/:id - Supplier melihat rincian PO konsolidasi beserta daftar partisipan', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/supplier/pos/${supplier_po_id}`);
    const json = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.po.id).toBe(supplier_po_id);
    expect(json.data.commodity.id).toBe(created_commodity_id);
    expect(Array.isArray(json.data.participants)).toBe(true);
    expect(json.data.participants.length).toBeGreaterThan(0);
    expect(json.data.participants[0].final_delivery_address).toBe('Jl. Gejayan No. 25, Sleman');
  }, 20000);
});
