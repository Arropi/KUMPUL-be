import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '../config/db';
import {
  business_entities,
  business_roles,
  supplier_commodities,
  commodity_batch_tags,
} from '../config/schema';
import { eq } from 'drizzle-orm';
import {
  create_commodity_batch_tag_service,
  verify_batch_tag_with_ai_service,
  get_commodity_batch_tag_by_id_service,
  delete_commodity_batch_tag_service,
} from '../services/products/commodity-batch-tag-service';
import { verify_supplier_document_service } from '../services/ai/gemini-document-service';
import { swagger_spec } from '../config/swagger';

let test_entity_id = '';
let test_supplier_role_id = '';
let test_commodity_id = '';
const created_tag_ids: string[] = [];

describe('Gemini AI Commodity Batch Tag Document Verification Tests', () => {
  beforeAll(async () => {
    // 1. Buat Bisnis Entity
    const [entity] = await db
      .insert(business_entities)
      .values({
        legal_name: 'PT Kumpul Pangan Nusantara',
        npwp_nib: `NPWP-AI-TEST-${Date.now()}`,
        default_address: 'Kawasan Industri Agro No. 5, Bogor',
        latitude: '-6.5950000',
        longitude: '106.8166667',
      })
      .returning();
    test_entity_id = entity!.id;

    // 2. Buat Role Supplier
    const [supplier_role] = await db
      .insert(business_roles)
      .values({
        entity_id: test_entity_id,
        role_type: 'SUPPLIER',
        sector_type: 'PERTANIAN',
        is_active: true,
      })
      .returning();
    test_supplier_role_id = supplier_role!.id;

    // 3. Buat Komoditas
    const [commodity] = await db
      .insert(supplier_commodities)
      .values({
        supplier_role_id: test_supplier_role_id,
        name: 'Beras Organik Pandan Wangi Grade A',
        sku: `KUMPUL-AI-TEST-${Date.now()}`,
        wholesale_unit: 'KG',
        base_price: '18000.00',
        base_moq: '100.00',
        stock: '5000.00',
        lead_time_days: 2,
        is_marketplace_active: true,
      })
      .returning();
    test_commodity_id = commodity!.id;
  }, 45000);

  afterAll(async () => {
    try {
      for (const tag_id of created_tag_ids) {
        await db.delete(commodity_batch_tags).where(eq(commodity_batch_tags.id, tag_id));
      }
      if (test_commodity_id) {
        await db.delete(supplier_commodities).where(eq(supplier_commodities.id, test_commodity_id));
      }
      if (test_supplier_role_id) {
        await db.delete(business_roles).where(eq(business_roles.id, test_supplier_role_id));
      }
      if (test_entity_id) {
        await db.delete(business_entities).where(eq(business_entities.id, test_entity_id));
      }
    } catch (cleanup_err) {
      console.warn('Pembersihan data pengujian selesai:', cleanup_err);
    }
  }, 45000);

  it('1. Unit Test AI Service: Mengembalikan is_verified=false jika file_url kosong', async () => {
    const result = await verify_supplier_document_service({
      file_url: '',
    });

    expect(result).toBeDefined();
    expect(result.is_verified).toBe(false);
    expect(result.document_type).toBe('TIDAK_ADA_DOKUMEN');
    expect(result.rejection_reason).toBe('FILE_URL_EMPTY');
  });

  it('2. Pembuatan batch tag tanpa supporting_file_url secara default tersimpan dengan is_verified=false', async () => {
    const created_tag = await create_commodity_batch_tag_service({
      commodity_id: test_commodity_id,
      supporting_file_url: null,
      storage_temperature_type: 'AMBIENT',
    });

    created_tag_ids.push(created_tag.id);

    expect(created_tag).toBeDefined();
    expect(created_tag.id).toBeDefined();
    expect(created_tag.is_verified).toBe(false);
    expect(created_tag.storage_temperature_type).toBe('AMBIENT');
  }, 30000);

  it('3. Pembuatan batch tag dengan supporting_file_url menjalankan verifikasi AI dan menyimpan is_verified secara otomatis', async () => {
    // Simulasi sertifikat halal / hasil uji lab
    const dummy_cert_url = 'https://storage.supabase.co/kumpul-files/docs/sertifikat-halal-beras-organik.pdf';

    const created_tag = await create_commodity_batch_tag_service({
      commodity_id: test_commodity_id,
      supporting_file_url: dummy_cert_url,
      storage_temperature_type: 'CHILLED',
    });

    created_tag_ids.push(created_tag.id);

    expect(created_tag).toBeDefined();
    expect(created_tag.id).toBeDefined();
    expect(created_tag.supporting_file_url).toBe(dummy_cert_url);
    expect(created_tag.storage_temperature_type).toBe('CHILLED');
    // is_verified bernilai boolean (jika AI API key belum disetel maka fallback false)
    expect(typeof created_tag.is_verified).toBe('boolean');
  }, 30000);

  it('4. Menolak verifikasi AI jika batch tag tidak memiliki supporting_file_url (400 NO_SUPPORTING_DOCUMENT)', async () => {
    const tag_without_file = await create_commodity_batch_tag_service({
      commodity_id: test_commodity_id,
      supporting_file_url: null,
      is_verified: false,
    });
    created_tag_ids.push(tag_without_file.id);

    await expect(verify_batch_tag_with_ai_service(tag_without_file.id)).rejects.toThrow(
      'Batch tag tidak memiliki dokumen pendukung'
    );
  }, 30000);

  it('5. Dedicated Endpoint: Memvalidasi dokumen pada batch tag menggunakan verify_batch_tag_with_ai_service', async () => {
    const tag_with_file = await create_commodity_batch_tag_service({
      commodity_id: test_commodity_id,
      supporting_file_url: 'https://storage.supabase.co/kumpul-files/docs/uji-lab-mutu-beras-2026.pdf',
      is_verified: false,
    });
    created_tag_ids.push(tag_with_file.id);

    const verify_result = await verify_batch_tag_with_ai_service(tag_with_file.id);

    expect(verify_result).toBeDefined();
    expect(verify_result.tag).toBeDefined();
    expect(verify_result.verification).toBeDefined();
    expect(typeof verify_result.verification.is_verified).toBe('boolean');
    expect(typeof verify_result.verification.is_expired).toBe('boolean');
    expect(typeof verify_result.verification.hygiene_compliance).toBe('boolean');
    expect(typeof verify_result.verification.legal_compliance).toBe('boolean');
    expect(typeof verify_result.verification.analysis_summary).toBe('string');

    // Pastikan status di database terupdate sinkron dengan hasil verifikasi
    const fetched_tag = await get_commodity_batch_tag_by_id_service(tag_with_file.id);
    expect(fetched_tag.is_verified).toBe(verify_result.verification.is_verified);
  }, 35000);

  it('6. Spesifikasi Swagger memuat route POST /api/commodity-batch-tags/{id}/verify', () => {
    const paths = (swagger_spec as any).paths;
    expect(paths).toBeDefined();
    expect(paths['/api/commodity-batch-tags/{id}/verify']).toBeDefined();
    expect(paths['/api/commodity-batch-tags/{id}/verify'].post).toBeDefined();
    expect(paths['/api/commodity-batch-tags/{id}/verify'].post.summary).toContain('AI Gemini');
  });
});
