// api/webhook/[token].js
const { Telegraf } = require('telegraf');

function setupClonedBotLogic(botInstance) {
    botInstance.start(async (ctx) => {
        console.log(`[CLONE DEBUG] Perintah /start diterima dari user: ${ctx.from.id}`);
        try {
            await ctx.reply('Halo! Saya bot clone. Gunakan /waifu.');
            console.log(`[CLONE DEBUG] Balasan /start berhasil dikirim.`);
        } catch (error) {
            console.error('[CLONE ERROR] GAGAL MENGIRIM BALASAN /start:', error);
        }
    });

    botInstance.command('waifu', async (ctx) => {
        console.log(`[CLONE DEBUG] Perintah /waifu diterima dari user: ${ctx.from.id}`);
        try {
            const response = await fetch('https://api.waifu.pics/sfw/waifu');
            const data = await response.json();
            await ctx.replyWithPhoto(data.url, { caption: 'Waifu untukmu! ✨' });
            console.log(`[CLONE DEBUG] Balasan /waifu berhasil dikirim.`);
        } catch (error) {
            console.error('[CLONE ERROR] GAGAL MENGIRIM BALASAN /waifu:', error);
            try {
                // Jika kirim foto gagal, coba kirim pesan teks error
                await ctx.reply('Maaf, terjadi kesalahan saat mencari waifu.');
            } catch (replyError) {
                console.error('[CLONE ERROR] Bahkan gagal mengirim pesan error teks:', replyError);
            }
        }
    });
}

export default async function handler(request, response) {
    if (request.method !== 'POST' || !request.body) {
        return response.status(200).send('This is a webhook endpoint for a Telegram bot.');
    }

    const token = request.query.token;
    console.log(`[CLONE DEBUG] Menerima request untuk token: ...${token.slice(-6)}`);
    const bot = new Telegraf(token);
    
    setupClonedBotLogic(bot);
    
    try {
        await bot.handleUpdate(request.body);
    } catch (err) {
        // Ini jarang terjadi, tapi untuk jaga-jaga
        console.error('[CLONE FATAL ERROR] Error di handleUpdate:', err);
    }
    
    response.status(200).send('OK');
}