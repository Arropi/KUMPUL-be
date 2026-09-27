# Backend Development Guidelines & Agent Instructions (`be/`)

Dokumen ini adalah panduan standar arsitektur, struktur folder, konvensi penamaan, dan gaya penulisan kode untuk AI Agent dan pengembang yang bekerja pada backend (`be/`). Semua kode baru atau modifikasi kode yang dibuat **harus mematuhi** aturan dalam panduan ini agar konsisten dengan basis kode yang sudah ada.

---

## 1. Ikhtisar & Aturan Fundamental

- **Runtime & Modul:** Node.js (>= 20/22) dengan **ES Modules (ESM)** (`"type": "module"` di `package.json`).
- **Wajib Ekstensi `.js`:** Setiap relative import **wajib** mencantumkan ekstensi `.js` (contoh: `import { ... } from './services/user-service.js'`).
- **Dilarang CommonJS:** Jangan gunakan `require()`, `module.exports`, atau `exports`. Gunakan `import` dan `export`.
- **Framework & Library Utama:**
  - Web Server: **Express 5** (`express`)
  - ODM / Database: **Mongoose 9** (`mongoose`, MongoDB)
  - Schema Validation: **Zod 4** (`zod`)
  - Autentikasi: **JSON Web Token** (`jsonwebtoken`)
  - Dokumentasi API: **Swagger OpenAPI 3.0** (`swagger-jsdoc`, `swagger-ui-express`)
  - Keamanan / Bot Protection: **Arcjet** (`@arcjet/node`)
  - Object Storage: **Cloudflare R2** via AWS S3 SDK (`@aws-sdk/client-s3`)
  - Export Data: **fast-csv**

---

## 2. Struktur Folder & Tanggung Jawab (Layered Architecture)

Backend menggunakan arsitektur berlapis (*layered architecture* / *n-tier*) dengan pemisahan tanggung jawab (*Separation of Concerns*) yang ketat:

```text
be/
├── config/             # Konfigurasi aplikasi & inisialisasi koneksi pihak ketiga
├── controllers/        # HTTP Request & Response handlers
├── middleware/         # Express middleware (Auth, Role, Arcjet, Error Handler)
├── models/             # Schema & Model Mongoose
├── repositories/       # Data Access Layer (interaksi langsung dengan database MongoDB)
├── routes/             # Definisi endpoint & dokumentasi Swagger JSDoc
├── services/           # Business Logic Layer (orkestrasi repositori, validasi bisnis)
├── utils/              # Helper murni & utilitas aggregation
├── validations/        # Skema validasi request berbasis Zod
├── index.js            # Main entrypoint aplikasi
├── seed-dummy.js       # Script seeder data development
└── AGENTS.md           # Panduan ini
```

### Diagram Alur Data (Request Flow)

```
Client Request
      │
      ▼
   routes/              (Mendefinisikan endpoint & Swagger JSDoc)
      │
      ▼
 middleware/            (Auth, Role, Arcjet, dan Validasi Zod)
      │
      ▼
 controllers/           (Mengekstrak req.body/params/query/user, kirim response)
      │
      ▼
   services/            (Logika bisnis, validasi aturan bisnis, lempar Error dengan statusCode)
      │
      ▼
 repositories/          (Query Mongoose: find, aggregate, create, update, delete)
      │
      ▼
  models/ & MongoDB     (Schema & persistensi data)
```

---

## 3. Konvensi Penamaan (Naming Conventions)

### A. Penamaan File
Seluruh nama file menggunakan format **kebab-case** dengan sufiks layer yang spesifik:

| Layer | Format Nama File | Contoh | Catatan Khusus |
| :--- | :--- | :--- | :--- |
| **Routes** | `<feature>-route.js` | `user-route.js`, `machine-route.js` | Ekspor `default router` |
| **Controllers** | `<feature>-controller.js` | `user-controller.js`, `auth-controller.js` | Ekspor fungsi *named* |
| **Services** | `<feature>-service.js` | `user-service.js`, `machine-service.js` | Ekspor fungsi *named* |
| **Repositories** | `<feature>-repositories.js` | `user-repositories.js`, `machine-repositories.js` | **PENTING: Gunakan bentuk jamak (`-repositories.js`)** |
| **Models** | `<feature>-model.js` | `machine-model.js`, `user-model.js` | Ekspor `default Model` |
| **Validations** | `<feature>-validation.js` | `user-validation.js`, `machine-validation.js` | Middleware validasi fungsi *named* |
| **Middleware** | `<feature>-middleware.js` | `auth-middleware.js`, `role-middleware.js` | Ekspor `default` atau *named* |
| **Config** | `<feature>.js` | `env.js`, `database.js`, `swagger.js` | Konfigurasi modular |
| **Utils** | `<feature>.js` atau `helper.js` | `helper.js` | Fungsi pembantu umum |

### B. Penamaan Variabel & Fungsi
- **Fungsi & Variabel:** `camelCase` (contoh: `getMachines`, `findUserById`, `machineCreateValidation`).
- **Mongoose Model & Class:** `PascalCase` (contoh: `User`, `Machine`, `MachineMetrics`).
- **Environment Variables:** `SCREAMING_SNAKE_CASE` (diakses melalui `config/env.js`).

---

## 4. Pola Implementasi Tiap Layer (Coding Standards & Templates)

### 1. Routes (`routes/<feature>-route.js`)
- Menggunakan `Router()` dari `express`.
- **Wajib menuliskan Swagger JSDoc (`/** @swagger ... */`)** tepat di atas setiap route endpoint.
- Rantai middleware: `[authMiddleware] -> [roleMiddleware] -> [validationMiddleware] -> controller`.
- Ekspor `default router`.

```javascript
import { Router } from "express";
import authMiddleware from "../middleware/auth-middleware.js";
import roleMiddleware from "../middleware/role-middleware.js";
import { getExampleById, createExample } from "../controllers/example-controller.js";
import { exampleCreateValidation } from "../validations/example-validation.js";

const router = Router();

/**
 * @swagger
 * /api/example/{id}:
 *   get:
 *     summary: Get example by ID
 *     tags: [Example]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Example retrieved successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", getExampleById);

/**
 * @swagger
 * /api/example:
 *   post:
 *     summary: Create new example
 *     tags: [Example]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Example created successfully
 */
router.post("/", roleMiddleware, exampleCreateValidation, createExample);

export default router;
```

---

### 2. Validations (`validations/<feature>-validation.js`)
- Menggunakan `zod` untuk memvalidasi `req.body`, `req.query`, atau `req.params`.
- Bila validasi gagal, tangkap `ZodError`, ambil pesan issue pertama, set `err.statusCode = 400`, dan teruskan ke `next(err)`.
- Berikan pesan error ramah pengguna pada field schema.

```javascript
import { z, ZodError } from "zod";

export function exampleCreateValidation(req, res, next) {
  try {
    z.object({
      name: z
        .string({
          error: (iss) =>
            iss.input === undefined
              ? "Field Name Cannot Be Empty"
              : "Invalid input on name",
        })
        .min(1, "Field Name Cannot Be Empty"),
      email: z
        .email({
          error: (iss) =>
            iss.input === undefined
              ? "Field Email Cannot Be Empty"
              : "Invalid input on email",
        })
        .refine(
          (val) => val.endsWith("@mail.ugm.ac.id") || val.endsWith("@ugm.ac.id"),
          "Invalid email, please using ugm email"
        ),
    }).parse(req.body);

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const err = new Error(error.issues[0].message);
      err.statusCode = 400;
      next(err);
    } else {
      next(error);
    }
  }
}
```

---

### 3. Controllers (`controllers/<feature>-controller.js`)
- **Dilarang menaruh logika bisnis atau query database langsung di Controller.**
- Tugas Controller hanyalah:
  1. Mengekstrak parameter (`req.params`, `req.query`, `req.body`, `req.user`, `req.machine`).
  2. Memanggil fungsi Service terkait.
  3. Mengembalikan respons JSON dengan status code HTTP yang sesuai.
  4. Menangkap error dalam blok `try...catch` dan meneruskannya via `next(error)`.

```javascript
import { getExampleByIdService, createExampleService } from "../services/example-service.js";

export async function getExampleById(req, res, next) {
  try {
    const { id } = req.params;
    const example = await getExampleByIdService(id);
    res.status(200).json({
      message: "Example retrieved successfully",
      data: example,
    });
  } catch (error) {
    next(error);
  }
}

export async function createExample(req, res, next) {
  try {
    const { name, email } = req.body;
    const { id: userId } = req.user;
    const newExample = await createExampleService(name, email, userId);
    res.status(201).json({
      message: "Example created successfully",
      data: newExample,
    });
  } catch (error) {
    next(error);
  }
}
```

---

### 4. Services (`services/<feature>-service.js`)
- Berisi seluruh logika bisnis, validasi kondisi bisnis, hashing, manipulasi token, atau pemanggilan API pihak ketiga.
- Mengorkestrasi satu atau lebih fungsi dari layer Repositories.
- **Dilarang mengakses objek HTTP (`req` atau `res`).**
- **Aturan Error Handling:** Buat instans `new Error("Pesan error")`, sematkan properti `error.statusCode = <HTTP_CODE>`, lalu `throw error`.

```javascript
import {
  findExampleById,
  findExampleByEmail,
  createExampleRepo,
} from "../repositories/example-repositories.js";

export async function getExampleByIdService(id) {
  try {
    const example = await findExampleById(id);
    if (!example) {
      const error = new Error("Example not found");
      error.statusCode = 404;
      throw error;
    }
    return example;
  } catch (error) {
    throw error;
  }
}

export async function createExampleService(name, email, userId) {
  try {
    const existing = await findExampleByEmail(email);
    if (existing) {
      const error = new Error("Example with this email already exists");
      error.statusCode = 400;
      throw error;
    }

    const created = await createExampleRepo({ name, email, createdBy: userId });
    return created;
  } catch (error) {
    throw error;
  }
}
```

---

### 5. Repositories (`repositories/<feature>-repositories.js`)
- Mengelola operasi langsung ke Mongoose Model (`find`, `findOne`, `create`, `findByIdAndUpdate`, `aggregate`, dll.).
- **Dilarang memuat logika bisnis HTTP atau manipulasi response API.**
- Proyeksikan atau kecualikan data sensitif di level repository (contoh: `{ activationToken: 0, hashApiKey: 0 }`).
- Gunakan `.lean()` untuk read-only query demi efisiensi performa jika dokumen tidak perlu dimutasi via Mongoose Document methods.

```javascript
import Example from "../models/example-model.js";

export async function findExampleById(id) {
  try {
    const data = await Example.findById(id, { secretToken: 0 }).lean();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function findExampleByEmail(email) {
  try {
    const data = await Example.findOne({ email });
    return data;
  } catch (error) {
    throw error;
  }
}

export async function createExampleRepo(payload) {
  try {
    const newDoc = new Example(payload);
    await newDoc.save();
    return newDoc;
  } catch (error) {
    throw error;
  }
}
```

---

### 6. Models (`models/<feature>-model.js`)
- Menggunakan schema Mongoose dengan opsi `{ timestamps: true }`.
- Mendefinisikan tipe data, nilai default, `enum`, dan validator schema bawaan jika diperlukan.
- Ekspor `default mongoose.model("ModelName", schema)`.

```javascript
import mongoose from "mongoose";

const exampleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Example = mongoose.model("Example", exampleSchema);
export default Example;
```

---

### 7. Middleware (`middleware/<feature>-middleware.js`)
- Middleware bertugas memotong request untuk autentikasi, otorisasi, atau preprocessing.
- **Autentikasi Pengguna (`auth-middleware.js`):** Membaca header `Authorization: Bearer <token>`, memverifikasi JWT, dan mengisi `req.user = jwtDecode`.
- **Otorisasi Role (`role-middleware.js`):** Memeriksa `req.user.role` (contoh: hanya `admin`).
- **Autentikasi Agen (`agent-middleware.js`):** Membaca token agen, melakukan hash SHA-256, membandingkan secara aman (`timingSafeEqual`), dan mengisi `req.machine`.
- **Error Handler Terpusat (`error-middleware.js`):** Seluruh error yang dilempar via `next(err)` ditangani di sini. Mengembalikan format `{ "message": error.message }` dengan status code `error.statusCode || 500`.

---

## 5. Konfigurasi Lingkungan (`config/env.js`)

Semua variabel environment harus didefinisikan dan diekspor melalui `config/env.js`.
**Jangan pernah memanggil `process.env.VARIABLE` secara sporadis di dalam Service atau Repository jika belum diekspor melalui `env.js`.**

```javascript
import { config } from "dotenv";
if (process.env.NODE_ENV !== "production") {
  config({ path: ".env.development.local" });
}

export const {
  PORT,
  DB_URI,
  ARCJET_KEY,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  // ... variabel lainnya
} = process.env;
```

---

## 6. Standar Dokumentasi Swagger (`swagger.js` & `swagger-components.js`)

1. Setiap endpoint baru di folder `routes/` **wajib** menyertakan anotasi Swagger JSDoc.
2. Gunakan tag yang jelas sesuai domain fitur: `[User]`, `[Machine]`, `[Dashboard]`, `[CSV]`, `[Agent]`, `[Auth]`.
3. Komponen skema atau respons yang dapat digunakan kembali (*reusable*) harus ditempatkan di `config/swagger-components.js` dan direferensikan menggunakan `$ref`:
   - `$ref: '#/components/responses/BadRequest'` (400)
   - `$ref: '#/components/responses/Unauthorized'` (401)
   - `$ref: '#/components/responses/Forbidden'` (403)
   - `$ref: '#/components/responses/NotFound'` (404)
   - `$ref: '#/components/responses/InternalServerError'` (500)
   - `$ref: '#/components/schemas/Error'`

---

## 7. Format Standar Respons API

### Format Respons Sukses
Gunakan format envelope standar dengan field `message` dan payload data:
```json
{
  "message": "Operasi berhasil dilakukan",
  "data": { ... }
}
```

### Format Respons Error
Seluruh error yang dikirim ke client memiliki bentuk seragam:
```json
{
  "message": "Penjelasan error yang terjadi"
}
```

---

## 8. Panduan Menambah Fitur Baru (Step-by-Step Checklist)

Ketika diminta untuk membuat modul atau fitur baru di backend (misal fitur `audit-log`):

1. **Model:** Buat `models/audit-log-model.js`. Definisikan skema Mongoose dengan `timestamps: true`.
2. **Repository:** Buat `repositories/audit-log-repositories.js` (ingat bentuk jamak `-repositories.js`). Implementasikan fungsi query database.
3. **Service:** Buat `services/audit-log-service.js`. Implementasikan aturan bisnis, validasi logika, dan lempar error dengan `statusCode`.
4. **Validation:** Buat `validations/audit-log-validation.js`. Implementasikan skema Zod untuk body/query.
5. **Controller:** Buat `controllers/audit-log-controller.js`. Ekstrak parameter `req`, panggil service, kirimkan status `200`/`201` atau `next(error)`.
6. **Route:** Buat `routes/audit-log-route.js`. Pasang anotasi Swagger JSDoc, bind middleware & controller, ekspor `default router`.
7. **Pendaftaran di `index.js`:** Import route baru di `index.js` dan daftarkan melalui `app.use("/api/audit-logs", auditLogRoutes)`.
8. **Swagger Components (opsional):** Jika ada schema model baru yang reusable, tambahkan di `config/swagger-components.js`.

---

## 9. Checklist Anti-Pattern (Hal yang Dilarang)

- ❌ **DILARANG** mengimpor tanpa ekstensi `.js` (contoh salah: `import user from './models/user-model'`).
- ❌ **DILARANG** melakukan query database (`User.find()`, `Model.create()`) di dalam Controller atau Service. Query **harus** di Repository.
- ❌ **DILARANG** mengakses `req` atau `res` di dalam Service atau Repository.
- ❌ **DILARANG** mengirim status HTTP selain 2xx di dalam blok sukses Controller.
- ❌ **DILARANG** membiarkan error tidak tertangkap (`unhandled rejection`). Selalu gunakan `try...catch` dan oper ke `next(error)` di Controller.
- ❌ **DILARANG** menyertakan data sensitif (`activationToken`, `hashApiKey`, hash password) ke response JSON client.
- ❌ **DILARANG** menamai file repository dengan bentuk tunggal `*-repository.js`. Basis kode ini menggunakan `*-repositories.js`.
