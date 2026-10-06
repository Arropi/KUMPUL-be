import { Router } from 'express';
import {
  create_procurement_pool,
  list_procurement_pools,
  get_procurement_pool_by_id,
  join_procurement_pool,
  evaluate_pool_cutoffs,
} from '../../controllers/orders/pre-order-controller';
import {
  create_procurement_pool_validation,
  join_procurement_pool_validation,
} from '../../validations/orders/pre-order-validation';
import { uuid_param_validation } from '../../validations/orders/procurement-order-validation';

const router = Router();

/**
 * @swagger
 * /api/pre-orders/pools:
 *   post:
 *     summary: Membuat procurement pool baru (pre-order / pooling)
 *     tags: [PreOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commodity_id
 *               - target_moq
 *               - expires_at
 *             properties:
 *               commodity_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *               target_moq:
 *                 type: number
 *                 example: 500
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-12-31T23:59:59.000Z"
 *               default_hub_address:
 *                 type: string
 *                 example: "Hub Logistik Kumpul Pasar Minggu, Jakarta Selatan"
 *               hub_latitude:
 *                 type: number
 *                 example: -6.2841
 *               hub_longitude:
 *                 type: number
 *                 example: 106.8432
 *     responses:
 *       201:
 *         description: Procurement pool berhasil dibuat
 *       400:
 *         description: Validasi data gagal
 *       404:
 *         description: Komoditas tidak ditemukan
 */
router.post('/pools', create_procurement_pool_validation, create_procurement_pool);

/**
 * @swagger
 * /api/pre-orders/pools:
 *   get:
 *     summary: Mendapatkan daftar procurement pool (Pre-Order)
 *     tags: [PreOrders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, AGGREGATING, LOCKED, COMPLETED, FAILED]
 *         description: Filter status pool
 *       - in: query
 *         name: commodity_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter kamar patungan berdasarkan ID komoditas
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Daftar pool berhasil diambil
 */
router.get('/pools', list_procurement_pools);

/**
 * @swagger
 * /api/pre-orders/pools/evaluate-cutoffs:
 *   post:
 *     summary: Memproses evaluasi dan pembatalan otomatis pool yang melewati tanggal cut-off
 *     tags: [PreOrders]
 *     responses:
 *       200:
 *         description: Evaluasi cut-off berhasil dijalankan
 */
router.post('/pools/evaluate-cutoffs', evaluate_pool_cutoffs);

/**
 * @swagger
 * /api/pre-orders/pools/{id}:
 *   get:
 *     summary: Mendapatkan detail procurement pool beserta partisipan dan PO konsolidasi
 *     tags: [PreOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detail pool berhasil diambil
 *       404:
 *         description: Pool tidak ditemukan
 */
router.get('/pools/:id', uuid_param_validation, get_procurement_pool_by_id);

/**
 * @swagger
 * /api/pre-orders/join:
 *   post:
 *     summary: Bergabung ke dalam procurement pool (Pre-Order bahan baku bersama)
 *     tags: [PreOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pool_id
 *               - umkm_role_id
 *               - order_qty
 *               - final_delivery_address
 *               - final_delivery_lat
 *               - final_delivery_lng
 *             properties:
 *               pool_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID kamar patungan jika memilih gabung kamar yang sudah ada
 *               commodity_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID komoditas (wajib diisi jika membuat kamar patungan baru)
 *               create_new_pool:
 *                 type: boolean
 *                 description: Set true jika ingin membuka kamar patungan baru mandiri
 *                 example: false
 *               umkm_role_id:
 *                 type: string
 *                 format: uuid
 *               order_qty:
 *                 type: number
 *                 example: 50
 *               delivery_method:
 *                 type: string
 *                 enum: [HEMAT_HUB, DIRECT_DOOR_TO_DOOR]
 *                 description: Opsi metode pengiriman (dapat dipilih sekarang atau saat checkout pembayaran)
 *                 example: "HEMAT_HUB"
 *               required_delivery_date:
 *                 type: string
 *                 format: date
 *                 description: Tanggal pesanan dibutuhkan (harus dalam range panen/produksi sampai expired/closed date)
 *                 example: "2026-10-15"
 *               is_urgent_asap:
 *                 type: boolean
 *                 description: Opsi secepatnya (lock otomatis begitu MOQ terpenuhi, tanggal paling awal dari panen)
 *                 example: false
 *               final_delivery_address:
 *                 type: string
 *                 example: "Jl. Tebet Raya No. 45, Jakarta Selatan"
 *               final_delivery_lat:
 *                 type: number
 *                 example: -6.225
 *               final_delivery_lng:
 *                 type: number
 *                 example: 106.855
 *     responses:
 *       201:
 *         description: Berhasil bergabung ke dalam pool dan pesanan dibuat
 *       400:
 *         description: Pool sudah ditutup, kedaluwarsa, atau kuantitas tidak valid
 *       403:
 *         description: Hanya role UMKM yang diizinkan memesan
 *       404:
 *         description: Pool atau role tidak ditemukan
 */
router.post('/join', join_procurement_pool_validation, join_procurement_pool);

export default router;
