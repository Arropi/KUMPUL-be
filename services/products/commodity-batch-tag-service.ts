import {
  find_commodity_batch_tag_by_id,
  find_batch_tags_by_commodity_id,
  find_commodity_by_id,
  insert_commodity_batch_tag,
  update_commodity_batch_tag_by_id,
  delete_commodity_batch_tag_by_id,
} from '../../repositories/products/commodity-batch-tag-repositories';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateCommodityBatchTagDTO,
  UpdateCommodityBatchTagDTO,
  CommodityBatchTagRecord,
  CommodityBatchTagInsertPayload,
} from '../../types/commodity-batch-tag-types';

export const create_commodity_batch_tag_service = async (
  payload: CreateCommodityBatchTagDTO
): Promise<CommodityBatchTagRecord> => {
  const existing_commodity = await find_commodity_by_id(payload.commodity_id);
  if (!existing_commodity) {
    throw new AppError('Komoditas tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  const insert_payload: CommodityBatchTagInsertPayload = {
    commodity_id: payload.commodity_id,
    supporting_file_url: payload.supporting_file_url ?? null,
    storage_temperature_type: payload.storage_temperature_type ?? 'AMBIENT',
    is_verified: payload.is_verified ?? false,
  };

  const created_record = await insert_commodity_batch_tag(insert_payload);
  return created_record;
};

export const get_commodity_batch_tag_by_id_service = async (
  tag_id: string
): Promise<CommodityBatchTagRecord> => {
  const tag_record = await find_commodity_batch_tag_by_id(tag_id);
  if (!tag_record) {
    throw new AppError('Commodity batch tag tidak ditemukan', 404, 'BATCH_TAG_NOT_FOUND');
  }

  return tag_record;
};

export const list_batch_tags_by_commodity_id_service = async (
  commodity_id: string
): Promise<CommodityBatchTagRecord[]> => {
  const existing_commodity = await find_commodity_by_id(commodity_id);
  if (!existing_commodity) {
    throw new AppError('Komoditas tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  const batch_tags = await find_batch_tags_by_commodity_id(commodity_id);
  return batch_tags;
};

export const update_commodity_batch_tag_service = async (
  tag_id: string,
  payload: UpdateCommodityBatchTagDTO
): Promise<CommodityBatchTagRecord> => {
  const existing_tag = await find_commodity_batch_tag_by_id(tag_id);
  if (!existing_tag) {
    throw new AppError('Commodity batch tag tidak ditemukan', 404, 'BATCH_TAG_NOT_FOUND');
  }

  if (payload.commodity_id && payload.commodity_id !== existing_tag.commodity_id) {
    const existing_commodity = await find_commodity_by_id(payload.commodity_id);
    if (!existing_commodity) {
      throw new AppError('Komoditas baru tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
    }
  }

  const update_payload: Partial<CommodityBatchTagInsertPayload> = {};

  if (payload.commodity_id !== undefined) {
    update_payload.commodity_id = payload.commodity_id;
  }
  if (payload.supporting_file_url !== undefined) {
    update_payload.supporting_file_url = payload.supporting_file_url;
  }
  if (payload.storage_temperature_type !== undefined) {
    update_payload.storage_temperature_type = payload.storage_temperature_type;
  }
  if (payload.is_verified !== undefined) {
    update_payload.is_verified = payload.is_verified;
  }

  if (Object.keys(update_payload).length === 0) {
    return existing_tag;
  }

  const updated_record = await update_commodity_batch_tag_by_id(tag_id, update_payload);
  if (!updated_record) {
    throw new AppError('Gagal memperbarui commodity batch tag', 500, 'UPDATE_FAILED');
  }

  return updated_record;
};

export const delete_commodity_batch_tag_service = async (
  tag_id: string
): Promise<CommodityBatchTagRecord> => {
  const existing_tag = await find_commodity_batch_tag_by_id(tag_id);
  if (!existing_tag) {
    throw new AppError('Commodity batch tag tidak ditemukan', 404, 'BATCH_TAG_NOT_FOUND');
  }

  const deleted_record = await delete_commodity_batch_tag_by_id(tag_id);
  if (!deleted_record) {
    throw new AppError('Gagal menghapus commodity batch tag', 500, 'DELETE_FAILED');
  }

  return deleted_record;
};
