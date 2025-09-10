// api/bot/[token].js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api'); // Library baru
const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Klien Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const vercelUrl = process.env.VERCEL_URL;

// Fungsi untuk mendaftarkan bot (tidak berubah)
async function registerBot(owner_number, bot_token) {
    await supabase.from('bots').insert([{ owner_number, bot_token }]);
    const webhookUrl = `https://${vercelUrl}/api/webhook/${bot_token}`;
    const telegramApiUrl = `https://api.telegram.org/bot${bot_token}/setWebhook?url=${webhookUrl}`;
    const response = await fetch(telegramApiUrl);
    const result = await response.json();
    if (!result.ok) {
        throw new Error(`Gagal mengatur webhook: ${result.description}`);
    }
}

// Fungsi utama Serverless Vercel
export default async function handler(request, response) {
    // Keamanan: Pastikan hanya token bot utama yang bisa menggunakan endpoint ini
    if (request.query.token !== process.env.BOT_TOKEN) {
        return response.status(401).send('Unauthorized');
    }

    try {
        const bot = new TelegramBot(process.env.BOT_TOKEN);

        // Menangani perintah /start
        bot.onText(/\/start/, (msg) => {
            bot.sendMessage(msg.chat.id, 'Halo, saya bot utama. Gunakan /jadibot <owner> <token>.');
        });

        // Menangani perintah /jadibot dengan argumen
        bot.onText(/\/jadibot (.+) (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const owner_number = match[1]; // Argumen pertama
            const bot_token = match[2];    // Argumen kedua

            try {
                await bot.sendMessage(chatId, 'Memproses...');
                await registerBot(owner_number, bot_token);
                await bot.sendMessage(chatId, '✅ Sukses! Bot clone Anda sekarang aktif.');
            } catch (e) {
                await bot.sendMessage(chatId, `❌ Gagal: ${e.message}`);
            }
        });

        // Memproses update dari webhook
        bot.processUpdate(request.body);
        response.status(200).send('OK');

    } catch (error) {
        console.error(error);
        response.status(500).send('Internal Server Error');
    }
}