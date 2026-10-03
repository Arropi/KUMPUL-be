import type { Request, Response, NextFunction } from 'express';
import {
  register_user_role_service,
  login_user_service,
} from '../../services/auth/auth-service';
import type { RoleType, SectorType } from '../../types/business-role-types';

export const register_user_role = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formatted_payload = {
      user_id: req.body.user_id as string,
      role: req.body.role as RoleType,
      sector: req.body.sector as SectorType,
      legal_name: req.body.legal_name as string,
      npwp_nib: req.body.npwp_nib as string,
      default_address: req.body.default_address as string,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      bank_account_info: req.body.bank_account_info,
      profile_picture_url: req.body.profile_picture_url as string,
      storage_capacity: req.body.storage_capacity,
    };

    const registration_result = await register_user_role_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Registrasi role dan profil bisnis pengguna berhasil',
      data: registration_result,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const login_user = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formatted_payload = {
      user_id: req.body.user_id as string,
      role: req.body.role ? (req.body.role as RoleType) : undefined,
    };

    const login_result = await login_user_service(formatted_payload);

    res.status(200).json({
      status: 'success',
      message: 'Login pengguna berhasil',
      data: login_result,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
