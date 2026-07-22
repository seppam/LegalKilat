# PANDUAN PEB (PEMBERITAHUAN EKSPOR BARANG) & INSW

## 📌 Ringkasan
**Sumber**: insw.go.id, DJBC (Direktorat Jenderal Bea dan Cukai), LNSW  
**Konteks**: Panduan teknis pengisian PEB melalui portal INSW untuk Eksportir Indonesia  
**Portal**: https://insw.go.id | Hotline: 150-679

---

## 1. TENTANG INSW (INDONESIA NATIONAL SINGLE WINDOW)

### 1.1 Definisi
INSW adalah sistem single-window resmi Indonesia yang dikelola **Lembaga National Single Window (LNSW)**, berada di bawah **Kementerian Keuangan RI**. Sistem ini memungkinkan:
- **Input data elektronik** untuk semua dokumen kepabeanan
- **Pertukaran data antar lembaga** secara otomatis
- **Persetujuan satu pintu** untuk izin-izin terkait ekspor/impor

### 1.2 Dasar Hukum
- **UU No. 17 Tahun 2006** Perubahan atas UU No. 10/1995 tentang Kepabeanan
- **Perpres No. 63 Tahun 2019** tentang INSW
- **Peraturan LNSW** terkait tata cara pertukaran data elektronik

### 1.3 Ruang Lingkup INSW
| Komponen | Keterangan |
|----------|------------|
| Dokumen Kepabeanan | PEB, PIB, BC 1.1, dll |
| Dokumen Karantina | Phytosanitary, SPS certificates |
| Dokumen Perizinan | NIE, SIUP, Sertificate standar |
| Dokumen Kepelabuhan | Booking kapal, delivery order |
| Dokumenothers | COO, Bill of Lading, dll |

---

## 2. PEB (PEMBERITAHUAN EKSPOR BARANG)

### 2.1 Definisi
PEB adalah dokumen pemberitahuan yang wajib diisi oleh Eksportir untuk memberitahu DJBC tentang barang yang akan diekspor. PEB merupakan dasar untuk penerbitan **BC 1.1 (Bearer Customs Declaration for Export)**.

### 2.2 Kapan PEB Harus Di-input?
- **Sebelum barang meninggalkan Indonesia**
- Minimal: beberapa jam sebelumLoading barang di kapal
- Waktu ideal: D-1 (satu hari sebelum keberangkatan kapal)

### 2.3 Siapa yang Harus Mengisi PEB?
| Role | Tanggung Jawab |
|------|---------------|
| **Eksportir (PPJK/Pengusaha)** | Wajib input PEB via INSW |
| **PPJK** (Pengusaha Pengurusan Jasa Kepabeanan) | Bisa mewakili eksportir, wajib lamar di DJBC |
| **PPJK Terdaftar** | Perusahaan yang mendapat izin dari DJBC untukurus customs declaration |

> **Catatan**: UMKM kecil bisa mengisi PEB sendiri (tidak wajib menggunakan PPJK). Namun, menggunakan PPJK memudahkan proses.

---

## 3. LANGKAH-LANGKAH PENGISIAN PEB DI INSW

### 3.1 Prasyarat
1. **NIB aktif** dari OSS (Online Single Submission)
2. **NPWP** perusahaan/perorangan
3. **Akses INSW** (register di insw.go.id jika belum punya akun)
4. **Data produk lengkap** (HS code, deskripsi, jumlah, nilai)
5. **Invoice dan Packing List** (siap di-upload)

### 3.2 Langkah 1 — Login ke INSW
```
URL: https://insw.go.id
Menu: Login → Eksportir / PPJK
Credentials: Username + Password (didapat dari registrasi)
```

### 3.3 Langkah 2 — Pilih Jenis Dokumen
```
Pilih: PEB (Pemberitahuan Ekspor Barang)
Menu: Periksa → Pemberitahuan Pabean → Ekspor
```

### 3.4 Langkah 3 — Isi Data Header
| Field | Contoh |
|-------|--------|
| **Jenis PEB** | Biasa / Kecil / Aktiva |
| **NIB Eksportir** | 81200876543210001 |
| **NPWP Eksportir** | 01.234.567.8-012.000 |
| **Nama Eksportir** | PT Contoh Indonesia |
| **Alamat Eksportir** | Jl. Sudirman No. 1, Jakarta |
| **API-P atau NIB** | NIB (untuk UMK) |

### 3.5 Langkah 4 — Isi Data Pembeli/Importir
| Field | Contoh |
|-------|--------|
| **Nama Importir** | ABC Company Inc. |
| **Alamat Importir** | 123 Main Street, Los Angeles, CA |
| **Negara Tujuan** | UNITED STATES |
| **Jenis Transaksi** | Jual Beli Biasa |

### 3.6 Langkah 5 — Isi Detail Barang
| Field | Contoh |
|-------|--------|
| **No Urut Barang** | 1, 2, 3... |
| **HS Code** | 0901.11.10 |
| **Uraian Barang** | INDONESIA GREEN COFFEE BEANS, ARABICA, ROASTY |
| **Merek Barang** | (kosongkan jika tidak ada) |
| **Kode Negara Asal Barang** | ID (Indonesia) |
| **Jumlah** | 10,000 |
| **Satuan** | KGM (Kilogram) |
| **Berat Bersih (Kg)** | 10,500 |
| **Berat Kotor (Kg)** | 11,000 |
| **FOB (USD)** | 45,000 |
| **Freight (USD)** | (isi jika CIF) |
| **Asuransi (USD)** | (isi jika CIF) |
| **Kondisi** | Baik / Baru / Bekas |
| **Jenis Kemasan** | Bag / Carton / Drum |
| **Jumlah Kemasan** | 300 |
| **Kode Kemasan** | BAG |

### 3.7 Langkah 6 — Isi Data Pengangkutan
| Field | Contoh |
|-------|--------|
| **Jenis Sarana Pengangkutan** | Laut (Sea) |
| **Nama Alat Angkut** | MV. EVER GIVEN |
| **No. Voy/Flight** | 1234E |
| **Tanggal Berangkat** | 15/07/2025 |
| **Pelabuhan Muat** | IDTPP (Tanjung Priok) |
| **Pelabuhan Transit** | (kosongkan jika direct) |
| **Pelabuhan Tujuan Akhir** | USLAX (Los Angeles) |
| **Gudang TPS/TPB** | TPS (Tempat Penimbunan Sementara) |
| **Alamat Gudang** | (isi alamat gudang di porto) |

### 3.8 Langkah 7 — Isi Data Incoterms & Pembayaran
| Field | Contoh |
|-------|--------|
| **Incoterms** | FOB |
| **Jenis Pembayaran** | L/C / T/T / D/A |
| **No. PIB/NPE** | (kosongkan untuk ekspor) |
| **No. Pendaftaran** | (kosongkan untuk ekspor) |
| **Valuta** | USD |

### 3.9 Langkah 8 — Upload Dokumen Pendukung
| Dokumen | Format | Wajib? |
|---------|--------|---------|
| Invoice | PDF | ✅ Ya |
| Packing List | PDF | ✅ Ya |
| COO / SKA | PDF | ✅ Ya (untuk FTA) |
| Surat Keterangan Asal | PDF | ⚠️ Jika diperlukan |
| Phytosanitary Certificate | PDF | ⚠️ Produk pertanian |
| Other documents | PDF/JPG | ❌ Opsional |

### 3.10 Langkah 9 — Submit & Tunggu Persetujuan
```
1. Klik "Kirim / Submit"
2. Sistem INSW memvalidasi data secara otomatis
3. Forward ke DJBC untuk mendapat拍浮
4. Status berubah: "DITERIMA" → "DIPERIKSA" → "DISAHKAN"
5. Sistem menerbitkan BC 1.1 (NPE) secara elektronik
6. Print BC 1.1 dan serahkan ke Capitan Port / Shipping Line
```

---

## 4. JENIS PEB

### 4.1 PEB Biasa
- Untuk ekspor barang dagangan umum
- Volume/value besar
- Proses standar DJBC

### 4.2 PEB Kecil (Sesuai UU PPh)
- Untuk ekspor barang bernilai ≤ USD 10.000 (FOB)
- Atau nilai sesuai threshold yang berlaku
- Prosedur lebih sederhana
- Tetap harus ada invoice dan Packing List

### 4.3 PEB Aktiva
- Untuk ekspor barang modal/aktiva perusahaan
- Bisa mendapat fasilitas pembebasan PPN

---

## 5. KETENTUAN KHUSUS PER PRODUK

### 5.1 Produk Pertanian (Kopi, Teh, Rempah)
| Persyaratan | Detail |
|------------|--------|
| **Phytosanitary Certificate** | Wajib dari Barantan (Badan Karantina Indonesia) |
| **Jenis attestation** | Sesuai standar SPS negara tujuan |
| **Fumigasi** | Methyl bromide atau phosphine treatment |
| **Sertifikat mutu** | SNI atau standar pembeli |
| **Registrasi** | Beberapa negara butuh registrasi exporter |

### 5.2 Produk Tekstil (Batik, Kerajinan Kain)
| Persyaratan | Detail |
|------------|--------|
| **Label compliance** | "Made in Indonesia" |
| **SNI tekstil** | SNI 08-0084-2006 (kain) |
| **PPN** | Bisa restitusi untuk ekspor |
| **Fumigasi** | Jika ada komponen kayu (pallet) |

### 5.3 Produk Kerajinan (Kayu, Rotan)
| Persyaratan | Detail |
|------------|--------|
| **SVLK** (Sistem Verifikasi Legalitas Kayu) | Wajib untuk produk kayu |
| **FLEGT License** | Jika ke pasar EU (sesuai EU-FLEGT VPAs) |
| **CITES Permit** | Jika bahan baku dari flora/fauna dilindungi |
| **Dokumen sumber kayu** | Bukti legalitas kayu (FPIC, izin galian) |

### 5.4 Produk Makanan & Minuman Olahan
| Persyaratan | Detail |
|------------|--------|
| **Halal Certificate** | Wajib untuk negara dengan persyaratan halal |
| **FDA Registration** | Untuk ekspor ke USA |
| **Sertifikat kesehatan** | Dari BPOM atau Dinas Kesehatan |
| **BPOM approval** | Jika produk tersebut diatur BPOM |

---

## 6. TRACKING STATUS PEB DI INSW

| Status | Arti | Aksi Needed |
|--------|------|-----------|
| **BARU** | PEB baru diinput | Tunggu proses validasi |
| **DITERIMA** | INSW menerima | Tunggu pemeriksaan DJBC |
| **DIPERIKSA** | SDJBC sedang memeriksa | Bersiap jika ada klarifikasi |
| **DISAHKAN** | BC 1.1/NPE diterbitkan | Print & serahkan ke shipping line |
| **DITOLAK** | Ada kesalahan/kurang dokumen | Perbaiki & resubmit |
| **BATAL** | PEB dibatalkan | Jika barang tidak jadi dikirim |

---

## 7. ALAMAT & KONTAK PENTING

| Lembaga | Alamat | Telepon |
|---------|--------|---------|
| **LNSW (INSW)** | Gedung Sarana Jaya 3, JL. Rawamangun No. 59C, Cempaka Putih, Jakarta Pusat 10570 | 150-679 |
| **DJBC Pusat** | Jl. A.W. Syahdan, Jakarta | (021) 578 52000 |
| **Call Center DJBC** | — | (021) 1500-288 |

---

## 8. PANDUAN RAG — TOPIK BAHASAN UTAMA

### Topik 1: Teknis PEB
- Bagaimana cara isi PEB di INSW langkah demi langkah?
- Apa perbedaan PEB biasa dan PEB kecil?
- Kenapa PEB saya ditolak? Bagaimana memperbaikinya?

### Topik 2: Dokumen Pendukung
- Kapan Phytosanitary Certificate wajib untuk ekspor kopi?
- Apakah PEB tanpa SKA/COO bisa disetujui?
- Apa risiko tidak ada BC 1.1 saat shipping?

### Topik 3: HS Code di PEB
- Bagaimana mencari HS Code yang tepat?
- Apa akibat salah HS Code di PEB?
- Apakah HS Code menentukan besaran bea keluar?

### Topik 4: Incoterms & Nilai
- Bagaimana menghitung FOB value dari CIF?
- Apa perbedaan freight dan insurance di PEB?
- Apakah salah hitung nilai bisa kena masalah dengan DJBC?

### Topik 5: Troubleshooting
- BC 1.1 belum keluar, kapal sudah mau berangkat — apa yang harus dilakukan?
- Bagaimana caranya cepat mendapat NPE?
- Apakah bisa amend PEB yang sudah disetujui?

---

## METADATA
- **Portal**: https://insw.go.id
- **Hotline**: 150-679
- **Email**: info@insw.go.id
- **Jam Operasional**: Senin-Jumat, 08.00-16.00 WIB
- **Disclaimer**: Informasi ini bersifatEDUKATIF. Regulations dapat berubah — selalu cek ke insw.go.id atau hubungi DJBC langsung untuk kepastian terkini.
