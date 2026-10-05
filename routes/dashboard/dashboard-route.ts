import { Router } from 'express';
import {
  get_supplier_dashboard,
  get_umkm_dashboard,
} from '../../controllers/dashboard/dashboard-controller';
import {
  authenticate_jwt,
  require_supplier,
  require_umkm,
} from '../../middleware/auth-middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboards
 *   description: Dashboard eksekutif dan analitik bisnis untuk Supplier dan UMKM
 */

/**
 * @swagger
 * /api/dashboards/supplier:
 *   get:
 *     summary: Mendapatkan ringkasan metrik analitik bisnis, pool aktif, dan komoditas terlaris Supplier
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analitik Supplier berhasil diambil
 *       403:
 *         description: Akses ditolak, khusus akun ber-role Supplier
 */
router.get('/supplier', authenticate_jwt, require_supplier, get_supplier_dashboard);

/**
 * @swagger
 * /api/dashboards/umkm:
 *   get:
 *     summary: Mendapatkan ringkasan pengadaan, penghematan, sirkular limbah, dan prediksi kehabisan stok dapur UMKM
 *     tags: [Dashboards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard operasional UMKM berhasil diambil
 *       403:
 *         description: Akses ditolak, khusus akun ber-role UMKM
 */
router.get('/umkm', authenticate_jwt, require_umkm, get_umkm_dashboard);

export default router;
