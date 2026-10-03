import type { Request, Response, NextFunction } from 'express';
import {
  create_commodity_batch_tag_service,
  get_commodity_batch_tag_by_id_service,
  list_batch_tags_by_commodity_id_service,
  update_commodity_batch_tag_service,
  verify_batch_tag_with_ai_service,
  delete_commodity_batch_tag_service,
} from '../../services/products/commodity-batch-tag-service';

export const create_commodity_batch_tag = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formatted_payload = {
      commodity_id: req.body.commodity_id,
      supporting_file_url: req.body.supporting_file_url ?? req.body.supporting_file,
      storage_temperature_type: req.body.storage_temperature_type,
      is_verified: req.body.is_verified,
    };

    const created_item = await create_commodity_batch_tag_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Commodity batch tag berhasil dibuat',
      data: created_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_commodity_batch_tag_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tag_id = req.params.id as string;
    const item_data = await get_commodity_batch_tag_by_id_service(tag_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail commodity batch tag berhasil diambil',
      data: item_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_batch_tags_by_commodity_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commodity_id = req.params.commodity_id as string;
    const items_data = await list_batch_tags_by_commodity_id_service(commodity_id);

    res.status(200).json({
      status: 'success',
      message: 'Daftar commodity batch tag berhasil diambil',
      data: items_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_commodity_batch_tag = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tag_id = req.params.id as string;
    const formatted_payload = {
      commodity_id: req.body.commodity_id,
      supporting_file_url: req.body.supporting_file_url ?? req.body.supporting_file,
      storage_temperature_type: req.body.storage_temperature_type,
      is_verified: req.body.is_verified,
    };

    const updated_item = await update_commodity_batch_tag_service(tag_id, formatted_payload);

    res.status(200).json({
      status: 'success',
      message: 'Commodity batch tag berhasil diperbarui',
      data: updated_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const verify_commodity_batch_tag_with_ai = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tag_id = req.params.id as string;
    const result = await verify_batch_tag_with_ai_service(tag_id);

    res.status(200).json({
      status: 'success',
      message: 'Verifikasi AI dokumen batch tag berhasil diselesaikan',
      data: {
        batch_tag: result.tag,
        verification: result.verification,
      },
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const delete_commodity_batch_tag = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tag_id = req.params.id as string;
    const deleted_item = await delete_commodity_batch_tag_service(tag_id);

    res.status(200).json({
      status: 'success',
      message: 'Commodity batch tag berhasil dihapus',
      data: deleted_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
