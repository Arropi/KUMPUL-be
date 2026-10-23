import type { Request } from 'express';
import { AppError } from '../middleware/error-middleware.ts';
import {
  find_active_role_by_entity_and_type,
  find_roles_by_entity_id,
  find_entity_by_auth_user_id,
} from '../repositories/profile/profile-repositories.ts';
import type { RoleType } from '../types/profile-types.ts';
import { authRoleCache } from './cache-utils.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const get_authenticated_role_id = async (
  req: Request,
  expected_role?: RoleType
): Promise<string> => {
  if (req.user?.active_role?.id) {
    if (!expected_role || req.user.active_role.role_type === expected_role) {
      return req.user.active_role.id;
    }
  }

  const direct_role_id = req.user?.role_id;
  if (typeof direct_role_id === 'string' && direct_role_id.length > 0) {
    return direct_role_id;
  }

  const cache_key = `${req.user?.auth_user_id || req.user?.sub || ''}_${req.user?.entity_id || ''}_${expected_role || ''}`;
  if (cache_key.length > 2 && authRoleCache.has(cache_key)) {
    return authRoleCache.get(cache_key)!;
  }
  let entity_id = req.user?.entity_id;

  // Jika entity_id belum ada di req.user, coba cari berdasarkan auth_user_id / user_id / sub
  if (!entity_id) {
    const auth_uid_candidate =
      req.user?.auth_user_id ||
      req.user?.user_id ||
      (typeof req.user?.sub === 'string' && UUID_REGEX.test(req.user.sub)
        ? req.user.sub
        : undefined);

    if (auth_uid_candidate) {
      const entity = await find_entity_by_auth_user_id(auth_uid_candidate);
      if (entity) {
        entity_id = entity.id;
        if (req.user) {
          req.user.entity_id = entity.id;
        }
      }
    }
  }

  if (entity_id) {
    const target_role = expected_role || (req.user?.role as RoleType) || (req.user?.role_type as RoleType);
    if (target_role) {
      const role_record = await find_active_role_by_entity_and_type(entity_id, target_role);
      if (role_record) {
        authRoleCache.set(cache_key, role_record.id);
        return role_record.id;
      }
    }

    // Jika target_role belum spesifik atau tidak ditemukan, ambil role aktif pertama yang dimiliki entitas
    const entity_roles = await find_roles_by_entity_id(entity_id);
    const active_role = entity_roles.find((r) => r.is_active && (!expected_role || r.role_type === expected_role));
    if (active_role) {
      authRoleCache.set(cache_key, active_role.id);
      return active_role.id;
    }
  }

  throw new AppError(
    'Role bisnis aktif tidak ditemukan untuk akun ini',
    403,
    'ACTIVE_ROLE_NOT_FOUND'
  );
};
