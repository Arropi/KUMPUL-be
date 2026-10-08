import { Router } from 'express';
import multer from 'multer';
import { upload_file_controller } from '../../controllers/storage/storage-controller.ts';

const storage_router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Megabytes limit
  },
});

// Middleware fleksibel untuk menerima file dari field 'file' atau 'image'
const flexible_file_upload = (req: any, res: any, next: any) => {
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      return next(err);
    }
    // Set req.file ke field yang terisi
    if (req.files && typeof req.files === 'object') {
      const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (filesObj.file && filesObj.file.length > 0) {
        req.file = filesObj.file[0];
      } else if (filesObj.image && filesObj.image.length > 0) {
        req.file = filesObj.image[0];
      }
    }
    next();
  });
};

/**
 * @openapi
 * /api/upload:
 *   post:
 *     summary: Unggah gambar atau dokumen ke Supabase Storage
 *     tags:
 *       - Storage
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 description: Subfolder tujuan di Supabase bucket (contoh katalog, batch-documents)
 *     responses:
 *       201:
 *         description: Berhasil mengunggah file
 */
storage_router.post('/', flexible_file_upload, upload_file_controller);
storage_router.post('/image', flexible_file_upload, upload_file_controller);
storage_router.post('/file', flexible_file_upload, upload_file_controller);

export default storage_router;
