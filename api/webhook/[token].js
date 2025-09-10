// api/webhook/[token].js
const { Telegraf } = require('telegraf');

function setupClonedBotLogic(botInstance) {
    botInstance.start((ctx) => ctx.reply('Halo! Saya bot clone. Gunakan /waifu.'));
    botInstance.command('waifu', async (ctx) => {
        try {
            const response = await fetch('https://api.waifu.pics/sfw/waifu');
            const data = await response.json();
            await ctx.replyWithPhoto(data.url, { caption: 'Waifu untukmu! ✨' });
        } catch (error) {
            await ctx.reply('Maaf, gagal mengambil gambar waifu.');
        }
    });
}

export default async function handler(request, response) {
    // TAMBAHAN: Cek apakah ini request POST dan ada body-nya
    if (request.method !== 'POST' || !request.body) {
        // Jika bukan, kirim pesan ramah dan berhenti.
        return response.status(200).send('This is a webhook endpoint for a Telegram bot.');
    }

    const token = request.query.token;
    const bot = new Telegraf(token);
    
    setupClonedBotLogic(bot);
    
    try {
        // Kode ini sekarang hanya akan berjalan jika request-nya valid dari Telegram
        await bot.handleUpdate(request.body);
    } catch (err) {
        console.error(err);
    }
    
    response.status(200).send('OK');
}