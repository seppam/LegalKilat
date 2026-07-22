# LegalKilat - Platform Legalitas & Akselerasi Bisnis UMKM Berbasis AI RAG

> **Proyek MVP IDCamp Developer Challenge #2: Digitalization & Acceleration of MSMEs with Generative AI**  
> *Solusi All-in-One Kepatuhan Kemitraan KUR 6%, Analisis Kode HS Ekspor, dan AI Guardrail Hukum Indonesia.*

---

## 📌 Business & Problem Overview

### Latar Belakang & Permasalahan
Usaha Mikro, Kecil, dan Menengah (UMKM) merupakan tulang punggung perekonomian Indonesia. Namun, sebagian besar pelaku UMKM menghadapi hambatan struktural saat ingin melakukan ekspansi bisnis melalui skema pembiayaan Kredit Usaha Rakyat (KUR) maupun perdagangan internasional (ekspor):

1. **Kerumitan Syarat Administrasi KUR 6%:** Pelaku UMKM sering kali kesulitan menyusun proposal bisnis formal dan menghitung skema kredit anuitas 6% secara akurat sesuai regulasi pemerintah.
2. **Hambatan Kepatuhan Kepabeanan & Ekspor:** Ketidakpahaman mengenai Klasifikasi Kode HS (BTKI 2022), ketentuan Bea Keluar, dan dokumen kepabeanan wajib (NIB, PEB, COO/SKA, SVLK, Phytosanitary) mengakibatkan kontainer kargo tertahan atau dikenakan denda bea masuk di negara tujuan.
3. **Risiko Informasi Palsu & Halusinasi AI:** Penggunaan AI umum tanpa grounding hukum sering memberikan jawaban halusinasi yang tidak sesuai dengan undang-undang atau regulasi perbankan Indonesia yang berlaku.

### Solusi LegalKilat
**LegalKilat** hadir sebagai platform *all-in-one suite* terpadu yang memadukan teknologi kecerdasan buatan berbasis *Retrieval-Augmented Generation* (RAG) dengan sistem akuntansi dan kelayakan legalitas hukum:

* **Kalkulator & Proposal Generator KUR 6%:** Menghitung simulasi kredit anuitas resmi dan menggenerasi dokumen proposal formal standar A4 dalam hitungan detik.
* **Analisis Ekspor & Commercial Invoice Generator:** Memetakan KBLI ke Kode HS BTKI 2022, rincian Bea Keluar, serta menerbitkan draf *Commercial Invoice* terstandarisasi.
* **Engine AI Grounded RAG dengan Guardrail:** Menjawab pertanyaan hukum UMKM dengan sumber rujukan mutlak (*Grounding Context*) dari basis data regulasi resmi tanpa risiko halusinasi.

### Dampak Bisnis
* ⏱️ **Efisiensi Waktu Pengajuan:** Memangkas waktu penyusunan proposal KUR dari berhari-hari menjadi kurang dari 3 menit.
* 🛡️ **Kepatuhan Kepabeanan 100%:** Mengurangi risiko penolakan kargo ekspor di pelabuhan akibat kesalahan dokumen atau klasifikasi Kode HS.
* 📈 **Percepatan Skalabilitas UMKM:** Membuka akses pendanaan modal kerja dan kemudahan ekspor mandiri secara terstruktur.

---

## 🛠️ Architecture & Tech Stack

```
                                  +---------------------------------+
                                  |     Klien Browser (SPA UX)       |
                                  | HTML5 / CSS3 / Vanilla JS / PDF |
                                  +---------------------------------+
                                                   |
                                            HTTPS / REST API
                                                   |
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                    Node.js / Express.js Server                                     |
|                                                                                                    |
|  +---------------------------+   +-------------------------------+   +--------------------------+  |
|  | Sesi & RBAC Auth          |   | Modul Kalkulasi Finansial     |   | AI RAG Hybrid Engine     |  |
|  | (express-session / bcrypt)|   | (Anuitas 6% & Matriks Ekspor) |   | (Dense + Sparse Retrieval|  |
|  +---------------------------+   +-------------------------------+   +--------------------------+  |
+----------------------------------------------------------------------------------------------------+
              |                                    |                                    |
              v                                    v                                    v
+---------------------------+        +---------------------------+        +---------------------------+
|    MongoDB Atlas Cloud    |        | Hugging Face Inference API|        |    legal_database.html    |
| (Akun User, Proposal, Sesi|        | (sentence-transformers    |        | (Grounding Source Mutlak) |
+---------------------------+        +---------------------------+        +---------------------------+
```

* **Backend:** Node.js, Express.js, `express-session`, `connect-mongo`, `cookie-parser`, `dotenv`
* **Database & Keamanan:** MongoDB Atlas Cloud, Bcrypt Password Hashing (10 Salt Rounds), Middleware Sesi RBAC (`userAuth` & `adminAuth`)
* **AI & RAG Engine:** Hugging Face Inference API (`sentence-transformers/all-MiniLM-L6-v2`), Vector Dense Embedding + Hybrid Sparse Search (BM25-like), Cosine Similarity Scoring, Relevance Threshold Guardrail
* **Frontend & Rendering PDF:** HTML5, Vanilla CSS3 (Custom Design Token & Utilities), JavaScript (ES6+ Native), `html2pdf.js`, Material Symbols / Lucide Icons

---

## ✨ Key Features

1. **Simulasi KUR 6% Anuitas & Auto-Generate Proposal (PDF A4)**
   * Perhitungan otomatis angsuran bulanan tepat sesuai suku bunga KUR 6% efektif per tahun untuk tenor 12, 24, 36, 48, dan 60 bulan.
   * Cetak proposal formal A4 simetris tanpa terpotong (*responsive A4 wrapper*) yang siap diserahkan ke bank penyalur (BRI, Mandiri, BNI).

2. **Analisis Kode HS (BTKI 2022) & Generator Draf Commercial Invoice**
   * Pemetaan otomatis 8 KBLI komoditas unggulan Indonesia (Kopi, Batik, Kerajinan Tangan, Kakao, Teh, Udang Beku, Furnitur Bambu, Alas Kaki).
   * Generasi draf *Commercial Invoice* ekspor secara *real-time* yang dapat diunduh sebagai file PDF A4 bersih.

3. **Asisten AI Hukum Grounded RAG (dengan Out-of-Scope Guardrail)**
   * Menjawab kueri seputar regulasi KUR dan ekspor berbasiskan basis data hukum resmi.
   * **Relevance Guardrail:** Pertanyaan di luar topik (seperti sains umum, olahraga, atau politik) otomatis disaring oleh threshold Cosine Similarity (`< 0.20`), dan dijawab dengan penolakan ramah tanpa memunculkan sumber grounding acak.

4. **Panel Admin & Simulator Prompt RAG**
   * Dashboard terproteksi khusus administrator untuk mensimulasikan kueri RAG, menguji kecocokan *grounding context*, dan memeriksa *safety warning* terhadap upaya manipulasi bunga KUR.

5. **SPA-Like UX & Retensi Data Form Client-Side**
   * Pengalaman pengguna yang mulus tanpa pengulangan input data berkat integrasi `sessionStorage` form persistence pada halaman KUR, Ekspor, dan Proposal.
   * Umpan balik visual dinamis menggunakan sistem Custom Modal Popup dan Toast UI tanpa `alert()` bawaan browser.

---

## 🚀 How to Run Locally

Ikuti langkah-langkah berikut untuk menjalankan proyek di komputer lokal Anda:

### 1. Prasyarat Sistem
* Node.js (versi 18.0.0 atau lebih baru)
* NPM (versi 9.0.0 atau lebih baru)
* Koneksi Internet (untuk Hugging Face API & MongoDB Atlas)

### 2. Langkah Instalasi

```bash
# 1. Clone repositori ke direktori lokal
git clone https://github.com/username/LegalKilat.git
cd LegalKilat

# 2. Install seluruh dependensi proyek
npm install

# 3. Salin file lingkungan .env.example menjadi .env
cp .env.example .env

# 4. Sesuaikan isi file .env (opsional jika ingin menggunakan MongoDB Atlas atau HF Token pribadi)
# Catatan: Jika MONGODB_URI/HF_TOKEN tidak diisi, sistem otomatis beralih ke Fallback Mode aman!
```

### 3. Menjalankan Aplikasi

```bash
# Jalankan server orkestrator RAG
npm start
# atau menggunakan nodemon (jika terinstall):
npm run dev
```

### 4. Akses Aplikasi
Buka peramban (browser) dan kunjungi:
* 🌐 **Portal Utama:** `http://localhost:3000`
* 📝 **Pendaftaran Akun:** `http://localhost:3000/register.html`
* 🔐 **Halaman Masuk:** `http://localhost:3000/login.html`
* 📊 **Dasbor Pengguna:** `http://localhost:3000/dashboard/proposal.html`
* ⚙️ **Panel Admin:** `http://localhost:3000/admin/simulator.html`

---

## 🔑 Demo Credentials

Untuk keperluan pengujian juri dan reviewer kompetisi, gunakan kredensial berikut:

| Peran (Role) | Identifier / Username / Email | Kata Sandi (Password) | Akses Area |
|---|---|---|---|
| **Administrator** | `admin` *(atau `admin@legalkilat.id`)* | `legalkilat2026` | `/admin/ingestion.html`, `/admin/simulator.html` |
| **Pengguna (UMKM)** | Registrasi baru di `/register.html` | Sesuai pendaftaran | `/dashboard/proposal.html`, `/dashboard/kur.html`, `/dashboard/ekspor.html`, `/dashboard/chat.html` |

---

> **Diproduksi oleh Team Antigravity AI** untuk *IDCamp Developer Challenge #2*.  
> *Hak Cipta © 2026 LegalKilat. Seluruh hak cipta dilindungi undang-undang.*
