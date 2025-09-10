// api/webhook/[token].js
const TelegramBot = require('node-telegram-bot-api'); // Library baru

// Fungsi utama Serverless Vercel
export default async function handler(request, response) {
    // Pengecekan dasar, jika request bukan POST atau tidak ada body
    if (request.method !== 'POST' || !request.body) {
        return response.status(200).send('This is a webhook endpoint for a Telegram bot.');
    }

    try {
        const token = request.query.token;
        const bot = new TelegramBot(token);

        // Menangani perintah /start
        bot.onText(/\/start/, (msg) => {
            bot.sendMessage(msg.chat.id, 'Halo! Saya bot clone. Gunakan /waifu.');
        });
        
        // Menangani perintah /waifu
        bot.onText(/\/waifu/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const apiResponse = await fetch('https://api.waifu.pics/sfw/waifu');
                const data = await apiResponse.json();
                // Mengirim foto dengan library baru
                await bot.sendPhoto(chatId, data.url, { caption: 'Waifu untukmu! ✨' });
            } catch (error) {
                console.error("Gagal kirim /waifu:", error);
                await bot.sendMessage(chatId, 'Maaf, gagal mengambil gambar waifu.');
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