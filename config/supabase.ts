import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase_url = process.env.SUPABASE_URL || '';
// Prioritaskan service role key untuk operasi storage di backend, fallback ke anon key
const supabase_key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  '';

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'icom-bucket';

if (!supabase_url || !supabase_key) {
  console.warn('⚠️ Konfigurasi SUPABASE_URL atau SUPABASE_KEY belum terpasang di environment variable backend.');
}

export const supabase_client: SupabaseClient = createClient(supabase_url, supabase_key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface UploadFileOptions {
  file_buffer: Buffer | Uint8Array;
  file_name: string;
  content_type: string;
  folder?: string;
}

export interface UploadFileResult {
  url: string;
  path: string;
  bucket: string;
  file_name: string;
  size: number;
  content_type: string;
}

/**
 * Mengunggah file buffer (gambar atau dokumen) ke Supabase Storage bucket
 */
export async function upload_file_to_supabase(
  options: UploadFileOptions
): Promise<UploadFileResult> {
  const { file_buffer, file_name, content_type, folder = 'katalog' } = options;

  if (!supabase_url || !supabase_key) {
    throw new Error('Supabase Storage belum dikonfigurasi pada server (SUPABASE_URL / SUPABASE_KEY kosong).');
  }

  // Bersihkan ekstensi dan nama file
  const extension = file_name.includes('.') ? file_name.split('.').pop() : '';
  const base_name = file_name.includes('.')
    ? file_name.substring(0, file_name.lastIndexOf('.'))
    : file_name;

  const sanitized_base_name = base_name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  const timestamp = Date.now();
  const random_suffix = Math.random().toString(36).substring(2, 8);
  const final_file_name = extension
    ? `${timestamp}-${random_suffix}-${sanitized_base_name}.${extension}`
    : `${timestamp}-${random_suffix}-${sanitized_base_name}`;

  const clean_folder = folder.replace(/^\/+|\/+$/g, '');
  const storage_path = clean_folder ? `${clean_folder}/${final_file_name}` : final_file_name;

  try {
    const { data, error } = await supabase_client.storage
      .from(SUPABASE_BUCKET)
      .upload(storage_path, file_buffer, {
        contentType: content_type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      // Diagnostik error Supabase Storage terperinci
      if (error.message.includes('row-level security') || error.message.includes('violates row-level security')) {
        throw new Error(
          `Gagal mengunggah ke Supabase Storage: Ditolak oleh Row-Level Security (RLS). Pastikan menggunakan SUPABASE_SERVICE_ROLE_KEY di be/.env atau aktifkan policy INSERT pada bucket "${SUPABASE_BUCKET}".`
        );
      }
      if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
        throw new Error(
          `Gagal mengunggah ke Supabase Storage: Bucket "${SUPABASE_BUCKET}" tidak ditemukan. Pastikan nama bucket di be/.env sesuai dan telah dibuat di Supabase Dashboard.`
        );
      }
      throw new Error(`Gagal mengunggah file ke Supabase Storage: ${error.message}`);
    }

    const { data: public_url_data } = supabase_client.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(data.path);

    return {
      url: public_url_data.publicUrl,
      path: data.path,
      bucket: SUPABASE_BUCKET,
      file_name: final_file_name,
      size: file_buffer.length,
      content_type,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND') || err.message.includes('timeout')) {
        throw new Error(
          `Kendala koneksi jaringan ke Supabase Storage (${supabase_url}): ${err.message}. Periksa koneksi internet atau gunakan Google/Cloudflare DNS.`
        );
      }
      throw err;
    }
    throw new Error('Terjadi kendala tidak terduga saat menghubungi Supabase Storage.');
  }
}

/**
 * Menghapus file dari Supabase Storage bucket berdasarkan storage path
 */
export async function delete_file_from_supabase(path: string): Promise<boolean> {
  if (!supabase_url || !supabase_key || !path) {
    return false;
  }
  try {
    const { error } = await supabase_client.storage
      .from(SUPABASE_BUCKET)
      .remove([path]);
    if (error) {
      console.warn(`Gagal menghapus file "${path}" dari Supabase Storage:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Kendala saat menghapus file "${path}" dari Supabase Storage:`, err);
    return false;
  }
}

