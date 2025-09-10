// api/bot.js
require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// --- INISIALISASI ---
const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Ambil token bot utama dan URL Vercel dari environment variables
const mainBotToken = process.env.BOT_TOKEN;
const vercelUrl = process.env.VERCEL_URL;

if (!mainBotToken || !vercelUrl) {
  console.error("BOT_TOKEN dan VERCEL_URL harus diatur!");
  process.exit(1);
}

const mainBot = new Telegraf(mainBotToken);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// =================================================================
// BAGIAN 1: LOGIKA UNTUK BOT CLONE (YANG AKAN DIGUNAKAN BERULANG)
// =================================================================
// Kita buat fungsi ini agar logika bot clone bisa dipanggil kapan saja.
function setupClonedBotLogic(botInstance) {
    botInstance.start((ctx) => ctx.reply('Halo! Saya adalah bot clone. Gunakan /waifu untuk gambar.'));
    
    botInstance.command('waifu', async (ctx) => {
        try {
            const response = await fetch('https://api.waifu.pics/sfw/waifu');
            const data = await response.json();
            await ctx.replyWithPhoto(data.url, { caption: 'Waifu untukmu! ✨' });
        } catch (error) {
            console.error(error);
            await ctx.reply('Maaf, gagal mengambil gambar waifu.');
        }
    });

    // Tambahkan perintah lain untuk bot clone di sini jika perlu
}


// =================================================================
// BAGIAN 2: ENDPOINT UNTUK MENERIMA PESAN DARI SEMUA BOT CLONE
// =================================================================
// Ini adalah endpoint "Manajer" kita. Semua bot clone akan mengirim pesan ke sini.
app.post('/api/webhook/:token', async (req, res) => {
    const token = req.params.token;

    // Keamanan: Cek apakah token ada di database kita sebelum memproses
    const { data, error } = await supabase
        .from('bots')
        .select('bot_token')
        .eq('bot_token', token)
        .single();

    if (error || !data) {
        console.warn(`Menerima request untuk token tidak dikenal: ${token}`);
        return res.status(401).send('Token tidak sah');
    }

    // Buat instance bot on-the-fly (saat itu juga) menggunakan token dari URL
    const clonedBot = new Telegraf(token);
    setupClonedBotLogic(clonedBot); // Terapkan logika yang sama untuk semua bot clone

    // Proses update dari Telegram
    await clonedBot.handleUpdate(req.body);

    // Kirim respons OK ke Telegram
    res.status(200).send('OK');
});


// =================================================================
// BAGIAN 3: FUNGSI UNTUK MENGATUR WEBHOOK BOT BARU
// =================================================================
async function registerBot(owner_number, bot_token) {
    // 1. Simpan ke Supabase
    const { data: insertData, error: insertError } = await supabase
        .from('bots')
        .insert([{ owner_number, bot_token }])
        .select();

    if (insertError) {
        console.error('Error Supabase saat insert:', insertError);
        throw new Error('Gagal menyimpan bot. Mungkin token sudah terdaftar.');
    }

    // 2. Atur Webhook di Telegram
    const webhookUrl = `https://${vercelUrl}/api/webhook/${bot_token}`;
    const telegramApiUrl = `https://api.telegram.org/bot${bot_token}/setWebhook?url=${webhookUrl}`;

    try {
        const response = await fetch(telegramApiUrl);
        const result = await response.json();
        if (!result.ok) {
            console.error('Gagal mengatur webhook:', result);
            throw new Error(`Gagal mengatur webhook: ${result.description}`);
        }
        console.log(`Webhook berhasil diatur untuk token: ...${bot_token.slice(-6)}`);
    } catch (fetchError) {
        console.error('Error saat fetch ke Telegram API:', fetchError);
        throw new Error('Gagal menghubungi API Telegram untuk mengatur webhook.');
    }
}


// =================================================================
// BAGIAN 4: BOT UTAMA & FORM WEB (UNTUK MENDAFTARKAN BOT BARU)
// =================================================================

// Logika untuk perintah /jadibot di bot utama
mainBot.command('jadibot', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('Format salah. Gunakan: /jadibot <nomor_owner> <token_bot>');
    }
    const [, owner_number, bot_token] = args;

    try {
        await ctx.reply('Sedang memproses... menyimpan bot dan mengatur webhook.');
        await registerBot(owner_number, bot_token);
        await ctx.reply('✅ Sukses! Bot clone Anda sekarang sudah aktif.');
    } catch (e) {
        await ctx.reply(`❌ Gagal: ${e.message}`);
    }
});
mainBot.start((ctx) => ctx.reply('Halo, saya adalah bot utama. Gunakan /jadibot untuk mendaftarkan bot clone Anda.'));

// Endpoint untuk webhook bot utama
app.post(`/api/bot/${mainBotToken}`, (req, res) => {
    mainBot.handleUpdate(req.body, res);
});

// Endpoint untuk form web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Endpoint untuk menerima data dari form web
app.post('/submit-bot', async (req, res) => {
    const { owner_number, bot_token } = req.body;
    try {
        await registerBot(owner_number, bot_token);
        res.send('<h1>Sukses!</h1><p>Bot clone Anda berhasil disimpan dan diaktifkan. Anda sudah bisa mencobanya di Telegram.</p>');
    } catch (e) {
        res.status(500).send(`<h1>Gagal</h1><p>${e.message}</p>`);
    }
});


// Ekspor app untuk Vercel
module.exports = app;