import type { Request } from 'express';
import { AppError } from '../middleware/error-middleware';
import { find_active_role_by_entity_and_type } from '../repositories/profile/profile-repositories';
import type { RoleType } from '../types/profile-types';

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

  const entity_id = req.user?.entity_id;
  if (entity_id && expected_role) {
    const role_record = await find_active_role_by_entity_and_type(entity_id, expected_role);
    if (role_record) {
      return role_record.id;
    }
  }

  throw new AppError(
    'Role bisnis aktif tidak ditemukan untuk akun ini',
    403,
    'ACTIVE_ROLE_NOT_FOUND'
  );
};
