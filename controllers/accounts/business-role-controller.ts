import type { Request, Response, NextFunction } from 'express';
import {
  create_business_role_service,
  get_business_role_by_id_service,
  list_business_roles_service,
  update_business_role_service,
  delete_business_role_service,
} from '../../services/accounts/business-role-service';
import type { RoleType, SectorType } from '../../types/business-role-types';

export const create_business_role = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const raw_sector = req.body.sector_type ?? req.body.sector;
    const formatted_payload = {
      entity_id: req.body.entity_id,
      role_type: req.body.role_type as RoleType,
      sector_type: raw_sector ? (raw_sector as SectorType) : undefined,
      storage_capacity: req.body.storage_capacity,
      is_active: req.body.is_active,
    };

    const created_role = await create_business_role_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Business entity role berhasil ditambahkan',
      data: created_role,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_business_role_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role_id = req.params.id as string;
    const role_detail = await get_business_role_by_id_service(role_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail business entity role berhasil diambil',
      data: role_detail,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_business_roles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const raw_query_sector = req.query.sector_type ?? req.query.sector;
    const filter_params = {
      entity_id: req.query.entity_id as string | undefined,
      role_type: req.query.role_type as RoleType | undefined,
      sector_type: raw_query_sector ? (raw_query_sector as SectorType) : undefined,
      is_active:
        req.query.is_active !== undefined
          ? req.query.is_active === 'true'
          : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    const roles_list = await list_business_roles_service(filter_params);

    res.status(200).json({
      status: 'success',
      message: 'Daftar business entity roles berhasil diambil',
      data: roles_list,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_business_role = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role_id = req.params.id as string;
    const raw_update_sector = req.body.sector_type ?? req.body.sector;
    const formatted_update_payload = {
      sector_type:
        raw_update_sector !== undefined
          ? raw_update_sector
            ? (raw_update_sector as SectorType)
            : null
          : undefined,
      storage_capacity: req.body.storage_capacity,
      is_active: req.body.is_active,
    };

    const updated_role = await update_business_role_service(
      role_id,
      formatted_update_payload
    );

    res.status(200).json({
      status: 'success',
      message: 'Business entity role berhasil diperbarui',
      data: updated_role,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const delete_business_role = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const role_id = req.params.id as string;
    await delete_business_role_service(role_id);

    res.status(200).json({
      status: 'success',
      message: 'Business entity role berhasil dihapus',
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
