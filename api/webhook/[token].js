const { Telegraf } = require("telegraf");

function setupClonedBotLogic(bot) {
  bot.start((ctx) => ctx.reply("Halo! Saya bot clone"));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { token } = req.query;
  const bot = new Telegraf(token);
  setupClonedBotLogic(bot);

  try {
    await bot.handleUpdate(req.body);
    res.status(200).send("OK");
  } catch (e) {
    console.error(e);
    res.status(500).send("Error");
  }
};
