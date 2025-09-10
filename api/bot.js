// api/bot.js
require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const serverless = require("serverless-http");

// --- INISIALISASI ---
const app = express();
app.use(express.json()); // ✅ cukup ini aja, jangan raw-body

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const mainBotToken = process.env.BOT_TOKEN;
const vercelUrl = process.env.VERCEL_URL;

if (!mainBotToken || !vercelUrl) {
  console.error("BOT_TOKEN dan VERCEL_URL harus diatur!");
  process.exit(1);
}

const mainBot = new Telegraf(mainBotToken);

// =================================================================
// BAGIAN 1: LOGIKA UNTUK BOT CLONE
// =================================================================
function setupClonedBotLogic(botInstance) {
  botInstance.start((ctx) =>
    ctx.reply("Halo! Saya adalah bot clone. Gunakan /waifu untuk gambar.")
  );

  botInstance.command("waifu", async (ctx) => {
    try {
      const response = await fetch("https://api.waifu.pics/sfw/waifu");
      const data = await response.json();
      await ctx.replyWithPhoto(data.url, { caption: "Waifu untukmu! ✨" });
    } catch (error) {
      console.error(error);
      await ctx.reply("Maaf, gagal mengambil gambar waifu.");
    }
  });
}

// =================================================================
// BAGIAN 2: ENDPOINT UNTUK BOT CLONE
// =================================================================
app.post("/api/webhook/:token", async (req, res) => {
  const token = req.params.token;

  // ✅ balikin respon dulu biar gak timeout
  res.status(200).send("OK");

  try {
    const clonedBot = new Telegraf(token);
    setupClonedBotLogic(clonedBot);
    await clonedBot.handleUpdate(req.body);
  } catch (e) {
    console.error("Error di bot clone:", e);
  }
});

// =================================================================
// BAGIAN 3: REGISTER BOT BARU
// =================================================================
async function registerBot(owner_number, bot_token) {
  const { error: insertError } = await supabase
    .from("bots")
    .insert([{ owner_number, bot_token }]);

  if (insertError) {
    console.error("Error Supabase saat insert:", insertError);
    throw new Error("Gagal menyimpan bot. Mungkin token sudah terdaftar.");
  }

  const webhookUrl = `https://${vercelUrl}/api/webhook/${bot_token}`;
  const telegramApiUrl = `https://api.telegram.org/bot${bot_token}/setWebhook?url=${webhookUrl}`;

  const response = await fetch(telegramApiUrl);
  const result = await response.json();
  if (!result.ok) {
    console.error("Gagal mengatur webhook:", result);
    throw new Error(`Gagal mengatur webhook: ${result.description}`);
  }

  console.log(`Webhook berhasil diatur untuk token: ...${bot_token.slice(-6)}`);
}

// =================================================================
// BAGIAN 4: BOT UTAMA
// =================================================================
mainBot.command("jadibot", async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length !== 3) {
    return ctx.reply("Format salah. Gunakan: /jadibot <nomor_owner> <token_bot>");
  }

  const [, owner_number, bot_token] = args;

  try {
    await ctx.reply("Sedang memproses... menyimpan bot dan mengatur webhook.");
    await registerBot(owner_number, bot_token);
    await ctx.reply("✅ Sukses! Bot clone Anda sekarang sudah aktif.");
  } catch (e) {
    await ctx.reply(`❌ Gagal: ${e.message}`);
  }
});

mainBot.start((ctx) =>
  ctx.reply(
    "Halo, saya adalah bot utama. Gunakan /jadibot untuk mendaftarkan bot clone Anda."
  )
);

// Endpoint webhook bot utama
app.post(`/api/bot/${mainBotToken}`, (req, res) => {
  res.status(200).send("OK"); // ✅ balikin respon dulu
  mainBot.handleUpdate(req.body).catch((err) =>
    console.error("Error bot utama:", err)
  );
});

// =================================================================
// BAGIAN 5: ENDPOINT TAMBAHAN
// =================================================================
app.get("/api/ping", (req, res) => res.send("pong"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.post("/submit-bot", async (req, res) => {
  const { owner_number, bot_token } = req.body;
  try {
    await registerBot(owner_number, bot_token);
    res.send(
      "<h1>Sukses!</h1><p>Bot clone Anda berhasil disimpan dan diaktifkan. Anda sudah bisa mencobanya di Telegram.</p>"
    );
  } catch (e) {
    res
      .status(500)
      .send(`<h1>Gagal</h1><p>${e.message}</p>`);
  }
});

// =================================================================
// EXPORT UNTUK VERCEL
// =================================================================
module.exports = serverless(app);
