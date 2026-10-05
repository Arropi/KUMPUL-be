import { Router } from 'express';
import {
  get_marketplace_catalog,
  get_marketplace_commodity_detail,
  get_marketplace_recommendations,
} from '../../controllers/products/marketplace-controller';
import { authenticate_jwt } from '../../middleware/auth-middleware';
import { get_marketplace_catalog_validation } from '../../validations/products/marketplace-validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Unified Marketplace
 *   description: Katalog marketplace terpadu, detail komoditas, dan mesin rekomendasi cerdas UMKM/Supplier
 */

/**
 * @swagger
 * /api/marketplace:
 *   get:
 *     summary: Mendapatkan katalog marketplace terpadu dengan filter dan status pool aktif
 *     tags: [Unified Marketplace]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Pencarian nama atau deskripsi komoditas
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter kategori atau sektor
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Batas harga maksimum
 *       - in: query
 *         name: storage_temp
 *         schema:
 *           type: string
 *           enum: [AMBIENT, CHILLED, FROZEN]
 *         description: Filter suhu penyimpanan komoditas
 *       - in: query
 *         name: ready_stock
 *         schema:
 *           type: boolean
 *         description: Hanya tampilkan komoditas yang memiliki stok tersedia (stock - reserved > 0)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Katalog marketplace berhasil diambil
 */
router.get('/', get_marketplace_catalog_validation, get_marketplace_catalog);

/**
 * @swagger
 * /api/marketplace/recommendations:
 *   get:
 *     summary: Mendapatkan rekomendasi cerdas dual-engine (UMKM atau Supplier sesuai peran login)
 *     tags: [Unified Marketplace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rekomendasi cerdas berhasil diambil
 *       401:
 *         description: Pengguna belum terautentikasi
 */
router.get('/recommendations', authenticate_jwt, get_marketplace_recommendations);

/**
 * @swagger
 * /api/marketplace/{id}:
 *   get:
 *     summary: Mendapatkan detail lengkap satu komoditas marketplace beserta tier harga dan pooling aktif
 *     tags: [Unified Marketplace]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detail komoditas berhasil diambil
 *       404:
 *         description: Komoditas tidak ditemukan
 */
router.get('/:id', get_marketplace_commodity_detail);

export default router;
