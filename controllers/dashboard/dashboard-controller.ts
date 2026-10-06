import type { Request, Response, NextFunction } from 'express';
import {
  get_supplier_dashboard_service,
  get_umkm_dashboard_service,
} from '../../services/dashboard/dashboard-service.ts';
import { get_authenticated_role_id } from '../../utils/auth-utils.ts';

export const get_supplier_dashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const supplier_role_id = await get_authenticated_role_id(req, 'SUPPLIER');
    const dashboard_data = await get_supplier_dashboard_service(supplier_role_id);

    res.status(200).json({
      status: 'success',
      message: 'Dashboard analitik Supplier berhasil diambil',
      data: dashboard_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const get_umkm_dashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const umkm_role_id = await get_authenticated_role_id(req, 'UMKM');
    const dashboard_data = await get_umkm_dashboard_service(umkm_role_id);

    res.status(200).json({
      status: 'success',
      message: 'Dashboard operasional UMKM berhasil diambil',
      data: dashboard_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
