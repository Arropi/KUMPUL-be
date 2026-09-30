/**
 * Menghasilkan SKU dasar dari nama komoditas/produk.
 * Contoh: "beras 20 Kg" -> "BRS-20-KG"
 *
 * Aturan:
 * 1. Setiap kata/token dipisahkan spasi atau tanda baca.
 * 2. Token angka murni dipertahankan (contoh: "20" -> "20").
 * 3. Token kata dibersihkan dari huruf vokal (A, E, I, O, U) dan diubah ke huruf kapital (contoh: "beras" -> "BRS", "Kg" -> "KG").
 * 4. Jika token kata seluruhnya terdiri dari huruf vokal (tanpa konsonan), gunakan huruf kapital aslinya.
 * 5. Token digabungkan menggunakan pemisah tanda hubung (-).
 */
export const generate_sku_from_name = (product_name: string): string => {
  const sanitized_input = product_name.trim();
  if (!sanitized_input) {
    return 'ITEM';
  }

  const raw_tokens = sanitized_input.split(/[\s_-]+/).filter((token) => token.length > 0);

  const formatted_tokens = raw_tokens
    .map((token) => {
      // Jika token adalah digit angka murni
      if (/^\d+$/.test(token)) {
        return token;
      }

      // Ambil karakter alfanumerik
      const clean_token = token.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (!clean_token) {
        return '';
      }

      // Jika ada angka di dalam token (misal: 20KG)
      const consonants_only = clean_token.replace(/[AEIOU]/g, '');

      return consonants_only.length > 0 ? consonants_only : clean_token;
    })
    .filter((token_part) => token_part.length > 0);

  return formatted_tokens.join('-');
};
