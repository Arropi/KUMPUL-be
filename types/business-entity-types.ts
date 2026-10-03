import type { BusinessEntity, NewBusinessEntity } from './database-types';

export interface CreateBusinessEntityDTO {
  auth_user_id?: string;
  legal_name: string;
  npwp_nib: string;
  default_address: string;
  latitude: number | string;
  longitude: number | string;
  bank_account_info?: Record<string, unknown>;
  profile_picture_url?: string;
}

export interface UpdateBusinessEntityDTO {
  legal_name?: string;
  npwp_nib?: string;
  default_address?: string;
  latitude?: number | string;
  longitude?: number | string;
  bank_account_info?: Record<string, unknown>;
  profile_picture_url?: string;
}

export interface UpdateEntityProfileDTO {
  legal_name?: string;
  default_address?: string;
  latitude?: number | string;
  longitude?: number | string;
  bank_account_info?: Record<string, unknown>;
  profile_picture_url?: string;
}

export type BusinessEntityRecord = BusinessEntity;
export type BusinessEntityInsertPayload = NewBusinessEntity;
