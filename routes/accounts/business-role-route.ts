import { Router } from 'express';
import {
  create_business_role,
  get_business_role_by_id,
  list_business_roles,
  update_business_role,
  delete_business_role,
} from '../../controllers/accounts/business-role-controller';
import {
  create_business_role_validation,
  update_business_role_validation,
  get_business_role_by_id_validation,
} from '../../validations/accounts/business-role-validation';

const router = Router();

/**
 * @swagger
 * /api/business-roles:
 *   get:
 *     summary: Mendapatkan daftar business entity roles
 *     tags: [BusinessRoles]
 *     parameters:
 *       - in: query
 *         name: entity_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter berdasarkan ID Business Entity
 *       - in: query
 *         name: role_type
 *         schema:
 *           type: string
 *           enum: [SUPPLIER, UMKM]
 *         description: Filter berdasarkan jenis role
 *       - in: query
 *         name: sector_type
 *         schema:
 *           type: string
 *           enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *         description: Filter berdasarkan sektor bisnis
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter berdasarkan status keaktifan
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
 *         description: Daftar business entity roles berhasil diambil
 */
router.get('/', list_business_roles);

/**
 * @swagger
 * /api/business-roles/{id}:
 *   get:
 *     summary: Mendapatkan detail business entity role berdasarkan ID
 *     tags: [BusinessRoles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari role
 *     responses:
 *       200:
 *         description: Data business entity role berhasil ditemukan
 *       404:
 *         description: Business entity role tidak ditemukan
 */
router.get('/:id', get_business_role_by_id_validation, get_business_role_by_id);

/**
 * @swagger
 * /api/business-roles:
 *   post:
 *     summary: Menambahkan role baru pada business entity (SUPPLIER / UMKM)
 *     tags: [BusinessRoles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entity_id
 *               - role_type
 *             properties:
 *               entity_id:
 *                 type: string
 *                 format: uuid
 *                 example: "938cf232-4121-4353-a339-d0e4ad90dfc5"
 *               role_type:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *                 example: "SUPPLIER"
 *               sector_type:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *                 example: "PERTANIAN"
 *               storage_capacity:
 *                 type: integer
 *                 example: 500
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Business entity role berhasil ditambahkan
 *       400:
 *         description: Validasi gagal atau role duplikat untuk entitas yang sama
 *       404:
 *         description: Business entity tidak ditemukan
 */
router.post('/', create_business_role_validation, create_business_role);

/**
 * @swagger
 * /api/business-roles/{id}:
 *   put:
 *     summary: Memperbarui data business entity role
 *     tags: [BusinessRoles]
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
 *             properties:
 *               sector_type:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *               storage_capacity:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Business entity role berhasil diperbarui
 *       404:
 *         description: Business entity role tidak ditemukan
 */
router.put('/:id', update_business_role_validation, update_business_role);

/**
 * @swagger
 * /api/business-roles/{id}:
 *   delete:
 *     summary: Menghapus business entity role berdasarkan ID
 *     tags: [BusinessRoles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Business entity role berhasil dihapus
 *       400:
 *         description: Role tidak dapat dihapus karena masih terikat ke data lain
 *       404:
 *         description: Business entity role tidak ditemukan
 */
router.delete('/:id', get_business_role_by_id_validation, delete_business_role);

export default router;
