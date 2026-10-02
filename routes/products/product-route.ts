import { Router } from 'express';
import {
  create_product,
  get_product_by_id,
  list_products,
  get_products_by_entity_id,
  update_product,
  delete_product,
} from '../../controllers/products/product-controller';
import {
  create_product_validation,
  update_product_validation,
  id_param_validation,
} from '../../validations/products/product-validation';
import recipe_router from './recipe-route';

const router = Router();

// Route extends: resep bahan menjadi sub-route dari produk UMKM
router.use('/:product_id/recipes', recipe_router);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Mendapatkan daftar produk UMKM
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: umkm_role_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter berdasarkan ID role UMKM
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
 *         description: Daftar produk UMKM berhasil diambil
 */
router.get('/', list_products);

/**
 * @swagger
 * /api/products/entity-id/{id}:
 *   get:
 *     summary: Mendapatkan daftar produk UMKM berdasarkan entity_id bisnis
 *     tags: [Products]
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
 *         description: Daftar produk entitas bisnis berhasil diambil
 *       404:
 *         description: Entitas bisnis tidak ditemukan
 */
router.get('/entity-id/:id', id_param_validation, get_products_by_entity_id);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Mendapatkan detail produk UMKM beserta daftar resep bahan
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari produk UMKM
 *     responses:
 *       200:
 *         description: Detail produk UMKM berhasil ditemukan
 *       404:
 *         description: Produk UMKM tidak ditemukan
 */
router.get('/:id', id_param_validation, get_product_by_id);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Menambahkan produk UMKM baru
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - umkm_role_id
 *               - product_name
 *               - target_selling_price_per_unit
 *             properties:
 *               umkm_role_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-2222-3333-4444-555555555555"
 *               product_name:
 *                 type: string
 *                 example: "Keripik Singkong Balado Premium"
 *               unit:
 *                 type: string
 *                 default: "PCS"
 *                 example: "PACK"
 *                 description: Satuan produk jadi yang mencakup 7 sektor (PCS, PACK, DUS, BOTOL, PORSI, KG, dll)
 *               target_selling_price_per_unit:
 *                 type: number
 *                 example: 18000
 *                 description: Target harga jual per unit
 *               expected_batch_units:
 *                 type: integer
 *                 default: 1
 *                 example: 50
 *                 description: Jumlah unit produk yang dihasilkan dalam 1 kali siklus batch produksi
 *     responses:
 *       201:
 *         description: Produk UMKM berhasil ditambahkan
 *       400:
 *         description: Validasi input gagal atau role bukan UMKM
 *       404:
 *         description: Role entitas tidak ditemukan
 */
router.post('/', create_product_validation, create_product);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Memperbarui data produk UMKM
 *     description: Memperbarui nama, unit, target harga jual, atau expected batch units. Otomatis menghitung ulang total kebutuhan bahan dan margin.
 *     tags: [Products]
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
 *               product_name:
 *                 type: string
 *               unit:
 *                 type: string
 *               target_selling_price_per_unit:
 *                 type: number
 *               expected_batch_units:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Produk UMKM berhasil diperbarui
 *       404:
 *         description: Produk UMKM tidak ditemukan
 */
router.put('/:id', update_product_validation, update_product);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Menghapus produk UMKM beserta resep bahan terkait
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Produk UMKM berhasil dihapus
 *       404:
 *         description: Produk UMKM tidak ditemukan
 */
router.delete('/:id', id_param_validation, delete_product);

export default router;
