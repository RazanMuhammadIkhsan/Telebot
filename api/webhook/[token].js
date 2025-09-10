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
    const token = request.query.token;
    const bot = new Telegraf(token);

    setupClonedBotLogic(bot);

    try {
        await bot.handleUpdate(request.body);
    } catch (err) {
        console.error(err);
    }

    response.status(200).send('OK');
}