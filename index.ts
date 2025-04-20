import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import express from 'express';
import bot, { registerCommands } from './services/bot';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

registerCommands();

app.post('/', (req: VercelRequest, res: VercelResponse) => {
  bot.processUpdate(req.body);
  res.status(200).send('OK');
});

export default app;

app.use(express.json());

// Set up webhook endpoint
app.post(`/webhook/${BOT_TOKEN}`, (req, res) => {
  const update = req.body;
  bot.processUpdate(update);
  res.sendStatus(200);
});

app.get("/", (_req, res) => {
  res.send("🚀 Bubblemaps-telegram-bot");
});

// Add a route to set up the webhook
app.get("/setup-webhook", async (_req, res) => {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || "";
    if (!webhookUrl) {
      return res.status(400).send("WEBHOOK_URL environment variable is not set");
    }
    
    const result = await bot.setWebHook(`${webhookUrl}/webhook/${BOT_TOKEN}`);
    res.send(`Webhook setup result: ${result}`);
  } catch (error) {
    console.error("Error setting up webhook:", error);
    res.status(500).send("Failed to set up webhook");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is listening at http://localhost:${PORT}`);
});
