import { Router } from 'express';
import {
  create_procurement_order,
  get_procurement_order_by_id,
  list_orders_by_umkm_role,
  list_orders_by_entity,
  cancel_procurement_order,
} from '../../controllers/orders/procurement-order-controller';
import {
  create_procurement_order_validation,
  uuid_param_validation,
} from '../../validations/orders/procurement-order-validation';

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Membuat pesanan pengadaan dari data partisipan pool
 *     tags: [ProcurementOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participant_id
 *             properties:
 *               participant_id:
 *                 type: string
 *                 format: uuid
 *               shipping_fee:
 *                 type: number
 *                 example: 15000
 *     responses:
 *       201:
 *         description: Pesanan pengadaan berhasil dibuat
 *       404:
 *         description: Partisipan atau pool tidak ditemukan
 */
router.post('/', create_procurement_order_validation, create_procurement_order);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Mendapatkan detail pesanan pengadaan berdasarkan order ID
 *     tags: [ProcurementOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detail pesanan berhasil diambil
 *       404:
 *         description: Pesanan tidak ditemukan
 */
router.get('/:id', uuid_param_validation, get_procurement_order_by_id);

/**
 * @swagger
 * /api/orders/umkm-role/{role_id}:
 *   get:
 *     summary: Mendapatkan riwayat pesanan berdasarkan ID role UMKM
 *     tags: [ProcurementOrders]
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Daftar pesanan UMKM berhasil diambil
 */
router.get('/umkm-role/:role_id', list_orders_by_umkm_role);

/**
 * @swagger
 * /api/orders/entity/{entity_id}:
 *   get:
 *     summary: Mendapatkan riwayat pesanan berdasarkan ID entitas bisnis UMKM
 *     tags: [ProcurementOrders]
 *     parameters:
 *       - in: path
 *         name: entity_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Daftar pesanan entitas berhasil diambil
 */
router.get('/entity/:entity_id', list_orders_by_entity);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Membatalkan pesanan pengadaan (jika belum berstatus SETTLED)
 *     tags: [ProcurementOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pesanan berhasil dibatalkan
 *       400:
 *         description: Pesanan yang sudah dibayar tidak dapat dibatalkan langsung
 *       404:
 *         description: Pesanan tidak ditemukan
 */
router.post('/:id/cancel', uuid_param_validation, cancel_procurement_order);

export default router;
