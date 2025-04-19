import dotenv from 'dotenv';
import express from 'express';
import TelegramBot, { Message } from 'node-telegram-bot-api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN as string;

// Initialize Telegram Bot with polling
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// --------------------
// Telegram Commands
// --------------------

// /start
bot.onText(/\/start/, (msg: Message) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `👋 Hello ${msg.from?.first_name || 'there'}! Welcome to the bot.`);
});

// /help
bot.onText(/\/help/, (msg: Message) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Here are the available commands:\n/start - Welcome\n/help - Commands\n/echo [text] - Echo`);
});

// /echo
bot.onText(/\/echo (.+)/, (msg: Message, match: RegExpExecArray | null) => {
  const chatId = msg.chat.id;
  const resp = match?.[1];
  bot.sendMessage(chatId, resp || 'Nothing to echo!');
});

// /time
bot.onText(/\/time/, (msg: Message) => {
  const chatId = msg.chat.id;
  const now = new Date().toLocaleString();
  bot.sendMessage(chatId, `⏰ Current time: ${now}`);
});

// Fallback for non-command text messages
bot.on('message', (msg: Message) => {
  const chatId = msg.chat.id;

  if (!msg.text?.startsWith('/')) {
    bot.sendMessage(chatId, `🤖 I received: "${msg.text}". Type /help for options.`);
  }
});

// --------------------
// Express Setup
// --------------------
app.get('/', (_req, res) => {
  res.send('🚀 Bubblemaps-telegram-bot');
});

app.listen(PORT, () => {
  console.log(`✅ Server is listening at http://localhost:${PORT}`);
});
