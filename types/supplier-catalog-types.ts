import type { SupplierCommodity, NewSupplierCommodity } from './database-types';

export type WholesaleUnit = 'KARUNG' | 'SAK' | 'KRAT' | 'PAX' | 'BAL';

export interface CreateSupplierCommodityDTO {
  supplier_role_id: string;
  name: string;
  wholesale_unit: WholesaleUnit;
  base_moq: number | string;
  lead_time_days?: number;
  is_marketplace_active?: boolean;
}

export interface UpdateSupplierCommodityDTO {
  name?: string;
  wholesale_unit?: WholesaleUnit;
  base_moq?: number | string;
  lead_time_days?: number;
  is_marketplace_active?: boolean;
}

export type SupplierCommodityRecord = SupplierCommodity;
export type SupplierCommodityInsertPayload = NewSupplierCommodity;
