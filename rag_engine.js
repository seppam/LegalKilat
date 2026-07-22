const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Memuat variabel lingkungan jika belum ter-load
if (!process.env.HF_TOKEN) {
    require('dotenv').config();
}

/**
 * Fungsi untuk memotong konten dari legal_database.html menjadi potongan-potongan kecil (chunks)
 */
function loadAndChunkDatabase() {
    const htmlPath = path.join(__dirname, 'rag/datasets/legal_database.html');
    if (!fs.existsSync(htmlPath)) {
        console.error(`File basis data tidak ditemukan di: ${htmlPath}`);
        return [];
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const $ = cheerio.load(htmlContent);
    const chunks = [];
    let chunkId = 0;

    // 1. Ekstrak data dari tabel
    $('table').each((i, tableEl) => {
        const table = $(tableEl);
        const headers = [];
        table.find('thead th').each((j, th) => {
            headers.push($(th).text().trim());
        });

        table.find('tbody tr').each((j, tr) => {
            const rowData = [];
            $(tr).find('td').each((k, td) => {
                rowData.push($(td).text().trim());
            });

            if (rowData.length > 0) {
                const text = rowData.map((val, idx) => {
                    const colName = headers[idx] || `Kolom ${idx + 1}`;
                    return `${colName}: ${val}`;
                }).join(' | ');
                
                chunks.push({
                    id: `tabel-baris-${chunkId++}`,
                    text: `[Data Tabel Regulasi] ${text}`,
                    source: 'Tabel Basis Data Regulasi'
                });
            }
        });
    });

    // 2. Potong berdasarkan paragraf (<p>) dan daftar item (<li>)
    $('p, li').each((i, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text.length > 25) {
            let sectionTitle = '';
            let prev = $(el).prev();
            while (prev.length > 0) {
                if (prev.is('h1, h2, h3, h4, h5, h6')) {
                    sectionTitle = prev.text().trim();
                    break;
                }
                prev = prev.prev();
            }

            chunks.push({
                id: `teks-blok-${chunkId++}`,
                text: sectionTitle ? `[Bagian: ${sectionTitle}] ${text}` : text,
                source: sectionTitle || 'Informasi Regulasi Umum'
            });
        }
    });

    // 3. Potong kartu modul utama
    $('.bg-white, .bg-slate-50, .p-5, .p-6').each((i, el) => {
        const clone = $(el).clone();
        clone.find('table, .bg-white, .bg-slate-50').remove();
        const text = clone.text().trim().replace(/\s+/g, ' ');
        if (text.length > 50 && text.length < 600) {
            chunks.push({
                id: `modul-kartu-${chunkId++}`,
                text: text,
                source: 'Modul Regulasi UMKM'
            });
        }
    });

    const uniqueTexts = new Set();
    const filteredChunks = [];
    for (const chunk of chunks) {
        if (chunk.text && chunk.text.length > 25 && !uniqueTexts.has(chunk.text)) {
            uniqueTexts.add(chunk.text);
            filteredChunks.push(chunk);
        }
    }

    return filteredChunks;
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function sparseScore(query, text) {
    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const textWords = text.toLowerCase().split(/\W+/);
    if (queryWords.length === 0) return 0;
    
    let matches = 0;
    for (const qw of queryWords) {
        if (textWords.includes(qw)) {
            matches++;
        }
    }
    return matches / queryWords.length;
}

class RAGEngine {
    constructor() {
        this.chunks = [];
        this.embeddings = [];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        console.log('[RAG] Memulai inisialisasi RAG Engine via Hugging Face API...');
        this.chunks = loadAndChunkDatabase();
        console.log(`[RAG] Berhasil memotong database hukum menjadi ${this.chunks.length} potongan.`);

        const token = process.env.HF_TOKEN;
        if (!token || token.includes('placeholder') || token === 'hf_') {
            console.warn('[RAG] HF_TOKEN tidak diset atau masih menggunakan placeholder. Menggunakan Sparse Retrieval (Kata Kunci) saja.');
            this.initialized = true;
            return;
        }

        try {
            console.log('[RAG] Menghitung dense embeddings via Hugging Face Inference API (Batching 10 chunks)...');
            
            const batchSize = 10;
            const allEmbeddings = [];
            let success = true;

            for (let i = 0; i < this.chunks.length; i += batchSize) {
                const batchChunks = this.chunks.slice(i, i + batchSize);
                const texts = batchChunks.map(c => c.text);
                
                console.log(`[RAG] Memproses batch ${Math.floor(i / batchSize) + 1} (${texts.length} chunk)...`);
                const vectors = await this.getHFEmbeddings(texts);
                
                if (vectors && Array.isArray(vectors) && vectors.length === texts.length) {
                    allEmbeddings.push(...vectors);
                } else {
                    console.warn(`[RAG] Gagal memproses batch pada index ${i}. Fallback ke Sparse Retrieval.`);
                    success = false;
                    break;
                }
                
                // Jeda 200ms untuk mencegah error rate-limiting 429
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (success && allEmbeddings.length === this.chunks.length) {
                this.embeddings = allEmbeddings;
                console.log('[RAG] Perhitungan embeddings selesai. RAG Engine siap digunakan secara Hybrid!');
            }
            this.initialized = true;
        } catch (err) {
            console.error('[RAG] Gagal menginisialisasi dense retriever. Fallback ke sparse.', err);
            this.initialized = true;
        }
    }

    async getHFEmbeddings(texts) {
        const token = process.env.HF_TOKEN;
        const url = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
        
        let retries = 5;
        while (retries > 0) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ inputs: texts })
                });

                const data = await response.json();
                
                if (response.status === 200 && Array.isArray(data)) {
                    return data;
                }

                if (data.error && data.error.includes('loading')) {
                    const waitTime = Math.ceil(data.estimated_time || 15);
                    console.log(`[RAG] Model sedang loading di Hugging Face. Menunggu ${waitTime} detik...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                    retries--;
                } else {
                    console.error('[RAG] Error dari Hugging Face API:', data);
                    return null;
                }
            } catch (err) {
                console.error('[RAG] Gagal memanggil Hugging Face API:', err);
                return null;
            }
        }
        return null;
    }

    /**
     * Mencari chunk paling relevan dari basis data regulasi.
     * Mengembalikan objek { results, outOfScope } untuk digunakan oleh server sebagai guardrail.
     * @param {string} query - Kueri pencarian dari pengguna
     * @param {number} topK  - Jumlah hasil teratas yang dikembalikan
     * @returns {{ results: Array, outOfScope: boolean }}
     */
    async search(query, topK = 5) {
        if (!this.initialized) {
            await this.init();
        }

        let scoredChunks = [];

        if (this.embeddings.length === this.chunks.length) {
            try {
                const queryVectors = await this.getHFEmbeddings([query]);
                if (queryVectors && Array.isArray(queryVectors) && queryVectors.length > 0) {
                    const queryVector = queryVectors[0];
                    scoredChunks = this.chunks.map((chunk, idx) => {
                        const dScore = cosineSimilarity(queryVector, this.embeddings[idx]);
                        const sScore = sparseScore(query, chunk.text);
                        const hybridScore = 0.7 * dScore + 0.3 * sScore;
                        return {
                            ...chunk,
                            denseScore: dScore,
                            sparseScore: sScore,
                            score: hybridScore
                        };
                    });
                }
            } catch (err) {
                console.error('[RAG] Gagal mencari kemiripan semantik, beralih ke pencarian kata kunci.', err);
            }
        }

        if (scoredChunks.length === 0) {
            scoredChunks = this.chunks.map((chunk) => {
                const sScore = sparseScore(query, chunk.text);
                return {
                    ...chunk,
                    denseScore: 0,
                    sparseScore: sScore,
                    score: sScore
                };
            });
        }

        const sorted = scoredChunks.sort((a, b) => b.score - a.score);
        const topResults = sorted.slice(0, topK);

        // [GUARDRAIL] Threshold relevansi:
        // Sparse mode: skor > 0.25 dianggap relevan.
        // Dense/Hybrid mode: skor > 0.20 dianggap relevan.
        const hasEmbeddings = this.embeddings.length === this.chunks.length;
        const relevanceThreshold = hasEmbeddings ? 0.20 : 0.25;
        const topScore = topResults.length > 0 ? topResults[0].score : 0;
        const outOfScope = topScore < relevanceThreshold;

        if (outOfScope) {
            console.log(`[RAG GUARDRAIL] Kueri di luar lingkup. Skor tertinggi: ${topScore.toFixed(4)} < threshold ${relevanceThreshold}`);
        }

        return { results: topResults, outOfScope };
    }


    /**
     * Memvalidasi proposal pinjaman dan ekspor untuk 8 komoditas utama Indonesia
     */
    validateProposal(plafon, kbli) {
        const result = {
            compliant: true,
            errors: [],
            skema: 'KUR Mikro',
            bunga: '6% efektif per tahun',
            agunan: 'Tanpa Jaminan Fisik',
            komoditas: '',
            kbli_desc: '',
            hs_codes: [],
            dokumen_wajib: [],
            grounding_text: '',
            rekomendasi_ai: ''
        };

        const plafonNum = parseFloat(plafon);
        if (isNaN(plafonNum) || plafonNum <= 0) {
            result.compliant = false;
            result.errors.push('Nominal plafon pinjaman harus berupa angka positif yang valid.');
            return result;
        }

        // 1. Validasi Batas Skema KUR
        if (plafonNum <= 10000000) {
            result.skema = 'KUR Super Mikro';
            result.agunan = 'Tanpa Agunan Tambahan';
        } else if (plafonNum <= 50000000) {
            result.skema = 'KUR Mikro';
            result.agunan = 'Tanpa Jaminan Fisik / Agunan Tambahan';
        } else if (plafonNum <= 500000000) {
            result.skema = 'KUR Kecil';
            result.agunan = 'Agunan Sesuai Penilaian Risiko Bank';
        } else {
            result.compliant = false;
            result.errors.push('Nominal plafon melebihi batas maksimal KUR pemerintah (maksimal Rp 500 Juta).');
        }

        // 2. Pemetaan & Validasi 8 Sektor Usaha Utama (KBLI)
        if (kbli === '01240') {
            result.komoditas = 'Kopi';
            result.kbli_desc = 'Perkebunan Kopi (KBLI 01240)';
            result.hs_codes = [
                { code: '0901.11.10', desc: 'Kopi, belum disangrai (Green Beans Arabika/Robusta)', duty: '0% (Bebas Bea Keluar)' },
                { code: '2101.11.10', desc: 'Kopi Instan olahan kemasan siap seduh', duty: '10% Bea Keluar' }
            ];
            result.dokumen_wajib = [
                { nama: 'Invoice & Packing List', desc: 'Kelengkapan dokumen komersial ekspor dasar.' },
                { nama: 'Certificate of Origin (COO / SKA)', desc: 'Surat Keterangan Asal untuk fasilitas diskon tarif bea masuk.' },
                { nama: 'Sertifikat Karantina Pertanian (Phytosanitary)', desc: 'Sertifikat kesehatan tanaman wajib dari Badan Karantina Indonesia.' }
            ];
            result.grounding_text = 'Regulasi Kopi (KBLI 01240): Green Beans dikenakan Bea Keluar 0%. Wajib Phytosanitary Certificate.';
            result.rekomendasi_ai = 'Rekomendasi AI: Optimalkan ekspor dalam bentuk olahan (kopi instan/roasted) untuk meningkatkan nilai tambah, meskipun dikenakan bea keluar 10%. Pastikan kadar air kopi sesuai standar ISO 1446 (maksimal 12.5%).';
        } else if (kbli === '14111') {
            result.komoditas = 'Batik';
            result.kbli_desc = 'Pakaian Jadi Konveksi Batik (KBLI 14111)';
            result.hs_codes = [
                { code: '6204.42.10.00', desc: 'Pakaian wanita/gadis dari katun bermotif batik tulis/cap', duty: 'MFN 25% (Dapat dikurangi tarif preferensi)' }
            ];
            result.dokumen_wajib = [
                { nama: 'Invoice & Packing List', desc: 'Komersial dasar pengiriman barang garmen.' },
                { nama: 'Certificate of Origin (COO / SKA)', desc: 'Menjamin asal-usul kain batik asli buatan Indonesia untuk memanfaatkan tax-cut di bea cukai tujuan.' }
            ];
            result.grounding_text = 'Regulasi Batik (KBLI 14111): Pakaian katun batik dikenakan tarif MFN 25% di luar skema perdagangan FTA.';
            result.rekomendasi_ai = 'Rekomendasi AI: Sertakan sertifikat keaslian batik dari Balai Besar Standardisasi Kerajinan dan Batik untuk menarik pangsa pasar premium di Uni Eropa dan Amerika Serikat.';
        } else if (kbli === '16294') {
            result.komoditas = 'Kerajinan Tangan';
            result.kbli_desc = 'Kerajinan Kayu & Rotan (KBLI 16294)';
            result.hs_codes = [
                { code: '4420.10.00.00', desc: 'Patung kayu dan alat dekorasi kayu', duty: 'Bebas Bea Keluar' },
                { code: '4601.21.00.00', desc: 'Tas, tikar, atau anyaman berbahan rotan alami', duty: 'Bebas Bea Keluar' }
            ];
            result.dokumen_wajib = [
                { nama: 'Invoice & Packing List', desc: 'Dokumen transaksi fisik barang ekspor.' },
                { nama: 'Sertifikat V-Legal (SVLK)', desc: 'Dokumen kepatuhan Sistem Verifikasi Legalitas Kayu wajib untuk bahan berbahan kayu.' }
            ];
            result.grounding_text = 'Regulasi Kerajinan Kayu (KBLI 16294): Patung kayu bebas bea keluar, wajib dilengkapi Sertifikat V-Legal (SVLK) resmi.';
            result.rekomendasi_ai = 'Rekomendasi AI: Untuk bahan rotan, pastikan tidak mengekspor bahan mentah/setengah jadi yang dilarang undang-undang. Produk anyaman jadi 100% bebas bea keluar.';
        } else if (kbli === '10731') {
            result.komoditas = 'Kakao/Cokelat';
            result.kbli_desc = 'Pengolahan Kakao & Cokelat (KBLI 10731)';
            result.hs_codes = [
                { code: '1801.00.00.00', desc: 'Biji kakao utuh atau pecah, mentah', duty: '5% Bea Keluar' },
                { code: '1806.31.00.00', desc: 'Cokelat olahan batangan siap konsumsi', duty: 'MFN 15%' }
            ];
            result.dokumen_wajib = [
                { nama: 'Invoice & Packing List', desc: 'Kelengkapan dokumen komersial.' },
                { nama: 'Sertifikat HACCP / Food Safety', desc: 'Sertifikat sistem keamanan pangan untuk ekspor makanan.' },
                { nama: 'Sertifikat Karantina Pertanian (Phytosanitary)', desc: 'Sertifikat kesehatan wajib komoditas tanaman.' }
            ];
            result.grounding_text = 'Regulasi Kakao (KBLI 10731): Biji kakao mentah dikenakan Bea Keluar 5% sesuai Peraturan Menteri Keuangan.';
            result.rekomendasi_ai = 'Rekomendasi AI: Ekspor dalam bentuk cokelat batangan olahan/bubuk kakao dibebaskan dari bea keluar dan memiliki tarif preferensi di wilayah ASEAN dengan dokumen COO Form D.';
        } else if (kbli === '10771') {
            result.komoditas = 'Teh';
            result.kbli_desc = 'Pengolahan Teh (KBLI 10771)';
            result.hs_codes = [
                { code: '0902.10.00.00', desc: 'Teh hijau (belum difermentasi) kemasan langsung ≤ 3kg', duty: 'MFN 5%' },
                { code: '0902.30.00.00', desc: 'Teh hitam (difermentasi) kemasan langsung ≤ 3kg', duty: 'MFN 5%' }
            ];
            result.dokumen_wajib = [
                { nama: 'Invoice & Packing List', desc: 'Dokumen ekspor komersial dasar.' },
                { nama: 'Sertifikat Halal', desc: 'Sertifikat jaminan produk halal untuk ekspor negara tujuan OKI.' },
                { nama: 'Sertifikat Karantina Pertanian (Phytosanitary)', desc: 'Wajib dari Balai Karantina Indonesia.' }
            ];
            result.grounding_text = 'Regulasi Teh (KBLI 10771): Teh kemasan ritel dikenakan bea masuk MFN rata-rata 5% di negara tujuan umum.';
            result.rekomendasi_ai = 'Rekomendasi AI: Jaga batas residu pestisida (MRL) sesuai regulasi ketat FDA atau Uni Eropa (di bawah 0.01 mg/kg) untuk mempermudah clearance bea cukai.';
        } else if (kbli === '10212') {
            result.komoditas = 'Udang Olahan';
            result.kbli_desc = 'Pengolahan Udang Beku & Kaleng (KBLI 10212)';
            result.hs_codes = [
                { code: '1605.21.00.00', desc: 'Udang olahan atau diawetkan, tidak kedap udara', duty: '0% (Bebas Bea Keluar)' }
            ];
            result.dokumen_wajib = [
                { nama: 'Invoice & Packing List', desc: 'Dokumen administrasi pengiriman kargo.' },
                { nama: 'Health Certificate BKIPM', desc: 'Sertifikat Kesehatan Ikan dan Produk Perikanan dari Kementerian Kelautan dan Perikanan.' }
            ];
            result.grounding_text = 'Regulasi Produk Perikanan (KBLI 10212): Ekspor udang olahan beku wajib mengantongi Health Certificate dari BKIPM.';
            result.rekomendasi_ai = 'Rekomendasi AI: Pastikan cold chain system (rantai dingin) terjaga di suhu -18°C secara konsisten selama logistik pelayaran ekspor untuk menjamin kualitas fisik produk.';
        } else if (kbli === '31001') {
            result.komoditas = 'Furnitur Bambu';
            result.kbli_desc = 'Industri Furnitur Bambu & Rotan (KBLI 31001)';
            result.hs_codes = [
                { code: '9403.82.00.00', desc: 'Furnitur dari bambu atau rotan untuk meja, kursi, ranjang', duty: 'Bebas Bea Keluar' }
            ];
            result.dokumen_wajib = [
                { nama: 'Invoice & Packing List', desc: 'Rincian fisik dan keuangan barang ekspor.' },
                { nama: 'Sertifikat V-Legal (SVLK)', desc: 'Dokumen kelayakan Sistem Verifikasi Legalitas Kayu/Bambu hasil hutan.' }
            ];
            result.grounding_text = 'Regulasi Furnitur Bambu (KBLI 31001): Produk jadi furnitur bambu dibebaskan dari bea keluar ekspor.';
            result.rekomendasi_ai = 'Rekomendasi AI: Produk bambu disarankan melalui proses fumigasi (Sertifikat Fumigasi) untuk mencegah serangga bubuk kayu menyerang furnitur saat berada di kontainer kapal kontainer.';
        } else if (kbli === '15201') {
            result.komoditas = 'Alas Kaki/Sepatu';
            result.kbli_desc = 'Industri Sepatu Olahraga & Kulit (KBLI 15201)';
            result.hs_codes = [
                { code: '6403.99.90.00', desc: 'Sepatu dengan sol luar dari karet dan bagian atas dari kulit', duty: 'MFN 20% (Preferensi FTA)' }
            ];
            result.dokumen_wajib = [
                { nama: 'Invoice & Packing List', desc: 'Dokumen dasar pengapalan cargo kontainer.' },
                { nama: 'Certificate of Origin (COO / SKA)', desc: 'SKA Form AJ/E/D untuk pembebasan tarif bea masuk di negara mitra FTA.' }
            ];
            result.grounding_text = 'Regulasi Alas Kaki (KBLI 15201): Bea masuk ekspor alas kaki kulit ke negara tujuan non-FTA dikenakan tarif MFN 20%.';
            result.rekomendasi_ai = 'Rekomendasi AI: Manfaatkan perjanjian kemitraan IJEPA (Indonesia-Japan Economic Partnership) atau CEPA untuk memotong tarif masuk menjadi 0% di negara importir Jepang/Korea.';
        } else {
            result.compliant = false;
            result.errors.push('Kode KBLI / Sektor Usaha Utama tidak dikenali atau tidak didukung.');
        }

        return result;
    }
}

module.exports = {
    RAGEngine,
    loadAndChunkDatabase
};
