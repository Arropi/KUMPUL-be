import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connect_to_db } from './middleware/db-middleware';
import { error_middleware } from './middleware/error-middleware';
import business_entity_router from './routes/accounts/business-entity-route';
import business_role_router from './routes/accounts/business-role-route';
import supplier_catalog_router from './routes/products/supplier-catalog-route';

const DEFAULT_PORT = 3000;
const server_port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
const app: Express = express();

// Middleware dasar aplikasi
app.use(cors());
app.use(express.json());

// Pengkoneksian sekali ke database melalui middleware
app.use(connect_to_db());

// Endpoint pemeriksaan kesehatan (health check)
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'KUMPUL Backend API berjalan dengan baik',
    database_status: 'connected',
  });
});

// Pendaftaran route API
app.use('/api/business-entities', business_entity_router);
app.use('/api/business-roles', business_role_router);
app.use('/api/supplier-catalogs', supplier_catalog_router);

// Middleware penanganan error global terpusat
app.use(error_middleware);

// Menjalankan server
app.listen(server_port, () => {
  console.log(`🚀 Server aktif dan berjalan di http://localhost:${server_port}`);
});