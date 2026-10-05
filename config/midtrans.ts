import midtrans_client from 'midtrans-client';
import 'dotenv/config';

export const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY as string
export const MIDTRANS_CLIENT_KEY =
  process.env.MIDTRANS_CLIENT_KEY as string
export const MIDTRANS_IS_PRODUCTION =
  process.env.MIDTRANS_IS_PRODUCTION === 'true';

// Inisialisasi Midtrans Snap Client (Sandbox Mode secara default)
export const snap_client = new midtrans_client.Snap({
  isProduction: MIDTRANS_IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});

// Inisialisasi Midtrans Core API Client untuk pengecekan status & pembatalan
export const core_api_client = new midtrans_client.CoreApi({
  isProduction: MIDTRANS_IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});
