import swagger_jsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'node:url';

const ROUTES_DIR = fileURLToPath(new URL('../routes', import.meta.url)).replace(/\\/g, '/');
const DEFAULT_SERVER_PORT = 3000;
const current_port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_SERVER_PORT;

const swagger_options: swagger_jsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KUMPUL Backend API',
      version: '1.0.0',
      description:
        'Dokumentasi resmi API Backend KUMPUL - Platform Kolaborasi UMKM dan Supplier Agromaritim & Manufaktur.',
      contact: {
        name: 'Tim Pengembang KUMPUL',
      },
    },
    servers: [
      {
        url: `http://localhost:${current_port}`,
        description: 'Server Pengembangan Lokal (Development)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Masukkan access token JWT Anda di sini',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autentikasi & Registrasi Pengguna' },
      { name: 'Profile', description: 'Manajemen Profil Entitas Bisnis, Rekening, Lokasi, Sektor, & Kapasitas Penyimpanan' },
      { name: 'SupplierCatalogs', description: 'Katalog Komoditas Supplier & Tiering Harga' },
      { name: 'CommodityBatchTags', description: 'Batch Komoditas, Tag Panen, & Verifikasi AI' },
      { name: 'Products', description: 'Katalog Produk UMKM & Perhitungan Margin' },
      { name: 'RecipeDetails', description: 'Resep Bahan Baku & Perhitungan HPP Otomatis' },
      { name: 'PreOrders', description: 'Procurement Pools (Pre-Order) & Agregasi Permintaan Bahan Baku' },
      { name: 'ProcurementOrders', description: 'Pemesanan Bahan Baku UMKM & Manajemen Status Pesanan' },
      { name: 'Payments', description: 'Gateway Pembayaran Midtrans Snap, Webhook, & Rekening Bersama (Escrow)' },
      { name: 'Unified Marketplace', description: 'Katalog Marketplace Terpadu & Mesin Rekomendasi Cerdas' },
      { name: 'Waste Exchange', description: 'Bursa Limbah Produktif & Rekomendasi 5 Bank Sampah Terdekat' },
      { name: 'Dashboards', description: 'Dashboard Eksekutif & Analitik Bisnis Supplier & UMKM' },
    ],
  },
  // Lokal (Bun) membaca file .ts, sedangkan Vercel hanya memuat hasil kompilasi .js
  apis: [`${ROUTES_DIR}/**/*.ts`, `${ROUTES_DIR}/**/*.js`],
};

export const swagger_spec = swagger_jsdoc(swagger_options);
