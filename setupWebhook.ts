// setupWebhook.ts
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN!, { webHook: false });

bot.setWebHook(`${process.env.VERCEL_URL}/`).then(() => {
  console.log('✅ Webhook set successfully!');
});
