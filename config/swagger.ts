import swagger_jsdoc from 'swagger-jsdoc';

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
      { name: 'BusinessEntities', description: 'Pengelolaan Entitas & Profil Bisnis' },
      { name: 'BusinessRoles', description: 'Manajemen Role Bisnis (UMKM / SUPPLIER)' },
      { name: 'SupplierCatalogs', description: 'Katalog Komoditas Supplier & Tiering Harga' },
      { name: 'CommodityBatchTags', description: 'Batch Komoditas, Tag Panen, & Verifikasi AI' },
      { name: 'Products', description: 'Katalog Produk UMKM & Perhitungan Margin' },
      { name: 'RecipeDetails', description: 'Resep Bahan Baku & Perhitungan HPP Otomatis' },
      { name: 'PreOrders', description: 'Procurement Pools (Pre-Order) & Agregasi Permintaan Bahan Baku' },
      { name: 'ProcurementOrders', description: 'Pemesanan Bahan Baku UMKM & Manajemen Status Pesanan' },
      { name: 'Payments', description: 'Gateway Pembayaran Midtrans Snap, Webhook, & Rekening Bersama (Escrow)' },
    ],
  },
  apis: ['./routes/**/*.ts', './routes/*.ts'],
};

export const swagger_spec = swagger_jsdoc(swagger_options);
