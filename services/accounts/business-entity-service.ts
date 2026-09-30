import {
  find_entity_by_id,
  find_entity_by_npwp,
  find_entities_list,
  insert_business_entity,
  update_business_entity_by_id,
} from '../../repositories/accounts/business-entity-repositories';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateBusinessEntityDTO,
  UpdateBusinessEntityDTO,
  UpdateEntityProfileDTO,
  BusinessEntityRecord,
} from '../../types/business-entity-types';

export const create_entity_service = async (
  payload: CreateBusinessEntityDTO
): Promise<BusinessEntityRecord> => {
  const existing_entity = await find_entity_by_npwp(payload.npwp_nib);
  if (existing_entity) {
    throw new AppError(
      'Business entity dengan NPWP/NIB tersebut sudah terdaftar',
      400,
      'NPWP_NIB_ALREADY_EXISTS'
    );
  }

  const insert_payload = {
    auth_user_id: payload.auth_user_id,
    legal_name: payload.legal_name,
    npwp_nib: payload.npwp_nib,
    default_address: payload.default_address,
    latitude: String(payload.latitude),
    longitude: String(payload.longitude),
    bank_account_info: payload.bank_account_info ?? {},
    profile_picture_url: payload.profile_picture_url ?? null,
  };

  const created_record = await insert_business_entity(insert_payload);
  return created_record;
};

export const update_entity_service = async (
  entity_id: string,
  payload: UpdateBusinessEntityDTO
): Promise<BusinessEntityRecord> => {
  const target_entity = await find_entity_by_id(entity_id);
  if (!target_entity) {
    throw new AppError('Business entity tidak ditemukan', 404, 'ENTITY_NOT_FOUND');
  }

  if (payload.npwp_nib && payload.npwp_nib !== target_entity.npwp_nib) {
    const duplicate_npwp = await find_entity_by_npwp(payload.npwp_nib);
    if (duplicate_npwp && duplicate_npwp.id !== entity_id) {
      throw new AppError(
        'NPWP/NIB sudah digunakan oleh business entity lain',
        400,
        'NPWP_NIB_CONFLICT'
      );
    }
  }

  const update_payload = {
    ...(payload.legal_name ? { legal_name: payload.legal_name } : {}),
    ...(payload.npwp_nib ? { npwp_nib: payload.npwp_nib } : {}),
    ...(payload.default_address ? { default_address: payload.default_address } : {}),
    ...(payload.latitude !== undefined ? { latitude: String(payload.latitude) } : {}),
    ...(payload.longitude !== undefined ? { longitude: String(payload.longitude) } : {}),
    ...(payload.bank_account_info ? { bank_account_info: payload.bank_account_info } : {}),
    ...(payload.profile_picture_url !== undefined
      ? { profile_picture_url: payload.profile_picture_url || null }
      : {}),
  };

  const updated_record = await update_business_entity_by_id(entity_id, update_payload);
  if (!updated_record) {
    throw new AppError('Gagal memperbarui data business entity', 500, 'UPDATE_FAILED');
  }

  return updated_record;
};

export const update_profile_service = async (
  entity_id: string,
  payload: UpdateEntityProfileDTO
): Promise<BusinessEntityRecord> => {
  const current_entity = await find_entity_by_id(entity_id);
  if (!current_entity) {
    throw new AppError('Profil business entity tidak ditemukan', 404, 'ENTITY_NOT_FOUND');
  }

  const profile_update_payload = {
    ...(payload.legal_name ? { legal_name: payload.legal_name } : {}),
    ...(payload.default_address ? { default_address: payload.default_address } : {}),
    ...(payload.latitude !== undefined ? { latitude: String(payload.latitude) } : {}),
    ...(payload.longitude !== undefined ? { longitude: String(payload.longitude) } : {}),
    ...(payload.bank_account_info ? { bank_account_info: payload.bank_account_info } : {}),
    ...(payload.profile_picture_url !== undefined
      ? { profile_picture_url: payload.profile_picture_url || null }
      : {}),
  };

  const updated_profile = await update_business_entity_by_id(entity_id, profile_update_payload);
  if (!updated_profile) {
    throw new AppError('Gagal memperbarui profil business entity', 500, 'PROFILE_UPDATE_FAILED');
  }

  return updated_profile;
};

export const get_entity_by_id_service = async (
  entity_id: string
): Promise<BusinessEntityRecord> => {
  const found_entity = await find_entity_by_id(entity_id);
  if (!found_entity) {
    throw new AppError('Business entity tidak ditemukan', 404, 'ENTITY_NOT_FOUND');
  }
  return found_entity;
};

export const list_entities_service = async (
  limit_count = 20,
  offset_count = 0
): Promise<BusinessEntityRecord[]> => {
  const entity_list = await find_entities_list(limit_count, offset_count);
  return entity_list;
};
