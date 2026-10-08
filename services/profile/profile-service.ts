import { AppError } from '../../middleware/error-middleware.ts';
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
  get_total_sales_by_entity_id,
  get_products_by_entity_id,
  find_role_by_id,
  find_all_active_roles,
  delete_business_role_by_id,
  update_business_role_by_id,
  check_role_has_active_transactions,
  check_entity_has_active_transactions,
} from '../../repositories/profile/profile-repositories.ts';
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
  ProductDTO,
  RoleType,
  SectorType,
} from '../../types/profile-types.ts';

/**
 * Helper untuk memetakan entity record dan roles ke ProfileResponseDTO.
 * Menyediakan alias sesuai permintaan user:
 * profile, bank_account_info, lat, long, default_address, npwp, business_name, storage, sector, phone_number.
 */
const format_profile_response = (
  entity: BusinessEntityRecord,
  roles: BusinessRoleRecord[],
  total_sales?: number,
  products?: ProductDTO[]
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
    phone_number: ('phone_number' in entity && entity.phone_number !== null) ? entity.phone_number : undefined,
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
    total_sales: total_sales ?? undefined,
    products: products ?? undefined,
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
    phone_number: payload.phone_number ?? null,
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
  const total_sales = await get_total_sales_by_entity_id(found_entity.id);
  const products = await get_products_by_entity_id(found_entity.id);

  return format_profile_response(found_entity, roles, total_sales, products);
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
  if (payload.phone_number !== undefined) {
    entity_update_payload.phone_number = payload.phone_number;
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
  // Recalculate total_sales and products after update (optional, could be expensive)
  // For now we keep previous values? We'll fetch fresh to reflect any changes.
  const total_sales = await get_total_sales_by_entity_id(entity_id);
  const products = await get_products_by_entity_id(entity_id);

  return format_profile_response(updated_entity, refreshed_roles, total_sales, products);
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

  // Periksa apakah entitas masih memiliki pesanan, transaksi, atau pool aktif
  const tx_check = await check_entity_has_active_transactions(entity_id);
  if (tx_check.has_active) {
    throw new AppError(
      `Akun profil usaha tidak dapat dihapus karena ${tx_check.reason}`,
      400,
      'ACTIVE_TRANSACTIONS_EXIST'
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
 * Menambahkan peran usaha baru (SUPPLIER atau UMKM) untuk suatu entitas bisnis.
 */
export const create_role_service = async (payload: {
  entity_id: string;
  role_type: RoleType;
  sector_type?: SectorType | null;
  storage_capacity?: number;
  is_active?: boolean;
}): Promise<BusinessRoleRecord> => {
  const target_entity = await find_entity_by_id(payload.entity_id);
  if (!target_entity) {
    throw new AppError('Entitas bisnis tidak ditemukan', 404, 'ENTITY_NOT_FOUND');
  }

  const existing_roles = await find_roles_by_entity_id(payload.entity_id);
  const already_exists = existing_roles.some(
    (r) => r.role_type === payload.role_type
  );
  if (already_exists) {
    throw new AppError(
      `Peran usaha ${payload.role_type} sudah terdaftar pada entitas ini`,
      400,
      'ROLE_ALREADY_EXISTS'
    );
  }

  const new_role = await insert_business_role({
    entity_id: payload.entity_id,
    role_type: payload.role_type,
    sector_type: payload.sector_type ?? null,
    storage_capacity: payload.storage_capacity ?? 0,
    is_active: payload.is_active ?? true,
  });

  return new_role;
};

/**
 * Memperbarui konfigurasi suatu peran usaha berdasarkan role_id.
 */
export const update_role_service = async (
  role_id: string,
  payload: {
    sector_type?: SectorType | null;
    storage_capacity?: number;
    is_active?: boolean;
    role_type?: RoleType;
  }
): Promise<BusinessRoleRecord> => {
  const target_role = await find_role_by_id(role_id);
  if (!target_role) {
    throw new AppError('Peran usaha tidak ditemukan', 404, 'ROLE_NOT_FOUND');
  }

  const updated = await update_business_role_by_id(role_id, payload);
  if (!updated) {
    throw new AppError('Gagal memperbarui peran usaha', 500, 'UPDATE_ROLE_FAILED');
  }

  return updated;
};

/**
 * Menghapus suatu peran usaha berdasarkan role_id dengan validasi transaksi aktif.
 */
export const delete_role_service = async (role_id: string): Promise<void> => {
  const target_role = await find_role_by_id(role_id);
  if (!target_role) {
    throw new AppError('Peran usaha tidak ditemukan', 404, 'ROLE_NOT_FOUND');
  }

  const existing_roles = await find_roles_by_entity_id(target_role.entity_id);
  if (existing_roles.length <= 1) {
    throw new AppError(
      'Entitas usaha harus memiliki minimal 1 peran aktif. Untuk menghapus peran ini, silakan gunakan tombol hapus akun usaha.',
      400,
      'CANNOT_DELETE_LAST_ROLE'
    );
  }

  const tx_check = await check_role_has_active_transactions(role_id);
  if (tx_check.has_active) {
    throw new AppError(
      `Peran usaha tidak dapat dihapus karena ${tx_check.reason}`,
      400,
      'ACTIVE_TRANSACTIONS_EXIST'
    );
  }

  try {
    const is_deleted = await delete_business_role_by_id(role_id);
    if (!is_deleted) {
      throw new AppError('Gagal menghapus peran usaha dari database', 500, 'DELETE_FAILED');
    }
  } catch (delete_error) {
    if (
      delete_error instanceof Error &&
      (delete_error.message.includes('foreign key') ||
        delete_error.message.includes('violates foreign key'))
    ) {
      throw new AppError(
        'Peran usaha tidak dapat dihapus karena masih terkait dengan data produk, komoditas, atau pesanan',
        400,
        'ROLE_IN_USE'
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

  // Fetch extra data for each entity in parallel
  const entitiesWithExtra = await Promise.all(
    entities.map(async (entity_record) => {
      const roles = await find_roles_by_entity_id(entity_record.id);
      const total_sales = await get_total_sales_by_entity_id(entity_record.id);
      const products = await get_products_by_entity_id(entity_record.id);
      return { entity: entity_record, roles, total_sales, products };
    })
  );

  const formatted_profiles = entitiesWithExtra.map(({ entity, roles, total_sales, products }) =>
    format_profile_response(entity, roles, total_sales, products)
  );

  return {
    total: total_count,
    limit: limit_num,
    offset: offset_num,
    profiles: formatted_profiles,
  };
};

/**
 * Mengambil daftar peran usaha berdasarkan filter entity_id dan/atau role_type
 */
export const list_roles_service = async (filter: {
  entity_id?: string;
  role_type?: string;
}): Promise<BusinessRoleRecord[]> => {
  let roles: BusinessRoleRecord[] = [];
  if (filter.entity_id) {
    roles = await find_roles_by_entity_id(filter.entity_id);
  } else {
    roles = await find_all_active_roles(filter.role_type as RoleType | undefined);
  }

  if (filter.role_type) {
    roles = roles.filter(
      (r) => r.role_type.toUpperCase() === filter.role_type!.toUpperCase()
    );
  }

  return roles;
};