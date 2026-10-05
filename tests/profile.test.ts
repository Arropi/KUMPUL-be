import { describe, it, expect, beforeAll } from 'bun:test';
import '..';
import { swagger_spec } from '../config/swagger';
import { db } from '../config/db';
import { sql } from 'drizzle-orm';

const BASE_URL = `http://localhost:${process.env.PORT || 3030}`;

describe('Profile Module Endpoints & Schema Tests', () => {
  let created_entity_id: string = '';
  const test_unique_suffix = Date.now().toString().slice(-6);
  const test_npwp = `9988776655${test_unique_suffix}`;

  beforeAll(async () => {
    // Ensure DB connection is active
    await db.execute(sql`SELECT 1`);
  });

  it(
    '1. POST /api/profile - Berhasil membuat profil entitas bisnis baru',
    async () => {
      const payload = {
        business_name: `PT Tani Sejahtera ${test_unique_suffix}`,
        npwp: test_npwp,
        default_address: 'Jl. Agro Pertanian No. 45, Sleman, DI Yogyakarta',
        lat: -7.7123,
        long: 110.3456,
        bank_account_info: {
          bank_name: 'BCA',
          account_number: '8829102931',
          account_holder: `PT Tani Sejahtera ${test_unique_suffix}`,
        },
        profile: 'https://example.com/logo-tani.png',
        storage: 750,
        sector: 'PERTANIAN',
        role: 'SUPPLIER',
      };

      const res = await fetch(`${BASE_URL}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as any;
      expect(res.status).toBe(201);
      expect(json.status).toBe('success');
      expect(json.data).toBeDefined();
      expect(json.data.id).toBeDefined();

      created_entity_id = json.data.id;

      expect(json.data.business_name).toBe(payload.business_name);
      expect(json.data.legal_name).toBe(payload.business_name);
      expect(json.data.npwp).toBe(test_npwp);
      expect(json.data.npwp_nib).toBe(test_npwp);
      expect(json.data.default_address).toBe(payload.default_address);
      expect(json.data.lat).toBeCloseTo(-7.7123, 3);
      expect(json.data.long).toBeCloseTo(110.3456, 3);
      expect(json.data.bank_account_info.bank_name).toBe('BCA');
      expect(json.data.profile).toBe(payload.profile);
      expect(json.data.profile_picture_url).toBe(payload.profile);
      expect(json.data.storage).toBe(750);
      expect(json.data.storage_capacity).toBe(750);
      expect(json.data.sector).toBe('PERTANIAN');
      expect(json.data.sector_type).toBe('PERTANIAN');
    },
    20000
  );

  it(
    '2. GET /api/profile/:id - Mengembalikan detail profil dengan semua field yang diminta',
    async () => {
      expect(created_entity_id).not.toBe('');

      const res = await fetch(`${BASE_URL}/api/profile/${created_entity_id}`);
      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.status).toBe('success');
      expect(json.data.id).toBe(created_entity_id);
      expect(json.data.entity_id).toBe(created_entity_id);

      expect(json.data.profile).toBe('https://example.com/logo-tani.png');
      expect(json.data.bank_account_info).toBeDefined();
      expect(json.data.bank_account_info.account_number).toBe('8829102931');
      expect(json.data.lat).toBeCloseTo(-7.7123, 3);
      expect(json.data.long).toBeCloseTo(110.3456, 3);
      expect(json.data.default_address).toContain('Jl. Agro Pertanian');
      expect(json.data.npwp).toBe(test_npwp);
      expect(json.data.business_name).toContain('PT Tani Sejahtera');
      expect(json.data.storage).toBe(750);
      expect(json.data.sector).toBe('PERTANIAN');
    },
    20000
  );

  it(
    '3. PUT /api/profile/:id - Berhasil memperbarui data profil secara menyeluruh',
    async () => {
      const update_payload = {
        business_name: `PT Tani Sejahtera Mandiri ${test_unique_suffix}`,
        default_address: 'Jl. Kaliurang KM 10, Sleman, DI Yogyakarta',
        lat: -7.7001,
        long: 110.4002,
        bank_account_info: {
          bank_name: 'Mandiri',
          account_number: '1370001928374',
          account_holder: `PT Tani Sejahtera Mandiri ${test_unique_suffix}`,
        },
        profile: 'https://example.com/updated-logo.png',
        storage: 1200,
        sector: 'PETERNAKAN',
      };

      const res = await fetch(`${BASE_URL}/api/profile/${created_entity_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update_payload),
      });

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.status).toBe('success');
      expect(json.data.business_name).toBe(update_payload.business_name);
      expect(json.data.default_address).toBe(update_payload.default_address);
      expect(json.data.lat).toBeCloseTo(-7.7001, 3);
      expect(json.data.long).toBeCloseTo(110.4002, 3);
      expect(json.data.bank_account_info.bank_name).toBe('Mandiri');
      expect(json.data.profile).toBe(update_payload.profile);
      expect(json.data.storage).toBe(1200);
      expect(json.data.sector).toBe('PETERNAKAN');
    },
    20000
  );

  it(
    '4. PATCH /api/profile/:id - Berhasil memperbarui sebagian data profil',
    async () => {
      const patch_payload = {
        storage: 1500,
        sector: 'PERIKANAN',
      };

      const res = await fetch(`${BASE_URL}/api/profile/${created_entity_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch_payload),
      });

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.status).toBe('success');
      expect(json.data.storage).toBe(1500);
      expect(json.data.sector).toBe('PERIKANAN');
      expect(json.data.business_name).toContain('PT Tani Sejahtera Mandiri');
      expect(json.data.bank_account_info.bank_name).toBe('Mandiri');
    },
    20000
  );

  it(
    '5. GET /api/profile - Berhasil mengambil daftar profil dengan paginasi',
    async () => {
      const res = await fetch(`${BASE_URL}/api/profile?limit=5&offset=0`);
      const json = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(json.status).toBe('success');
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.pagination).toBeDefined();
      expect(json.pagination.limit).toBe(5);
      expect(json.pagination.offset).toBe(0);
    },
    20000
  );

  it(
    '6. DELETE /api/profile/:id - Berhasil menghapus profil entitas bisnis',
    async () => {
      const res = await fetch(`${BASE_URL}/api/profile/${created_entity_id}`, {
        method: 'DELETE',
      });

      const json = (await res.json()) as any;
      expect(res.status).toBe(200);
      expect(json.status).toBe('success');

      // Verifikasi pemanggilan ulang menghasilkan 404
      const check_res = await fetch(`${BASE_URL}/api/profile/${created_entity_id}`);
      expect(check_res.status).toBe(404);
    },
    20000
  );

  it('7. Swagger OpenAPI spec mencakup routes /api/profile dan tags Profile', () => {
    const spec = swagger_spec as any;
    expect(spec.paths['/api/profile']).toBeDefined();
    expect(spec.paths['/api/profile'].get).toBeDefined();
    expect(spec.paths['/api/profile'].post).toBeDefined();
    expect(spec.paths['/api/profile/{id}']).toBeDefined();
    expect(spec.paths['/api/profile/{id}'].get).toBeDefined();
    expect(spec.paths['/api/profile/{id}'].put).toBeDefined();
    expect(spec.paths['/api/profile/{id}'].patch).toBeDefined();
    expect(spec.paths['/api/profile/{id}'].delete).toBeDefined();
  });
});
