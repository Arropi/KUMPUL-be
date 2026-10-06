import { Type } from '@google/genai';
import { gemini_client, DEFAULT_GEMINI_MODEL, GEMINI_API_KEY } from '../../config/gemini.ts';
import type { DocumentVerificationResult, VerifyDocumentInput } from '../../types/ai-verification-types.ts';

/**
 * Memverifikasi dokumen pendukung supplier (kebersihan, keamanan pangan, atau legalitas usaha)
 * serta memastikan validitas tanggal kadaluarsa dokumen menggunakan Google Gemini AI.
 */
export const verify_supplier_document_service = async (
  input: VerifyDocumentInput
): Promise<DocumentVerificationResult> => {
  const { file_url, commodity_name, supplier_name } = input;

  if (!file_url || typeof file_url !== 'string' || file_url.trim() === '') {
    return {
      is_verified: false,
      document_type: 'TIDAK_ADA_DOKUMEN',
      is_expired: false,
      hygiene_compliance: false,
      legal_compliance: false,
      analysis_summary: 'Tidak ada berkas pendukung (supporting_file_url) yang dilampirkan.',
      rejection_reason: 'FILE_URL_EMPTY',
    };
  }

  // Jika API Key belum disetel atau klien belum diinisialisasi
  if (!gemini_client || !GEMINI_API_KEY) {
    console.warn('[Gemini AI]: GEMINI_API_KEY belum dikonfigurasi di .env, verifikasi otomatis disetel false.');
    return {
      is_verified: false,
      document_type: 'BELUM_DIVERIFIKASI',
      is_expired: false,
      hygiene_compliance: false,
      legal_compliance: false,
      analysis_summary: 'Kunci API Gemini belum dikonfigurasi pada server.',
      rejection_reason: 'GEMINI_API_KEY_MISSING',
    };
  }

  const current_date_str = new Date().toISOString().split('T')[0];

  const system_instruction = `Anda adalah Asisten Auditor Kepatuhan Resmi Platform KUMPUL (Agromaritim, Manufaktur & Pangan).
Tugas Anda adalah memeriksa dokumen pendukung dari Supplier untuk memverifikasi kebersihan/keamanan pangan serta legalitas usaha, dan memastikan dokumen belum kadaluarsa.

TANGGAL HARI INI: ${current_date_str}.

KRITERIA EVALUASI DOKUMEN:
1. STANDAR KEBERSIHAN & MUTU (hygiene_compliance):
   - Dokumen yang diakui: Sertifikat Halal (BPJPH/MUI), HACCP, GMP/CPPOB, Sertifikat Kelayakan Pengolahan (SKP), Uji Laboratorium Pangan/Mikrobiologi, Karantina Pertanian/Perikanan.
2. STANDAR LEGALITAS (legal_compliance):
   - Dokumen yang diakui: NIB (Nomor Induk Berusaha), Izin Edar BPOM (MD/ML), SPP-PIRT, SIUP, NPWP Badan Usaha, Izin Usaha Perikanan/Pertanian.
3. MASA KADALUARSA (is_expired):
   - Periksa tanggal kedaluwarsa dokumen (valid until / expiry date).
   - Jika tanggal kadaluarsa <= ${current_date_str}, maka dokumen KADALUARSA (is_expired: true, is_verified: false, rejection_reason: "DOKUMEN_KADALUARSA").
   - Jika dokumen berlaku seumur hidup atau tidak ada batas tanggal, set is_expired: false dan expiration_date: null.
4. KEPUTUSAN FINAL (is_verified):
   - is_verified WAJIB bernilai TRUE jika dan hanya jika:
     (hygiene_compliance === true ATAU legal_compliance === true) DAN is_expired === false DAN dokumen terlihat sah/asli.
   - Selain itu, is_verified WAJIB bernilai FALSE dengan menyertakan rejection_reason.`;

  try {
    const contents: any[] = [];

    // Jika file URL merupakan URL HTTP/HTTPS, coba unduh buffer dokumen (gambar atau PDF)
    let file_part = await fetch_file_buffer(file_url);
    if (file_part) {
      contents.push(file_part);
    }

    contents.push({
      text: `Periksa dokumen pendukung berikut ini:
URL Dokumen: ${file_url}
${commodity_name ? `Komoditas: ${commodity_name}` : ''}
${supplier_name ? `Nama Usaha Supplier: ${supplier_name}` : ''}

Silakan analisis apakah dokumen ini valid secara kebersihan atau legalitas usaha, dan pastikan masa berlakunya masih aktif per hari ini (${current_date_str}).`,
    });

    const response = await gemini_client.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: system_instruction,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            is_verified: {
              type: Type.BOOLEAN,
              description: 'True jika dokumen sah secara kebersihan atau legalitas dan belum kadaluarsa',
            },
            document_type: {
              type: Type.STRING,
              description: 'Tipe dokumen (e.g. SERTIFIKAT_HALAL, HACCP, BPOM_MD, PIRT, NIB, UJI_LAB, TIDAK_VALID)',
            },
            document_number: {
              type: Type.STRING,
              description: 'Nomor registrasi/sertifikat resmi dokumen jika ditemukan',
            },
            issuer: {
              type: Type.STRING,
              description: 'Lembaga atau instansi resmi yang menerbitkan dokumen',
            },
            expiration_date: {
              type: Type.STRING,
              description: 'Tanggal kadaluarsa dokumen dalam format YYYY-MM-DD, atau kosong jika seumur hidup',
            },
            is_expired: {
              type: Type.BOOLEAN,
              description: 'True jika tanggal kadaluarsa dokumen sudah lewat dari hari ini',
            },
            hygiene_compliance: {
              type: Type.BOOLEAN,
              description: 'True jika dokumen membuktikan standar kebersihan/mutu pangan',
            },
            legal_compliance: {
              type: Type.BOOLEAN,
              description: 'True jika dokumen membuktikan legalitas usaha supplier',
            },
            analysis_summary: {
              type: Type.STRING,
              description: 'Penjelasan ringkas hasil verifikasi dalam bahasa Indonesia',
            },
            rejection_reason: {
              type: Type.STRING,
              description: 'Alasan penolakan jika is_verified bernilai false',
            },
          },
          required: [
            'is_verified',
            'document_type',
            'is_expired',
            'hygiene_compliance',
            'legal_compliance',
            'analysis_summary',
          ],
        },
      },
    });

    const response_text = response.text;
    if (!response_text) {
      throw new Error('Gemini AI tidak mengembalikan output analisis yang valid.');
    }

    const parsed_result = JSON.parse(response_text) as DocumentVerificationResult;

    // Proteksi ekstra: pastikan jika kadaluarsa, is_verified wajib false
    if (parsed_result.is_expired) {
      parsed_result.is_verified = false;
      if (!parsed_result.rejection_reason) {
        parsed_result.rejection_reason = 'DOKUMEN_KADALUARSA';
      }
    }

    return parsed_result;
  } catch (error: any) {
    console.error('[Gemini AI Document Verification Error]:', error);
    return {
      is_verified: false,
      document_type: 'GAGAL_ANALISIS',
      is_expired: false,
      hygiene_compliance: false,
      legal_compliance: false,
      analysis_summary: `Terjadi kendala saat menganalisis dokumen dengan AI: ${error.message || 'Kesalahan layanan'}`,
      rejection_reason: 'AI_PROCESSING_ERROR',
    };
  }
};

/**
 * Helper untuk mengunduh berkas gambar/PDF dari URL agar dapat diproses oleh model multimodal Gemini.
 */
const fetch_file_buffer = async (file_url: string): Promise<any | null> => {
  if (!file_url.startsWith('http://') && !file_url.startsWith('https://')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout_id = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(file_url, { signal: controller.signal });
    clearTimeout(timeout_id);

    if (!res.ok) return null;

    const content_type = res.headers.get('content-type') || '';
    const is_supported_mime =
      content_type.startsWith('image/') || content_type === 'application/pdf';

    if (!is_supported_mime) return null;

    const array_buffer = await res.arrayBuffer();
    const base64_data = Buffer.from(array_buffer).toString('base64');

    return {
      inlineData: {
        mimeType: content_type.split(';')[0],
        data: base64_data,
      },
    };
  } catch {
    // Jika gagal fetch (misal URL privat/lokal), fallback ke teks URL
    return null;
  }
};
