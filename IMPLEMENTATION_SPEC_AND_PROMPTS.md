# KUMPUL Backend Implementation Specification & AI Agent Prompts

Dokumen ini memuat panduan arsitektur, modifikasi skema database Drizzle ORM, spesifikasi kontrak API (request/response), algoritma penentuan **5 Bank Sampah Terdekat**, serta **Prompt Instruksi Siap Pakai** bagi pengembang atau AI Agent untuk mengimplementasikan seluruh fitur backend yang belum terselesaikan di **KUMPUL** (`be/`).

Seluruh modul wajib mematuhi panduan standar pada [`be/AGENTS.md`](./AGENTS.md):
- Express 5 + Bun + TypeScript
- Drizzle ORM + PostgreSQL (Supabase) dengan driver `postgres.js` (`{ prepare: false }`)
- Skema validasi Zod
- Format respons & variabel `snake_case`
- Dokumentasi Swagger OpenAPI 3.0 JSDoc di setiap route
- Sentralisasi error via `AppError` dan `middleware/error-middleware.ts`

---

## DAFTAR ISI
1. [Modifikasi Skema Database (`schema.ts`)](#1-modifikasi-skema-database-schemats)
2. [Modul 1: Marketplace Terpadu & Dual-Engine Recommender](#modul-1-marketplace-terpadu--dual-engine-recommender)
3. [Modul 2: Bursa Limbah Produktif (CRUD, Self-Pickup Escrow & 5 Bank Sampah Terdekat)](#modul-2-bursa-limbah-produktif-crud-self-pickup-escrow--5-bank-sampah-terdekat)
4. [Modul 3: Gateway Pembayaran & Escrow (Midtrans 12h & Waste Escrow)](#modul-3-gateway-pembayaran--escrow-midtrans-12h--waste-escrow)
5. [Modul 4: Manajemen Pesanan Terpadu & Pengelompokan Order](#modul-4-manajemen-pesanan-terpadu--pengelompokan-order)
6. [Modul 5: Dashboard Analitik Eksekutif (UMKM & Supplier)](#modul-5-dashboard-analitik-eksekutif-umkm--supplier)
7. [Modul 6: Script Scraper Data Bank Sampah di D.I. Yogyakarta](#modul-6-script-scraper-data-bank-sampah-di-di-yogyakarta)
8. [Daftar Pendaftaran Route Baru pada `index.ts`](#8-daftar-pendaftaran-route-baru-pada-indexts)

---

## 1. Modifikasi Skema Database (`schema.ts`)

Berdasarkan analisis kebutuhan alur bisnis (Pre-Auth 12 jam, Anchor/Host Hub, Pesanan Langsung di atas MOQ, Handshake Pickup, dan Estimasi Runout Stok), lakukan penyesuaian pada `be/config/schema.ts`:

### A. Tabel `procurement_pools`
Tambahkan dukungan Host Hub dan Pesanan Langsung:
```typescript
// Tambahan kolom pada procurement_pools:
host_umkm_role_id: uuid('host_umkm_role_id').references(() => business_roles.id), // UMKM yang tokonya menjadi Host Hub
is_direct_order: boolean('is_direct_order').default(false).notNull(), // Menandai pesanan langsung >= MOQ tanpa pooling
```

### B. Tabel `pool_participants`
Tambahkan kode verifikasi serah terima fisik di Hub:
```typescript
// Tambahan kolom pada pool_participants:
pickup_code: varchar('pickup_code', { length: 10 }), // 4-digit PIN untuk serah terima di Hub
is_picked_up: boolean('is_picked_up').default(false).notNull(),
picked_up_at: timestamp('picked_up_at', { withTimezone: true }),
```

### C. Tabel `umkm_procurement_orders`
Tambahkan deadline pembayaran 12 jam:
```typescript
// Tambahan kolom pada umkm_procurement_orders:
payment_deadline: timestamp('payment_deadline', { withTimezone: true }), // Batas akhir 12 jam sejak LOCKED
```

### D. Tabel `waste_listings` (Disederhanakan)
> **Catatan Arsitektur:** Tidak perlu kolom `pickup_address`, `latitude`, atau `longitude` terpisah karena titik penjemputan 100% mewarisi alamat legal UMKM dari `business_entities` (via `seller_role_id -> business_roles -> business_entities`). Tidak perlu enum kaku `waste_category_enum`, jenis limbah langsung dikenali dari nama limbah (`listing_title`).

```typescript
// Struktur revisi waste_listings:
export const waste_listings = pgTable('waste_listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  umkm_product_id: uuid('umkm_product_id').references(() => umkm_products.id),
  seller_role_id: uuid('seller_role_id').references(() => business_roles.id).notNull(),
  listing_title: varchar('listing_title', { length: 255 }).notNull(), // Contoh: "Ampas Tahu", "Minyak Jelantah", "Kain Perca"
  unit: unit_enum('unit').default('KG').notNull(),
  available_weight: numeric('available_weight').notNull(),
  price_per_kg: numeric('price_per_kg').notNull(),
  is_marketplace_visible: boolean('is_marketplace_visible').default(true),
  listing_status: waste_listing_status_enum('listing_status').default('AVAILABLE').notNull(),
  expired_at: timestamp('expired_at', { withTimezone: true }).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

### E. Tabel `waste_transactions`
Tambahkan dukungan pembayaran Midtrans dan Handshake Serah Terima Mandiri (Self-Pickup):
```typescript
// Tambahan kolom pada waste_transactions:
pickup_date: date('pickup_date').notNull(),
pickup_code: varchar('pickup_code', { length: 10 }).notNull(), // Kode OTP/PIN dari pembeli ke penjual limbah
picked_up_at: timestamp('picked_up_at', { withTimezone: true }),
snap_token: text('snap_token'),
snap_redirect_url: text('snap_redirect_url'),
payment_status: payment_status_enum('payment_status').default('PENDING').notNull(),
```

### F. Tabel `offtaker_directories` (Koreksi untuk Fitur 5 Bank Sampah Terdekat)
Agar sistem dapat menghitung jarak Haversine ke lokasi UMKM, tambahkan `address`, `latitude`, dan `longitude`:
```typescript
export const offtaker_directories = pgTable('offtaker_directories', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_name: varchar('org_name', { length: 255 }).notNull(),
  contact_person: varchar('contact_person', { length: 150 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'), // Alamat lengkap bank sampah
  latitude: numeric('latitude'), // Titik koordinat untuk kalkulasi jarak
  longitude: numeric('longitude'), // Titik koordinat untuk kalkulasi jarak
  accepted_waste_types: jsonb('accepted_waste_types').default([]).notNull(), // Array nama limbah, misal ["Minyak Jelantah", "Organik", "Kardus"]
  service_area_city: varchar('service_area_city', { length: 100 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

### G. Tabel Baru: `umkm_inventory_stocks` (Disederhanakan Tanpa Safe Stock Manual)
> **Catatan Arsitektur:** Tidak perlu kolom `minimum_safe_stock` manual. Batas aman dihitung dinamis (*Dynamic Safe Stock*):
> $$\text{Batas Kritis 1 Batch} = \text{required\_qty\_per\_unit} \times \text{expected\_batch\_units}$$

```typescript
export const umkm_inventory_stocks = pgTable('umkm_inventory_stocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  umkm_role_id: uuid('umkm_role_id').references(() => business_roles.id).notNull(),
  ingredient_name: varchar('ingredient_name', { length: 255 }).notNull(),
  current_stock: numeric('current_stock').default('0.00').notNull(),
  unit: unit_enum('unit').notNull(),
  last_restocked_at: timestamp('last_restocked_at', { withTimezone: true }).defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

---

## Modul 1: Marketplace Terpadu & Dual-Engine Recommender

### 1.1. Latar Belakang & Spesifikasi Fitur
* **Penyatuan Etalase:** Endpoint `/api/marketplace` mengembalikan komoditas supplier aktif DAN limbah produktif yang `AVAILABLE`. Tiap item memuat flag `is_waste: boolean`.
* **Rekomendasi Cerdas untuk UMKM:**
  1. *Stok Menipis vs Kebutuhan Menu:* Sistem memeriksa bahan baku di `umkm_inventory_stocks` yang stoknya kurang dari kebutuhan 1 batch (`required_qty_per_unit * expected_batch_units`), lalu mencocokkannya dengan komoditas supplier berharga terendah & sertifikasi mutu tertinggi.
  2. *Simbiosis Sirkular:* Sistem merekomendasikan limbah dari UMKM lain yang cocok menggantikan bahan baku.
* **Rekomendasi Cerdas untuk Supplier:**
  1. *Market Price Monitoring:* Menampilkan harga pasar regional untuk komoditas serupa agar supplier dapat memantau apakah harga mereka kompetitif atau overprice.
  2. *Top Demanded Commodities:* Komoditas yang sedang ramai dicari/dibuat pool-nya di wilayah sekitar supplier.

### 1.2. Prompt AI Agent / Developer (Modul 1)
```text
PROMPT TUGAS: IMPLEMENTASI MARKETPLACE TERPADU & DUAL-ENGINE RECOMMENDER

Konteks Arsitektur:
- routes/products/marketplace-route.ts
- controllers/products/marketplace-controller.ts
- services/products/marketplace-service.ts
- repositories/products/marketplace-repositories.ts
- validations/products/marketplace-validation.ts
- types/marketplace-types.ts

Kebutuhan Endpoint:
1. GET /api/marketplace
   - Query: search, sector, item_type ('ALL' | 'COMMODITY' | 'WASTE'), city, limit, offset.
   - Menggabungkan data supplier_commodities (is_marketplace_active = true) dan waste_listings (listing_status = 'AVAILABLE').
   - Alamat & koordinat limbah diambil otomatis via JOIN business_roles -> business_entities.
   - Response DTO wajib memuat:
     id, item_type ('COMMODITY' | 'WASTE'), title, seller_name, sector, unit, price, available_stock,
     quality_score (jika komoditas: status verifikasi batch tag; jika limbah: sisa hari expired),
     location (city, address, lat, lng), is_waste: boolean.

2. GET /api/marketplace/recommendations
   - Header: Bearer Token (Auth Middleware).
   - Logika untuk Role 'UMKM':
     a. Ambil data umkm_products beserta recipes untuk menghitung kebutuhan 1 batch (required_qty_per_unit * expected_batch_units).
     b. Bandingkan dengan current_stock di umkm_inventory_stocks. Jika current_stock < kebutuhan 1 batch, tandai bahan butuh restock.
     c. Cari komoditas supplier yang cocok dengan harga tier terendah dan batch tag is_verified = true.
     d. Cari apakah ada waste_listings dari UMKM terdekat yang nama limbahnya cocok untuk kebutuhan sektor UMKM tersebut (contoh: Peternakan direkomendasikan limbah ampas tahu/kedelai).
     e. Return format: { low_stock_recommendations: [...], circular_waste_matches: [...] }
   - Logika untuk Role 'SUPPLIER':
     a. Ambil komoditas milik supplier.
     b. Hitung rata-rata harga pasar kompetitor (supplier lain) di regional yang sama untuk komoditas serupa.
     c. Berikan status: 'COMPETITIVE', 'OVERPRICED' (>15% di atas rata-rata), atau 'UNDERPRICED'.
     d. Berikan tren komoditas dengan volume akumulasi pool tertinggi dalam 7 hari terakhir.
     e. Return format: { price_benchmarks: [...], high_demand_commodities: [...] }

Validasi Zod & Swagger:
Sertakan anotasi @swagger lengkap dan validasi query param dengan Zod.
```

---

## Modul 2: Bursa Limbah Produktif (CRUD, Self-Pickup Escrow & 5 Bank Sampah Terdekat)

### 2.1. Latar Belakang & Spesifikasi Fitur
* **CRUD Limbah:** UMKM dapat membuat, melihat, memperbarui, dan menghapus listing limbah produktif (volume, harga/satuan, masa simpan/expired). Alamat penjemputan otomatis menggunakan alamat UMKM terdaftar.
* **Transaksi Self-Pickup:** Pembeli membeli limbah tanpa batas MOQ, memilih tanggal penjemputan, dan menahan dana di Escrow.
* **Handshake Serah Terima (OTP/PIN):** Pembeli menerima 4-digit `pickup_code`. Saat mengambil barang di lokasi penjual, penjual menginput `pickup_code` tersebut. Jika cocok, status berubah menjadi `ACCEPTED_COMPLETED` dan dana escrow dilepas ke penjual.
* **Fitur Rekomendasi 5 Bank Sampah Terdekat:**
  * Endpoint cerdas yang menerima parameter nama limbah (`waste_name`) atau `listing_id`.
  * Sistem mengambil koordinat UMKM penjual.
  * Sistem mencocokkan `waste_name` dengan daftar `accepted_waste_types` di bank sampah.
  * Menghitung jarak Haversine (km) dan mengembalikan **5 bank sampah terdekat** dari lokasi UMKM.

### 2.2. Prompt AI Agent / Developer (Modul 2)
```text
PROMPT TUGAS: BURSA LIMBAH PRODUKTIF & REKOMENDASI 5 BANK SAMPAH TERDEKAT

Konteks Arsitektur:
- routes/waste/waste-route.ts
- controllers/waste/waste-controller.ts
- services/waste/waste-service.ts
- repositories/waste/waste-repositories.ts
- validations/waste/waste-validation.ts
- types/waste-types.ts

Kebutuhan Endpoint:
1. POST /api/waste-listings
   - Body: umkm_product_id (optional), listing_title, unit, available_weight, price_per_kg, expired_at, notes.
   - Lokasi penjemputan otomatis mengambil latitude, longitude, dan default_address dari business_entities milik user.
   - Validasi: expired_at harus di masa depan, weight > 0, price >= 0.

2. GET /api/waste-listings
   - Query: search, status, seller_role_id, limit, offset.
   - Evaluasi otomatis: jika expired_at < NOW() dan status masih 'AVAILABLE', tandai kadaluarsa.

3. GET /api/waste-listings/:id & PUT /api/waste-listings/:id & DELETE /api/waste-listings/:id
   - CRUD standar dengan otorisasi kepemilikan listing.

4. GET /api/waste-listings/recommendations/offtakers
   - Header: Bearer Token (UMKM).
   - Query: waste_name (string, contoh: "Minyak Jelantah" atau "Ampas Tahu"), listing_id (optional).
   - Logika:
     a. Ambil koordinat UMKM (lat_umkm, lng_umkm) dari profil business_entities.
     b. Query offtaker_directories yang memiliki koordinat latitude dan longitude.
     c. Filter bank sampah yang kolom accepted_waste_types-nya cocok dengan keyword waste_name (case-insensitive substring match). Jika tidak ada yang cocok spesifik, ambil bank sampah umum.
     d. Hitung jarak (dalam km) menggunakan rumus Haversine:
        dLat = (lat2 - lat1) * Math.PI / 180;
        dLon = (lon2 - lon1) * Math.PI / 180;
        a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance_km = 6371 * c;
     e. Urutkan ASC berdasarkan distance_km, ambil 5 data teratas (LIMIT 5).
     f. Return format:
        [
          {
            offtaker_id: "...",
            org_name: "Bank Sampah Griya Sapu Lidi",
            contact_person: "Ibu Susilowati",
            phone: "081328905678",
            address: "Jalan Pandeyan No. 18, Umbulharjo",
            distance_km: 1.85,
            accepted_waste_types: ["Minyak Jelantah", "Plastik", "Organik"]
          },
          ... (5 data terdekat)
        ]

5. POST /api/waste-listings/:id/refer-offtaker
   - Input: offtaker_id.
   - Logic: Buat offtaker_referral_logs dengan auto manifest_number: 'WS-OFF-{timestamp}-{rand4}'. Ubah listing_status menjadi 'REFERRED_TO_OFFTAKER'.

6. POST /api/waste-transactions
   - Input: listing_id, purchased_weight, pickup_date.
   - Logic: Generate pickup_code acak 6 digit unik ('KMP-8912'). Total amount = purchased_weight * price_per_kg. Kurangi stok listing. Status = 'PAID_HELD_IN_ESCROW'.

7. POST /api/waste-transactions/:id/verify-pickup
   - Input: pickup_code.
   - Logic: Jika valid, set fulfillment_status = 'ACCEPTED_COMPLETED', release dana escrow ke rekening penjual.
```

---

## Modul 3: Gateway Pembayaran & Escrow (Midtrans 12h & Waste Escrow)

### 3.1. Latar Belakang & Spesifikasi Fitur
* **Payment Link 12 Jam:** Transaksi pemesanan pool menggunakan Midtrans Snap dengan parameter `expiry: { unit: 'hour', duration: 12 }`.
* **Dukungan Pembayaran Limbah:** Menyediakan Snap Token untuk transaksi pembelian limbah antar-UMKM.
* **Webhook Handler Terpadu:** Memproses notifikasi settlement Midtrans, membedakan order PO pengadaan bahan (`PROCUREMENT_ESCROW`) vs transaksi limbah (`WASTE_ESCROW`).
* **Worker Evaluasi Expiry:** Job pemantau yang membatalkan order pending yang telah melewati 12 jam, mengembalikan kuota pool, dan menurunkan status pool jika kuota turun di bawah target MOQ.

### 3.2. Prompt AI Agent / Developer (Modul 3)
```text
PROMPT TUGAS: PEMBAYARAN MIDTRANS 12 JAM, WASTE ESCROW & EXPIRATION SCHEDULER

Konteks Arsitektur:
- services/payments/payment-service.ts
- services/payments/midtrans-service.ts
- controllers/payments/payment-controller.ts
- routes/payments/payment-route.ts

Kebutuhan Fitur:
1. Konfigurasi 12 Jam Expiry pada Snap:
   - Di midtrans-service.ts, tambahkan custom parameter pada create_snap_transaction:
     expiry: {
       start_time: format(now, 'yyyy-MM-dd HH:mm:ss +0700'),
       unit: 'hour',
       duration: 12
     }
   - Pastikan payment_deadline pada umkm_procurement_orders diset: new Date(Date.now() + 12 * 3600 * 1000).

2. Endpoint Pembayaran Khusus Limbah:
   - POST /api/payments/waste-orders/:transaction_id/snap-token
   - Memanggil Midtrans Snap untuk transaksi limbah.

3. Penyempurnaan Webhook Handler (handle_midtrans_webhook_service):
   - Mampu mengenali awalan midtrans_order_id:
     - Jika 'KMPL-ORD-...' -> update umkm_procurement_orders.payment_status = 'SETTLED', buat escrow_transactions 'PROCUREMENT_ESCROW'.
     - Jika 'KMPL-WST-...' -> update waste_transactions.payment_status = 'SETTLED', buat escrow_transactions 'WASTE_ESCROW'.

4. Worker Evaluasi Expiry Order 12 Jam:
   - Buat fungsi: evaluate_expired_orders_service():
     a. Cari umkm_procurement_orders dengan payment_status = 'PENDING' dan payment_deadline < NOW().
     b. Batalkan pesanan (payment_status = 'REFUNDED').
     c. Kurangi accumulated_qty di procurement_pools sebesar order_qty peserta yang batal.
     d. Jika accumulated_qty menjadi < target_moq dan status pool sebelumnya 'LOCKED':
        Ubah status pool kembali menjadi 'AGGREGATING' (Unlocking).
        Batalkan consolidated_pos yang terlanjur terbit dan kembalikan reserved_stock supplier.
```

---

## Modul 4: Manajemen Pesanan Terpadu & Pengelompokan Order

### 4.1. Latar Belakang & Spesifikasi Fitur
* **Pesanan dari Sisi Supplier:**
  * Wajib dikelompokkan secara terstruktur:
    1. Berdasarkan komoditas produk yang sama.
    2. Dibagi menjadi 2 sub-grup: **Hasil Pooling (Consolidated PO)** dan **Pesanan Langsung Non-Pooling (Direct PO)**.
    3. Status kesiapan pengantaran (*Ready to Ship* vs *Delivered*).
* **Pembatalan Pesanan Direct (> MOQ):**
  * UMKM yang memesan di atas MOQ dapat membatalkan pesanan **selama belum memasuki Lead Time Supplier**.

### 4.2. Prompt AI Agent / Developer (Modul 4)
```text
PROMPT TUGAS: PENGELOMPOKAN PESANAN SUPPLIER & ALUR PEMBATALAN LEAD TIME

Konteks Arsitektur:
- routes/orders/procurement-order-route.ts
- controllers/orders/procurement-order-controller.ts
- services/orders/procurement-order-service.ts
- repositories/orders/procurement-order-repositories.ts

Kebutuhan Endpoint:
1. GET /api/orders/supplier/grouped
   - Header: Bearer Token (Supplier).
   - Mengelompokkan pesanan per komoditas:
     - pooling_orders: Consolidated PO hasil patungan.
     - direct_orders: Pesanan langsung mandiri >= MOQ.
     - Status kesiapan pengantaran (is_ready_to_ship).

2. GET /api/orders/umkm/all
   - Header: Bearer Token (UMKM).
   - Riwayat pesanan bahan baku (Pool & Direct) lengkap dengan pickup_code dan status limbah yang dibeli/dijual.

3. POST /api/orders/:order_id/cancel
   - Validasi Pembatalan Berdasarkan Lead Time:
     a. Hitung cutoff_timestamp = target_delivery_date - (lead_time_days * 86400000).
     b. Jika NOW() >= cutoff_timestamp:
        Throw AppError(400, 'Pesanan sudah memasuki masa persiapan dan panen (Lead Time). Pembatalan tidak diizinkan.')
     c. Jika masih sebelum lead time: update payment_status = 'REFUNDED' dan kurangi reserved_stock supplier.
```

---

## Modul 5: Dashboard Analitik Eksekutif (UMKM & Supplier)

### 5.1. Latar Belakang & Spesifikasi Fitur
* **Dashboard Supplier:**
  1. *Keuntungan / Omset Terbesar:* Komoditas penyumbang omset tertinggi dalam 30 hari terakhir.
  2. *Deteksi Harga Terlalu Tinggi:* Komparasi base price komoditas supplier dengan harga median platform untuk memicu peringatan pasar.
  3. *Detail Pesanan Per Produk:* Ringkasan pesanan aktif per komoditas.
  4. *Prediksi Stok & Permintaan:* Alert komoditas yang stoknya menipis vs komoditas yang permintaannya sedang melaju pesat (demand velocity).
* **Dashboard UMKM:**
  1. *Kitchen Inventory Runout Predictor:* Menghitung sisa hari pakai stok bahan dapur:
     $$\text{Hari Habis} = \frac{\text{Stok Tersedia}}{\text{Kebutuhan per Porsi} \times \text{Porsi per Batch} \times \text{Iterasi Masak Harian}}$$
     Menampilkan daftar bahan yang paling kritis (kebutuhan 1 batch) dan harus segera dipesan ulang.
  2. *Performa Limbah Sirkular:* Total limbah aktif, estimasi valuasi pendapatan, realisasi cuan limbah yang terjual, serta daftar limbah yang mendekati kadaluarsa untuk dirujuk ke bank sampah terdekat.
  3. *Efisiensi Arus Kas:* Total penghematan modal yang didapatkan dari pembelian skema grosir pooling dibanding harga eceran.

### 5.2. Prompt AI Agent / Developer (Modul 5)
```text
PROMPT TUGAS: IMPLEMENTASI EXECUTIVE DASHBOARD UMKM & SUPPLIER

Konteks Arsitektur:
- routes/dashboard/dashboard-route.ts
- controllers/dashboard/dashboard-controller.ts
- services/dashboard/dashboard-service.ts
- repositories/dashboard/dashboard-repositories.ts
- types/dashboard-types.ts

Kebutuhan Endpoint:
1. GET /api/dashboards/supplier
   - Header: Bearer Token (Role: SUPPLIER).
   - Menghasilkan:
     a. Omset terbesar 30 hari terakhir.
     b. Deteksi harga terlalu tinggi (>15% di atas rata-rata kompetitor komoditas serupa).
     c. Detail pesanan per produk (pooling vs direct).
     d. Prediksi lonjakan permintaan 7 hari terakhir.

2. GET /api/dashboards/umkm
   - Header: Bearer Token (Role: UMKM).
   - Menghasilkan:
     a. Kitchen Inventory Runout Predictor:
        - Pemakaian harian: daily_burn = required_qty_per_unit * expected_batch_units * production_iterations_per_day.
        - Sisa hari: days_left = current_stock / daily_burn.
        - Safe stock 1 batch: safe_batch_qty = required_qty_per_unit * expected_batch_units.
        - Status 'CRITICAL' jika current_stock < safe_batch_qty atau days_left <= 2 hari.
     b. Analisis Limbah Sirkular:
        - Volume limbah aktif di etalase & estimasi pendapatan.
        - Realisasi pendapatan limbah yang sudah lunas.
        - Jumlah limbah kadaluarsa yang membutuhkan rujukan bank sampah.
     c. Penghematan Modal Belanja dari Pooling Grosir.
```

---

## Modul 6: Script Scraper Data Bank Sampah di D.I. Yogyakarta

Script scraper telah tersedia di:
👉 **[`be/scripts/scrape-jogja-bank-sampah.ts`](./scripts/scrape-jogja-bank-sampah.ts)**

### 6.1. Cara Menjalankan Scraper:
Jalankan perintah berikut di direktori `be/`:
```bash
bun run scripts/scrape-jogja-bank-sampah.ts
```

### 6.2. Output yang Dihasilkan:
1. **JSON Data:** [`be/scripts/jogja-bank-sampah.json`](./scripts/jogja-bank-sampah.json)
2. **SQL Seed File:** [`be/scripts/seed-jogja-bank-sampah.sql`](./scripts/seed-jogja-bank-sampah.sql)

### 6.3. Cara Seeding ke Database Supabase / PostgreSQL:
Eksekusi file SQL seed langsung di Supabase SQL Editor atau via terminal:
```bash
psql $DATABASE_URL -f scripts/seed-jogja-bank-sampah.sql
```

Data tersebut mencakup bank sampah terkenal di Yogyakarta (seperti *Bank Sampah Gemah Ripah Bantul, Griya Sapu Lidi Umbulharjo, Surolaten Sleman, TPS3R Bener, TPS3R Giwangan*) lengkap dengan koordinat latitude, longitude, nomor telepon, dan jenis limbah yang diterima.

---

## 8. Daftar Pendaftaran Route Baru pada `index.ts`

Pastikan seluruh route baru terdaftar di file entrypoint utama `be/index.ts`:

```typescript
// Tambahkan import di be/index.ts:
import marketplace_router from './routes/products/marketplace-route';
import waste_router from './routes/waste/waste-route';
import dashboard_router from './routes/dashboard/dashboard-route';

// Daftarkan route:
app.use('/api/marketplace', marketplace_router);
app.use('/api/waste-listings', waste_router);
app.use('/api/waste-transactions', waste_router);
app.use('/api/dashboards', dashboard_router);
```
