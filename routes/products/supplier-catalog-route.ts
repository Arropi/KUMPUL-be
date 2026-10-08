import { Router } from 'express';
import {
  create_supplier_commodity,
  get_supplier_commodity_by_id,
  list_supplier_commodities,
  update_supplier_commodity,
  delete_supplier_commodity,
  get_supplier_commodities_by_entity_id,
  publish_supplier_commodity,
  unpublish_supplier_commodity,
  get_marketplace_catalog,
} from '../../controllers/products/supplier-catalog-controller.ts';
import {
  create_supplier_commodity_validation,
  update_supplier_commodity_validation,
  get_supplier_commodity_by_id_validation,
} from '../../validations/products/supplier-catalog-validation.ts';
import commodity_batch from "./commodity-batch-tag-route.ts"
import storage_router from '../storage/storage-route.ts';

const router = Router();

router.use("/batch", commodity_batch);
router.use("/upload", storage_router);
router.use("/upload-image", storage_router);

/**
 * @swagger
 * /api/supplier-catalogs/marketplace:
 *   get:
 *     summary: Mendapatkan katalog komoditas publik aktif di Marketplace
 *     description: Mengembalikan daftar komoditas yang sedang aktif dipublikasikan, dilengkapi info stok tersedia, tiering harga, sertifikasi mutu batch terverifikasi AI, dan pool aktif.
 *     tags: [SupplierCatalogs]
 *     parameters:
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
 *         description: Katalog marketplace berhasil diambil
 */
router.get('/marketplace', get_marketplace_catalog);
/**
 * @swagger
 * /api/supplier-catalogs:
 *   get:
 *     summary: Mendapatkan daftar komoditas katalog supplier
 *     tags: [SupplierCatalogs]
 *     parameters:
 *       - in: query
 *         name: supplier_role_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter berdasarkan ID role supplier
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Batas jumlah data
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pergeseran data
 *     responses:
 *       200:
 *         description: Daftar komoditas katalog berhasil diambil
 */
router.get('/', list_supplier_commodities);

/**
 * @swagger
 * /api/supplier-catalogs/entity-id/{id}:
 *   get:
 *     summary: Mendapatkan daftar komoditas katalog berdasarkan entity_id bisnis
 *     tags: [SupplierCatalogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari Business Entity
 *     responses:
 *       200:
 *         description: Daftar komoditas entitas bisnis berhasil diambil
 *       404:
 *         description: Entitas bisnis tidak ditemukan
 */
router.get('/entity-id/:id', get_supplier_commodity_by_id_validation, get_supplier_commodities_by_entity_id);

/**
 * @swagger
 * /api/supplier-catalogs/{id}:
 *   get:
 *     summary: Mendapatkan detail komoditas katalog berdasarkan ID
 *     tags: [SupplierCatalogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari komoditas
 *     responses:
 *       200:
 *         description: Data komoditas katalog berhasil ditemukan
 *       404:
 *         description: Komoditas katalog tidak ditemukan
 */
router.get('/:id', get_supplier_commodity_by_id_validation, get_supplier_commodity_by_id);

/**
 * @swagger
 * /api/supplier-catalogs:
 *   post:
 *     summary: Menambahkan komoditas baru ke katalog supplier dengan SKU otomatis
 *     description: SKU di-generate otomatis pada layer service berdasarkan nama komoditas (contoh "beras 20 Kg" -> "BRS-20-KG").
 *     tags: [SupplierCatalogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_role_id
 *               - name
 *               - wholesale_unit
 *               - base_price
 *               - stock
 *               - base_moq
 *             properties:
 *               supplier_role_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-2222-3333-4444-555555555555"
 *               name:
 *                 type: string
 *                 example: "Beras Rojolele 20 Kg"
 *               wholesale_unit:
 *                 type: string
 *                 enum: [KARUNG, SAK, KRAT, PAX, BAL]
 *                 example: "KARUNG"
 *               base_price:
 *                 type: number
 *                 example: 250000
 *                 description: Harga utama per wholesale unit
 *               stock:
 *                 type: number
 *                 example: 100
 *                 description: Kuantitas stok komoditas yang tersedia
 *               base_moq:
 *                 type: number
 *                 example: 20
 *                 description: Minimum order quantity dalam wholesale unit
 *               lead_time_days:
 *                 type: integer
 *                 example: 2
 *               image_url:
 *                 type: string
 *                 nullable: true
 *                 example: "https://example.com/images/beras.jpg"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "Beras pulen berkualitas super langsung dari petani Klaten."
 *               production_date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "2026-10-15"
 *                 description: Perkiraan tanggal panen/produksi (YYYY-MM-DD)
 *               auto_activate_marketplace:
 *                 type: boolean
 *                 example: true
 *                 description: Otomatis mengaktifkan marketplace ketika memasuki tanggal panen
 *               allows_under_moq:
 *                 type: boolean
 *                 example: true
 *                 description: Menentukan apakah menerima pemesanan di bawah MOQ
 *               under_moq_price_per_kg:
 *                 type: number
 *                 nullable: true
 *                 example: 15000
 *                 description: Harga per kg jika pembeli memesan di bawah MOQ (wajib jika allows_under_moq bernilai true)
 *               is_marketplace_active:
 *                 type: boolean
 *                 example: true
 *               price_tiers:
 *                 type: array
 *                 description: Tiering harga grosir bertingkat
 *                 items:
 *                   type: object
 *                   required:
 *                     - min_qty
 *                     - max_qty
 *                     - tier_price
 *                   properties:
 *                     min_qty:
 *                       type: number
 *                       example: 20
 *                     max_qty:
 *                       type: number
 *                       example: 50
 *                     tier_price:
 *                       type: number
 *                       example: 240000
 *     responses:
 *       201:
 *         description: Komoditas katalog berhasil ditambahkan dengan SKU otomatis dan tier harga
 *       400:
 *         description: Validasi input gagal atau role bukan SUPPLIER
 *       404:
 *         description: Role entitas bisnis tidak ditemukan
 */
router.post('/', create_supplier_commodity_validation, create_supplier_commodity);

/**
 * @swagger
 * /api/supplier-catalogs/{id}:
 *   put:
 *     summary: Memperbarui data komoditas katalog supplier
 *     tags: [SupplierCatalogs]
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
 *               name:
 *                 type: string
 *               wholesale_unit:
 *                 type: string
 *                 enum: [KARUNG, SAK, KRAT, PAX, BAL]
 *               base_price:
 *                 type: number
 *               stock:
 *                 type: number
 *               base_moq:
 *                 type: number
 *               lead_time_days:
 *                 type: integer
 *               image_url:
 *                 type: string
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *               production_date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               auto_activate_marketplace:
 *                 type: boolean
 *               allows_under_moq:
 *                 type: boolean
 *               under_moq_price_per_kg:
 *                 type: number
 *                 nullable: true
 *               is_marketplace_active:
 *                 type: boolean
 *               price_tiers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     min_qty:
 *                       type: number
 *                     max_qty:
 *                       type: number
 *                     tier_price:
 *                       type: number
 *     responses:
 *       200:
 *         description: Komoditas katalog berhasil diperbarui
 *       404:
 *         description: Komoditas katalog tidak ditemukan
 */
router.put('/:id', update_supplier_commodity_validation, update_supplier_commodity);

/**
 * @swagger
 * /api/supplier-catalogs/{id}:
 *   delete:
 *     summary: Menghapus komoditas katalog supplier berdasarkan ID
 *     tags: [SupplierCatalogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Komoditas katalog berhasil dihapus
 *       404:
 *         description: Komoditas katalog tidak ditemukan
 */
router.delete('/:id', get_supplier_commodity_by_id_validation, delete_supplier_commodity);

/**
 * @swagger
 * /api/supplier-catalogs/{id}/publish:
 *   post:
 *     summary: Mempublikasikan komoditas ke etalase Marketplace publik
 *     description: Memvalidasi ketersediaan stok, rentang tanggal panen hingga expired (production_date < closed_date), merangkum status mutu batch tag, mengaktifkan status publik, dan menginisialisasi procurement pool aktif.
 *     tags: [SupplierCatalogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID komoditas yang akan dipublikasikan
 *     responses:
 *       200:
 *         description: Komoditas berhasil dipublikasikan ke Marketplace
 *       400:
 *         description: Validasi gagal (misal tanggal panen belum diisi atau stok kosong)
 *       404:
 *         description: Komoditas tidak ditemukan
 */
router.post('/:id/publish', get_supplier_commodity_by_id_validation, publish_supplier_commodity);

/**
 * @swagger
 * /api/supplier-catalogs/{id}/unpublish:
 *   post:
 *     summary: Menarik komoditas dari etalase Marketplace publik
 *     description: Menonaktifkan visibilitas komoditas di marketplace (is_marketplace_active = false).
 *     tags: [SupplierCatalogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID komoditas yang akan ditarik
 *     responses:
 *       200:
 *         description: Komoditas berhasil ditarik dari Marketplace
 *       404:
 *         description: Komoditas tidak ditemukan
 */
router.post('/:id/unpublish', get_supplier_commodity_by_id_validation, unpublish_supplier_commodity);

export default router;
