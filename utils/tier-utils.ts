import { AppError } from '../middleware/error-middleware.ts';
import type { PriceTierInputDTO } from '../types/supplier-catalog-types.ts';

/**
 * Validasi dan konversi tier harga komoditas grosir
 */
export const format_and_validate_price_tiers = (
  raw_tiers: PriceTierInputDTO[]
): { min_qty: string; max_qty: string; tier_price: string }[] => {
  return raw_tiers.map((tier_item, tier_index) => {
    const min_numeric =
      typeof tier_item.min_qty === 'number'
        ? tier_item.min_qty
        : parseFloat(tier_item.min_qty);
    const max_numeric =
      typeof tier_item.max_qty === 'number'
        ? tier_item.max_qty
        : parseFloat(tier_item.max_qty);
    const price_numeric =
      typeof tier_item.tier_price === 'number'
        ? tier_item.tier_price
        : parseFloat(tier_item.tier_price);

    if (isNaN(min_numeric) || min_numeric <= 0) {
      throw new AppError(
        `Tier index ${tier_index}: min_qty harus bernilai angka lebih besar dari 0`,
        400,
        'INVALID_TIER_MIN_QTY'
      );
    }
    if (isNaN(max_numeric) || max_numeric <= 0) {
      throw new AppError(
        `Tier index ${tier_index}: max_qty harus bernilai angka lebih besar dari 0`,
        400,
        'INVALID_TIER_MAX_QTY'
      );
    }
    if (max_numeric <= min_numeric) {
      throw new AppError(
        `Tier index ${tier_index}: max_qty harus lebih besar dari min_qty`,
        400,
        'INVALID_TIER_RANGE'
      );
    }
    if (isNaN(price_numeric) || price_numeric <= 0) {
      throw new AppError(
        `Tier index ${tier_index}: tier_price harus bernilai angka lebih besar dari 0`,
        400,
        'INVALID_TIER_PRICE'
      );
    }

    return {
      min_qty: String(min_numeric),
      max_qty: String(max_numeric),
      tier_price: String(price_numeric),
    };
  });
};
