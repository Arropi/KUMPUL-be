import { Router } from 'express';
import {
  create_business_entity,
  update_business_entity,
  update_entity_profile,
  get_business_entity_by_id,
  list_business_entities,
} from '../../controllers/accounts/business-entity-controller';
import {
  create_business_entity_validation,
  update_business_entity_validation,
  update_entity_profile_validation,
  get_business_entity_by_id_validation,
} from '../../validations/accounts/business-entity-validation';

const router = Router();

/**
 * @swagger
 * /api/business-entities:
 *   get:
 *     summary: Mendapatkan daftar business entities
 *     tags: [BusinessEntities]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Jumlah data per halaman
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset data
 *     responses:
 *       200:
 *         description: Daftar business entities berhasil diambil
 */
router.get('/', list_business_entities);

/**
 * @swagger
 * /api/business-entities/{id}:
 *   get:
 *     summary: Mendapatkan detail business entity berdasarkan ID
 *     tags: [BusinessEntities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari business entity
 *     responses:
 *       200:
 *         description: Data business entity berhasil ditemukan
 *       404:
 *         description: Business entity tidak ditemukan
 */
router.get('/:id', get_business_entity_by_id_validation, get_business_entity_by_id);

/**
 * @swagger
 * /api/business-entities:
 *   post:
 *     summary: Menambahkan business entity baru beserta profil
 *     tags: [BusinessEntities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - legal_name
 *               - npwp_nib
 *               - default_address
 *               - latitude
 *               - longitude
 *             properties:
 *               legal_name:
 *                 type: string
 *                 example: PT Kumpul Pangan Nusantara
 *               npwp_nib:
 *                 type: string
 *                 example: "1234567890123456"
 *               default_address:
 *                 type: string
 *                 example: Jl. Malioboro No. 12, Yogyakarta
 *               latitude:
 *                 type: number
 *                 example: -7.7956
 *               longitude:
 *                 type: number
 *                 example: 110.3695
 *               bank_account_info:
 *                 type: object
 *                 example: { "bank_name": "BCA", "account_number": "1234567890", "account_holder": "PT Kumpul Pangan Nusantara" }
 *               profile_picture_url:
 *                 type: string
 *                 example: "https://example.com/profiles/kumpul.png"
 *               auth_user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Business entity berhasil didaftarkan
 *       400:
 *         description: Data input tidak valid atau NPWP sudah terdaftar
 */
router.post('/', create_business_entity_validation, create_business_entity);

/**
 * @swagger
 * /api/business-entities/{id}:
 *   put:
 *     summary: Memperbarui data business entity
 *     tags: [BusinessEntities]
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
 *               legal_name:
 *                 type: string
 *               npwp_nib:
 *                 type: string
 *               default_address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               bank_account_info:
 *                 type: object
 *               profile_picture_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Data business entity berhasil diperbarui
 *       404:
 *         description: Business entity tidak ditemukan
 */
router.put('/:id', update_business_entity_validation, update_business_entity);

/**
 * @swagger
 * /api/business-entities/{id}/profile:
 *   patch:
 *     summary: Memperbarui profil business entity (termasuk foto/logo profil dan alamat)
 *     tags: [BusinessEntities]
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
 *               legal_name:
 *                 type: string
 *               default_address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               bank_account_info:
 *                 type: object
 *               profile_picture_url:
 *                 type: string
 *                 example: "https://example.com/profiles/avatar.png"
 *     responses:
 *       200:
 *         description: Profil business entity berhasil diperbarui
 *       404:
 *         description: Business entity tidak ditemukan
 */
router.patch('/:id/profile', update_entity_profile_validation, update_entity_profile);

export default router;
