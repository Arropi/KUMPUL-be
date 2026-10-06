import { Router } from 'express';
import {
  create_profile,
  get_profile_by_id,
  update_profile,
  patch_profile,
  delete_profile,
  list_profiles,
} from '../../controllers/profile/profile-controller.ts';
import {
  create_profile_validation,
  update_profile_validation,
  patch_profile_validation,
  get_profile_by_id_validation,
  list_profiles_validation,
} from '../../validations/profile/profile-validation.ts';

const router = Router();

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Mendapatkan daftar profil entitas bisnis dengan paginasi
 *     tags: [Profile]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Kata kunci pencarian berdasarkan nama bisnis, NPWP, atau alamat
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
 *         description: Posisi data awal
 *     responses:
 *       200:
 *         description: Daftar profil berhasil diambil
 */
router.get('/', list_profiles_validation, list_profiles);

/**
 * @swagger
 * /api/profile:
 *   post:
 *     summary: Membuat profil entitas bisnis baru beserta role dan data operasional
 *     tags: [Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - business_name
 *               - npwp
 *               - default_address
 *               - lat
 *               - long
 *             properties:
 *               business_name:
 *                 type: string
 *                 example: "PT Agro Pangan Nusantara"
 *                 description: Nama bisnis / nama legal entitas
 *               legal_name:
 *                 type: string
 *                 example: "PT Agro Pangan Nusantara"
 *               npwp:
 *                 type: string
 *                 example: "1234567890123456"
 *                 description: Nomor NPWP atau NIB
 *               npwp_nib:
 *                 type: string
 *                 example: "1234567890123456"
 *               default_address:
 *                 type: string
 *                 example: "Jl. Malioboro No. 12, Yogyakarta"
 *               lat:
 *                 type: number
 *                 example: -7.7956
 *                 description: Koordinat latitude
 *               latitude:
 *                 type: number
 *                 example: -7.7956
 *               long:
 *                 type: number
 *                 example: 110.3695
 *                 description: Koordinat longitude
 *               longitude:
 *                 type: number
 *                 example: 110.3695
 *               bank_account_info:
 *                 type: object
 *                 example: { "bank_name": "BCA", "account_number": "1234567890", "account_holder": "PT Agro Pangan Nusantara" }
 *               profile:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *                 description: URL foto profil / logo bisnis
 *               profile_picture_url:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *               storage:
 *                 type: integer
 *                 example: 500
 *                 description: Kapasitas penyimpanan (storage capacity)
 *               storage_capacity:
 *                 type: integer
 *                 example: 500
 *               sector:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *                 example: "PERTANIAN"
 *               sector_type:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *               role:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *                 example: "SUPPLIER"
 *               role_type:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *               auth_user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Profil entitas bisnis berhasil didaftarkan
 *       400:
 *         description: Validasi gagal atau NPWP sudah terdaftar
 */
router.post('/', create_profile_validation, create_profile);

/**
 * @swagger
 * /api/profile/{id}:
 *   get:
 *     summary: Mendapatkan detail profil berdasarkan entity_id atau id pada tabel business_entities
 *     tags: [Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID UUID dari business_entities atau entity_id
 *     responses:
 *       200:
 *         description: Detail profil berhasil diambil (berisi profile, bank_account_info, lat, long, default_address, npwp, business_name, storage, sector)
 *       404:
 *         description: Profil entitas bisnis tidak ditemukan
 */
router.get('/:id', get_profile_by_id_validation, get_profile_by_id);

/**
 * @swagger
 * /api/profile/{id}:
 *   put:
 *     summary: Memperbarui seluruh data profil berdasarkan entity_id
 *     tags: [Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID UUID dari business_entities atau entity_id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               business_name:
 *                 type: string
 *               legal_name:
 *                 type: string
 *               npwp:
 *                 type: string
 *               npwp_nib:
 *                 type: string
 *               default_address:
 *                 type: string
 *               lat:
 *                 type: number
 *               latitude:
 *                 type: number
 *               long:
 *                 type: number
 *               longitude:
 *                 type: number
 *               bank_account_info:
 *                 type: object
 *               profile:
 *                 type: string
 *               profile_picture_url:
 *                 type: string
 *               storage:
 *                 type: integer
 *               storage_capacity:
 *                 type: integer
 *               sector:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *               sector_type:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *               role:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *               role_type:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *     responses:
 *       200:
 *         description: Profil entitas bisnis berhasil diperbarui
 *       404:
 *         description: Profil tidak ditemukan
 */
router.put(
  '/:id',
  get_profile_by_id_validation,
  update_profile_validation,
  update_profile
);

/**
 * @swagger
 * /api/profile/{id}:
 *   patch:
 *     summary: Memperbarui sebagian data profil berdasarkan entity_id
 *     tags: [Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID UUID dari business_entities atau entity_id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               business_name:
 *                 type: string
 *               legal_name:
 *                 type: string
 *               npwp:
 *                 type: string
 *               npwp_nib:
 *                 type: string
 *               default_address:
 *                 type: string
 *               lat:
 *                 type: number
 *               latitude:
 *                 type: number
 *               long:
 *                 type: number
 *               longitude:
 *                 type: number
 *               bank_account_info:
 *                 type: object
 *               profile:
 *                 type: string
 *               profile_picture_url:
 *                 type: string
 *               storage:
 *                 type: integer
 *               storage_capacity:
 *                 type: integer
 *               sector:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *               sector_type:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *               role:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *               role_type:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *     responses:
 *       200:
 *         description: Profil entitas bisnis berhasil diperbarui
 *       404:
 *         description: Profil tidak ditemukan
 */
router.patch(
  '/:id',
  get_profile_by_id_validation,
  patch_profile_validation,
  patch_profile
);

/**
 * @swagger
 * /api/profile/{id}:
 *   delete:
 *     summary: Menghapus profil entitas bisnis beserta role terkait berdasarkan entity_id
 *     tags: [Profile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID UUID dari business_entities atau entity_id
 *     responses:
 *       200:
 *         description: Profil entitas bisnis berhasil dihapus
 *       400:
 *         description: Profil tidak dapat dihapus karena masih terkait data lain
 *       404:
 *         description: Profil tidak ditemukan
 */
router.delete('/:id', get_profile_by_id_validation, delete_profile);

export default router;
