// Uji integrasi HTTP: menjalankan server.js sebagai proses anak (tanpa MongoDB, tanpa HF token).
const assert = require('assert');
const { spawn } = require('child_process');

const PORT = 3950 + Math.floor(Math.random() * 40);
const BASE = `http://localhost:${PORT}`;
const env = {
    ...process.env,
    PORT: String(PORT),
    HF_TOKEN: 'placeholder',
    MONGODB_URI: 'mongodb://127.0.0.1:1/legalkilat_test', // sengaja tidak terjangkau -> mode fallback memori
    SESSION_SECRET: 'test-secret',
    ADMIN_PASSWORD: 'test-admin-pass',
    NODE_ENV: 'development'
};

const post = (path, body, cookie) => fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body)
});

async function waitReady(child) {
    for (let i = 0; i < 60; i++) {
        if (child.exitCode !== null) throw new Error('server berhenti lebih awal');
        try { const r = await fetch(BASE + '/'); if (r.ok) return; } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('server tidak siap');
}

(async () => {
    const child = spawn(process.execPath, ['server.js'], { env, stdio: 'ignore' });
    try {
        await waitReady(child);

        // Halaman publik
        assert.strictEqual((await fetch(BASE + '/login.html')).status, 200);

        // Tanpa sesi: API terproteksi
        assert.strictEqual((await post('/api/chat-rag', { message: 'bunga KUR' })).status, 401);
        assert.strictEqual((await post('/api/rag-simulate', { question: 'bunga KUR' })).status, 403);

        // Login admin salah / benar
        const bad = await post('/api/auth/login', { identifier: 'admin', password: 'salah' });
        assert.notStrictEqual(bad.status, 200);
        const ok = await post('/api/auth/login', { identifier: 'admin', password: env.ADMIN_PASSWORD });
        assert.strictEqual(ok.status, 200);
        const cookie = ok.headers.get('set-cookie').split(';')[0];

        // RAG simulator: valid, kosong, out-of-scope
        const sim = await (await post('/api/rag-simulate', { question: 'Berapa bunga KUR Mikro?' }, cookie)).json();
        assert.strictEqual(sim.success, true);
        assert.strictEqual(sim.outOfScope, false);
        assert.ok(sim.retrieved.length > 0);
        assert.strictEqual((await post('/api/rag-simulate', {}, cookie)).status, 400);
        const oos = await (await post('/api/rag-simulate', { question: 'Siapa juara piala dunia sepak bola?' }, cookie)).json();
        assert.strictEqual(oos.outOfScope, true);
        assert.deepStrictEqual(oos.retrieved, []);

        // Chat RAG
        const chat = await (await post('/api/chat-rag', { message: 'Apa itu KUR Super Mikro dan bunganya?' }, cookie)).json();
        assert.strictEqual(chat.success, true);
        assert.ok(/6%/.test(chat.answer));
        assert.strictEqual((await post('/api/chat-rag', { message: '' }, cookie)).status, 400);

        // Mode produksi menolak rahasia bawaan
        const prod = spawn(process.execPath, ['server.js'], { env: { ...env, PORT: String(PORT + 100), NODE_ENV: 'production', SESSION_SECRET: '', ADMIN_PASSWORD: '' }, stdio: 'ignore' });
        const code = await new Promise(res => prod.on('exit', res));
        assert.strictEqual(code, 1);

        console.log('Semua uji integrasi HTTP BERHASIL');
    } catch (e) {
        console.error('Uji integrasi GAGAL:', e);
        process.exitCode = 1;
    } finally {
        child.kill();
    }
})();
