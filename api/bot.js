// api/bot.js
require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// --- INISIALISASI ---
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const PORT = process.env.PORT || 3000;

// Middleware untuk parsing body dari form dan JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- LOGIKA PERINTAH BOT ---

// Perintah /start
bot.start((ctx) => ctx.reply('Halo! Saya bot waifu. Gunakan /waifu untuk gacha atau /jadibot untuk mendaftarkan bot.'));

// Perintah /waifu (Gacha)
bot.command('waifu', async (ctx) => {
  try {
    const response = await fetch('https://api.waifu.pics/sfw/waifu');
    const data = await response.json();
    await ctx.replyWithPhoto(data.url, { caption: 'Ini waifu untukmu! ✨' });
  } catch (error) {
    console.error(error);
    await ctx.reply('Maaf, gagal mengambil gambar waifu.');
  }
});

// Perintah /jadibot (via Telegram)
bot.command('jadibot', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
        return ctx.reply('Format salah. Gunakan: /jadibot <nomor_owner> <token_bot>');
    }

    const [, owner_number, bot_token] = args;

    // Simpan ke Supabase
    const { error } = await supabase.from('bots').insert([{ owner_number, bot_token }]);

    if (error) {
        console.error('Error Supabase:', error);
        return ctx.reply('Gagal menyimpan bot. Mungkin token sudah terdaftar.');
    }

    await ctx.reply('Bot berhasil disimpan via Telegram!');
});

// --- PENGATURAN WEB SERVER (EXPRESS) ---

// 1. Endpoint untuk Webhook Telegram
// Telegram akan mengirim update ke URL ini
app.use(bot.webhookCallback('/api/bot'));

// 2. Endpoint untuk menyajikan halaman HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 3. Endpoint untuk menerima data dari form web
app.post('/submit-bot', async (req, res) => {
    const { owner_number, bot_token } = req.body;

    const { error } = await supabase.from('bots').insert([{ owner_number, bot_token }]);

    if (error) {
        console.error('Error Supabase:', error);
        return res.status(500).send('Gagal menyimpan bot. Token mungkin sudah ada.');
    }

    res.send('<h1>Sukses!</h1><p>Bot Anda telah disimpan dan akan segera aktif. Anda bisa menutup halaman ini.</p>');
});

// Jalankan server (hanya untuk tes lokal)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

// Ekspor app untuk Vercel
module.exports = app;