import { Router } from 'express';
import {
  create_procurement_order,
  get_procurement_order_by_id,
  list_orders_by_umkm_role,
  list_orders_by_entity,
  cancel_procurement_order,
  list_supplier_pos,
  get_supplier_po_detail,
  update_supplier_po_status,
  get_supplier_grouped_orders,
  get_umkm_all_orders,
  confirm_order_pickup,
  assign_pool_host,
  ship_supplier_po,
} from '../../controllers/orders/procurement-order-controller.ts';
import {
  create_procurement_order_validation,
  uuid_param_validation,
  confirm_pickup_validation,
  assign_host_validation,
  ship_po_validation,
} from '../../validations/orders/procurement-order-validation.ts';
import {
  authenticate_jwt,
  optional_authenticate_jwt,
  require_supplier,
  require_umkm,
} from '../../middleware/auth-middleware.ts';

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
 * /api/orders/supplier/grouped:
 *   get:
 *     summary: Mendapatkan pesanan pengadaan yang dikelompokkan berdasarkan komoditas dan pool untuk Supplier
 *     tags: [ProcurementOrders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar pesanan terkelompok berhasil diambil
 *       403:
 *         description: Akses ditolak, khusus supplier
 */
router.get('/supplier/grouped', authenticate_jwt, require_supplier, get_supplier_grouped_orders);

/**
 * @swagger
 * /api/orders/umkm/all:
 *   get:
 *     summary: Mendapatkan seluruh daftar pesanan pengadaan (pooling & direct) milik akun UMKM aktif
 *     tags: [ProcurementOrders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seluruh daftar pesanan UMKM berhasil diambil
 *       403:
 *         description: Akses ditolak, khusus UMKM
 */
router.get('/umkm/all', authenticate_jwt, require_umkm, get_umkm_all_orders);

/**
 * @swagger
 * /api/orders/supplier/pos:
 *   get:
 *     summary: Mendapatkan daftar Purchase Order (PO) konsolidasi untuk Supplier
 *     tags: [ProcurementOrders]
 *     parameters:
 *       - in: query
 *         name: supplier_role_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID role supplier
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
 *         description: Daftar PO supplier berhasil diambil
 *       400:
 *         description: supplier_role_id wajib disertakan
 */
router.get('/supplier/pos', optional_authenticate_jwt, list_supplier_pos);

/**
 * @swagger
 * /api/orders/supplier/pos/{id}:
 *   get:
 *     summary: Mendapatkan rincian detail Purchase Order (PO) konsolidasi beserta partisipan UMKM dan titik antar
 *     tags: [ProcurementOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari consolidated PO
 *     responses:
 *       200:
 *         description: Rincian PO berhasil diambil
 *       404:
 *         description: PO tidak ditemukan
 */
router.get('/supplier/pos/:id', uuid_param_validation, get_supplier_po_detail);

/**
 * @swagger
 * /api/orders/supplier/pos/{id}/status:
 *   patch:
 *     summary: Memperbarui status pengiriman PO konsolidasi oleh Supplier (SHIPPED / DELIVERED)
 *     tags: [ProcurementOrders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SHIPPED, DELIVERED]
 *                 example: "SHIPPED"
 *     responses:
 *       200:
 *         description: Status PO berhasil diperbarui
 *       400:
 *         description: Status tidak valid atau urutan transisi status salah
 *       404:
 *         description: PO tidak ditemukan
 */
router.patch('/supplier/pos/:id/status', uuid_param_validation, update_supplier_po_status);

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

/**
 * @swagger
 * /api/orders/{id}/confirm-pickup:
 *   post:
 *     summary: Memvalidasi PIN/kode serah terima barang untuk mengubah status pesanan UMKM ke Selesai
 *     tags: [ProcurementOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *                 example: "KMPL-8891"
 *     responses:
 *       200:
 *         description: Pengambilan barang berhasil dikonfirmasi
 *       400:
 *         description: Kode pickup tidak valid
 */
router.post(
  '/:id/confirm-pickup',
  authenticate_jwt,
  uuid_param_validation,
  confirm_pickup_validation,
  confirm_order_pickup
);

/**
 * @swagger
 * /api/orders/supplier/pools/{pool_id}/assign-host:
 *   put:
 *     summary: Mengubah UMKM yang menjadi titik Host Hub untuk pesanan pooling konsolidasi
 *     tags: [ProcurementOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pool_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host_umkm_role_id
 *             properties:
 *               host_umkm_role_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Host hub berhasil diperbarui (dengan warning kapasitas jika kurang)
 */
router.put(
  '/supplier/pools/:pool_id/assign-host',
  optional_authenticate_jwt,
  assign_host_validation,
  assign_pool_host
);

/**
 * @swagger
 * /api/orders/supplier/pos/{id}/ship:
 *   post:
 *     summary: Mengunggah bukti pengiriman barang (surat jalan/foto serah terima) dan nomor resi/plat nomor
 *     tags: [ProcurementOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driver_name
 *               - tracking_number
 *             properties:
 *               driver_name:
 *                 type: string
 *                 example: "Budi Santoso"
 *               tracking_number:
 *                 type: string
 *                 example: "B 1234 CD / KMPL-LOG-99"
 *               delivery_proof_url:
 *                 type: string
 *                 example: "https://.../bukti.jpg"
 *     responses:
 *       200:
 *         description: Pengiriman barang berhasil dicatat
 */
router.post(
  '/supplier/pos/:id/ship',
  optional_authenticate_jwt,
  uuid_param_validation,
  ship_po_validation,
  ship_supplier_po
);

export default router;
