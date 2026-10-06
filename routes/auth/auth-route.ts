import { Router } from 'express';
import {
  register_user_role,
  login_user,
} from '../../controllers/auth/auth-controller.ts';
import {
  register_user_validation,
  login_user_validation,
} from '../../validations/auth/auth-validation.ts';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrasi profil bisnis dan role pengguna (UMKM / SUPPLIER)
 *     description: Mendaftarkan seluruh data wajib profil bisnis (legal_name, npwp_nib, default_address, latitude, longitude, bank_account_info, profile_picture_url) serta role dan sector bisnis. Hanya storage_capacity yang bersifat opsional. Endpoint ini tidak mengembalikan token langsung; token diperoleh melalui endpoint /login.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - role
 *               - sector
 *               - legal_name
 *               - npwp_nib
 *               - default_address
 *               - latitude
 *               - longitude
 *               - bank_account_info
 *               - profile_picture_url
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID pengguna dari Supabase Auth
 *                 example: "4743cee5-d6bc-4ff0-8c7d-f709c7d7db3b"
 *               role:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *                 description: Role bisnis pengguna
 *                 example: "UMKM"
 *               sector:
 *                 type: string
 *                 enum: [PERTANIAN, PETERNAKAN, PERIKANAN, PERKEBUNAN, FNB_PENGOLAHAN, RITEL, LOGISTIK]
 *                 description: Sektor bisnis pengguna
 *                 example: "FNB_PENGOLAHAN"
 *               legal_name:
 *                 type: string
 *                 description: Nama resmi usaha/badan hukum
 *                 example: "CV Berkah Pangan Makmur"
 *               npwp_nib:
 *                 type: string
 *                 description: Nomor NPWP atau NIB (harus unik)
 *                 example: "0123456789012345"
 *               default_address:
 *                 type: string
 *                 description: Alamat utama operasional bisnis
 *                 example: "Jl. Kaliurang KM 5 No. 10, Sleman, DI Yogyakarta"
 *               latitude:
 *                 type: number
 *                 description: Koordinat latitude lokasi usaha (tidak boleh 0)
 *                 example: -7.7651000
 *               longitude:
 *                 type: number
 *                 description: Koordinat longitude lokasi usaha (tidak boleh 0)
 *                 example: 110.3812000
 *               bank_account_info:
 *                 type: object
 *                 description: Informasi rekening perbankan usaha
 *                 example: { "bank_name": "BCA", "account_number": "1234567890", "account_holder": "CV Berkah Pangan Makmur" }
 *               profile_picture_url:
 *                 type: string
 *                 format: uri
 *                 description: URL foto profil usaha
 *                 example: "https://storage.kumpul.id/profiles/berkah-pangan.jpg"
 *               storage_capacity:
 *                 type: integer
 *                 description: Kapasitas gudang penyimpanan dalam kg/unit (opsional)
 *                 example: 200
 *     responses:
 *       201:
 *         description: Registrasi profil bisnis dan role berhasil
 *       400:
 *         description: Validasi input gagal, NPWP/NIB duplikat, atau role sudah terdaftar
 *       404:
 *         description: Data entitas bisnis tidak ditemukan
 */
router.post('/register', register_user_validation, register_user_role);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login pengguna (Token Exchange) berdasarkan user_id dari Supabase Auth
 *     description: Menukarkan user_id Supabase Auth dengan custom KUMPUL JWT. Jika pengguna belum memiliki role (pengguna baru), endpoint ini mengembalikan 403 ROLE_NOT_REGISTERED. Jika role sudah ada namun profil bisnis belum diisi, mengembalikan 403 BUSINESS_PROFILE_INCOMPLETE. Jika profil lengkap, mengembalikan 200 OK dengan token JWT.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID pengguna dari Supabase Auth
 *                 example: "4743cee5-d6bc-4ff0-8c7d-f709c7d7db3b"
 *               role:
 *                 type: string
 *                 enum: [SUPPLIER, UMKM]
 *                 description: Role spesifik yang dipilih jika entitas memiliki multi-role (opsional)
 *                 example: "UMKM"
 *     responses:
 *       200:
 *         description: Login berhasil dan mengembalikan token JWT KUMPUL
 *       400:
 *         description: Validasi input gagal
 *       403:
 *         description: Belum terdaftar (ROLE_NOT_REGISTERED) atau profil belum lengkap (BUSINESS_PROFILE_INCOMPLETE)
 */
router.post('/login', login_user_validation, login_user);

export default router;
