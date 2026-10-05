import type { CommodityBatchTag, NewCommodityBatchTag } from './database-types';
import type { DocumentVerificationResult } from './ai-verification-types';

export type StorageTemperatureType = 'AMBIENT' | 'CHILLED' | 'FROZEN';

export interface CreateCommodityBatchTagDTO {
  commodity_id: string;
  supporting_file_url?: string | null;
  storage_temperature_type?: StorageTemperatureType;
  is_verified?: boolean;
  verification_notes?: string | null;
  verified_at?: Date | null;
}

export interface UpdateCommodityBatchTagDTO {
  commodity_id?: string;
  supporting_file_url?: string | null;
  storage_temperature_type?: StorageTemperatureType;
  is_verified?: boolean;
  verification_notes?: string | null;
  verified_at?: Date | null;
}

export interface QualityVerificationResultDTO {
  is_verified: boolean;
  hygiene_assessment: string;
  legality_assessment: string;
  expiration_valid: boolean;
  verification_notes: string;
}

export interface CommodityBatchTagWithVerification extends CommodityBatchTag {
  ai_verification?: DocumentVerificationResult | null;
}

export type CommodityBatchTagRecord = CommodityBatchTag;
export type CommodityBatchTagInsertPayload = NewCommodityBatchTag;
