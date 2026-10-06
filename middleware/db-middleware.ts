import type { Request, Response, NextFunction } from 'express';
import { check_db_connection } from '../config/db.ts';
import { AppError } from './error-middleware.ts';

let is_database_connected = false;
let database_initialization_promise: Promise<void> | null = null;

const initialize_database_once = async (): Promise<void> => {
  if (is_database_connected) {
    return;
  }

  if (!database_initialization_promise) {
    database_initialization_promise = (async () => {
      const is_successful = await check_db_connection();
      if (!is_successful) {
        database_initialization_promise = null; // Reset promise agar dapat dicoba kembali jika gagal
        throw new AppError(
          'Koneksi ke database PostgreSQL gagal diinisialisasi',
          500,
          'DATABASE_CONNECTION_ERROR'
        );
      }
      is_database_connected = true;
      console.log('✅ Koneksi database berhasil diinisialisasi sekali melalui middleware.');
    })();
  }

  await database_initialization_promise;
};

/**
 * Middleware untuk menginisialisasi koneksi database sekali saja (singleton).
 * Digunakan sebagai: app.use(connect_to_db()) atau app.use(connet_to_db())
 */
export const connect_to_db = () => {
  // Proaktif memulai koneksi saat middleware didaftarkan
  initialize_database_once().catch((init_error) => {
    console.error('Inisialisasi awal koneksi database tertunda atau gagal:', init_error);
  });

  return async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await initialize_database_once();
      next();
    } catch (middleware_error) {
      next(middleware_error);
    }
  };
};

// Alias untuk toleransi penulisan typo pada prompt: connet_to_db()
export const connet_to_db = connect_to_db;
