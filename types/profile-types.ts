import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { business_entities, business_roles } from '../config/schema.ts';

export type RoleType = 'SUPPLIER' | 'UMKM';

export type SectorType =
  | 'PERTANIAN'
  | 'PETERNAKAN'
  | 'PERIKANAN'
  | 'PERKEBUNAN'
  | 'FNB_PENGOLAHAN'
  | 'RITEL'
  | 'LOGISTIK';

export interface BankAccountInfo {
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
  [key: string]: unknown;
}

/** Minimal product information for profile listing */
export interface ProductDTO {
  id: string;
  name: string;
  sku: string;
  base_price: number | string;
  stock: number | string;
  unit: string;
}

export interface CreateProfileDTO {
  business_name: string;
  npwp: string;
  default_address: string;
  latitude: number | string;
  longitude: number | string;
  phone_number?: string;
  bank_account_info?: BankAccountInfo;
  profile_picture_url?: string | null;
  storage_capacity?: number;
  sector_type?: SectorType | null;
  role_type?: RoleType;
  auth_user_id?: string | null;
}

export interface UpdateProfileDTO {
  business_name?: string;
  npwp?: string;
  default_address?: string;
  latitude?: number | string;
  longitude?: number | string;
  phone_number?: string;
  bank_account_info?: BankAccountInfo;
  profile_picture_url?: string | null;
  storage_capacity?: number;
  sector_type?: SectorType | null;
  role_type?: RoleType;
  is_active?: boolean;
}

export type PatchProfileDTO = UpdateProfileDTO;

export interface ProfileRoleItem {
  id: string;
  entity_id: string;
  role_type: RoleType;
  sector_type: SectorType | null;
  storage_capacity: number;
  is_active: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface ProfileResponseDTO {
  id: string;
  entity_id: string;
  auth_user_id: string | null;
  business_name: string;
  legal_name: string;
  npwp: string;
  npwp_nib: string;
  default_address: string;
  phone_number?: string;
  lat: number;
  long: number;
  latitude: number;
  longitude: number;
  bank_account_info: BankAccountInfo;
  profile: string | null;
  profile_picture_url: string | null;
  storage: number;
  storage_capacity: number;
  sector: SectorType | null;
  sector_type: SectorType | null;
  role: RoleType | null;
  role_type: RoleType | null;
  is_active: boolean | null;
  roles: ProfileRoleItem[];
  created_at: Date | null;
  updated_at: Date | null;
  /** Total sales amount (sum of transaction amounts) */
  total_sales?: number;
  /** List of products/commodities associated with this entity */
  products?: ProductDTO[];
}

export interface ProfileListFilterDTO {
  search?: string;
  role_type?: RoleType;
  sector_type?: SectorType;
  limit?: number;
  offset?: number;
}

export interface PaginatedProfileResult {
  total: number;
  limit: number;
  offset: number;
  profiles: ProfileResponseDTO[];
}

export type BusinessEntityRecord = InferSelectModel<typeof business_entities>;
export type NewBusinessEntity = InferInsertModel<typeof business_entities>;

export type BusinessRoleRecord = InferSelectModel<typeof business_roles>;
export type NewBusinessRole = InferInsertModel<typeof business_roles>;

export type BusinessEntityInsertPayload = NewBusinessEntity;
export type BusinessRoleInsertPayload = NewBusinessRole;
