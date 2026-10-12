const assert = require('assert');
// Uji ini berjalan offline (hanya sparse retrieval); jangan kirim HF_TOKEN nyata saat testing.
process.env.HF_TOKEN = 'placeholder';
const { RAGEngine } = require('./rag_engine');

async function runTests() {
    console.log('====================================================');
    console.log('  Memulai Uji Coba Kepatuhan RAG LegalKilat...');
    console.log('====================================================');

    const rag = new RAGEngine();
    
    // 1. Tes Uji Validasi Aturan KUR & KBLI
    console.log('\n[UJI 1] Menguji fungsi validateProposal()...');
    
    // Kasus 1: Plafon Super Mikro (<= 10 Jt)
    const resSuperMikro = rag.validateProposal('10000000', '01240');
    assert.strictEqual(resSuperMikro.compliant, true);
    assert.strictEqual(resSuperMikro.skema, 'KUR Super Mikro');
    assert.strictEqual(resSuperMikro.bunga, '6% efektif per tahun');
    assert.strictEqual(resSuperMikro.agunan, 'Tanpa Agunan Tambahan');
    assert.strictEqual(resSuperMikro.komoditas, 'Kopi');
    console.log('✔ Uji Plafon Super Mikro & KBLI Kopi Kepatuhan: BERHASIL');

    // Kasus 2: Plafon Mikro (10 Jt - 50 Jt)
    const resMikro = rag.validateProposal('45000000', '14111');
    assert.strictEqual(resMikro.compliant, true);
    assert.strictEqual(resMikro.skema, 'KUR Mikro');
    assert.strictEqual(resMikro.agunan, 'Tanpa Jaminan Fisik / Agunan Tambahan');
    assert.strictEqual(resMikro.komoditas, 'Batik');
    console.log('✔ Uji Plafon Mikro & KBLI Batik Kepatuhan: BERHASIL');

    // Kasus 3: Plafon Kecil (50 Jt - 500 Jt)
    const resKecil = rag.validateProposal('150000000', '16294');
    assert.strictEqual(resKecil.compliant, true);
    assert.strictEqual(resKecil.skema, 'KUR Kecil');
    assert.strictEqual(resKecil.agunan, 'Agunan Sesuai Penilaian Risiko Bank');
    assert.strictEqual(resKecil.komoditas, 'Kerajinan Tangan');
    console.log('✔ Uji Plafon Kecil & KBLI Kerajinan Kepatuhan: BERHASIL');

    // Kasus 4: Plafon Over-limit (> 500 Jt)
    const resInvalidPlafon = rag.validateProposal('600000000', '01240');
    assert.strictEqual(resInvalidPlafon.compliant, false);
    assert.ok(resInvalidPlafon.errors.includes('Nominal plafon melebihi batas maksimal KUR pemerintah (maksimal Rp 500 Juta).'));
    console.log('✔ Uji Batas Atas Plafon Melebihi Limit KUR: BERHASIL (Kepatuhan Terblokir)');

    // Kasus 5: KBLI Tidak Terdaftar
    const resInvalidKbli = rag.validateProposal('25000000', '99999');
    assert.strictEqual(resInvalidKbli.compliant, false);
    assert.ok(resInvalidKbli.errors.includes('Kode KBLI / Sektor Usaha Utama tidak dikenali atau tidak didukung.'));
    console.log('✔ Uji Penolakan KBLI Tidak Valid: BERHASIL');

    // 2. Tes Integrasi Inisialisasi Model Semantic Embedding
    console.log('\n[UJI 2] Menginisialisasi RAG Engine & Indeks Semantic Embedding...');
    try {
        await rag.init();
        assert.ok(rag.chunks.length > 0);
        console.log(`✔ Inisialisasi Indeks RAG Sukses: Terbentuk ${rag.chunks.length} potongan grounding.`);
        
        console.log('\nMengevaluasi Pencarian Hybrid Semantik...');
        const searchResponse = await rag.search('Berapa bunga KUR Mikro Mandiri?', 3);
        const searchResults = searchResponse.results;
        assert.ok(Array.isArray(searchResults));
        assert.strictEqual(searchResults.length, 3);
        console.log('Hasil Pencarian Teratas untuk "Berapa bunga KUR Mikro Mandiri?":');
        searchResults.forEach((r, i) => {
            console.log(`  ${i+1}. [Skor: ${r.score.toFixed(4)}] ${r.text.substring(0, 100)}...`);
        });
        
        // Verifikasi hasil teratas mengandung kata kunci relevan
        const topResultText = searchResults[0].text.toLowerCase();
        assert.ok(topResultText.includes('bunga') || topResultText.includes('kur') || topResultText.includes('6%'));
        console.log('✔ Uji Hybrid Search Semantik RAG: BERHASIL');


    } catch (err) {
        console.error('✘ Uji RAG Engine Gagal:', err);
        process.exit(1);
    }

    // 3. Guardrail & validasi input
    console.log('\n[UJI 3] Menguji guardrail out-of-scope & input tidak valid...');
    const oos = await rag.search('Siapa juara piala dunia sepak bola 2022?', 3);
    assert.strictEqual(oos.outOfScope, true);
    const empty = await rag.search(undefined, 3);
    assert.deepStrictEqual(empty, { results: [], outOfScope: true });
    const inScope = await rag.search('syarat dokumen ekspor PEB INSW', 3);
    assert.strictEqual(inScope.outOfScope, false);
    console.log('✔ Uji Guardrail Out-of-Scope & Input Kosong: BERHASIL');

    console.log('\n====================================================');
    console.log('  Semua Uji Coba Kepatuhan RAG BERHASIL! (100% OK)');
    console.log('====================================================');
}

runTests();
