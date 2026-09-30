import type { BusinessRole, NewBusinessRole } from './database-types';

export type RoleType = 'SUPPLIER' | 'UMKM';

export type SectorType =
  | 'PERTANIAN'
  | 'PETERNAKAN'
  | 'PERIKANAN'
  | 'PERKEBUNAN'
  | 'FNB_PENGOLAHAN'
  | 'RITEL'
  | 'LOGISTIK';

export interface CreateBusinessRoleDTO {
  entity_id: string;
  role_type: RoleType;
  sector_type: SectorType;
  storage_capacity?: number;
  is_active?: boolean;
}

export interface UpdateBusinessRoleDTO {
  sector_type?: SectorType;
  storage_capacity?: number;
  is_active?: boolean;
}

export interface BusinessRoleFilterDTO {
  entity_id?: string;
  role_type?: RoleType;
  sector_type?: SectorType;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export type BusinessRoleRecord = BusinessRole;
export type BusinessRoleInsertPayload = NewBusinessRole;
