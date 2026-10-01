import type { CommodityBatchTag, NewCommodityBatchTag } from './database-types';

export type StorageTemperatureType = 'AMBIENT' | 'CHILLED' | 'FROZEN';

export interface CreateCommodityBatchTagDTO {
  commodity_id: string;
  license_number?: string | null;
  production_date: string;
  storage_temperature_type?: StorageTemperatureType;
  is_verified?: boolean;
}

export interface UpdateCommodityBatchTagDTO {
  commodity_id?: string;
  license_number?: string | null;
  production_date?: string;
  storage_temperature_type?: StorageTemperatureType;
  is_verified?: boolean;
}

export type CommodityBatchTagRecord = CommodityBatchTag;
export type CommodityBatchTagInsertPayload = NewCommodityBatchTag;
