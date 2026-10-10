import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';
import * as schema from './schema.ts';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL belum didefinisikan pada environment variables');
}

const is_vercel = Boolean(process.env.VERCEL);

// Konfigurasi koneksi ke Supabase PostgreSQL Pooler (port 6543)
// Catatan: Mode Transaction Pooler Supabase mewajibkan `prepare: false`
// Pada serverless (Vercel), max connection dibatasi ke 1 agar tidak menguras pool connections
const connection_client = postgres(DATABASE_URL, {
  prepare: false,
  max: is_vercel ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

export const db = drizzle(connection_client, { schema });

export const check_db_connection = async (): Promise<boolean> => {
  try {
    await connection_client.unsafe('SELECT 1');
    return true;
  } catch (error_instance) {
    console.error('Koneksi ke database gagal:', error_instance);
    return false;
  }
};

export { connection_client };
