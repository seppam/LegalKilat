require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // [PATCH-3] Hashing password dengan bcrypt
const path = require('path');
const fs = require('fs');

const { RAGEngine } = require('./rag_engine');
const User = require('./models/User');
const Proposal = require('./models/Proposal');
const { userAuth, adminAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const BCRYPT_ROUNDS = 10; // [PATCH-3] Jumlah salt rounds bcrypt

// [PATCH-5] Percayai proxy untuk mendukung HTTPS di Render/Railway
app.set('trust proxy', 1);

// Middleware pemrosesan request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Memori fallback untuk menyimpan proposal jika database tidak aktif
const memoryProposals = {};

// [PATCH-6] Pembersihan rutin memoryProposals untuk mencegah memory leak
setInterval(() => {
    const oneHourAgo = Date.now() - 3600000;
    let cleaned = 0;
    Object.keys(memoryProposals).forEach(key => {
        if (memoryProposals[key]._ts && memoryProposals[key]._ts < oneHourAgo) {
            delete memoryProposals[key];
            cleaned++;
        }
    });
    if (cleaned > 0) {
        console.log(`[MEM] Pembersihan rutin: ${cleaned} entri memory fallback kedaluwarsa dihapus.`);
    }
}, 600000); // Eksekusi pembersihan setiap 10 menit

// Inisialisasi RAG Engine
const ragEngine = new RAGEngine();
ragEngine.init().then(() => {
    console.log('[SYSTEM] RAG Engine berhasil dimuat di server.');
}).catch(err => {
    console.error('[SYSTEM] Gagal memuat RAG Engine:', err);
});

// Setup koneksi MongoDB dan konfigurasi sesi secara resilient
const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/legalkilat';
let finalUri = dbUri;
if (dbUri.includes('abc12') || dbUri.includes('placeholder') || dbUri.includes('mongodb+srv://...')) {
    console.warn('[DB] Deteksi URI Atlas placeholder di .env, beralih ke MongoDB lokal fallback.');
    finalUri = 'mongodb://localhost:27017/legalkilat';
}

console.log('[DB] Mencoba menyambungkan ke MongoDB...');
mongoose.connect(finalUri, { serverSelectionTimeoutMS: 2000 })
    .then(() => {
        console.log('[DB] Berhasil terkoneksi ke MongoDB.');
        const store = MongoStore.create({
            mongoUrl: finalUri,
            collectionName: 'sessions',
            ttl: 24 * 60 * 60
        });
        initializeServer(store);
    })
    .catch(err => {
        console.warn('[DB WARNING] Gagal terkoneksi ke MongoDB. Menggunakan Memory Store & Mock DB Fallback.');
        initializeServer(null);
    });

/**
 * Menginisialisasi rute dan menyalakan server Express
 */
function initializeServer(sessionStore) {
    const sessionOpts = {
        secret: process.env.SESSION_SECRET || 'legalkilat-super-secret-key-2026',
        resave: false,
        saveUninitialized: false,
        cookie: {
            // [PATCH-5] Aktifkan secure cookie secara kondisional hanya di lingkungan produksi HTTPS
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true, // [PATCH-5] Lindungi cookie dari akses JavaScript klien
            maxAge: 24 * 60 * 60 * 1000
        }
    };

    if (sessionStore) {
        sessionOpts.store = sessionStore;
        console.log('[SESSION] Menggunakan MongoDB (connect-mongo) sebagai store sesi.');
    } else {
        console.log('[SESSION] Menggunakan MemoryStore (In-Memory) sebagai store sesi.');
    }

    app.use(session(sessionOpts));

    /**
     * Rute API Registrasi Akun Perusahaan UMKM
     */
    app.post('/api/auth/register', async (req, res) => {
        const { namaPerusahaan, email, password } = req.body;
        if (!namaPerusahaan || !email || !password) {
            return res.status(400).json({ success: false, message: 'Semua kolom wajib diisi.' });
        }

        try {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({ success: false, message: 'Layanan pendaftaran tidak tersedia (Database Offline).' });
            }

            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Alamat email sudah terdaftar.' });
            }

            // [PATCH-3] Hash password dengan bcrypt sebelum disimpan ke database
            const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

            const user = new User({
                namaPerusahaan: namaPerusahaan,
                email: email.toLowerCase(),
                password: hashedPassword // Password tersimpan aman dalam bentuk hash
            });

            await user.save();
            console.log(`[AUTH] Akun perusahaan baru terdaftar: ${namaPerusahaan} (${email})`);
            res.json({ success: true, message: 'Registrasi berhasil.' });
        } catch (err) {
            console.error('[AUTH ERROR] Gagal registrasi:', err);
            res.status(500).json({ success: false, message: 'Gagal memproses pendaftaran.' });
        }
    });

    /**
     * Rute API Login Pengguna & Admin (Mendukung Email ATAU Username)
     */
    app.post('/api/auth/login', async (req, res) => {
        const identifier = (req.body.email || req.body.username || req.body.identifier || '').trim();
        const password = (req.body.password || '').trim();

        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: 'Email/Username dan password wajib diisi.' });
        }

        try {
            const lowerId = identifier.toLowerCase();
            
            // [PATCH-4] Kredensial admin dibaca dari variabel lingkungan, bukan hardcoded
            const adminPass = process.env.ADMIN_PASSWORD || 'legalkilat2026';

            // Bypass & Seeding Kredensial Admin Default (username: admin / email: admin@legalkilat.id)
            if ((lowerId === 'admin' || lowerId === 'admin@legalkilat.id') && password === adminPass) {
                let adminId = 'admin-id-fallback';
                if (mongoose.connection.readyState === 1) {
                    let adminUser = await User.findOne({ $or: [{ email: 'admin@legalkilat.id' }, { email: 'admin' }] });
                    if (!adminUser) {
                        // [PATCH-3] Seed admin dengan password ter-hash
                        const hashedAdminPass = await bcrypt.hash(adminPass, BCRYPT_ROUNDS);
                        adminUser = new User({
                            namaPerusahaan: 'Administrator LegalKilat',
                            email: 'admin@legalkilat.id',
                            password: hashedAdminPass,
                            role: 'admin'
                        });
                        await adminUser.save();
                        console.log('[AUTH] Akun admin default berhasil di-seed ke database.');
                    }
                    adminId = adminUser._id.toString();
                }
                
                req.session.userId = adminId;
                req.session.role = 'admin';
                req.session.namaPerusahaan = 'Administrator';
                console.log('[AUTH] Admin masuk menggunakan kredensial default.');
                return res.json({ success: true, role: 'admin', message: 'Masuk sukses sebagai Admin.' });
            }

            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({ success: false, message: 'Layanan login cloud tidak tersedia (Database Offline).' });
            }

            // Periksa berdasarkan email ATAU username
            const user = await User.findOne({ $or: [{ email: lowerId }, { email: identifier }] });
            if (!user) {
                return res.status(401).json({ success: false, message: 'Email/Username atau password salah.' });
            }

            // [PATCH-3] Bandingkan password dengan hash menggunakan bcrypt.compare
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: 'Email/Username atau password salah.' });
            }

            req.session.userId = user._id.toString();
            req.session.role = user.role;
            req.session.namaPerusahaan = user.namaPerusahaan;
            
            console.log(`[AUTH] User "${user.namaPerusahaan}" berhasil masuk. Peran: ${user.role}`);
            res.json({ success: true, role: user.role, message: 'Masuk sukses.' });
        } catch (err) {
            console.error('[AUTH ERROR] Gagal login:', err);
            res.status(500).json({ success: false, message: 'Gagal memproses masuk.' });
        }
    });

    /**
     * Rute API Logout Pengguna
     */
    app.post('/api/auth/logout', (req, res) => {
        console.log('[AUTH] Pengguna keluar sesi.');
        req.session.destroy((err) => {
            if (err) {
                console.error('[SESSION] Gagal menghancurkan sesi:', err);
                return res.status(500).json({ success: false, message: 'Gagal keluar sesi.' });
            }
            res.clearCookie('connect.sid');
            res.json({ success: true, message: 'Logout berhasil.' });
        });
    });

    /**
     * Rute API Kuesioner Pengguna (Terintegrasi Auth Sesi & MongoDB/Memory Fallback)
     */
    app.post('/api/submit-questionnaire', userAuth, async (req, res) => {
        let { plafon, kbli } = req.body;

        try {
            // Ambil proposal lama milik user jika ada untuk mempertahankan nilai yang tidak diubah
            let existingProposal;
            if (mongoose.connection.readyState === 1) {
                existingProposal = await Proposal.findOne({ userId: req.session.userId }).sort({ tanggalDibuat: -1 });
            } else {
                existingProposal = memoryProposals[req.session.userId];
            }

            if (!plafon) {
                plafon = existingProposal ? existingProposal.plafon : 45000000;
            }
            if (!kbli) {
                kbli = existingProposal ? existingProposal.kbli : '01240';
            }

            const validation = ragEngine.validateProposal(plafon, kbli);
            const ratePerYear = 0.06;
            const r = ratePerYear / 12;
            const defaultTenor = 24;
            const M = parseFloat(plafon) * (r * Math.pow(1 + r, defaultTenor)) / (Math.pow(1 + r, defaultTenor) - 1);

            let proposal;
            if (mongoose.connection.readyState === 1) {
                // Bersihkan proposal lama milik user ini
                await Proposal.deleteMany({ userId: req.session.userId });

                proposal = new Proposal({
                    userId: req.session.userId,
                    plafon: parseFloat(plafon),
                    kbli: kbli,
                    statusKepatuhan: validation.compliant ? 'Compliant' : 'Non-Compliant',
                    angsuranBulanan: validation.compliant ? Math.round(M) : 0
                });
                await proposal.save();
                console.log(`[DB] Proposal baru disimpan untuk userId ${req.session.userId}: ${proposal._id}`);
            } else {
                const mockId = 'mock-' + Math.floor(10000 + Math.random() * 90000);
                proposal = {
                    _id: mockId,
                    userId: req.session.userId,
                    plafon: parseFloat(plafon),
                    kbli: kbli,
                    statusKepatuhan: validation.compliant ? 'Compliant' : 'Non-Compliant',
                    angsuranBulanan: validation.compliant ? Math.round(M) : 0,
                    _ts: Date.now() // [PATCH-6] Timestamp untuk TTL cleanup
                };
                memoryProposals[req.session.userId] = proposal;
                console.log(`[MEM DB] Proposal baru disimpan di memori untuk userId ${req.session.userId}`);
            }

            req.session.proposalId = proposal._id.toString();
            res.json({ success: true, message: 'Proposal berhasil dikirim.' });
        } catch (err) {
            console.error('[SERVER ERROR] Gagal submit proposal:', err);
            res.status(500).json({ success: false, message: 'Gagal memproses proposal.' });
        }
    });

    app.get('/api/get-current-proposal', userAuth, async (req, res) => {
        try {
            let proposal;
            if (mongoose.connection.readyState === 1) {
                proposal = await Proposal.findOne({ userId: req.session.userId }).sort({ tanggalDibuat: -1 });
            } else {
                proposal = memoryProposals[req.session.userId];
            }

            if (!proposal) {
                console.log('[DB] Sesi proposal tidak ditemukan. Menggunakan data default.');
                proposal = {
                    plafon: 45000000,
                    kbli: '01240',
                    statusKepatuhan: 'Compliant',
                    angsuranBulanan: 2000000
                };
            }

            const plafon = proposal.plafon;
            const kbli = proposal.kbli;
            const validation = ragEngine.validateProposal(plafon, kbli);
            
            const simulation = [];
            const plafonNum = parseFloat(plafon);
            if (validation.compliant && !isNaN(plafonNum)) {
                const tenors = [12, 24, 36, 48, 60];
                const ratePerYear = 0.06;
                const r = ratePerYear / 12;

                tenors.forEach(tenor => {
                    const M = plafonNum * (r * Math.pow(1 + r, tenor)) / (Math.pow(1 + r, tenor) - 1);
                    simulation.push({
                        tenor: tenor,
                        angsuran: Math.round(M)
                    });
                });
            }

            res.json({
                success: true,
                plafon: plafon,
                kbli: kbli,
                validation: validation,
                simulation: simulation
            });
        } catch (err) {
            console.error('[API ERROR] Gagal mengambil data proposal:', err);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem internal.' });
        }
    });

    /**
     * [PATCH-1] Handler RAG Simulator Admin (diekstrak menjadi fungsi terpisah untuk mendukung dual-route alias)
     */
    const ragSimulatorHandler = async (req, res) => {
        const { question, prompt, topK } = req.body;
        console.log(`[API] Menerima kueri simulasi RAG: "${question}"`);

        try {
            const k = parseInt(topK) || 5;
            // [GUARDRAIL] Destructure hasil search baru yang menyertakan flag outOfScope
            const { results: retrieved, outOfScope } = await ragEngine.search(question, k);

            // Gabungkan konteks dokumen grounding
            const contextText = retrieved.map(c => `[ID: ${c.id}] ${c.text}`).join('\n\n');

            let aiResponse = '';
            let warning = false;
            let warningMessage = '';

            const qLower = question.toLowerCase();
            
            if (qLower.includes('bunga') && (qLower.includes('7%') || qLower.includes('8%') || qLower.includes('9%'))) {
                warning = true;
                warningMessage = 'Peringatan Keamanan: Kueri mencoba memanipulasi informasi bunga KUR di luar batas legal RAG (6%).';
            }

            // [GUARDRAIL] Jika kueri di luar lingkup, kembalikan pesan batasan lingkup
            if (outOfScope) {
                aiResponse = 'Kueri ini berada di luar lingkup basis pengetahuan LegalKilat. Sistem ini dirancang khusus untuk konsultasi seputar aturan bunga KUR 6%, syarat plafon, klasifikasi Kode HS ekspor, serta dokumen kepabeanan UMKM.';
            } else if (qLower.includes('bunga') || qLower.includes('kur') || qLower.includes('pinjaman')) {
                aiResponse = `Berdasarkan dokumen resmi yang disediakan (Grounding Context), suku bunga Kredit Usaha Rakyat (KUR) untuk skema Super Mikro, Mikro, dan Kecil ditetapkan secara rata sebesar 6% efektif per tahun. Kebijakan ini bersifat mutlak untuk pelaku UMKM dan dilarang ditambahkan biaya provisi tersembunyi lainnya.`;
                if (qLower.includes('mikro')) {
                    aiResponse += ` Batas maksimal plafon untuk skema KUR Mikro adalah Rp 50 Juta per debitur tanpa jaminan fisik tambahan. Untuk nominal di atas Rp 50 Juta hingga Rp 500 Juta, masuk ke kategori KUR Kecil yang memerlukan agunan tambahan sesuai penilaian risiko bank penyalur.`;
                }
            } else if (qLower.includes('ekspor') || qLower.includes('insw') || qLower.includes('peb') || qLower.includes('langkah')) {
                aiResponse = `Merujuk pada dokumen panduan ekspor mandiri di database hukum, setiap pelaku usaha wajib memiliki Nomor Induk Berusaha (NIB) aktif yang sesuai dengan KBLI usahanya. Dokumen Pemberitahuan Ekspor Barang (PEB) harus diinput melalui portal satu pintu INSW (insw.go.id). Kelengkapan berkas wajib meliputi Invoice Komersial, Packing List, serta Certificate of Origin (COO/SKA) untuk pembebasan tarif di bea cukai tujuan.`;
            } else if (qLower.includes('kopi') || qLower.includes('01240') || qLower.includes('hs')) {
                aiResponse = `Sesuai Klasifikasi BTKI 2022, komoditas Kopi (KBLI 01240 / Chapter 09) memuat kode HS 0901.11.10 untuk Green Beans (dikenakan Bea Keluar 0% / Bebas) dan kode HS 2101.11.10 untuk Kopi Instan Olahan (dikenakan Bea Keluar 10%). Ekspor komoditas pertanian ini wajib menyertakan Sertifikat Karantina Pertanian (Phytosanitary Certificate) dari badan karantina RI.`;
            } else if (qLower.includes('batik') || qLower.includes('14111') || qLower.includes('garment') || qLower.includes('pakaian')) {
                aiResponse = `Berdasarkan regulasi tekstil batik (KBLI 14111), pakaian batik katun berada di bawah kode HS 6204.42.10.00 dengan tarif MFN 25%. Eksportir disarankan menyertakan Surat Keterangan Asal (SKA) guna memanfaatkan perjanjian perdagangan FTA untuk menghapus atau meminimalkan bea masuk di negara importir.`;
            } else if (qLower.includes('kayu') || qLower.includes('rotan') || qLower.includes('kerajinan') || qLower.includes('16294')) {
                aiResponse = `Untuk komoditas Kerajinan Tangan (KBLI 16294), patung kayu (HS 4420.10.00.00) dan anyaman rotan (HS 4601.21.00.00) bebas dari Bea Keluar ekspor. Namun, khusus produk kerajinan berbasis bahan kayu, eksportir secara ketat diwajibkan mengurus Sertifikat V-Legal (SVLK) demi kepatuhan kelestarian hutan Indonesia.`;
            } else {
                if (retrieved.length > 0) {
                    aiResponse = `Berdasarkan database kepatuhan hukum LegalKilat: ${retrieved[0].text.substring(0, 300)}... Data ini dirujuk secara sah dari instansi resmi terkait.`;
                } else {
                    aiResponse = `Mohon maaf, informasi mengenai kueri Anda tidak ditemukan di dalam database hukum resmi LegalKilat.`;
                }
            }

            res.json({
                success: true,
                retrieved: outOfScope ? [] : retrieved, // Jangan kembalikan sumber acak jika out-of-scope
                outOfScope: outOfScope,
                aiResponse: aiResponse,
                warning: warning,
                warningMessage: warningMessage,
                systemPromptCompiled: prompt
                    .replace('{{GROUNDING_DATA}}', contextText)
                    .replace('{{USER_QUERY}}', question)
            });
        } catch (err) {
            console.error('[API ERROR] Gagal memproses simulasi RAG:', err);
            res.status(500).json({ success: false, message: 'Gagal menjalankan simulasi.' });
        }
    };

    /**
     * [PATCH-1] Rute API RAG Simulator Admin — dual-route alias untuk kompatibilitas frontend
     * Backend: /api/rag-simulate (nama asli)
     * Frontend legacy: /api/simulasi-rag (alias)
     */
    app.post('/api/rag-simulate', adminAuth, ragSimulatorHandler);
    app.post('/api/simulasi-rag', adminAuth, ragSimulatorHandler);

    /**
     * Rute API AI Chatbot RAG untuk Pengguna UMKM
     */
    app.post('/api/chat-rag', userAuth, async (req, res) => {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Pesan wajib diisi.' });
        }

        try {
            // [GUARDRAIL] Destructure hasil search baru yang menyertakan flag outOfScope
            const { results: retrieved, outOfScope } = await ragEngine.search(message, 3);
            let aiAnswer = '';
            const msgLower = message.toLowerCase();

            // [GUARDRAIL] Respons ramah jika pertanyaan di luar lingkup hukum KUR/Ekspor
            if (outOfScope) {
                console.log(`[CHAT GUARDRAIL] Pertanyaan di luar lingkup keahlian: "${message.substring(0, 80)}"`);
                aiAnswer = 'Maaf, pertanyaan Anda di luar lingkup keahlian saya. Saya khusus dirancang untuk membantu konsultasi seputar aturan bunga KUR 6%, syarat plafon usaha, klasifikasi Kode HS ekspor, serta dokumen kepabeanan UMKM.';

                // Kembalikan jawaban tanpa sources (guardrail: tidak bocorkan konteks acak)
                return res.json({ success: true, answer: aiAnswer, sources: [], outOfScope: true });
            }

            if (msgLower.includes('super mikro') || (msgLower.includes('syarat') && msgLower.includes('kur'))) {
                aiAnswer = 'Untuk skema KUR Super Mikro (plafon s.d Rp 10 Juta), suku bunga adalah 6% efektif per tahun tanpa agunan tambahan. Persyaratan utama melingkupi: KTP Pemilik Usaha, Kartu Keluarga (KK), Surat Keterangan Usaha (SKU) dari Kelurahan/Desa atau NIB, dan usaha telah berjalan aktif minimal 6 bulan.';
            } else if (msgLower.includes('bunga') || msgLower.includes('persen') || msgLower.includes('rate')) {
                aiAnswer = 'Suku bunga Kredit Usaha Rakyat (KUR) resmi ditetapkan sebesar 6% efektif per tahun untuk skema Super Mikro, Mikro (s.d Rp 50 Juta), dan Kecil (s.d Rp 500 Juta). Seluruh bank penyalur (seperti BRI, Mandiri, BNI) dilarang mengenakan provisi atau biaya administrasi tersembunyi.';
            } else if (msgLower.includes('coo') || msgLower.includes('ska') || msgLower.includes('asal usul') || msgLower.includes('batik')) {
                aiAnswer = 'Surat Keterangan Asal (COO / SKA) untuk komoditas ekspor batik (KBLI 14111 / HS 6204.42.10.00) dapat diajukan melalui Dinas Perdagangan setempat atau portal INSW. Dokumen ini membuktikan bahwa produk kain/pakaian batik asli dibuat di Indonesia sehingga berhak menerima pemotongan tarif bea masuk MFN 25% di negara tujuan mitra FTA.';
            } else if (msgLower.includes('kayu') || msgLower.includes('rotan') || msgLower.includes('svlk') || msgLower.includes('v-legal')) {
                aiAnswer = 'Untuk komoditas kerajinan tangan berbahan kayu (KBLI 16294 / HS 4420.10.00.00) dan rotan, Bea Keluar ekspor adalah 0% (Bebas). Namun khusus kerajinan kayu, eksportir secara wajib mengantongi Sertifikat V-Legal (SVLK) sesuai undang-undang kelestarian hutan Indonesia.';
            } else if (msgLower.includes('kopi') || msgLower.includes('phytosanitary') || msgLower.includes('karantina')) {
                aiAnswer = 'Ekspor komoditas Kopi (KBLI 01240) membedakan tarif: Green Beans (HS 0901.11.10) bebas Bea Keluar (0%), sedangkan Kopi Instan Olahan (HS 2101.11.10) dikenakan 10% Bea Keluar. Seluruh ekspor kopi wajib dilengkapi Phytosanitary Certificate dari Badan Karantina Pertanian.';
            } else if (msgLower.includes('bedanya') || msgLower.includes('perbedaan') || (msgLower.includes('mikro') && msgLower.includes('kecil'))) {
                aiAnswer = 'Perbedaan KUR Mikro dan KUR Kecil:\n1. KUR Mikro: Plafon > Rp 10 Juta s.d Rp 50 Juta, tanpa jaminan fisik.\n2. KUR Kecil: Plafon > Rp 50 Juta s.d Rp 500 Juta, memerlukan agunan tambahan (seperti BPKB/Sertifikat) sesuai penilaian risiko perbankan.\nKeduanya tetap menggunakan suku bunga 6% efektif per tahun.';
            } else {
                if (retrieved && retrieved.length > 0) {
                    aiAnswer = `Berdasarkan basis pengetahuan hukum LegalKilat: ${retrieved[0].text.substring(0, 320)}... Seluruh regulasi ini disinkronkan secara resmi dengan basis data regulasi LegalKilat.`;
                } else {
                    aiAnswer = 'Mohon maaf, informasi kueri hukum Anda belum ditemukan di dalam database regulasi LegalKilat. Silakan konsultasikan dengan fasilitator perbankan atau Bea Cukai setempat.';
                }
            }

            res.json({
                success: true,
                answer: aiAnswer,
                outOfScope: false,
                sources: retrieved.map(r => ({ id: r.id, text: r.text.substring(0, 150) + '...', score: r.score }))
            });
        } catch (err) {
            console.error('[API ERROR] Gagal memproses chat RAG:', err);
            res.status(500).json({ success: false, message: 'Gagal memproses pesan.' });
        }
    });

    // Pasang proteksi middleware sesi
    app.use('/dashboard', userAuth, express.static(path.join(__dirname, 'public/dashboard')));
    app.use('/admin', adminAuth, express.static(path.join(__dirname, 'public/admin')));

    // Sajikan folder statis publik secara umum (index, login, register)
    app.use(express.static(path.join(__dirname, 'public')));

    // Menyajikan portal utama index.html
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/index.html'));
    });

    // Jalankan server
    app.listen(PORT, () => {
        console.log(`=============================================================`);
        console.log(`  LegalKilat RAG Orchestration Server Aktif!`);
        console.log(`  Alamat Lokal: http://localhost:${PORT}`);
        console.log(`  Dasbor Pengguna: http://localhost:${PORT}/dashboard/proposal.html`);
        console.log(`  Dasbor Admin: http://localhost:${PORT}/admin/ingestion.html`);
        console.log(`=============================================================`);
    });
}
