import type { CommodityBatchTag, NewCommodityBatchTag } from './database-types';
import type { DocumentVerificationResult } from './ai-verification-types';

export type StorageTemperatureType = 'AMBIENT' | 'CHILLED' | 'FROZEN';

export interface CreateCommodityBatchTagDTO {
  commodity_id: string;
  supporting_file_url?: string | null;
  storage_temperature_type?: StorageTemperatureType;
  is_verified?: boolean;
}

export interface UpdateCommodityBatchTagDTO {
  commodity_id?: string;
  supporting_file_url?: string | null;
  storage_temperature_type?: StorageTemperatureType;
  is_verified?: boolean;
}

export interface CommodityBatchTagWithVerification extends CommodityBatchTag {
  ai_verification?: DocumentVerificationResult | null;
}

export type CommodityBatchTagRecord = CommodityBatchTag;
export type CommodityBatchTagInsertPayload = NewCommodityBatchTag;
