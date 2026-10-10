import { Router } from 'express';
import {
  buy_waste_listing,
  confirm_waste_pickup,
  create_waste_listing,
  get_buyer_waste_transactions,
  get_nearest_offtakers,
  get_seller_waste_transactions,
  get_waste_listing_detail,
  get_waste_listings,
  refer_listing_to_offtaker,
} from '../../controllers/waste/waste-controller.ts';
import { authenticate_jwt, authenticate_optional_jwt } from '../../middleware/auth-middleware.ts';
import {
  buy_waste_validation,
  confirm_pickup_validation,
  create_waste_listing_validation,
  offtaker_referral_validation,
} from '../../validations/waste/waste-validation.ts';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Waste Exchange
 *   description: Manajemen bursa limbah produktif & rekomendasi Bank Sampah terdekat
 */

/**
 * @swagger
 * /api/waste-listings:
 *   get:
 *     summary: Mendapatkan daftar limbah produktif yang tersedia di marketplace
 *     tags: [Waste Exchange]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [ORGANIK_BASAH, ORGANIK_KERING, TEKSTIL_PERCA, ANORGANIK]
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Berhasil mengambil daftar limbah
 */
router.get('/', authenticate_optional_jwt, get_waste_listings);

/**
 * @swagger
 * /api/waste-listings/recommendations/offtakers:
 *   get:
 *     summary: Mendapatkan rekomendasi 5 Bank Sampah / TPS3R terdekat berdasarkan koordinat
 *     tags: [Waste Exchange]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listing_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Daftar Bank Sampah terdekat berhasil diambil
 */
router.get('/recommendations/offtakers', authenticate_jwt, get_nearest_offtakers);

/**
 * @swagger
 * /api/waste-listings/transactions/purchases:
 *   get:
 *     summary: Mendapatkan riwayat pembelian limbah oleh pengguna aktif
 *     tags: [Waste Exchange]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Riwayat pembelian berhasil diambil
 */
router.get('/transactions/purchases', authenticate_jwt, get_buyer_waste_transactions);

/**
 * @swagger
 * /api/waste-listings/transactions/sales:
 *   get:
 *     summary: Mendapatkan riwayat penjualan limbah oleh penjual aktif
 *     tags: [Waste Exchange]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Riwayat penjualan limbah berhasil diambil
 */
router.get('/transactions/sales', authenticate_jwt, get_seller_waste_transactions);

/**
 * @swagger
 * /api/waste-listings/{id}:
 *   get:
 *     summary: Mendapatkan detail listing limbah berdasarkan ID
 *     tags: [Waste Exchange]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detail listing limbah berhasil diambil
 *       404:
 *         description: Listing limbah tidak ditemukan
 */
router.get('/:id', get_waste_listing_detail);

/**
 * @swagger
 * /api/waste-listings:
 *   post:
 *     summary: Membuat listing limbah baru oleh UMKM/pelaku usaha
 *     tags: [Waste Exchange]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listing_title
 *               - waste_category
 *               - available_weight
 *               - price_per_kg
 *               - expired_at
 *             properties:
 *               listing_title:
 *                 type: string
 *               waste_category:
 *                 type: string
 *                 enum: [ORGANIK_BASAH, ORGANIK_KERING, TEKSTIL_PERCA, ANORGANIK]
 *               available_weight:
 *                 type: number
 *               price_per_kg:
 *                 type: number
 *               expired_at:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *               umkm_product_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Listing limbah berhasil dibuat
 */
router.post(
  '/',
  authenticate_jwt,
  create_waste_listing_validation,
  create_waste_listing
);

/**
 * @swagger
 * /api/waste-listings/{id}/buy:
 *   post:
 *     summary: Melakukan pembelian limbah produktif
 *     tags: [Waste Exchange]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchased_weight
 *               - pickup_date
 *             properties:
 *               purchased_weight:
 *                 type: number
 *               pickup_date:
 *                 type: string
 *                 example: "2026-10-15"
 *     responses:
 *       201:
 *         description: Transaksi pembelian limbah berhasil dibuat
 */
router.post(
  '/:id/buy',
  authenticate_jwt,
  buy_waste_validation,
  buy_waste_listing
);

/**
 * @swagger
 * /api/waste-listings/{id}/confirm-pickup:
 *   post:
 *     summary: Mengonfirmasi pengambilan limbah oleh penjual menggunakan kode pickup
 *     tags: [Waste Exchange]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup_code
 *             properties:
 *               pickup_code:
 *                 type: string
 *                 example: "WST-A1B2"
 *     responses:
 *       200:
 *         description: Pengambilan berhasil diverifikasi dan dana escrow diteruskan
 */
router.post(
  '/:id/confirm-pickup',
  authenticate_jwt,
  confirm_pickup_validation,
  confirm_waste_pickup
);

/**
 * @swagger
 * /api/waste-listings/{id}/refer-offtaker:
 *   post:
 *     summary: Merujuk limbah yang tidak terjual ke Bank Sampah / TPS3R mitra
 *     tags: [Waste Exchange]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offtaker_id
 *             properties:
 *               offtaker_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Limbah berhasil dirujuk dengan penerbitan manifest transfer
 */
router.post(
  '/:id/refer-offtaker',
  authenticate_jwt,
  offtaker_referral_validation,
  refer_listing_to_offtaker
);

export default router;
