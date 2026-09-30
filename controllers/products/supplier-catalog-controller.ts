import type { Request, Response, NextFunction } from 'express';
import {
  create_supplier_commodity_service,
  get_commodity_by_id_service,
  list_commodities_by_supplier_service,
  list_all_catalog_commodities_service,
  update_supplier_commodity_service,
  delete_supplier_commodity_service,
} from '../../services/products/supplier-catalog-service';

export const create_supplier_commodity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formatted_payload = {
      supplier_role_id: req.body.supplier_role_id,
      name: req.body.name,
      wholesale_unit: req.body.wholesale_unit,
      base_moq: req.body.base_moq,
      lead_time_days: req.body.lead_time_days,
      is_marketplace_active: req.body.is_marketplace_active,
    };

    const created_item = await create_supplier_commodity_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Komoditas katalog supplier berhasil ditambahkan dengan SKU otomatis',
      data: created_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_supplier_commodity_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commodity_id = req.params.id as string;
    const item_data = await get_commodity_by_id_service(commodity_id);

    res.status(200).json({
      status: 'success',
      message: 'Detail komoditas katalog berhasil diambil',
      data: item_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const list_supplier_commodities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed_limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const parsed_offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const supplier_role_id = req.query.supplier_role_id as string | undefined;

    let catalog_items;
    if (supplier_role_id) {
      catalog_items = await list_commodities_by_supplier_service(
        supplier_role_id,
        parsed_limit,
        parsed_offset
      );
    } else {
      catalog_items = await list_all_catalog_commodities_service(
        parsed_limit,
        parsed_offset
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Daftar komoditas katalog supplier berhasil diambil',
      data: catalog_items,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const update_supplier_commodity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commodity_id = req.params.id as string;
    const formatted_update_payload = {
      name: req.body.name,
      wholesale_unit: req.body.wholesale_unit,
      base_moq: req.body.base_moq,
      lead_time_days: req.body.lead_time_days,
      is_marketplace_active: req.body.is_marketplace_active,
    };

    const updated_item = await update_supplier_commodity_service(
      commodity_id,
      formatted_update_payload
    );

    res.status(200).json({
      status: 'success',
      message: 'Komoditas katalog supplier berhasil diperbarui',
      data: updated_item,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const delete_supplier_commodity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commodity_id = req.params.id as string;
    await delete_supplier_commodity_service(commodity_id);

    res.status(200).json({
      status: 'success',
      message: 'Komoditas katalog supplier berhasil dihapus',
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
