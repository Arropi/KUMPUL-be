import { Router } from 'express';
import {
  initiate_order_payment,
  handle_midtrans_webhook,
  check_payment_status,
  release_escrow_funds,
  evaluate_expired_orders,
} from '../../controllers/payments/payment-controller';
import {
  initiate_payment_validation,
  midtrans_notification_validation,
  release_escrow_validation,
} from '../../validations/payments/payment-validation';

const router = Router();

/**
 * @swagger
 * /api/payments/snap-token:
 *   post:
 *     summary: Menginisialisasi pembayaran pesanan via Midtrans Snap
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *             properties:
 *               order_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *               delivery_method:
 *                 type: string
 *                 enum: [HEMAT_HUB, DIRECT_DOOR_TO_DOOR]
 *                 description: Pemilihan metode pengiriman saat checkout pembayaran (opsional jika sudah dipilih saat join)
 *                 example: "HEMAT_HUB"
 *     responses:
 *       201:
 *         description: Snap token dan redirect URL berhasil dibuat
 *       400:
 *         description: Pesanan sudah dibayar atau nominal tidak valid
 *       404:
 *         description: Pesanan tidak ditemukan
 */
router.post('/snap-token', initiate_payment_validation, initiate_order_payment);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Endpoint Webhook notifikasi transaksi dari Midtrans Gateway
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - status_code
 *               - gross_amount
 *               - signature_key
 *               - transaction_status
 *             properties:
 *               order_id:
 *                 type: string
 *               status_code:
 *                 type: string
 *               gross_amount:
 *                 type: string
 *               signature_key:
 *                 type: string
 *               transaction_status:
 *                 type: string
 *               fraud_status:
 *                 type: string
 *               transaction_id:
 *                 type: string
 *               payment_type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notifikasi webhook berhasil diproses
 *       403:
 *         description: Signature key tidak valid
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.post('/webhook', midtrans_notification_validation, handle_midtrans_webhook);

/**
 * @swagger
 * /api/payments/status/{order_id}:
 *   get:
 *     summary: Mengecek dan menyinkronkan status pembayaran pesanan dengan Midtrans & Escrow
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Status transaksi berhasil diverifikasi
 *       404:
 *         description: Transaksi pembayaran belum diinisialisasi
 */
router.get('/status/:order_id', check_payment_status);

/**
 * @swagger
 * /api/payments/escrow/release:
 *   post:
 *     summary: Meneruskan dana rekening bersama (Escrow) ke Supplier setelah barang diterima UMKM
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_reference_id
 *             properties:
 *               order_reference_id:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *                 example: "Barang telah diterima dalam kondisi baik"
 *     responses:
 *       200:
 *         description: Dana escrow berhasil dilepaskan
 *       400:
 *         description: Escrow tidak dalam status HELD
 *       404:
 *         description: Rekening bersama tidak ditemukan
 */
router.post('/escrow/release', release_escrow_validation, release_escrow_funds);

/**
 * @swagger
 * /api/payments/evaluate-expired:
 *   post:
 *     summary: Mengevaluasi dan membatalkan pesanan pengadaan yang melewati batas waktu pembayaran 12 jam
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Evaluasi berhasil dijalankan
 */
router.post('/evaluate-expired', evaluate_expired_orders);

export default router;
