import type { Request, Response, NextFunction } from 'express';
import {
  create_entity_service,
  update_entity_service,
  update_profile_service,
  get_entity_by_id_service,
  list_entities_service,
} from '../../services/accounts/business-entity-service';

export const create_business_entity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formatted_payload = {
      auth_user_id: req.body.auth_user_id,
      legal_name: req.body.legal_name,
      npwp_nib: req.body.npwp_nib,
      default_address: req.body.default_address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      bank_account_info: req.body.bank_account_info,
      profile_picture_url: req.body.profile_picture_url,
    };

    const created_entity = await create_entity_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Business entity berhasil didaftarkan',
      data: created_entity,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_business_entity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entity_id = req.params.id as string;
    const formatted_payload = {
      legal_name: req.body.legal_name,
      npwp_nib: req.body.npwp_nib,
      default_address: req.body.default_address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      bank_account_info: req.body.bank_account_info,
      profile_picture_url: req.body.profile_picture_url,
    };

    const updated_entity = await update_entity_service(entity_id, formatted_payload);

    res.status(200).json({
      status: 'success',
      message: 'Business entity berhasil diperbarui',
      data: updated_entity,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_entity_profile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entity_id = req.params.id as string;
    const profile_payload = {
      legal_name: req.body.legal_name,
      default_address: req.body.default_address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      bank_account_info: req.body.bank_account_info,
      profile_picture_url: req.body.profile_picture_url,
    };

    const updated_profile = await update_profile_service(entity_id, profile_payload);

    res.status(200).json({
      status: 'success',
      message: 'Profil business entity berhasil diperbarui',
      data: updated_profile,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_business_entity_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const entity_id = req.params.id as string;
    const found_entity = await get_entity_by_id_service(entity_id);

    res.status(200).json({
      status: 'success',
      message: 'Business entity berhasil diambil',
      data: found_entity,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_business_entities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed_limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const parsed_offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const entities = await list_entities_service(parsed_limit, parsed_offset);

    res.status(200).json({
      status: 'success',
      message: 'Daftar business entities berhasil diambil',
      data: entities,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
