// api/bot/[token].js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const vercelUrl = process.env.VERCEL_URL;

async function registerBot(owner_number, bot_token) {
    // Simpan ke Supabase
    const { error: insertError } = await supabase
        .from('bots')
        .insert([{ owner_number, bot_token }]);

    if (insertError) {
        console.error('Error Supabase saat insert:', insertError);
        throw new Error('Gagal menyimpan bot. Token mungkin sudah terdaftar.');
    }

    // Atur Webhook di Telegram
    const webhookUrl = `https://${vercelUrl}/api/webhook/${bot_token}`;
    const telegramApiUrl = `https://api.telegram.org/bot${bot_token}/setWebhook?url=${webhookUrl}`;

    const response = await fetch(telegramApiUrl);
    const result = await response.json();

    if (!result.ok) {
        console.error('Gagal mengatur webhook:', result);
        throw new Error(`Gagal mengatur webhook: ${result.description}`);
    }
}

export default async function handler(request, response) {
    // Pastikan hanya token bot utama yang bisa menggunakan endpoint ini
    if (request.query.token !== process.env.BOT_TOKEN) {
        return response.status(401).send('Unauthorized');
    }

    const bot = new Telegraf(process.env.BOT_TOKEN);

    bot.start((ctx) => ctx.reply('Halo, saya bot utama. Gunakan /jadibot.'));
    bot.command('jadibot', async (ctx) => {
        const args = ctx.message.text.split(' ');
        if (args.length !== 3) {
            return ctx.reply('Format salah: /jadibot <owner_number> <bot_token>');
        }
        const [, owner_number, bot_token] = args;

        try {
            await ctx.reply('Memproses...');
            await registerBot(owner_number, bot_token);
            await ctx.reply('✅ Sukses! Bot clone Anda sekarang aktif.');
        } catch (e) {
            await ctx.reply(`❌ Gagal: ${e.message}`);
        }
    });

    try {
        await bot.handleUpdate(request.body);
    } catch (err) {
        console.error(err);
    }

    response.status(200).send('OK');
}