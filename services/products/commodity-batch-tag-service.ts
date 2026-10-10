import {
  find_commodity_batch_tag_by_id,
  find_batch_tags_by_commodity_id,
  find_commodity_by_id,
  insert_commodity_batch_tag,
  update_commodity_batch_tag_by_id,
  delete_commodity_batch_tag_by_id,
} from '../../repositories/products/commodity-batch-tag-repositories.ts';
import { verify_supplier_document_service } from '../ai/gemini-document-service.ts';
import { verify_commodity_quality_with_ai } from './commodity-ai-service.ts';
import { AppError } from '../../middleware/error-middleware.ts';
import type {
  CreateCommodityBatchTagDTO,
  UpdateCommodityBatchTagDTO,
  CommodityBatchTagRecord,
  CommodityBatchTagWithVerification,
  CommodityBatchTagInsertPayload,
  QualityVerificationResultDTO,
} from '../../types/commodity-batch-tag-types.ts';
import type { DocumentVerificationResult } from '../../types/ai-verification-types.ts';

export const create_commodity_batch_tag_service = async (
  payload: CreateCommodityBatchTagDTO
): Promise<CommodityBatchTagWithVerification> => {
  const existing_commodity = await find_commodity_by_id(payload.commodity_id);
  if (!existing_commodity) {
    throw new AppError('Komoditas tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  // Jalankan audit AI secara otomatis jika berkas pendukung dilampirkan
  let ai_verified = payload.is_verified ?? false;
  let ai_notes = payload.verification_notes ?? null;
  let verified_date = ai_verified ? new Date() : null;
  let verification_result: DocumentVerificationResult | null = null;

  if (payload.supporting_file_url && payload.is_verified === undefined) {
    verification_result = await verify_supplier_document_service({
      file_url: payload.supporting_file_url,
      commodity_name: existing_commodity.name,
    });
    ai_verified = verification_result.is_verified;
    ai_notes = verification_result.analysis_summary;
    verified_date = verification_result.is_verified ? new Date() : null;
  }

  const insert_payload: CommodityBatchTagInsertPayload = {
    commodity_id: payload.commodity_id,
    supporting_file_url: payload.supporting_file_url ?? null,
    storage_temperature_type: payload.storage_temperature_type ?? 'AMBIENT',
    is_verified: ai_verified,
    verification_notes: ai_notes,
    verified_at: verified_date,
  };

  const created_record = await insert_commodity_batch_tag(insert_payload);

  return {
    ...created_record,
    ai_verification: verification_result,
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
    update_payload.verified_at = payload.is_verified ? new Date() : null;
  }
  if (payload.verification_notes !== undefined) {
    update_payload.verification_notes = payload.verification_notes;
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
): Promise<{ tag: CommodityBatchTagRecord; verification: DocumentVerificationResult }> => {
  const existing_tag = await find_commodity_batch_tag_by_id(tag_id);
  if (!existing_tag) {
    throw new AppError('Commodity batch tag tidak ditemukan', 404, 'BATCH_TAG_NOT_FOUND');
  }

  if (!existing_tag.supporting_file_url || existing_tag.supporting_file_url.trim() === '') {
    throw new AppError(
      'Batch tag tidak memiliki dokumen pendukung (supporting_file_url) untuk diverifikasi',
      400,
      'NO_SUPPORTING_DOCUMENT'
    );
  }

  const commodity = await find_commodity_by_id(existing_tag.commodity_id);
  if (!commodity) {
    throw new AppError('Komoditas batch tag tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  const verification = await verify_supplier_document_service({
    file_url: existing_tag.supporting_file_url,
    commodity_name: commodity.name,
  });

  const updated_tag = await update_commodity_batch_tag_by_id(tag_id, {
    is_verified: verification.is_verified,
    verification_notes: verification.analysis_summary,
    verified_at: verification.is_verified ? new Date() : null,
  });

  return {
    tag: updated_tag || existing_tag,
    verification,
  };
};

export const verify_commodity_batch_tag_ai_service = async (
  tag_id: string
): Promise<{ tag: CommodityBatchTagRecord; ai_result: QualityVerificationResultDTO }> => {
  const existing_tag = await find_commodity_batch_tag_by_id(tag_id);
  if (!existing_tag) {
    throw new AppError('Commodity batch tag tidak ditemukan', 404, 'BATCH_TAG_NOT_FOUND');
  }

  const commodity = await find_commodity_by_id(existing_tag.commodity_id);
  if (!commodity) {
    throw new AppError('Komoditas batch tag tidak ditemukan', 404, 'COMMODITY_NOT_FOUND');
  }

  const ai_result = await verify_commodity_quality_with_ai(
    commodity.name,
    existing_tag.supporting_file_url,
    existing_tag.storage_temperature_type
  );

  const updated_tag = await update_commodity_batch_tag_by_id(tag_id, {
    is_verified: ai_result.is_verified,
    verification_notes: ai_result.verification_notes,
    verified_at: ai_result.is_verified ? new Date() : null,
  });

  return {
    tag: updated_tag || existing_tag,
    ai_result,
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
