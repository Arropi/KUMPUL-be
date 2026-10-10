import { describe, it, expect } from 'bun:test';
import { format_and_validate_price_tiers } from '../utils/tier-utils.ts';
import { AppError } from '../middleware/error-middleware.ts';

describe('format_and_validate_price_tiers Unit Tests', () => {
  it('berhasil memvalidasi tier price yang lebih kecil atau sama dengan base_price', () => {
    const rawTiers = [
      { min_qty: 10, max_qty: 50, tier_price: 35000 },
      { min_qty: 51, max_qty: 100, tier_price: 32000 },
    ];

    const result = format_and_validate_price_tiers(rawTiers, 35000);
    expect(result).toHaveLength(2);
    expect(result[0]!.min_qty).toBe('10');
    expect(result[0]!.max_qty).toBe('50');
    expect(result[0]!.tier_price).toBe('35000');
    expect(result[1]!.min_qty).toBe('51');
    expect(result[1]!.max_qty).toBe('100');
    expect(result[1]!.tier_price).toBe('32000');
  });

  it('gagal jika tier_price melebihi base_price', () => {
    const rawTiers = [
      { min_qty: 10, max_qty: 50, tier_price: 40000 },
    ];

    expect(() => {
      format_and_validate_price_tiers(rawTiers, 35000);
    }).toThrow('tidak boleh melebihi harga utama komoditas');
  });

  it('gagal jika max_qty <= min_qty', () => {
    const rawTiers = [
      { min_qty: 50, max_qty: 50, tier_price: 30000 },
    ];

    expect(() => {
      format_and_validate_price_tiers(rawTiers, 35000);
    }).toThrow('max_qty harus lebih besar dari min_qty');
  });

  it('gagal jika tier_price <= 0', () => {
    const rawTiers = [
      { min_qty: 10, max_qty: 50, tier_price: 0 },
    ];

    expect(() => {
      format_and_validate_price_tiers(rawTiers, 35000);
    }).toThrow('tier_price harus bernilai angka lebih besar dari 0');
  });

  it('gagal jika min_qty <= 0', () => {
    const rawTiers = [
      { min_qty: 0, max_qty: 50, tier_price: 30000 },
    ];

    expect(() => {
      format_and_validate_price_tiers(rawTiers, 35000);
    }).toThrow('min_qty harus bernilai angka lebih besar dari 0');
  });
});

import { delete_file_from_supabase } from '../config/supabase.ts';

describe('delete_file_from_supabase Tests', () => {
  it('mengembalikan false secara aman jika path kosong', async () => {
    const result = await delete_file_from_supabase('');
    expect(result).toBe(false);
  });
});
