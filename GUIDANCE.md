# Project Guidance & Coding Standards

Dokumen ini adalah panduan arsitektur, struktur folder, konvensi kode, dan pedoman prompt untuk pengembangan backend **KUMPUL** (`be`). Setiap developer maupun AI Agent yang bekerja pada repositori ini **wajib mengacu pada dokumen ini**.

---

## 1. Ikhtisar & Arsitektur Proyek

Proyek ini dibangun menggunakan:
- **Runtime:** [Bun](https://bun.com)
- **Framework:** Express.js 5 (TypeScript)
- **Database ORM:** Drizzle ORM
- **Validation:** Zod
- **Architecture Pattern:** *Layered Architecture* (Separation of Concerns)

Setiap lapisan (*layer*) memiliki tanggung jawab yang terisolasi dan jelas untuk memudahkan pemeliharaan, pengujian, dan skalabilitas.

---

## 2. Struktur Folder & Tanggung Jawab

```text
.
├── config/           # Konfigurasi pihak ketiga (Database, Cloud Services, dll)
├── controllers/      # Parsing & pemformatan input sebelum ke service, format response
├── middleware/       # Express middlewares (Auth, Logger, Error Handler, dll)
├── repositories/     # Akses data & kontak langsung ke database (Drizzle queries)
├── routes/           # Definisi endpoint & routing API
├── services/         # Logika bisnis inti sebelum masuk/keluar database
├── types/            # Definisi tipe data (TypeScript) lintas modul/file
├── utils/            # Helper functions umum yang repeatable/reusable
├── validations/      # Schema validasi request menggunakan Zod
├── index.ts          # Entry point aplikasi
└── package.json      # Dependensi dan script proyek
```

### Rincian Peran Tiap Folder

| Folder | Tanggung Jawab | Aturan & Ketentuan |
| :--- | :--- | :--- |
| **`routes/`** | Penambahan dan pendaftaran route baru. | Semua route baru **wajib** diletakkan di folder ini. Memetakan URL path & method HTTP ke middleware dan controller terkait. |
| **`config/`** | Konfigurasi library & layanan pihak ketiga (*third-party*). | Koneksi database (misal `db.ts`), integrasi payment gateway, mailer, cloud storage, dsb. |
| **`controllers/`** | Adapter antara HTTP request dan Service. | Berguna untuk mengekstrak param/body/query, mengubah format input ke format yang valid sebelum dikirim ke `services`, serta memformat response HTTP. Tidak boleh berisi query database langsung atau logika bisnis berat. |
| **`middleware/`** | Kebutuhan middleware HTTP. | Autentikasi token (JWT), otorisasi role, rate limiter, request logging, serta penanganan error global. |
| **`services/`** | Logika bisnis (*business logic*). | Menjalankan seluruh aturan bisnis (*business rules*), validasi alur, komputasi, dan orkestrasi sebelum data masuk atau setelah data keluar dari `repositories`. |
| **`repositories/`** | Akses ke database (*Data Access Layer*). | Satu-satunya layer yang boleh melakukan kontak langsung ke database (Drizzle ORM queries, mutations, transactions). |
| **`utils/`** | Fungsi pembantu (*helper/utility*). | Fungsi-fungsi yang bersifat *repeatable*, stateless, dan dapat digunakan secara umum di berbagai file/modul (misal: format tanggal, enkripsi helper, generator ID). |
| **`validations/`** | Skema validasi request. | Menerima dan memvalidasi skema payload (body, query, params) menggunakan **Zod**. |
| **`types/`** | Tipe data bersama (*shared types*). | Berisi interface, type alias, dan enum yang digunakan lintas modul atau file untuk menjaga konsistensi tipe. |

---

## 3. Alur Data (*Request Lifecycle*)

```
[HTTP Request]
       │
       ▼
[Middleware Layer] ──► (Auth, Logging, Validation Middleware via Zod)
       │
       ▼
[Route Layer] (`routes/`)
       │
       ▼
[Controller Layer] (`controllers/`) ──► Memformat input agar valid untuk Service
       │
       ▼
[Service Layer] (`services/`) ──► Menjalankan logika bisnis
       │
       ▼
[Repository Layer] (`repositories/`) ──► Eksekusi query ke Database
       │
       ▼
[Database]
       │
       ▼
[Response dikembalikan melalui Controller dalam format snake_case]
```

> [!IMPORTANT]
> Jika terjadi error pada tahap mana pun, error harus dilemparkan (*thrown*) atau diteruskan menggunakan `next(error)` ke **`error-middleware.ts`**. Jangan membuat response error manual yang tidak seragam di controller/service.

---

## 4. Konvensi Penamaan & Format Kode

Untuk menjaga konsistensi seluruh codebase:

### 4.1. Response API (`snake_case`)
Semua key pada response JSON ke client **wajib** menggunakan `snake_case`.

**Contoh Response Sukses:**
```json
{
  "status": "success",
  "message": "data_berhasil_diambil",
  "data": {
    "user_id": "usr_12345",
    "full_name": "John Doe",
    "created_at": "2026-09-29T15:00:00.000Z"
  }
}
```

**Contoh Response Error (dari `error-middleware.ts`):**
```json
{
  "status": "error",
  "error_code": "VALIDATION_ERROR",
  "message": "Data input tidak valid",
  "error_details": [
    {
      "field": "phone_number",
      "issue": "Nomor telepon tidak valid"
    }
  ]
}
```

### 4.2. Penamaan Variabel (`snake_case`)
Variabel lokal, properti objek internal, dan parameter fungsi menggunakan `snake_case`.
```typescript
const user_id = req.params.id;
const transaction_payload = { ... };
const is_active_member = true;
```

### 4.3. Penamaan Konstanta (`UPPER_SNAKE_CASE`)
Nilai konstan global atau konfigurasi tetap menggunakan huruf kapital penuh (*full uppercase*) dengan pemisah garis bawah.
```typescript
const DEFAULT_PAGE_LIMIT = 20;
const MAX_RETRY_ATTEMPTS = 3;
const JWT_ACCESS_EXPIRATION = "15m";
```

### 4.4. Penamaan Type dan Interface (`PascalCase`)
Tipe data yang didefinisikan pada folder `types/` menggunakan `PascalCase`.
```typescript
export interface UserProfile {
  user_id: string;
  email_address: string;
}
```

### 4.5. Hindari Variabel Ganda (*No Duplicate / Shadowing*)
- **Dilarang keras menduplikasi atau menimpa (*shadowing*) nama variabel** dalam scope yang sama maupun nested scope.
- Pastikan setiap variabel memiliki penamaan yang deskriptif dan unik sesuai fungsinya, misalnya bedakan:
  - `raw_input` vs `validated_input` vs `formatted_input`
  - Hindari penggunaan ulang variabel sementara seperti `let data = ...; data = ...;` jika makna datanya berubah.

---

## 5. Standar Error Handling (`error-middleware.ts`)

Semua error yang terjadi pada alur request **wajib ditangani secara terpusat oleh `middleware/error-middleware.ts`**.

### Aturan Error Handling:
1. **Controller:** Bungkus operasi asynchronous menggunakan `try-catch` dan teruskan error ke `next(error)`, atau gunakan async wrapper middleware.
2. **Service & Repository:** Lemparkan custom error (misal `AppError`, `NotFoundError`, `UnauthorizedError`) dengan status code yang sesuai.
3. **Zod Validation:** Jika validasi Zod gagal, lempar error Zod atau transformasikan ke `ValidationError` agar `error-middleware.ts` mengembalikannya dengan struktur `error_details`.
4. **Sentralisasi:** Tidak boleh mengirim response error langsung dari `controller` dengan `res.status(500).json(...)` secara ad-hoc tanpa melalui `error-middleware.ts`.

---

## 6. Template Panduan untuk Prompt AI

Gunakan format prompt berikut saat memberikan instruksi kepada AI untuk membuat atau mengubah fitur pada repositori ini:

```markdown
PENTING: Selalu patuhi standar arsitektur pada GUIDANCE.md:
1. Route baru WAJIB ditambahkan di folder `routes/`.
2. Validasi input menggunakan schema Zod di folder `validations/`.
3. Input diolah dan diformat di `controllers/` sebelum dikirim ke `services/`.
4. Logika bisnis dijalankan di `services/`.
5. Interaksi database HANYA boleh ada di `repositories/` (Drizzle ORM).
6. Konfigurasi pihak ketiga hanya di `config/`.
7. Helper umum yang repeatable diletakkan di `utils/`.
8. Tipe data yang dipakai lintas file/modul didefinisikan di `types/`.
9. Format response JSON ke client WAJIB menggunakan `snake_case`.
10. Penamaan variabel menggunakan `snake_case`, konstanta menggunakan `UPPER_SNAKE_CASE`.
11. Dilarang menduplikasi atau menimpa nama variabel (hindari variable shadowing).
12. SEMUA error wajib dialirkan ke `middleware/error-middleware.ts` (jangan kirim res.status error ad-hoc).
```

---

## 7. Checklist Penambahan Fitur Baru

Sebelum menyelesaikan task atau fitur baru, pastikan hal-hal berikut sudah terpenuhi:

- [ ] Route baru terdaftar di file modul di dalam `routes/`.
- [ ] Schema validasi Zod dibuat di `validations/`.
- [ ] Controller di `controllers/` mengadaptasi input dan memanggil service.
- [ ] Logika bisnis di `services/` terpisah bersih dari layer controller dan database.
- [ ] Query database berada di `repositories/`.
- [ ] Tipe data bersama didefinisikan di `types/`.
- [ ] Semua JSON keys pada response keluar dalam format `snake_case`.
- [ ] Nama variabel menggunakan `snake_case` dan konstanta menggunakan `UPPER_SNAKE_CASE`.
- [ ] Tidak ada variabel yang bertabrakan (*duplicate/shadowing*).
- [ ] Error handling ditangani oleh `middleware/error-middleware.ts`.
