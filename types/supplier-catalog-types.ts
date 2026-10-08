import type {
  SupplierCommodity,
  NewSupplierCommodity,
  CommodityPriceTier,
  NewCommodityPriceTier,
} from './database-types.ts';

export type WholesaleUnit =
  | 'KARUNG'
  | 'SAK'
  | 'KRAT'
  | 'PAX'
  | 'BAL'
  | 'KG'
  | 'GRAM'
  | 'TON'
  | 'KUINTAL'
  | 'LITER'
  | 'ML'
  | 'KUBIK'
  | 'PCS'
  | 'PACK'
  | 'DUS'
  | 'BOX'
  | 'KARTON'
  | 'BOTOL'
  | 'KALENG'
  | 'TRAY'
  | 'KERANJANG'
  | 'BASKOM'
  | 'EKOR'
  | 'BUTIR'
  | 'LEMBAR'
  | 'IKAT'
  | 'PORSI'
  | 'CUP'
  | 'BUNGKUS'
  | 'LUSIN'
  | 'PALLET'
  | 'KOLI';

export interface PriceTierInputDTO {
  min_qty: number | string;
  max_qty: number | string;
  tier_price: number | string;
}

export interface CreateSupplierCommodityDTO {
  supplier_role_id: string;
  name: string;
  wholesale_unit: WholesaleUnit;
  base_price: number | string;
  stock: number | string;
  base_moq: number | string;
  lead_time_days?: number;
  image_url?: string | null;
  description?: string | null;
  production_date?: string | null;
  closed_date?: string | null;
  reserved_stock?: number | string;
  auto_activate_marketplace?: boolean;
  allows_under_moq?: boolean;
  under_moq_price_per_kg?: number | string | null;
  is_marketplace_active?: boolean;
  price_tiers?: PriceTierInputDTO[];
}

export interface UpdateSupplierCommodityDTO {
  name?: string;
  wholesale_unit?: WholesaleUnit;
  base_price?: number | string;
  stock?: number | string;
  base_moq?: number | string;
  lead_time_days?: number;
  image_url?: string | null;
  description?: string | null;
  production_date?: string | null;
  closed_date?: string | null;
  reserved_stock?: number | string;
  auto_activate_marketplace?: boolean;
  allows_under_moq?: boolean;
  under_moq_price_per_kg?: number | string | null;
  is_marketplace_active?: boolean;
  price_tiers?: PriceTierInputDTO[];
}

export interface SupplierCommodityWithTiers extends SupplierCommodity {
  price_tiers: CommodityPriceTier[];
  supplier_entity_id?: string;
  batch_tag?: any;
  batch_tags?: any[];
}

export type SupplierCommodityRecord = SupplierCommodity;
export type SupplierCommodityInsertPayload = NewSupplierCommodity;
export type CommodityPriceTierRecord = CommodityPriceTier;
export type CommodityPriceTierInsertPayload = NewCommodityPriceTier;

