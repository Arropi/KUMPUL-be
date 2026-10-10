import type { Request, Response, NextFunction } from 'express';
import { upload_file_to_supabase, delete_file_from_supabase } from '../../config/supabase.ts';
import { AppError } from '../../middleware/error-middleware.ts';
import {
  find_entity_by_id,
  find_business_role_by_id,
} from '../../repositories/products/supplier-catalog-repositories.ts';
import { find_active_role_by_entity_and_type } from '../../repositories/profile/profile-repositories.ts';

export const upload_file_controller = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError('File tidak ditemukan dalam permintaan form data. Harap sertakan field "file" atau "image".', 400, 'NO_FILE_UPLOADED');
    }

    const target_folder =
      (req.body?.folder as string) ||
      (req.query?.folder as string) ||
      'katalog';

    // Validasi kelengkapan profil usaha supplier (termasuk nomor telepon) sebelum mengunggah foto komoditas ke Supabase Storage
    const role_id =
      (req.body?.supplier_role_id as string) ||
      (req.query?.supplier_role_id as string) ||
      (req as any).user?.role_id;
    const entity_id =
      (req.body?.entity_id as string) ||
      (req.query?.entity_id as string) ||
      (req as any).user?.entity_id;

    if (target_folder === 'katalog' && (role_id || entity_id)) {
      let entity = null;
      let supplier_role = null;

      if (role_id) {
        supplier_role = await find_business_role_by_id(role_id);
        if (supplier_role) {
          entity = await find_entity_by_id(supplier_role.entity_id);
        }
      } else if (entity_id) {
        entity = await find_entity_by_id(entity_id);
        supplier_role = await find_active_role_by_entity_and_type(entity_id, 'SUPPLIER');
      }

      if (entity) {
        const bank_info = (entity.bank_account_info || {}) as Record<string, any>;
        const has_phone = Boolean(entity.phone_number?.trim() || bank_info.phone?.trim());
        const has_bank = Boolean(
          (Array.isArray(bank_info.accounts) && bank_info.accounts.length > 0) ||
          bank_info.account_number?.trim()
        );
        const has_storage = Boolean(
          (supplier_role?.storage_capacity && supplier_role.storage_capacity > 0) ||
          Number(bank_info.storage_value) > 0
        );

        if (!has_phone || !has_bank || !has_storage) {
          const missing: string[] = [];
          if (!has_phone) missing.push('nomor kontak/telepon');
          if (!has_bank) missing.push('rekening bank');
          if (!has_storage) missing.push('kapasitas penyimpanan gudang');

          throw new AppError(
            `Profil usaha Anda belum lengkap (${missing.join(', ')}). Tidak dapat mengunggah file ke Supabase Storage sebelum profil dilengkapi agar penyimpanan tidak penuh.`,
            400,
            'INCOMPLETE_SUPPLIER_PROFILE',
            { missing_fields: missing }
          );
        }
      }
    }

    const upload_result = await upload_file_to_supabase({
      file_buffer: file.buffer,
      file_name: file.originalname,
      content_type: file.mimetype,
      folder: target_folder,
    });

    res.status(201).json({
      status: 'success',
      message: 'File berhasil diunggah ke Supabase Storage',
      data: {
        url: upload_result.url,
        path: upload_result.path,
        bucket: upload_result.bucket,
        file_name: upload_result.file_name,
        original_name: file.originalname,
        size: upload_result.size,
        content_type: upload_result.content_type,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const delete_file_controller = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file_path =
      (req.body?.path as string) ||
      (req.query?.path as string) ||
      (req.params?.path as string);

    if (!file_path) {
      throw new AppError('Field "path" wajib disertakan untuk menghapus file.', 400, 'MISSING_FILE_PATH');
    }

    const success = await delete_file_from_supabase(file_path);
    if (!success) {
      throw new AppError('Gagal menghapus file dari Supabase Storage', 500, 'DELETE_FAILED');
    }

    res.status(200).json({
      status: 'success',
      message: 'File berhasil dihapus dari Supabase Storage',
      data: { path: file_path },
    });
  } catch (error) {
    next(error);
  }
};
