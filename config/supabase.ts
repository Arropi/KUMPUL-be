import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase_url = process.env.SUPABASE_URL || '';
const supabase_key = process.env.SUPABASE_KEY || '';

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'icom-bucket';

if (!supabase_url || !supabase_key) {
  console.warn('⚠️ Konfigurasi SUPABASE_URL atau SUPABASE_KEY belum terpasang di environment variable.');
}

export const supabase_client: SupabaseClient = createClient(supabase_url, supabase_key);

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

  const { data, error } = await supabase_client.storage
    .from(SUPABASE_BUCKET)
    .upload(storage_path, file_buffer, {
      contentType: content_type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
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
}
