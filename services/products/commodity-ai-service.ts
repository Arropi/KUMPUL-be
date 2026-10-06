import type { QualityVerificationResultDTO } from '../../types/commodity-batch-tag-types';

const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];

/**
 * Memvalidasi dokumen pendukung mutu (sertifikat, legalitas, kebersihan, tanggal expired)
 * menggunakan model AI Google Gemini.
 */
export const verify_commodity_quality_with_ai = async (
  commodity_name: string,
  supporting_file_url?: string | null,
  storage_temperature?: string
): Promise<QualityVerificationResultDTO> => {
  // Jika tidak ada URL berkas pendukung, otomatis tidak terverifikasi
  if (!supporting_file_url || supporting_file_url.trim().length === 0) {
    return {
      is_verified: false,
      hygiene_assessment: 'Dokumen pendukung kebersihan tidak dilampirkan.',
      legality_assessment: 'Dokumen legalitas izin edar/sertifikasi belum diunggah.',
      expiration_valid: false,
      verification_notes: 'Verifikasi AI gagal: URL berkas pendukung (supporting_file_url) kosong.',
    };
  }

  const api_key = process.env.GEMINI_API_KEY || process.env.GEMIN_API_KEY;
  if (!api_key) {
    return {
      is_verified: false,
      hygiene_assessment: 'Kunci API Gemini tidak terkonfigurasi pada server backend.',
      legality_assessment: 'Pemeriksaan legalitas tertunda.',
      expiration_valid: false,
      verification_notes: 'GEMINI_API_KEY belum dikonfigurasi di file environment.',
    };
  }

  const system_instruction = `
Anda adalah AI Auditor Verifikasi Mutu & Legalitas Pangan B2B untuk platform KUMPUL.
Tugas Anda adalah memvalidasi dokumen pendukung mutu komoditas bahan baku yang diunggah oleh Supplier.

Fokuskan instruksi pemeriksaan ketat pada 3 kriteria:
1. Kebersihan & Sanitasi: Apakah dokumen mencakup standar kebersihan pangan, Good Agricultural Practices (GAP), sertifikat fitosanitari, uji lab cemaran, atau sertifikasi sanitasi yang higienis?
2. Legalitas Supplier: Apakah dokumen menunjukkan izin resmi (seperti BPOM, P-IRT, Sertifikat Halal, Karantina Pertanian, atau izin dinas terkait)?
3. Masa Berlaku / Kadaluarsa Dokumen: Apakah dokumen atau izin masih dalam masa berlaku yang valid (tidak kedaluwarsa)?

Jika dokumen memenuhi standar kebersihan, legalitas sah, dan tanggal kadaluarsa masih valid, tetapkan is_verified: true.
Jika dokumen palsu, tidak relevan, kadaluarsa, atau tidak memenuhi standar kebersihan/legalitas, tetapkan is_verified: false.

KEMBALIKAN HANYA FORMAT JSON MURNI TANPA BACKTICK MARKDOWN:
{
  "is_verified": boolean,
  "hygiene_assessment": "ringkasan penilaian kebersihan",
  "legality_assessment": "ringkasan penilaian legalitas/izin",
  "expiration_valid": boolean,
  "verification_notes": "kesimpulan audit mutu secara ringkas"
}
`.trim();

  const user_prompt = `
Komoditas Bahan Baku: ${commodity_name}
Suhu Penyimpanan: ${storage_temperature || 'AMBIENT'}
URL Berkas Pendukung Mutu/Legalitas: ${supporting_file_url}
Tanggal Audit: ${new Date().toISOString().slice(0, 10)}
`.trim();

  for (const model_name of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${api_key}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${system_instruction}\n\n${user_prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        continue;
      }

      const response_data = (await response.json()) as any;
      const response_text = response_data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!response_text) {
        continue;
      }

      const parsed_json = JSON.parse(response_text) as QualityVerificationResultDTO;
      return {
        is_verified: Boolean(parsed_json.is_verified),
        hygiene_assessment: parsed_json.hygiene_assessment || 'Standar kebersihan dievaluasi oleh sistem.',
        legality_assessment: parsed_json.legality_assessment || 'Dokumen legalitas diverifikasi.',
        expiration_valid: Boolean(parsed_json.expiration_valid),
        verification_notes: parsed_json.verification_notes || 'Verifikasi otomatis diselesaikan oleh AI Gemini.',
      };
    } catch (_model_error) {
      // Coba model fallback berikutnya
      continue;
    }
  }

  // Fallback jika seluruh model gagal merespons
  return {
    is_verified: false,
    hygiene_assessment: 'Gagal terhubung dengan layanan AI auditor.',
    legality_assessment: 'Verifikasi legalitas belum dapat diselesaikan.',
    expiration_valid: false,
    verification_notes: 'Layanan AI verifikasi sementara tidak merespons. Status mutu diatur ke false.',
  };
};
