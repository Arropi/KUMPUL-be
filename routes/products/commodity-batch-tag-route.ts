import { Router } from 'express';
import {
  create_commodity_batch_tag,
  get_commodity_batch_tag_by_id,
  list_batch_tags_by_commodity_id,
  update_commodity_batch_tag,
  verify_commodity_batch_tag_with_ai,
  delete_commodity_batch_tag,
} from '../../controllers/products/commodity-batch-tag-controller';
import {
  create_commodity_batch_tag_validation,
  update_commodity_batch_tag_validation,
  batch_tag_id_param_validation,
  commodity_batch_tags_by_commodity_validation,
} from '../../validations/products/commodity-batch-tag-validation';

const router = Router();

/**
 * @swagger
 * /api/commodity-batch-tags/commodity/{commodity_id}:
 *   get:
 *     summary: Mendapatkan daftar batch tag berdasarkan ID komoditas
 *     tags: [CommodityBatchTags]
 *     parameters:
 *       - in: path
 *         name: commodity_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari komoditas
 *     responses:
 *       200:
 *         description: Daftar batch tag berhasil diambil
 *       404:
 *         description: Komoditas tidak ditemukan
 */
router.get(
  '/commodity/:commodity_id',
  commodity_batch_tags_by_commodity_validation,
  list_batch_tags_by_commodity_id
);

/**
 * @swagger
 * /api/commodity-batch-tags/{id}:
 *   get:
 *     summary: Mendapatkan detail batch tag komoditas berdasarkan ID
 *     tags: [CommodityBatchTags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari batch tag
 *     responses:
 *       200:
 *         description: Data batch tag berhasil ditemukan
 *       404:
 *         description: Batch tag tidak ditemukan
 */
router.get('/:id', batch_tag_id_param_validation, get_commodity_batch_tag_by_id);

/**
 * @swagger
 * /api/commodity-batch-tags:
 *   post:
 *     summary: Menambahkan batch tag baru untuk komoditas
 *     tags: [CommodityBatchTags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commodity_id
 *             properties:
 *               commodity_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-2222-3333-4444-555555555555"
 *               supporting_file_url:
 *                 type: string
 *                 nullable: true
 *                 example: "https://storage.supabase.co/kumpul-files/docs/cert-batch-001.pdf"
 *                 description: URL berkas/file pendukung (dokumen mutu/izin/sertifikasi) untuk verifikasi AI
 *               storage_temperature_type:
 *                 type: string
 *                 enum: [AMBIENT, CHILLED, FROZEN]
 *                 default: AMBIENT
 *                 example: "AMBIENT"
 *               is_verified:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *                 description: Status verifikasi batch (diverifikasi oleh AI model Gemini)
 *     responses:
 *       201:
 *         description: Commodity batch tag berhasil dibuat
 *       400:
 *         description: Validasi input gagal
 *       404:
 *         description: Komoditas tidak ditemukan
 */
router.post('/', create_commodity_batch_tag_validation, create_commodity_batch_tag);

/**
 * @swagger
 * /api/commodity-batch-tags/{id}:
 *   put:
 *     summary: Memperbarui data batch tag komoditas (termasuk is_verified hasil verifikasi AI)
 *     tags: [CommodityBatchTags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari batch tag
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commodity_id:
 *                 type: string
 *                 format: uuid
 *               supporting_file_url:
 *                 type: string
 *                 nullable: true
 *                 example: "https://storage.supabase.co/kumpul-files/docs/cert-batch-001.pdf"
 *                 description: URL berkas/file pendukung (dokumen mutu/izin/sertifikasi) untuk verifikasi AI
 *               storage_temperature_type:
 *                 type: string
 *                 enum: [AMBIENT, CHILLED, FROZEN]
 *                 example: "CHILLED"
 *               is_verified:
 *                 type: boolean
 *                 example: true
 *                 description: Menandai apakah batch telah lolos verifikasi AI
 *     responses:
 *       200:
 *         description: Commodity batch tag berhasil diperbarui
 *       400:
 *         description: Validasi input gagal
 *       404:
 *         description: Batch tag atau komoditas tidak ditemukan
 */
router.put('/:id', update_commodity_batch_tag_validation, update_commodity_batch_tag);

/**
 * @swagger
 * /api/commodity-batch-tags/{id}/verify:
 *   post:
 *     summary: Memvalidasi berkas pendukung batch tag menggunakan AI Gemini (kebersihan, legalitas & masa berlaku)
 *     tags: [CommodityBatchTags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari batch tag yang akan diverifikasi
 *     responses:
 *       200:
 *         description: Verifikasi AI berhasil dijalankan dan status is_verified diperbarui
 *       400:
 *         description: Dokumen pendukung tidak ditemukan pada batch tag
 *       404:
 *         description: Batch tag tidak ditemukan
 */
router.post('/:id/verify', batch_tag_id_param_validation, verify_commodity_batch_tag_with_ai);

/**
 * @swagger
 * /api/commodity-batch-tags/{id}:
 *   delete:
 *     summary: Menghapus batch tag komoditas berdasarkan ID
 *     tags: [CommodityBatchTags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari batch tag
 *     responses:
 *       200:
 *         description: Commodity batch tag berhasil dihapus
 *       404:
 *         description: Batch tag tidak ditemukan
 */
router.delete('/:id', batch_tag_id_param_validation, delete_commodity_batch_tag);

export default router;
