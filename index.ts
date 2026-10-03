import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import swagger_ui from 'swagger-ui-express';
import { swagger_spec } from './config/swagger';
import { connect_to_db } from './middleware/db-middleware';
import { error_middleware } from './middleware/error-middleware';
import auth_router from './routes/auth/auth-route';
import business_router from './routes/accounts/index';
import supplier_catalog_router from './routes/products/supplier-catalog-route';
import commodity_batch_tag_router from './routes/products/commodity-batch-tag-route';
import product_router from './routes/products/product-route';
import recipe_router from './routes/products/recipe-route';
import pre_order_router from './routes/orders/pre-order-route';
import procurement_order_router from './routes/orders/procurement-order-route';
import payment_router from './routes/payments/payment-route';

const DEFAULT_PORT = 3000;
const server_port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
const app: Express = express();

// Middleware dasar aplikasi
app.use(cors());
app.use(express.json());

// Pengkoneksian sekali ke database melalui middleware
app.use(connect_to_db());

// Dokumentasi API via Swagger OpenAPI 3.0
app.use(
  '/api/docs',
  swagger_ui.serve,
  swagger_ui.setup(swagger_spec, {
    customSiteTitle: 'KUMPUL API Documentation',
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
app.use('/api/business', business_router);
app.use('/api/supplier-catalogs', supplier_catalog_router);
app.use('/api/commodity-batch-tags', commodity_batch_tag_router);
app.use('/api/products', product_router);
app.use('/api/recipe-details', recipe_router);
app.use('/api/pre-orders', pre_order_router);
app.use('/api/orders', procurement_order_router);
app.use('/api/payments', payment_router);

// Middleware penanganan error global terpusat
app.use(error_middleware);

// Menjalankan server
app.listen(server_port, () => {
  console.log(`🚀 Server aktif dan berjalan di http://localhost:${server_port}`);
  console.log(`📑 Dokumentasi Swagger API tersedia di http://localhost:${server_port}/api-docs`);
});

export default app;