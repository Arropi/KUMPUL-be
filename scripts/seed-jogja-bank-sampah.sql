-- ============================================================================
-- SEED DATA: Direktori Bank Sampah & TPS3R Daerah Istimewa Yogyakarta (KUMPUL)
-- Format sesuai tabel: offtaker_directories
-- ============================================================================

INSERT INTO offtaker_directories (
  id,
  org_name,
  contact_person,
  phone,
  address,
  latitude,
  longitude,
  accepted_waste_types,
  service_area_city,
  created_at
) VALUES
  (gen_random_uuid(), 'Bank Sampah Gemah Ripah Bantul (Pelopor Nasional)', 'Pak Bambang Suwerda', '081227091234', 'Badegan, RT 01, Trirenggo, Kec. Bantul, Kabupaten Bantul, D.I. Yogyakarta 55714', -7.893215, 110.334182, '["Minyak Jelantah","Plastik","Kardus/Kertas","Logam/Besi","Organik/Kompos","Kaca/Botol"]'::jsonb, 'Kabupaten Bantul', NOW()),
  (gen_random_uuid(), 'Bank Sampah Griya Sapu Lidi', 'Ibu Susilowati', '081328905678', 'Jalan Pandeyan No. 18, Pandeyan, Kec. Umbulharjo, Kota Yogyakarta, D.I. Yogyakarta 55161', -7.818452, 110.387921, '["Minyak Jelantah","Plastik","Kardus/Kertas","Kain Perca","Organik/Kompos"]'::jsonb, 'Kota Yogyakarta', NOW()),
  (gen_random_uuid(), 'Bank Sampah Surolaten Berkah', 'Pak Sumarno', '081578123456', 'Surolaten, Manukan, Condongcatur, Kec. Depok, Kabupaten Sleman, D.I. Yogyakarta 55281', -7.755431, 110.402143, '["Plastik","Kardus/Kertas","Minyak Jelantah","Organik/Ampas Tahu","Logam/Besi"]'::jsonb, 'Kabupaten Sleman', NOW()),
  (gen_random_uuid(), 'Bank Sampah Resik Plus Mergangsan', 'Ibu Ratna Dewi', '081790123890', 'Jl. Sisingamangaraja No. 45, Brontokusuman, Kec. Mergangsan, Kota Yogyakarta 55153', -7.823901, 110.372189, '["Minyak Jelantah","Plastik","Kardus/Kertas","Kain Perca","Cangkang Telur"]'::jsonb, 'Kota Yogyakarta', NOW()),
  (gen_random_uuid(), 'TPS3R Bener Mandiri Sejahtera', 'Pak Haryadi', '081234567811', 'Jl. Bener No. 12, Bener, Kec. Tegalrejo, Kota Yogyakarta, D.I. Yogyakarta 55243', -7.781294, 110.354102, '["Organik Basah Dapur","Ampas Kedelai","Sayur/Buah Busuk","Kardus/Kertas","Plastik"]'::jsonb, 'Kota Yogyakarta', NOW()),
  (gen_random_uuid(), 'Bank Sampah Alam Lestari Minomartani', 'Ibu Sri Handayani', '081392817263', 'Jl. Gurame No. 5, Minomartani, Kec. Ngaglik, Kabupaten Sleman, D.I. Yogyakarta 55581', -7.734129, 110.407812, '["Minyak Jelantah","Plastik","Kardus/Kertas","Logam/Aluminium","Organik/Kompos"]'::jsonb, 'Kabupaten Sleman', NOW()),
  (gen_random_uuid(), 'Bank Sampah Guyub Rukun Kotagede', 'Pak Triyono', '081804129876', 'Jagalan, Kec. Kotagede, Kota Yogyakarta, D.I. Yogyakarta 55172', -7.828451, 110.399812, '["Minyak Jelantah","Kain Perca Tekstil","Kardus/Kertas","Plastik","Logam/Perak/Tembaga"]'::jsonb, 'Kota Yogyakarta', NOW()),
  (gen_random_uuid(), 'TPS3R Giwangan Berkah Resik', 'Pak Joko Purnomo', '081329018274', 'Jl. Imogiri Timur KM 4.5, Giwangan, Kec. Umbulharjo, Kota Yogyakarta 55163', -7.834912, 110.390123, '["Organik Basah Pasar","Ampas Tahu/Kedelai","Sayur/Buah Afkir","Kardus/Kertas"]'::jsonb, 'Kota Yogyakarta', NOW()),
  (gen_random_uuid(), 'Bank Sampah Berkah Barokah Gamping', 'Ibu Ningsih', '081648912301', 'Ambarketawang, Kec. Gamping, Kabupaten Sleman, D.I. Yogyakarta 55294', -7.801239, 110.324109, '["Kotoran Ternak/Feses","Organik/Kompos","Minyak Jelantah","Plastik","Kardus/Kertas"]'::jsonb, 'Kabupaten Sleman', NOW()),
  (gen_random_uuid(), 'Bank Sampah Asri Sedayu', 'Pak Slamet Wibowo', '081704981235', 'Argorejo, Kec. Sedayu, Kabupaten Bantul, D.I. Yogyakarta 55752', -7.829012, 110.274198, '["Minyak Jelantah","Organik Basah","Ampas Kedelai","Kardus/Kertas","Plastik"]'::jsonb, 'Kabupaten Bantul', NOW()),
  (gen_random_uuid(), 'Bank Sampah Dlingo Hijau Sentosa', 'Pak Mulyadi', '081226901823', 'Dlingo, Kec. Dlingo, Kabupaten Bantul, D.I. Yogyakarta 55783', -7.925412, 110.467812, '["Kain Perca","Serbuk Kayu/Gergaji","Kardus/Kertas","Organik/Kompos"]'::jsonb, 'Kabupaten Bantul', NOW()),
  (gen_random_uuid(), 'Bank Sampah Kulon Progo Mandiri (Wates)', 'Ibu Endang Suryani', '081391209845', 'Jl. Tentara Pelajar No. 20, Wates, Kabupaten Kulon Progo, D.I. Yogyakarta 55651', -7.859012, 110.158912, '["Minyak Jelantah","Plastik","Kardus/Kertas","Organik/Kompos","Kain Perca"]'::jsonb, 'Kabupaten Kulon Progo', NOW()),
  (gen_random_uuid(), 'Bank Sampah Handayani Wonosari', 'Pak Agus Riyanto', '081749012876', 'Kepek, Kec. Wonosari, Kabupaten Gunungkidul, D.I. Yogyakarta 55813', -7.965412, 110.601294, '["Kardus/Kertas","Plastik","Logam/Besi","Organik/Kompos","Kotoran Ternak/Feses"]'::jsonb, 'Kabupaten Gunungkidul', NOW()),
  (gen_random_uuid(), 'Bank Sampah Kalirang Lestari', 'Pak Danang Sulistyo', '081328190245', 'Jl. Kaliurang KM 14.5, Umbulmartani, Ngemplak, Kabupaten Sleman 55584', -7.689012, 110.428901, '["Minyak Jelantah","Organik/Ampas Kopi","Plastik","Kardus/Kertas","Kaca/Botol"]'::jsonb, 'Kabupaten Sleman', NOW()),
  (gen_random_uuid(), 'TPS3R Kasihan Bersih', 'Pak Teguh Widodo', '081579012389', 'Tamantirto, Kec. Kasihan, Kabupaten Bantul, D.I. Yogyakarta 55183', -7.817812, 110.330129, '["Organik Dapur Mahasiswa","Minyak Jelantah","Kardus/Kertas","Plastik"]'::jsonb, 'Kabupaten Bantul', NOW());