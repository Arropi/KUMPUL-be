import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error-middleware.ts';
import type { AuthUserPayload } from '../types/auth-types.ts';
import type { RoleType } from '../types/profile-types.ts';
import {
  find_active_role_by_entity_and_type,
  find_entity_by_auth_user_id,
} from '../repositories/profile/profile-repositories.ts';

const JWT_SECRET = process.env.JWT_SECRET as string
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Helper untuk mengekstrak dan memverifikasi token JWT dari header Authorization.
 */
const extract_and_verify_token = (req: Request): AuthUserPayload => {
  const authorization_header = req.headers.authorization;
  if (!authorization_header) {
    throw new AppError(
      'Token otorisasi tidak ditemukan pada header Authorization',
      401,
      'TOKEN_MISSING'
    );
  }

  const token_parts = authorization_header.split(' ');
  if (token_parts.length !== 2 || token_parts[0]?.toLowerCase() !== 'bearer') {
    throw new AppError(
      'Format Authorization header tidak valid. Gunakan: Bearer <token>',
      401,
      'INVALID_TOKEN_FORMAT'
    );
  }

  const token_value = token_parts[1]?.trim();
  if (!token_value) {
    throw new AppError(
      'Token otorisasi kosong',
      401,
      'EMPTY_TOKEN'
    );
  }

  try {
    const verified_payload = jwt.verify(token_value, JWT_SECRET);
    return verified_payload as AuthUserPayload;
  } catch (verify_error) {
    if (verify_error instanceof jwt.TokenExpiredError) {
      throw new AppError(
        'Token telah kedaluwarsa, silakan login kembali',
        401,
        'TOKEN_EXPIRED'
      );
    }

    if (verify_error instanceof jwt.JsonWebTokenError) {
      throw new AppError(
        'Token autentikasi tidak valid',
        401,
        'INVALID_TOKEN'
      );
    }

    throw new AppError(
      'Gagal memverifikasi token autentikasi',
      401,
      'AUTHENTICATION_FAILED'
    );
  }
};

/**
 * Helper untuk mengecek apakah user memiliki role tertentu (baik dari claim token maupun database).
 */
const check_user_has_role = async (
  user_payload: AuthUserPayload,
  expected_role: RoleType
): Promise<boolean> => {
  // 1. Cek langsung dari claim payload token
  if (
    user_payload.role === expected_role ||
    user_payload.role_type === expected_role ||
    (Array.isArray(user_payload.roles) && user_payload.roles.includes(expected_role)) ||
    user_payload.app_metadata?.role === expected_role ||
    (Array.isArray(user_payload.app_metadata?.roles) &&
      user_payload.app_metadata.roles.includes(expected_role)) ||
    user_payload.user_metadata?.role === expected_role
  ) {
    return true;
  }

  // 2. Cek berbasis entity_id dari database
  const target_entity_id =
    user_payload.entity_id ||
    (typeof user_payload.sub === 'string' && UUID_REGEX.test(user_payload.sub)
      ? user_payload.sub
      : undefined);

  if (target_entity_id) {
    const active_role_record = await find_active_role_by_entity_and_type(
      target_entity_id,
      expected_role
    );
    if (active_role_record) {
      user_payload.entity_id = target_entity_id;
      user_payload.active_role = active_role_record;
      user_payload.role = expected_role;
      return true;
    }
  }

  // 3. Cek berbasis auth_user_id dari tabel business_entities
  const auth_user_id_candidate =
    user_payload.auth_user_id ||
    user_payload.user_id ||
    (typeof user_payload.sub === 'string' && UUID_REGEX.test(user_payload.sub)
      ? user_payload.sub
      : undefined);

  if (auth_user_id_candidate) {
    const matched_entity = await find_entity_by_auth_user_id(auth_user_id_candidate);
    if (matched_entity) {
      user_payload.entity_id = matched_entity.id;
      const active_role_record = await find_active_role_by_entity_and_type(
        matched_entity.id,
        expected_role
      );
      if (active_role_record) {
        user_payload.active_role = active_role_record;
        user_payload.role = expected_role;
        return true;
      }
    }
  }

  return false;
};

/**
 * 1. Middleware Validasi Token (JWT):
 * Memeriksa keabsahan token JWT dari header Authorization.
 * Jika valid, hasil decode disimpan pada req.user agar bisa digunakan oleh middleware atau controller setelahnya.
 */
export const authenticate_jwt = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const decoded_user = extract_and_verify_token(req);
    req.user = decoded_user;
    next();
  } catch (auth_error) {
    next(auth_error);
  }
};

/**
 * 2. Middleware Validasi Role UMKM:
 * Memastikan pengguna yang terautentikasi memiliki role aktif UMKM.
 */
export const require_umkm = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Jika belum melewati authenticate_jwt namun ada Authorization header, decode terlebih dahulu
    if (!req.user && req.headers.authorization) {
      req.user = extract_and_verify_token(req);
    }

    if (!req.user) {
      throw new AppError(
        'Pengguna belum terautentikasi, token diperlukan',
        401,
        'UNAUTHORIZED'
      );
    }

    const is_valid_umkm = await check_user_has_role(req.user, 'UMKM');
    if (!is_valid_umkm) {
      throw new AppError(
        'Akses ditolak: Hanya pengguna dengan role UMKM yang diizinkan mengakses resource ini',
        403,
        'FORBIDDEN_UMKM_ONLY'
      );
    }

    next();
  } catch (role_error) {
    next(role_error);
  }
};

/**
 * 3. Middleware Validasi Role SUPPLIER:
 * Memastikan pengguna yang terautentikasi memiliki role aktif SUPPLIER.
 */
export const require_supplier = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Jika belum melewati authenticate_jwt namun ada Authorization header, decode terlebih dahulu
    if (!req.user && req.headers.authorization) {
      req.user = extract_and_verify_token(req);
    }

    if (!req.user) {
      throw new AppError(
        'Pengguna belum terautentikasi, token diperlukan',
        401,
        'UNAUTHORIZED'
      );
    }

    const is_valid_supplier = await check_user_has_role(req.user, 'SUPPLIER');
    if (!is_valid_supplier) {
      throw new AppError(
        'Akses ditolak: Hanya pengguna dengan role SUPPLIER yang diizinkan mengakses resource ini',
        403,
        'FORBIDDEN_SUPPLIER_ONLY'
      );
    }

    next();
  } catch (role_error) {
    next(role_error);
  }
};

// Aliases untuk fleksibilitas penamaan
export const auth_middleware = authenticate_jwt;
export const verify_token = authenticate_jwt;
export const is_umkm_middleware = require_umkm;
export const is_supplier_middleware = require_supplier;

export const optional_authenticate_jwt = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.headers.authorization) {
    try {
      req.user = extract_and_verify_token(req);
    } catch {
      // Ignore in optional mode
    }
  }
  next();
};
