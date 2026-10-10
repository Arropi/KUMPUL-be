import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import swagger_ui from 'swagger-ui-express';
import { swagger_spec } from './config/swagger.ts';
import { connect_to_db } from './middleware/db-middleware.ts';
import { error_middleware } from './middleware/error-middleware.ts';
import auth_router from './routes/auth/auth-route.ts';
import supplier_catalog_router from './routes/products/supplier-catalog-route.ts';
import commodity_batch_tag_router from './routes/products/commodity-batch-tag-route.ts';
import product_router from './routes/products/product-route.ts';
import recipe_router from './routes/products/recipe-route.ts';
import pre_order_router from './routes/orders/pre-order-route.ts';
import procurement_order_router from './routes/orders/procurement-order-route.ts';
import payment_router from './routes/payments/payment-route.ts';
import profile_router from './routes/profile/profile-route.ts';
import business_router from './routes/profile/business-route.ts';
import marketplace_router from './routes/products/marketplace-route.ts';
import waste_router from './routes/waste/waste-route.ts';
import dashboard_router from './routes/dashboard/dashboard-route.ts';
import storage_router from './routes/storage/storage-route.ts';

const DEFAULT_PORT = 3000;
const server_port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
const app: Express = express();

// Middleware dasar aplikasi
app.use(cors());
app.use(express.json());

// Pengkoneksian sekali ke database melalui middleware
app.use(connect_to_db());

// Dokumentasi API via Swagger OpenAPI 3.0
const SWAGGER_CSS_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css';
const SWAGGER_JS_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js',
];

app.use(
  ['/api/docs', '/api-docs'],
  swagger_ui.serve,
  swagger_ui.setup(swagger_spec, {
    customSiteTitle: 'KUMPUL API Documentation',
    customCssUrl: SWAGGER_CSS_URL,
    customJs: SWAGGER_JS_URLS,
  })
);

// Endpoint spesifikasi OpenAPI JSON mentah
app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swagger_spec);
});

// Endpoint pemeriksaan kesehatan (health check)
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'KUMPUL Backend API berjalan dengan baik',
    database_status: 'connected',
    documentation_url: '/api-docs',
  });
});

// Pendaftaran route API
app.use('/api/auth', auth_router);
app.use('/api/profile', profile_router);
app.use('/api/profiles', profile_router);
app.use('/api/business', business_router);
app.use('/api/supplier-catalogs', supplier_catalog_router);
app.use('/api/commodity-batch-tags', commodity_batch_tag_router);
app.use('/api/products', product_router);
app.use('/api/recipe-details', recipe_router);
app.use('/api/pre-orders', pre_order_router);
app.use('/api/orders', procurement_order_router);
app.use('/api/payments', payment_router);
app.use('/api/marketplace', marketplace_router);
app.use('/api/waste-listings', waste_router);
app.use('/api/dashboards', dashboard_router);
app.use('/api/upload', storage_router);

// Middleware penanganan error global terpusat
app.use(error_middleware);

// Menjalankan server lokal jika bukan di lingkungan Vercel Serverless
if (!process.env.VERCEL) {
  app.listen(server_port, () => {
    console.log(`🚀 Server aktif dan berjalan di http://localhost:${server_port}`);
    console.log(`📑 Dokumentasi Swagger API tersedia di http://localhost:${server_port}/api/docs`);
  });
}

export default app;