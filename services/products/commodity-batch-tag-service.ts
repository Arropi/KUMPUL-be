import {
  find_commodity_batch_tag_by_id,
  find_batch_tags_by_commodity_id,
  find_commodity_by_id,
  insert_commodity_batch_tag,
  update_commodity_batch_tag_by_id,
  delete_commodity_batch_tag_by_id,
} from '../../repositories/products/commodity-batch-tag-repositories';
import { verify_supplier_document_service } from '../ai/gemini-document-service';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateCommodityBatchTagDTO,
  UpdateCommodityBatchTagDTO,
  CommodityBatchTagRecord,
  CommodityBatchTagWithVerification,
  CommodityBatchTagInsertPayload,
} from '../../types/commodity-batch-tag-types';
import type { DocumentVerificationResult } from '../../types/ai-verification-types';

export const create_commodity_batch_tag_service = async (
  payload: CreateCommodityBatchTagDTO
): Promise<CommodityBatchTagWithVerification> => {
  const existing_commodity = await find_commodity_by_id(payload.commodity_id);
  if (!existing_commodity) {
    throw new AppError('Komoditas tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  let is_verified_value = payload.is_verified ?? false;
  let ai_verification_result: DocumentVerificationResult | null = null;

  // Jika is_verified tidak ditentukan secara manual dan terdapat URL berkas pendukung,
  // jalankan verifikasi AI Gemini secara otomatis.
  if (payload.is_verified === undefined && payload.supporting_file_url) {
    ai_verification_result = await verify_supplier_document_service({
      file_url: payload.supporting_file_url,
      commodity_name: existing_commodity.name,
    });

    is_verified_value = ai_verification_result.is_verified === true;
  }

  const insert_payload: CommodityBatchTagInsertPayload = {
    commodity_id: payload.commodity_id,
    supporting_file_url: payload.supporting_file_url ?? null,
    storage_temperature_type: payload.storage_temperature_type ?? 'AMBIENT',
    is_verified: is_verified_value,
  };

  const created_record = await insert_commodity_batch_tag(insert_payload);

  return {
    ...created_record,
    ai_verification: ai_verification_result,
  };
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

export const verify_batch_tag_with_ai_service = async (
  tag_id: string
): Promise<{
  tag: CommodityBatchTagRecord;
  verification: DocumentVerificationResult;
}> => {
  const existing_tag = await find_commodity_batch_tag_by_id(tag_id);
  if (!existing_tag) {
    throw new AppError('Commodity batch tag tidak ditemukan', 404, 'BATCH_TAG_NOT_FOUND');
  }

  if (!existing_tag.supporting_file_url) {
    throw new AppError(
      'Batch tag tidak memiliki dokumen pendukung (supporting_file_url) untuk diverifikasi',
      400,
      'NO_SUPPORTING_DOCUMENT'
    );
  }

  const commodity = await find_commodity_by_id(existing_tag.commodity_id);

  const verification_result = await verify_supplier_document_service({
    file_url: existing_tag.supporting_file_url,
    commodity_name: commodity?.name,
  });

  const updated_record = await update_commodity_batch_tag_by_id(tag_id, {
    is_verified: verification_result.is_verified,
  });

  if (!updated_record) {
    throw new AppError('Gagal memperbarui status verifikasi batch tag', 500, 'UPDATE_FAILED');
  }

  return {
    tag: updated_record,
    verification: verification_result,
  };
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
