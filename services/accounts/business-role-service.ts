import {
  find_entity_by_id,
  find_role_by_id,
  find_role_with_entity_by_id,
  find_duplicate_role,
  find_roles_by_filter,
  insert_business_role,
  update_business_role_by_id,
  delete_business_role_by_id,
} from '../../repositories/accounts/business-role-repositories';
import { AppError } from '../../middleware/error-middleware';
import type {
  CreateBusinessRoleDTO,
  UpdateBusinessRoleDTO,
  BusinessRoleFilterDTO,
  BusinessRoleRecord,
} from '../../types/business-role-types';

export const create_business_role_service = async (
  payload: CreateBusinessRoleDTO
): Promise<BusinessRoleRecord> => {
  // 1. Verifikasi keberadaan business entity induk
  const target_entity = await find_entity_by_id(payload.entity_id);
  if (!target_entity) {
    throw new AppError(
      'Business entity tidak ditemukan',
      404,
      'ENTITY_NOT_FOUND'
    );
  }

  // 2. Cek apakah role dengan jenis dan sektor yang sama sudah ada untuk entitas ini
  const existing_duplicate = await find_duplicate_role(
    payload.entity_id,
    payload.role_type,
    payload.sector_type
  );
  if (existing_duplicate) {
    throw new AppError(
      'Business entity sudah memiliki role dengan jenis dan sektor ini',
      400,
      'ROLE_ALREADY_EXISTS'
    );
  }

  const insert_payload = {
    entity_id: payload.entity_id,
    role_type: payload.role_type,
    sector_type: payload.sector_type,
    storage_capacity: payload.storage_capacity ?? 0,
    is_active: payload.is_active ?? true,
  };

  const created_role = await insert_business_role(insert_payload);
  return created_role;
};

export const get_business_role_by_id_service = async (role_id: string) => {
  const role_record = await find_role_with_entity_by_id(role_id);
  if (!role_record) {
    throw new AppError(
      'Business entity role tidak ditemukan',
      404,
      'ROLE_NOT_FOUND'
    );
  }

  return role_record;
};

export const list_business_roles_service = async (
  filter: BusinessRoleFilterDTO
): Promise<BusinessRoleRecord[]> => {
  const roles_list = await find_roles_by_filter(filter);
  return roles_list;
};

export const update_business_role_service = async (
  role_id: string,
  payload: UpdateBusinessRoleDTO
): Promise<BusinessRoleRecord> => {
  const existing_role = await find_role_by_id(role_id);
  if (!existing_role) {
    throw new AppError(
      'Business entity role tidak ditemukan',
      404,
      'ROLE_NOT_FOUND'
    );
  }

  // Jika sektor diperbarui, pastikan tidak terjadi duplikasi dengan role_type yang sama
  if (payload.sector_type && payload.sector_type !== existing_role.sector_type) {
    const duplicate_check = await find_duplicate_role(
      existing_role.entity_id,
      existing_role.role_type,
      payload.sector_type
    );
    if (duplicate_check && duplicate_check.id !== role_id) {
      throw new AppError(
        'Business entity sudah memiliki role dengan jenis dan sektor tersebut',
        400,
        'ROLE_ALREADY_EXISTS'
      );
    }
  }

  const update_payload = {
    ...(payload.sector_type ? { sector_type: payload.sector_type } : {}),
    ...(payload.storage_capacity !== undefined
      ? { storage_capacity: payload.storage_capacity }
      : {}),
    ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
  };

  const updated_role = await update_business_role_by_id(role_id, update_payload);
  if (!updated_role) {
    throw new AppError('Gagal memperbarui business entity role', 500, 'UPDATE_FAILED');
  }

  return updated_role;
};

export const delete_business_role_service = async (
  role_id: string
): Promise<void> => {
  const existing_role = await find_role_by_id(role_id);
  if (!existing_role) {
    throw new AppError(
      'Business entity role tidak ditemukan',
      404,
      'ROLE_NOT_FOUND'
    );
  }

  try {
    const is_deleted = await delete_business_role_by_id(role_id);
    if (!is_deleted) {
      throw new AppError('Gagal menghapus business entity role', 500, 'DELETE_FAILED');
    }
  } catch (delete_error) {
    // Tangani kemungkinan foreign key constraint violation jika role sudah terikat ke komoditas/produk/transaksi
    if (
      delete_error instanceof Error &&
      (delete_error.message.includes('foreign key') ||
        delete_error.message.includes('violates foreign key'))
    ) {
      throw new AppError(
        'Role tidak dapat dihapus karena masih memiliki data keterkaitan (komoditas, produk, atau pesanan)',
        400,
        'ROLE_IN_USE'
      );
    }
    throw delete_error;
  }
};
