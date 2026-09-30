# Backend Development Guidelines & Agent Instructions (`be/`)

Dokumen ini adalah panduan standar arsitektur, struktur folder, konvensi penamaan, standar penulisan kode, dan pedoman prompt bagi **AI Agent** maupun pengembang yang bekerja pada backend **KUMPUL** (`be/`). Seluruh kode baru maupun modifikasi kode yang dibuat **wajib mematuhi** aturan dalam panduan ini.

---

## 1. Ikhtisar & Aturan Fundamental

- **Runtime & Toolchain:** [Bun](https://bun.com) (>= 1.3) dengan **TypeScript** (`"module": "index.ts"`, `"type": "module"`).
- **Web Server:** **Express 5** (`express`).
- **Database & ORM:** **PostgreSQL** (Supabase) via **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`) dengan driver `postgres` (postgres.js).
  - *Catatan Supabase Pooler:* Menggunakan transaction-mode pooler (port 6543) yang mewajibkan konfigurasi `{ prepare: false }`.
  - Inisialisasi koneksi database dieksekusi sekali (*singleton connection*) melalui middleware `app.use(connect_to_db())`.
- **Skema & Validasi:** **Zod** (`zod`).
- **Autentikasi:** **JSON Web Token** (`jsonwebtoken`).
- **Dokumentasi API:** **Swagger OpenAPI 3.0** (`swagger-jsdoc`, `swagger-ui-express`).
- **Separation of Concerns:** Pemisahan tanggung jawab yang ketat antar layer (*Layered Architecture*).
- **Konvensi Variabel:** Menggunakan `snake_case` untuk variabel dan `UPPER_SNAKE_CASE` untuk konstanta.
- **Konsistensi Variabel:** **Dilarang keras melakukan variable shadowing atau penggunaan ulang variabel dengan makna data berbeda** (*no duplicate variable usage*).
- **Respons JSON:** Seluruh key pada response API **wajib** menggunakan `snake_case`.
- **Sentralisasi Error:** Seluruh error wajib ditangani terpusat oleh `middleware/error-middleware.ts`. Dilarang mengirim response error ad-hoc dari controller atau service.

---

## 2. Struktur Folder & Tanggung Jawab

```text
be/
├── config/             # Konfigurasi pihak ketiga (Database, Cloud Services, Swagger, dll)
├── controllers/        # Adapter HTTP: parsing input, panggil service, format response
├── middleware/         # Express middlewares (Auth, Role, DB Connection, Error Handling)
├── repositories/       # Data Access Layer: interaksi langsung dengan database (Drizzle ORM)
├── routes/             # Definisi endpoint & dokumentasi Swagger JSDoc
├── services/           # Business Logic Layer: validasi bisnis, komputasi, orkestrasi
├── types/              # Definisi tipe data TypeScript (shared interfaces/types)
├── utils/              # Fungsi helper umum yang repeatable & reusable
├── validations/        # Skema validasi request berbasis Zod
├── index.ts            # Entrypoint utama server Express
├── drizzle.config.ts   # Konfigurasi Drizzle Kit untuk migrasi & skema
├── package.json        # Dependensi dan script Bun
└── AGENTS.md           # Dokumen panduan ini
```

### Rincian Peran Tiap Folder

| Folder | Tanggung Jawab | Aturan & Ketentuan |
| :--- | :--- | :--- |
| **`routes/`** | Penambahan & pendaftaran route API. | Setiap route baru **wajib** diletakkan di sini. Memetakan URL path dan HTTP method ke middleware & controller, serta memuat anotasi Swagger JSDoc. |
| **`config/`** | Konfigurasi library & layanan pihak ketiga. | Berisi konfigurasi database (`db.ts`), skema Drizzle (`schema.ts`), Swagger, cloud storage, dsb. |
| **`controllers/`** | Adapter antara HTTP request dan Service. | Mengekstrak params/query/body, mengubah format input ke format yang valid sebelum dikirim ke `services`, dan memformat response HTTP. Tidak boleh berisi query database langsung atau logika bisnis. |
| **`middleware/`** | Middleware Express. | Autentikasi token (JWT), otorisasi role, inisialisasi koneksi DB (`connect_to_db`), dan penanganan error terpusat (`error_middleware`). |
| **`services/`** | Logika bisnis (*business logic*). | Menjalankan seluruh aturan bisnis, validasi alur, komputasi, dan orkestrasi sebelum data masuk atau setelah data keluar dari repository. Tidak boleh mengakses objek `req` atau `res`. |
| **`repositories/`** | Akses ke database (*Data Access Layer*). | Satu-satunya layer yang boleh melakukan kontak langsung ke database (Drizzle ORM queries, mutations, transactions). |
| **`utils/`** | Fungsi pembantu (*helper/utility*). | Fungsi-fungsi yang bersifat *repeatable*, *stateless*, dan reusable secara umum di berbagai file/modul (misal: format tanggal, kalkulator, generator ID). |
| **`validations/`** | Skema validasi request. | Menerima dan memvalidasi payload (body, query, params) menggunakan **Zod**. |
| **`types/`** | Tipe data bersama (*shared types*). | Berisi interface, type alias, dan enum TypeScript yang digunakan lintas modul/file. |

---

## 3. Diagram Alur Data (*Request & Error Lifecycle*)

```
Client HTTP Request
       │
       ▼
[Middleware Layer] ──► (CORS, Express JSON, Auth, connect_to_db(), Validation Zod)
       │
       ▼
[Route Layer] (`routes/`) ──► Memetakan endpoint & Swagger JSDoc
       │
       ▼
[Controller Layer] (`controllers/`) ──► Mengekstrak input, format data sebelum ke service
       │
       ▼
[Service Layer] (`services/`) ──► Logika bisnis & validasi domain rules
       │
       ▼
[Repository Layer] (`repositories/`) ──► Eksekusi query Drizzle ORM
       │
       ▼
[Database PostgreSQL (Supabase)]
       │
       ▼
[Response dikembalikan oleh Controller dalam format snake_case]

============================ ALUR PENANGANAN ERROR ============================
Jika terjadi error di layer mana pun (throw AppError / ZodError / DatabaseError):
       │
       ▼
[next(error)] dari Controller / Middleware
       │
       ▼
[middleware/error-middleware.ts] ──► Format respons error terstandarisasi snake_case
```

---

## 4. Konvensi Penamaan (Naming Conventions)

### 4.1. Penamaan File
Seluruh nama file menggunakan format **kebab-case** dengan sufiks layer yang spesifik:

| Layer | Format Nama File | Contoh | Catatan Khusus |
| :--- | :--- | :--- | :--- |
| **Routes** | `<feature>-route.ts` | `auth-route.ts`, `transaction-route.ts` | Ekspor `default router` |
| **Controllers** | `<feature>-controller.ts` | `auth-controller.ts`, `transaction-controller.ts` | Ekspor fungsi *named* |
| **Services** | `<feature>-service.ts` | `auth-service.ts`, `transaction-service.ts` | Ekspor fungsi *named* |
| **Repositories** | `<feature>-repositories.ts` | `auth-repositories.ts`, `transaction-repositories.ts` | Bentuk jamak `-repositories.ts` |
| **Validations** | `<feature>-validation.ts` | `auth-validation.ts`, `transaction-validation.ts` | Middleware validasi fungsi *named* |
| **Middleware** | `<feature>-middleware.ts` | `auth-middleware.ts`, `db-middleware.ts`, `error-middleware.ts` | Ekspor *named* |
| **Config** | `<feature>.ts` | `db.ts`, `schema.ts`, `swagger.ts` | Konfigurasi modular |
| **Types** | `<feature>-types.ts` atau `index.ts` | `user-types.ts`, `transaction-types.ts` | Ekspor type & interface |
| **Utils** | `<feature>-utils.ts` atau `helper.ts` | `string-utils.ts`, `date-utils.ts` | Fungsi pembantu umum |

### 4.2. Penamaan Kode
- **Variabel & Properti Objek:** `snake_case` (contoh: `user_id`, `transaction_data`, `is_database_healthy`).
- **Konstanta:** `UPPER_SNAKE_CASE` (contoh: `DEFAULT_PORT`, `MAX_POOL_CONNECTIONS`, `JWT_SECRET`).
- **Interface & Types:** `PascalCase` (contoh: `UserProfile`, `CreateTransactionInput`).
- **Fungsi:** `snake_case` (contoh: `get_user_by_id`, `create_transaction_service`, `check_db_connection`).
- **Anti-Shadowing:** Dilarang menggunakan nama variabel yang sama dalam scope bertingkat atau menggunakan ulang variabel penampung sementara jika maknanya berubah (*no duplicate variable usage*).

### 4.3. Format Standar Respons API (`snake_case`)
Semua key pada response JSON ke client **wajib** menggunakan format `snake_case`.

**Respons Sukses:**
```json
{
  "status": "success",
  "message": "Data berhasil diambil",
  "data": {
    "user_id": "usr_998877",
    "full_name": "Arropi",
    "created_at": "2026-09-29T15:00:00.000Z"
  }
}
```

**Respons Error (dari `error-middleware.ts`):**
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

---

## 5. Pola Implementasi Tiap Layer (Coding Standards & Templates)

### 5.1. Routes (`routes/<feature>-route.ts`)
- Menggunakan `Router()` dari `express`.
- **Wajib menuliskan Swagger JSDoc (`/** @swagger ... */`)** di atas setiap endpoint.
- Rantai middleware: `[auth_middleware] -> [role_middleware] -> [validation_middleware] -> controller`.
- Ekspor `default router`.

```typescript
import { Router } from 'express';
import { get_transaction_by_id, create_transaction } from '../controllers/transaction-controller';
import { create_transaction_validation } from '../validations/transaction-validation';

const router = Router();

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Mendapatkan detail transaksi berdasarkan ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaksi berhasil ditemukan
 *       404:
 *         description: Transaksi tidak ditemukan
 */
router.get('/:id', get_transaction_by_id);

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Membuat transaksi baru
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - user_id
 *             properties:
 *               amount:
 *                 type: string
 *               user_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaksi berhasil dibuat
 */
router.post('/', create_transaction_validation, create_transaction);

export default router;
```

---

### 5.2. Validations (`validations/<feature>-validation.ts`)
- Menggunakan `zod` untuk memvalidasi `req.body`, `req.query`, atau `req.params`.
- Bila validasi gagal, teruskan error ke `next(validation_error)` agar ditangkap oleh `error-middleware.ts`.

```typescript
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const create_transaction_schema = z.object({
  user_id: z.string().uuid({ message: 'user_id harus berformat UUID valid' }),
  amount: z.string().min(1, { message: 'amount tidak boleh kosong' }),
});

export const create_transaction_validation = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    req.body = create_transaction_schema.parse(req.body);
    next();
  } catch (validation_error) {
    next(validation_error);
  }
};
```

---

### 5.3. Controllers (`controllers/<feature>-controller.ts`)
- **Dilarang menaruh query database atau logika bisnis berat di Controller.**
- Tugas Controller:
  1. Mengekstrak dan memformat parameter (`req.params`, `req.query`, `req.body`, `req.user`).
  2. Memanggil fungsi Service terkait dengan data yang valid.
  3. Mengembalikan respons JSON dengan format `snake_case` dan status code HTTP yang sesuai.
  4. Menangkap error dalam blok `try...catch` dan meneruskannya ke `next(controller_error)`.

```typescript
import type { Request, Response, NextFunction } from 'express';
import {
  get_transaction_by_id_service,
  create_transaction_service,
} from '../services/transaction-service';

export const get_transaction_by_id = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const transaction_id = req.params.id as string;
    const transaction_data = await get_transaction_by_id_service(transaction_id);

    res.status(200).json({
      status: 'success',
      message: 'Transaksi berhasil diambil',
      data: transaction_data,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};

export const create_transaction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const formatted_payload = {
      user_id: req.body.user_id,
      amount: req.body.amount,
    };

    const new_transaction = await create_transaction_service(formatted_payload);

    res.status(201).json({
      status: 'success',
      message: 'Transaksi berhasil dibuat',
      data: new_transaction,
    });
  } catch (controller_error) {
    next(controller_error);
  }
};
```

---

### 5.4. Services (`services/<feature>-service.ts`)
- Berisi seluruh logika bisnis, validasi aturan bisnis, otorisasi spesifik, dan manipulasi data.
- Mengorkestrasi satu atau lebih fungsi dari layer Repositories.
- **Dilarang mengakses objek HTTP (`req` atau `res`).**
- **Error Handling:** Lemparkan `AppError` dengan status code dan error code yang jelas.

```typescript
import {
  find_transaction_by_id,
  insert_transaction,
} from '../repositories/transaction-repositories';
import { AppError } from '../middleware/error-middleware';
import type { CreateTransactionDTO, TransactionRecord } from '../types/transaction-types';

export const get_transaction_by_id_service = async (
  transaction_id: string
): Promise<TransactionRecord> => {
  const transaction_result = await find_transaction_by_id(transaction_id);
  if (!transaction_result) {
    throw new AppError('Transaksi tidak ditemukan', 404, 'TRANSACTION_NOT_FOUND');
  }
  return transaction_result;
};

export const create_transaction_service = async (
  payload: CreateTransactionDTO
): Promise<TransactionRecord> => {
  const parsed_amount = parseFloat(payload.amount);
  if (isNaN(parsed_amount) || parsed_amount <= 0) {
    throw new AppError('Jumlah transaksi harus bernilai lebih dari 0', 400, 'INVALID_AMOUNT');
  }

  const created_record = await insert_transaction({
    user_id: payload.user_id,
    amount: payload.amount,
    status: 'pending',
  });

  return created_record;
};
```

---

### 5.5. Repositories (`repositories/<feature>-repositories.ts`)
- Satu-satunya layer yang berinteraksi langsung dengan database melalui **Drizzle ORM** (`db`).
- Menggunakan bentuk penamaan jamak: `*-repositories.ts`.
- **Dilarang memuat logika bisnis HTTP atau manipulasi response API.**

```typescript
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { transactions_table } from '../config/schema';
import type { TransactionRecord, NewTransactionInsert } from '../types/transaction-types';

export const find_transaction_by_id = async (
  transaction_id: string
): Promise<TransactionRecord | null> => {
  const records = await db
    .select()
    .from(transactions_table)
    .where(eq(transactions_table.id, transaction_id))
    .limit(1);

  return records[0] ?? null;
};

export const insert_transaction = async (
  insert_payload: NewTransactionInsert
): Promise<TransactionRecord> => {
  const inserted_records = await db
    .insert(transactions_table)
    .values(insert_payload)
    .returning();

  const created_data = inserted_records[0];
  if (!created_data) {
    throw new Error('Gagal menyimpan transaksi ke database');
  }

  return created_data;
};
```

---

### 5.6. Types (`types/<feature>-types.ts`)
- Menyimpan type, interface, dan enum yang digunakan lintas file atau modul.

```typescript
export interface TransactionRecord {
  id: string;
  user_id: string;
  amount: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTransactionDTO {
  user_id: string;
  amount: string;
}

export interface NewTransactionInsert {
  user_id: string;
  amount: string;
  status?: string;
}
```

---

### 5.7. Middleware (`middleware/`)
- **Koneksi Database Sekali (`db-middleware.ts`):** Menerapkan *singleton promise* agar koneksi database Supabase diinisialisasi sekali saat server mulai menerima traffic (`app.use(connect_to_db())`).
- **Error Handler Terpusat (`error-middleware.ts`):** Menangkap `ZodError`, `AppError`, dan error tak terduga, lalu mengembalikan JSON terstandarisasi dalam format `snake_case`.

---

## 6. Standar Error Handling Terpusat (`error-middleware.ts`)

Semua error yang dilempar via `throw` di service atau `next(err)` di controller **wajib ditangani terpusat** oleh `middleware/error-middleware.ts`.

### Format Error Handler Terstandarisasi:
```typescript
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public status_code: number;
  public error_code: string;
  public error_details?: unknown;

  constructor(message: string, status_code = 500, error_code = 'INTERNAL_SERVER_ERROR', error_details?: unknown) {
    super(message);
    this.status_code = status_code;
    this.error_code = error_code;
    this.error_details = error_details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const error_middleware = (
  error_instance: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error_instance instanceof ZodError) {
    const formatted_issues = error_instance.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));

    res.status(400).json({
      status: 'error',
      error_code: 'VALIDATION_ERROR',
      message: 'Data input tidak valid',
      error_details: formatted_issues,
    });
    return;
  }

  if (error_instance instanceof AppError) {
    res.status(error_instance.status_code).json({
      status: 'error',
      error_code: error_instance.error_code,
      message: error_instance.message,
      ...(error_instance.error_details ? { error_details: error_instance.error_details } : {}),
    });
    return;
  }

  if (error_instance instanceof Error) {
    console.error('[Unhandled Error]:', error_instance);
    res.status(500).json({
      status: 'error',
      error_code: 'INTERNAL_SERVER_ERROR',
      message: error_instance.message || 'Terjadi kesalahan pada server',
    });
    return;
  }

  res.status(500).json({
    status: 'error',
    error_code: 'UNKNOWN_ERROR',
    message: 'Terjadi kesalahan yang tidak diketahui',
  });
};
```

---

## 7. Template Panduan untuk Prompt AI

Gunakan format prompt berikut saat memberikan instruksi kepada AI untuk membuat atau mengubah fitur pada repositori ini:

```markdown
PENTING: Selalu patuhi standar arsitektur pada AGENTS.md:
1. Route baru WAJIB ditambahkan di folder `routes/` dengan dokumentasi Swagger JSDoc.
2. Validasi input menggunakan schema Zod di folder `validations/`.
3. Input diolah dan diformat di `controllers/` sebelum dikirim ke `services/`.
4. Logika bisnis dan validasi aturan dijalankan di `services/`.
5. Interaksi database HANYA boleh ada di `repositories/` (Drizzle ORM) dengan sufiks `-repositories.ts`.
6. Konfigurasi pihak ketiga hanya di `config/`.
7. Helper umum yang repeatable diletakkan di `utils/`.
8. Tipe data yang dipakai lintas file/modul didefinisikan di `types/`.
9. Format response JSON ke client WAJIB menggunakan `snake_case`.
10. Penamaan variabel menggunakan `snake_case`, konstanta menggunakan `UPPER_SNAKE_CASE`.
11. Dilarang menduplikasi atau menimpa nama variabel (hindari variable shadowing).
12. SEMUA error wajib dialirkan ke `middleware/error-middleware.ts` (jangan kirim res.status error ad-hoc).
```

---

## 8. Panduan Menambah Fitur Baru (Step-by-Step Checklist)

Ketika diminta untuk membuat modul atau fitur baru (misalnya fitur `transactions`):

1. **Types:** Buat `types/transaction-types.ts`. Definisikan DTO, interface record, dan payload insert/update.
2. **Schema Table:** Perbarui skema tabel Drizzle di `config/schema.ts` jika ada penambahan atau modifikasi tabel database.
3. **Repository:** Buat `repositories/transaction-repositories.ts` (perhatikan bentuk jamak `-repositories.ts`). Implementasikan operasi Drizzle ORM.
4. **Service:** Buat `services/transaction-service.ts`. Implementasikan logika bisnis, validasi aturan domain, dan lempar `AppError` bila gagal.
5. **Validation:** Buat `validations/transaction-validation.ts`. Implementasikan skema Zod untuk payload request.
6. **Controller:** Buat `controllers/transaction-controller.ts`. Ekstrak parameter input, panggil service, kirimkan response `snake_case` atau teruskan ke `next(controller_error)`.
7. **Route:** Buat `routes/transaction-route.ts`. Sertakan anotasi Swagger JSDoc, hubungkan middleware & controller, lalu ekspor `default router`.
8. **Pendaftaran di `index.ts`:** Import route baru dan daftarkan dengan `app.use('/api/transactions', transaction_router)`.

---

## 9. Checklist Anti-Pattern (Hal yang Dilarang Keras)

- ❌ **DILARANG** melakukan query database (`db.select()`, `db.insert()`) di Controller atau Service. Seluruh query database **wajib** di Repository.
- ❌ **DILARANG** mengakses objek HTTP (`req` atau `res`) di dalam Service atau Repository.
- ❌ **DILARANG** membuat response error manual di controller (misal `res.status(500).json(...)`). Gunakan `next(error)`.
- ❌ **DILARANG** menggunakan `camelCase` pada key respons JSON ke client. Seluruh key **wajib** `snake_case`.
- ❌ **DILARANG** melakukan *variable shadowing* atau penggunaan ulang variabel dengan makna data berbeda dalam scope yang sama.
- ❌ **DILARANG** menyertakan data sensitif (`password_hash`, secret key, private token) pada respons JSON client.
- ❌ **DILARANG** menamai file repository dengan bentuk tunggal `*-repository.ts`. Basis kode ini menggunakan bentuk jamak `*-repositories.ts`.
