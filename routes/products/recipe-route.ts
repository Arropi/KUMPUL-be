import { Router } from 'express';
import {
  create_recipe,
  get_recipe_by_id,
  list_recipes_by_product,
  update_recipe,
  delete_recipe,
} from '../../controllers/products/product-controller';
import {
  create_recipe_validation,
  update_recipe_validation,
  id_param_validation,
  product_id_param_validation,
} from '../../validations/products/product-validation';

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/products/{product_id}/recipes:
 *   get:
 *     summary: Mendapatkan seluruh daftar resep bahan untuk suatu produk UMKM
 *     tags: [RecipeDetails]
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari produk UMKM
 *     responses:
 *       200:
 *         description: Daftar resep bahan berhasil diambil
 *       404:
 *         description: Produk UMKM tidak ditemukan
 */
router.get('/', list_recipes_by_product);

/**
 * @swagger
 * /api/products/{product_id}/recipes:
 *   post:
 *     summary: Menambahkan resep bahan baru ke produk UMKM (Route extends)
 *     description: Menambahkan bahan resep dan otomatis menghitung total batch qty serta memperbarui HPP & margin produk.
 *     tags: [RecipeDetails]
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID dari produk UMKM (jika menggunakan nested route)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ingredient_name
 *               - required_qty_per_unit
 *               - unit
 *             properties:
 *               umkm_product_id:
 *                 type: string
 *                 format: uuid
 *                 description: Wajib diisi jika menggunakan endpoint standalone /api/recipe-details
 *               ingredient_name:
 *                 type: string
 *                 example: "Tepung Terigu Segitiga"
 *               required_qty_per_unit:
 *                 type: number
 *                 example: 0.25
 *                 description: Kebutuhan bahan untuk menghasilkan 1 unit produk
 *               unit:
 *                 type: string
 *                 example: "KG"
 *                 description: Satuan ukuran bahan yang mencakup 7 sektor (KG, GRAM, LITER, ML, PCS, PACK, DUS, dll)
 *               estimated_cost_per_unit:
 *                 type: number
 *                 example: 3000
 *                 description: Estimasi biaya bahan per unit produk (otomatis menambahkan HPP produk)
 *     responses:
 *       201:
 *         description: Resep bahan berhasil ditambahkan
 *       400:
 *         description: Validasi input gagal
 *       404:
 *         description: Produk UMKM tidak ditemukan
 */
router.post('/', create_recipe_validation, create_recipe);

/**
 * @swagger
 * /api/recipe-details/{id}:
 *   get:
 *     summary: Mendapatkan detail resep bahan berdasarkan ID
 *     tags: [RecipeDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Data resep detail berhasil ditemukan
 *       404:
 *         description: Resep detail tidak ditemukan
 */
router.get('/:id', id_param_validation, get_recipe_by_id);

/**
 * @swagger
 * /api/recipe-details/{id}:
 *   put:
 *     summary: Memperbarui data resep bahan
 *     description: Memperbarui kuantitas/biaya bahan dan otomatis menyesuaikan HPP & margin produk.
 *     tags: [RecipeDetails]
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
 *               ingredient_name:
 *                 type: string
 *               required_qty_per_unit:
 *                 type: number
 *               unit:
 *                 type: string
 *               estimated_cost_per_unit:
 *                 type: number
 *     responses:
 *       200:
 *         description: Resep bahan berhasil diperbarui
 *       404:
 *         description: Resep bahan tidak ditemukan
 */
router.put('/:id', update_recipe_validation, update_recipe);

/**
 * @swagger
 * /api/recipe-details/{id}:
 *   delete:
 *     summary: Menghapus resep bahan berdasarkan ID
 *     tags: [RecipeDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Resep bahan berhasil dihapus
 *       404:
 *         description: Resep bahan tidak ditemukan
 */
router.delete('/:id', id_param_validation, delete_recipe);

export default router;
