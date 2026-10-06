import { AppError } from '../../middleware/error-middleware';
import {
  find_entity_by_id,
  find_entity_by_id_or_auth_id,
  find_entity_by_npwp,
  find_roles_by_entity_id,
  insert_business_entity,
  insert_business_role,
  update_business_entity,
  upsert_business_role_for_entity,
  delete_roles_by_entity_id,
  delete_business_entity,
  find_entities_list,
  count_entities,
} from '../../repositories/profile/profile-repositories';
import type {
  CreateProfileDTO,
  UpdateProfileDTO,
  PatchProfileDTO,
  ProfileResponseDTO,
  ProfileRoleItem,
  ProfileListFilterDTO,
  PaginatedProfileResult,
  BusinessEntityRecord,
  BusinessRoleRecord,
} from '../../types/profile-types';

/**
 * Helper untuk memetakan entity record dan roles ke ProfileResponseDTO.
 * Menyediakan alias sesuai permintaan user:
 * profile, bank_account_info, lat, long, default_address, npwp, business_name, storage, sector.
 */
const format_profile_response = (
  entity: BusinessEntityRecord,
  roles: BusinessRoleRecord[]
): ProfileResponseDTO => {
  const primary_role = roles[0] ?? null;

  const parsed_lat = parseFloat(entity.latitude);
  const parsed_long = parseFloat(entity.longitude);

  const mapped_roles: ProfileRoleItem[] = roles.map((role_record) => ({
    id: role_record.id,
    entity_id: role_record.entity_id,
    role_type: role_record.role_type,
    sector_type: role_record.sector_type,
    storage_capacity: role_record.storage_capacity,
    is_active: role_record.is_active,
    created_at: role_record.created_at,
    updated_at: role_record.updated_at,
  }));

  return {
    id: entity.id,
    entity_id: entity.id,
    auth_user_id: entity.auth_user_id,
    business_name: entity.legal_name,
    legal_name: entity.legal_name,
    npwp: entity.npwp_nib,
    npwp_nib: entity.npwp_nib,
    default_address: entity.default_address,
    lat: isNaN(parsed_lat) ? 0 : parsed_lat,
    long: isNaN(parsed_long) ? 0 : parsed_long,
    latitude: isNaN(parsed_lat) ? 0 : parsed_lat,
    longitude: isNaN(parsed_long) ? 0 : parsed_long,
    bank_account_info: (entity.bank_account_info as Record<string, unknown>) ?? {},
    profile: entity.profile_picture_url,
    profile_picture_url: entity.profile_picture_url,
    storage: primary_role ? primary_role.storage_capacity : 0,
    storage_capacity: primary_role ? primary_role.storage_capacity : 0,
    sector: primary_role ? primary_role.sector_type : null,
    sector_type: primary_role ? primary_role.sector_type : null,
    role: primary_role ? primary_role.role_type : null,
    role_type: primary_role ? primary_role.role_type : null,
    is_active: primary_role ? primary_role.is_active : null,
    roles: mapped_roles,
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
};

/**
 * Validasi angka koordinat latitude dan longitude.
 */
const validate_coordinates = (
  latitude: number | string,
  longitude: number | string
): { lat_num: number; long_num: number } => {
  const lat_num = typeof latitude === 'number' ? latitude : parseFloat(latitude);
  const long_num = typeof longitude === 'number' ? longitude : parseFloat(longitude);

  if (isNaN(lat_num) || isNaN(long_num)) {
    throw new AppError(
      'Koordinat latitude dan longitude harus berupa angka valid',
      400,
      'INVALID_COORDINATES'
    );
  }

  if (lat_num < -90 || lat_num > 90) {
    throw new AppError(
      'Nilai latitude harus berada di antara -90 dan 90 derajat',
      400,
      'INVALID_LATITUDE'
    );
  }

  if (long_num < -180 || long_num > 180) {
    throw new AppError(
      'Nilai longitude harus berada di antara -180 dan 180 derajat',
      400,
      'INVALID_LONGITUDE'
    );
  }

  return { lat_num, long_num };
};

/**
 * Membuat entitas bisnis baru beserta role awalnya (POST).
 */
export const create_profile_service = async (
  payload: CreateProfileDTO
): Promise<ProfileResponseDTO> => {
  const clean_npwp = payload.npwp.trim();
  const existing_entity = await find_entity_by_npwp(clean_npwp);
  if (existing_entity) {
    throw new AppError(
      'Business entity dengan NPWP/NIB tersebut sudah terdaftar',
      400,
      'NPWP_ALREADY_EXISTS'
    );
  }

  const { lat_num, long_num } = validate_coordinates(payload.latitude, payload.longitude);

  const clean_business_name = payload.business_name.trim();
  const clean_address = payload.default_address.trim();

  const insert_entity_payload = {
    auth_user_id: payload.auth_user_id ?? null,
    legal_name: clean_business_name,
    npwp_nib: clean_npwp,
    default_address: clean_address,
    latitude: String(lat_num),
    longitude: String(long_num),
    bank_account_info: payload.bank_account_info ?? {},
    profile_picture_url: payload.profile_picture_url ?? null,
  };

  const created_entity = await insert_business_entity(insert_entity_payload);

  const initial_role = await insert_business_role({
    entity_id: created_entity.id,
    role_type: payload.role_type ?? 'SUPPLIER',
    sector_type: payload.sector_type ?? null,
    storage_capacity: payload.storage_capacity ?? 0,
    is_active: true,
  });

  return format_profile_response(created_entity, [initial_role]);
};

/**
 * Mengambil detail profil berdasarkan entity_id atau id pada tabel business_entities (GET /:id).
 */
export const get_profile_by_id_service = async (
  identifier: string
): Promise<ProfileResponseDTO> => {
  const found_entity = await find_entity_by_id_or_auth_id(identifier);
  if (!found_entity) {
    throw new AppError(
      'Profil entitas bisnis tidak ditemukan',
      404,
      'PROFILE_NOT_FOUND'
    );
  }

  const roles = await find_roles_by_entity_id(found_entity.id);
  return format_profile_response(found_entity, roles);
};

/**
 * Memperbarui profil secara menyeluruh berdasarkan entity_id (PUT /:id).
 */
export const update_profile_service = async (
  entity_id: string,
  payload: UpdateProfileDTO
): Promise<ProfileResponseDTO> => {
  const target_entity = await find_entity_by_id(entity_id);
  if (!target_entity) {
    throw new AppError(
      'Profil entitas bisnis tidak ditemukan',
      404,
      'PROFILE_NOT_FOUND'
    );
  }

  if (payload.npwp) {
    const clean_npwp = payload.npwp.trim();
    if (clean_npwp !== target_entity.npwp_nib) {
      const duplicate_entity = await find_entity_by_npwp(clean_npwp);
      if (duplicate_entity && duplicate_entity.id !== entity_id) {
        throw new AppError(
          'NPWP/NIB sudah digunakan oleh entitas bisnis lain',
          400,
          'NPWP_CONFLICT'
        );
      }
    }
  }

  const entity_update_payload: Record<string, unknown> = {};

  if (payload.business_name !== undefined) {
    entity_update_payload.legal_name = payload.business_name.trim();
  }
  if (payload.npwp !== undefined) {
    entity_update_payload.npwp_nib = payload.npwp.trim();
  }
  if (payload.default_address !== undefined) {
    entity_update_payload.default_address = payload.default_address.trim();
  }

  if (payload.latitude !== undefined || payload.longitude !== undefined) {
    const lat_target = payload.latitude !== undefined ? payload.latitude : target_entity.latitude;
    const long_target = payload.longitude !== undefined ? payload.longitude : target_entity.longitude;
    const { lat_num, long_num } = validate_coordinates(lat_target, long_target);
    entity_update_payload.latitude = String(lat_num);
    entity_update_payload.longitude = String(long_num);
  }

  if (payload.bank_account_info !== undefined) {
    entity_update_payload.bank_account_info = payload.bank_account_info;
  }
  if (payload.profile_picture_url !== undefined) {
    entity_update_payload.profile_picture_url = payload.profile_picture_url || null;
  }

  let updated_entity = target_entity;
  if (Object.keys(entity_update_payload).length > 0) {
    const result = await update_business_entity(entity_id, entity_update_payload);
    if (!result) {
      throw new AppError('Gagal memperbarui profil entitas bisnis', 500, 'UPDATE_FAILED');
    }
    updated_entity = result;
  }

  const has_role_updates =
    payload.storage_capacity !== undefined ||
    payload.sector_type !== undefined ||
    payload.role_type !== undefined ||
    payload.is_active !== undefined;

  if (has_role_updates) {
    await upsert_business_role_for_entity(entity_id, {
      role_type: payload.role_type,
      sector_type: payload.sector_type,
      storage_capacity: payload.storage_capacity,
      is_active: payload.is_active,
    });
  }

  const refreshed_roles = await find_roles_by_entity_id(entity_id);
  return format_profile_response(updated_entity, refreshed_roles);
};

/**
 * Memperbarui profil secara parsial berdasarkan entity_id (PATCH /:id).
 */
export const patch_profile_service = async (
  entity_id: string,
  payload: PatchProfileDTO
): Promise<ProfileResponseDTO> => {
  return await update_profile_service(entity_id, payload);
};

/**
 * Menghapus profil entitas bisnis beserta role terkait berdasarkan entity_id (DELETE /:id).
 */
export const delete_profile_service = async (
  entity_id: string
): Promise<void> => {
  const target_entity = await find_entity_by_id(entity_id);
  if (!target_entity) {
    throw new AppError(
      'Profil entitas bisnis tidak ditemukan',
      404,
      'PROFILE_NOT_FOUND'
    );
  }

  try {
    await delete_roles_by_entity_id(entity_id);
    const is_deleted = await delete_business_entity(entity_id);
    if (!is_deleted) {
      throw new AppError(
        'Gagal menghapus entitas bisnis dari database',
        500,
        'DELETE_FAILED'
      );
    }
  } catch (delete_error) {
    if (
      delete_error instanceof Error &&
      (delete_error.message.includes('foreign key') ||
        delete_error.message.includes('violates foreign key'))
    ) {
      throw new AppError(
        'Profil entitas bisnis tidak dapat dihapus karena masih memiliki data keterkaitan (komoditas, produk, atau transaksi)',
        400,
        'PROFILE_IN_USE'
      );
    }
    throw delete_error;
  }
};

/**
 * Mengambil daftar profil dengan paginasi dan pencarian (GET /).
 */
export const list_profiles_service = async (
  filter: ProfileListFilterDTO
): Promise<PaginatedProfileResult> => {
  const limit_num = filter.limit && filter.limit > 0 ? filter.limit : 20;
  const offset_num = filter.offset && filter.offset >= 0 ? filter.offset : 0;

  const [entities, total_count] = await Promise.all([
    find_entities_list(limit_num, offset_num, filter.search),
    count_entities(filter.search),
  ]);

  const formatted_profiles = await Promise.all(
    entities.map(async (entity_record) => {
      const roles = await find_roles_by_entity_id(entity_record.id);
      return format_profile_response(entity_record, roles);
    })
  );

  return {
    total: total_count,
    limit: limit_num,
    offset: offset_num,
    profiles: formatted_profiles,
  };
};
