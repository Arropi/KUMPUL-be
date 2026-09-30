import { Router } from 'express';
import {
  create_supplier_commodity,
  get_supplier_commodity_by_id,
  list_supplier_commodities,
  update_supplier_commodity,
  delete_supplier_commodity,
} from '../../controllers/products/supplier-catalog-controller';
import {
  create_supplier_commodity_validation,
  update_supplier_commodity_validation,
  get_supplier_commodity_by_id_validation,
} from '../../validations/products/supplier-catalog-validation';

const router = Router();

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
 *               - base_moq
 *             properties:
 *               supplier_role_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-2222-3333-4444-555555555555"
 *               name:
 *                 type: string
 *                 example: "beras 20 Kg"
 *               wholesale_unit:
 *                 type: string
 *                 enum: [KARUNG, SAK, KRAT, PAX, BAL]
 *                 example: "KARUNG"
 *               base_moq:
 *                 type: number
 *                 example: 50
 *               lead_time_days:
 *                 type: integer
 *                 example: 2
 *               is_marketplace_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Komoditas katalog berhasil ditambahkan dengan SKU otomatis
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
 *               base_moq:
 *                 type: number
 *               lead_time_days:
 *                 type: integer
 *               is_marketplace_active:
 *                 type: boolean
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

export default router;
