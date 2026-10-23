import { Type } from '@google/genai';
import {
  gemini_client,
  DEFAULT_GEMINI_MODEL,
  GEMINI_FALLBACK_MODELS,
  GEMINI_API_KEY,
} from '../../config/gemini.ts';

export interface WastePricePredictionInput {
  title: string;
  category?: string;
  volume?: number;
  unit?: string;
  description?: string;
  expiry_date?: string;
}

export interface WastePricePredictionResult {
  suggested_price: number;
  price_range: string;
  min_price: number;
  max_price: number;
  target_industry: string;
  recommended_category: string;
  quality_grade: 'PREMIUM' | 'STANDAR' | 'EKONOMI';
  reasoning: string;
  carbon_offset_kg_estimate?: number;
}

// Fallback benchmarks lokal jika layanan AI tidak tersedia atau offline
const LOCAL_BENCHMARKS = [
  {
    keywords: ['minyak', 'jelantah', 'uco', 'goreng'],
    category: 'ORGANIK_KERING',
    minPrice: 6500,
    maxPrice: 8500,
    defaultPrice: 7500,
    industry: 'Industri Biodiesel B35 & SAF',
    unit: 'Liter',
    reason: 'Minyak jelantah memiliki potensi tinggi sebagai bahan baku biofuel terbarukan.',
  },
  {
    keywords: ['tahu', 'kedelai', 'ampas'],
    category: 'ORGANIK_BASAH',
    minPrice: 800,
    maxPrice: 1500,
    defaultPrice: 1200,
    industry: 'Peternakan Ruminansia & Budidaya Maggot BSF',
    unit: 'Kg',
    reason: 'Ampas kedelai/tahu kaya akan protein nabati untuk pakan ternak konsentrat.',
  },
  {
    keywords: ['telur', 'cangkang', 'kulit telur'],
    category: 'ORGANIK_KERING',
    minPrice: 1200,
    maxPrice: 2800,
    defaultPrice: 2000,
    industry: 'Industri Kalsium Pakan Ternak & Pupuk Organik',
    unit: 'Kg',
    reason: 'Cangkang telur mengandung kalsium karbonat tinggi untuk remineralisasi tanah dan suplemen pakan.',
  },
  {
    keywords: ['kopi', 'teh', 'coffee'],
    category: 'ORGANIK_KERING',
    minPrice: 1000,
    maxPrice: 2200,
    defaultPrice: 1600,
    industry: 'Briket Bio-Batubara & Ekstraksi Kosmetik',
    unit: 'Kg',
    reason: 'Ampas kopi berkalori tinggi untuk briket ramah lingkungan dan penyerap bau alami.',
  },
  {
    keywords: ['sayur', 'buah', 'kulit', 'daun'],
    category: 'ORGANIK_BASAH',
    minPrice: 400,
    maxPrice: 1000,
    defaultPrice: 700,
    industry: 'Eco-Enzyme & Biokonversi Maggot BSF',
    unit: 'Kg',
    reason: 'Residu buah dan sayur basah ideal untuk fermentasi eco-enzyme dan pakan larva BSF.',
  },
  {
    keywords: ['tulang', 'daging', 'ayam', 'sapi', 'ikan'],
    category: 'ORGANIK_BASAH',
    minPrice: 1500,
    maxPrice: 3200,
    defaultPrice: 2400,
    industry: 'Pabrik Pakan Ternak, Tepung Tulang & Kolagen',
    unit: 'Kg',
    reason: 'Residu hewani diproses menjadi tepung tulang kaya fosfor dan protein untuk pakan ternak.',
  },
];

function get_fallback_prediction(input: WastePricePredictionInput): WastePricePredictionResult {
  const text = `${input.title} ${input.description || ''}`.toLowerCase();
  const defaultBenchmark = LOCAL_BENCHMARKS[0]!;
  const matched =
    LOCAL_BENCHMARKS.find((b) => b.keywords.some((k) => text.includes(k))) ||
    defaultBenchmark;

  const isPremium =
    text.includes('jernih') ||
    text.includes('saring') ||
    text.includes('kering') ||
    text.includes('bersih') ||
    text.includes('segar');

  const price = isPremium ? Math.round(matched.defaultPrice * 1.1) : matched.defaultPrice;
  const vol = Number(input.volume) || 1;
  const unit = input.unit || matched.unit;

  return {
    suggested_price: price,
    price_range: `Rp ${matched.minPrice.toLocaleString('id-ID')} - Rp ${matched.maxPrice.toLocaleString('id-ID')}`,
    min_price: matched.minPrice,
    max_price: matched.maxPrice,
    target_industry: matched.industry,
    recommended_category: input.category || matched.category,
    quality_grade: isPremium ? 'PREMIUM' : 'STANDAR',
    reasoning: `Dianalisis untuk ${vol} ${unit} ${matched.keywords[0]} (${isPremium ? 'Kualitas Bersih / Terfilter' : 'Kualitas Standar Dapur'}). Target pasar: ${matched.industry}.`,
    carbon_offset_kg_estimate: Math.round(vol * 2.5 * 10) / 10,
  };
}

export const predict_waste_price_with_ai = async (
  input: WastePricePredictionInput
): Promise<WastePricePredictionResult> => {
  // Jika API client belum siap atau API key tidak ada, gunakan fallback cerdas
  if (!gemini_client || !GEMINI_API_KEY) {
    return get_fallback_prediction(input);
  }

  const prompt = `Analisis valuasi ekonomi sirkular dan estimasi harga pasar wajar untuk limbah residu dapur UMKM berikut:
Nama Residu Limbah: ${input.title}
Kategori Saat Ini: ${input.category || 'Belum Ditentukan'}
Volume: ${input.volume || 1} ${input.unit || 'Kg/Liter'}
Tanggal Kadaluwarsa / Batas Simpan: ${input.expiry_date || 'Belum Ditentukan'}
Deskripsi & Kondisi: ${input.description || 'Tidak ada catatan tambahan'}

Panduan Benchmark Pasar Sirkular B2B Indonesia:
- Minyak Jelantah (UCO): Rp 6.000 - Rp 9.000 / Liter (untuk Biodiesel B35 & SAF)
- Ampas Tahu / Kedelai: Rp 800 - Rp 1.800 / Kg (untuk Pakan Ternak & Maggot BSF)
- Cangkang Telur: Rp 1.200 - Rp 3.000 / Kg (untuk Kalsium Pakan & Pupuk Organik)
- Ampas Kopi & Teh: Rp 1.000 - Rp 2.500 / Kg (untuk Briket Bahan Bakar & Kosmetik)
- Residu Sayur/Buah: Rp 400 - Rp 1.200 / Kg (untuk Eco-enzyme & Kompos BSF)
- Tulang & Trimming Hewani: Rp 1.500 - Rp 3.500 / Kg (untuk Tepung Tulang/Pakan)
- Residu Anorganik (Kardus/Plastik): Rp 1.500 - Rp 4.500 / Kg (untuk Daur Ulang)`;

  const system_instruction = `Anda adalah AI Analis Valuasi Ekonomi Sirkular & Bursa Limbah Pangan B2B resmi platform KUMPUL.
Tugas Anda adalah memprediksi harga pasar wajar per unit (suggested_price sebagai integer rupiah bulat), rentang harga (price_range), target industri offtaker pembeli, kategori limbah yang paling tepat (ORGANIK_BASAH | ORGANIK_KERING | TEKSTIL_PERCA | ANORGANIK), serta alasan rekomendasi 1-2 kalimat padat dan informatif.`;

  for (const model_name of GEMINI_FALLBACK_MODELS) {
    try {
      const response = await gemini_client.models.generateContent({
        model: model_name,
        contents: prompt,
        config: {
          systemInstruction: system_instruction,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: Type.OBJECT,
            properties: {
              suggested_price: {
                type: Type.INTEGER,
                description: 'Harga per unit dalam Rupiah bulat tanpa koma, misal: 7500',
              },
              price_range: {
                type: Type.STRING,
                description: 'Rentang harga wajar pasar, contoh: Rp 6.500 - Rp 8.500',
              },
              min_price: { type: Type.INTEGER },
              max_price: { type: Type.INTEGER },
              target_industry: {
                type: Type.STRING,
                description: 'Target industri pembeli potensial (misal: Industri Biodiesel B35 & Ekspor SAF)',
              },
              recommended_category: {
                type: Type.STRING,
                description: 'Kategori limbah: ORGANIK_BASAH | ORGANIK_KERING | TEKSTIL_PERCA | ANORGANIK',
              },
              quality_grade: {
                type: Type.STRING,
                description: 'PREMIUM | STANDAR | EKONOMI',
              },
              reasoning: {
                type: Type.STRING,
                description: 'Penjelasan ringkas 1-2 kalimat mengapa harga ini direkomendasikan berdasarkan kondisi dan volume',
              },
              carbon_offset_kg_estimate: {
                type: Type.NUMBER,
                description: 'Estimasi reduksi emisi karbon (kg CO2e) jika residu ini dialihkan dari TPA',
              },
            },
            required: [
              'suggested_price',
              'price_range',
              'min_price',
              'max_price',
              'target_industry',
              'recommended_category',
              'reasoning',
            ],
          },
        },
      });

      const response_text = response.text;
      if (!response_text) continue;

      const parsed = JSON.parse(response_text) as WastePricePredictionResult;
      return {
        suggested_price: Number(parsed.suggested_price) || 5000,
        price_range: parsed.price_range || `Rp ${Number(parsed.suggested_price).toLocaleString('id-ID')}`,
        min_price: Number(parsed.min_price) || Number(parsed.suggested_price),
        max_price: Number(parsed.max_price) || Number(parsed.suggested_price),
        target_industry: parsed.target_industry || 'Offtaker & Bank Sampah Terdaftar',
        recommended_category: parsed.recommended_category || input.category || 'ORGANIK_BASAH',
        quality_grade:
          parsed.quality_grade === 'PREMIUM' ||
          parsed.quality_grade === 'STANDAR' ||
          parsed.quality_grade === 'EKONOMI'
            ? parsed.quality_grade
            : 'STANDAR',
        reasoning: parsed.reasoning || 'Rekomendasi harga dihitung berdasarkan dinamika bursa sirkular KUMPUL.',
        carbon_offset_kg_estimate: parsed.carbon_offset_kg_estimate,
      };
    } catch (model_err) {
      console.warn(`[Gemini Waste AI]: Model ${model_name} terkendala, mencoba fallback berikutnya...`);
    }
  }

  // Fallback jika seluruh model AI gagal
  return get_fallback_prediction(input);
};
