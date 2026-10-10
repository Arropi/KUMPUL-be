import jwt from 'jsonwebtoken';
import { AppError } from '../../middleware/error-middleware.ts';
import {
  find_entity_by_user_id,
  create_default_business_entity,
  find_existing_role,
  insert_new_role,
  find_active_roles_by_entity_id,
  update_entity_profile,
  find_entity_by_npwp_value,
} from '../../repositories/auth/auth-repositories.ts';
import type {
  RegisterUserInputDTO,
  RegisterUserResultDTO,
  LoginUserInputDTO,
  LoginUserResultDTO,
  AuthUserPayload,
} from '../../types/auth-types.ts';

const DEFAULT_JWT_SECRET = 'kumpul_super_secret_jwt_key_2026';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const TOKEN_EXPIRY = '7d';

export const register_user_role_service = async (
  payload: RegisterUserInputDTO
): Promise<RegisterUserResultDTO> => {
  // 1. Temukan atau siapkan Business Entity terkait user_id
  let target_entity = await find_entity_by_user_id(payload.user_id);
  if (!target_entity) {
    target_entity = await create_default_business_entity(payload.user_id);
  }

  // 2. Validasi keunikan NPWP/NIB jika sudah digunakan entitas lain
  const trimmed_npwp = payload.npwp_nib.trim();
  const existing_npwp_entity = await find_entity_by_npwp_value(trimmed_npwp);
  if (existing_npwp_entity && existing_npwp_entity.id !== target_entity.id) {
    throw new AppError(
      'NPWP/NIB sudah terdaftar pada entitas bisnis lain',
      400,
      'NPWP_NIB_ALREADY_EXISTS'
    );
  }

  // 3. Validasi koordinat latitude dan longitude
  const parsed_lat =
    typeof payload.latitude === 'number'
      ? payload.latitude
      : parseFloat(payload.latitude);
  const parsed_lng =
    typeof payload.longitude === 'number'
      ? payload.longitude
      : parseFloat(payload.longitude);

  if (isNaN(parsed_lat) || isNaN(parsed_lng)) {
    throw new AppError(
      'Koordinat latitude dan longitude harus berupa angka valid',
      400,
      'INVALID_COORDINATES'
    );
  }

  if (parsed_lat === 0 && parsed_lng === 0) {
    throw new AppError(
      'Koordinat latitude dan longitude tidak boleh (0, 0)',
      400,
      'INVALID_COORDINATES'
    );
  }

  // 4. Update data profil business entity dengan seluruh parameter wajib
  const updated_entity = await update_entity_profile(target_entity.id, {
    legal_name: payload.legal_name.trim(),
    npwp_nib: trimmed_npwp,
    default_address: payload.default_address.trim(),
    latitude: String(parsed_lat),
    longitude: String(parsed_lng),
    bank_account_info: payload.bank_account_info,
    profile_picture_url: payload.profile_picture_url,
  });

  if (!updated_entity) {
    throw new AppError(
      'Gagal memperbarui data profil bisnis',
      500,
      'UPDATE_FAILED'
    );
  }

  // 5. Cek apakah role dengan jenis & sektor ini sudah ada untuk entitas tersebut
  const existing_role = await find_existing_role(
    target_entity.id,
    payload.role,
    payload.sector
  );

  if (existing_role) {
    throw new AppError(
      `Pengguna sudah terdaftar dengan role ${payload.role} pada sektor ${payload.sector}`,
      400,
      'ROLE_ALREADY_EXISTS'
    );
  }

  // 6. Simpan role baru ke database
  const created_role = await insert_new_role({
    entity_id: target_entity.id,
    role_type: payload.role,
    sector_type: payload.sector,
    storage_capacity: payload.storage_capacity ?? 0,
    is_active: true,
  });

  // 7. Kembalikan data registrasi tanpa token (token didapatkan melalui hit login)
  return {
    user_id: payload.user_id,
    entity_id: target_entity.id,
    role: payload.role,
    sector: payload.sector,
    business_role: created_role,
    business_entity: updated_entity,
  };
};

export const login_user_service = async (
  payload: LoginUserInputDTO
): Promise<LoginUserResultDTO> => {
  // 1. Temukan atau buat default Business Entity terkait user_id
  let target_entity = await find_entity_by_user_id(payload.user_id);
  if (!target_entity) {
    target_entity = await create_default_business_entity(payload.user_id);
  }

  // 2. Periksa apakah pengguna sudah memiliki role terdaftar (PRIORITAS 1)
  // Jika belum ada role aktif, kembalikan ROLE_NOT_REGISTERED agar FE mengarahkan ke registrasi / business-step
  const active_roles = await find_active_roles_by_entity_id(target_entity.id);
  if (active_roles.length === 0) {
    throw new AppError(
      'Pengguna belum memiliki role terdaftar. Silakan lakukan registrasi terlebih dahulu.',
      403,
      'ROLE_NOT_REGISTERED',
      {
        user_id: payload.user_id,
        entity_id: target_entity.id,
      }
    );
  }

  // 3. Periksa apakah data profil bisnis masih berupa nilai default trigger (PRIORITAS 2)
  const parsed_lat = parseFloat(target_entity.latitude ?? '0');
  const parsed_lng = parseFloat(target_entity.longitude ?? '0');
  const is_lat_lng_zero = parsed_lat === 0 && parsed_lng === 0;

  const normalized_legal_name = (target_entity.legal_name || '')
    .trim()
    .toLowerCase();
  const is_default_legal_name =
    normalized_legal_name === 'nama usaha belum disetel' ||
    normalized_legal_name === 'nama usaha belum di setel';

  if (is_lat_lng_zero || is_default_legal_name) {
    throw new AppError(
      'Login ditolak: Data profil bisnis belum dilengkapi. Silakan lengkapi profil usaha melalui registrasi.',
      403,
      'BUSINESS_PROFILE_INCOMPLETE',
      {
        user_id: payload.user_id,
        entity_id: target_entity.id,
        is_default_legal_name,
        is_default_lat_lng: is_lat_lng_zero,
      }
    );
  }

  // 4. Tentukan role yang akan digunakan untuk sesi token ini
  let selected_role = active_roles[0];
  if (payload.role) {
    const matched_role = active_roles.find(
      (item) => item.role_type === payload.role
    );
    if (!matched_role) {
      throw new AppError(
        `Pengguna tidak memiliki role aktif sebagai ${payload.role}`,
        403,
        'ROLE_NOT_FOUND'
      );
    }
    selected_role = matched_role;
  }

  if (!selected_role) {
    throw new AppError('Role pengguna tidak valid', 500, 'INTERNAL_SERVER_ERROR');
  }

  // 5. Generate token JWT KUMPUL dengan payload kustom
  const token_payload: AuthUserPayload = {
    sub: payload.user_id,
    user_id: payload.user_id,
    auth_user_id: target_entity.auth_user_id ?? payload.user_id,
    entity_id: target_entity.id,
    role: selected_role.role_type,
    role_type: selected_role.role_type,
  };

  const auth_token = jwt.sign(token_payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  return {
    token: auth_token,
    user_id: payload.user_id,
    entity_id: target_entity.id,
    active_role: selected_role,
    available_roles: active_roles,
    business_entity: target_entity,
  };
};
