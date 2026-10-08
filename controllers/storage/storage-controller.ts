import type { Request, Response, NextFunction } from 'express';
import { upload_file_to_supabase } from '../../config/supabase.ts';
import { AppError } from '../../middleware/error-middleware.ts';

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
