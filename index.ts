import dotenv from 'dotenv';
import express from 'express';
import bot, { registerCommands } from './services/bot';

dotenv.config();

const app = express();

app.use(express.json({
  limit: '1mb',
  verify: (req, res: express.Response, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).send('Invalid JSON');
      throw new Error('Invalid JSON');
    }
  }
}));
const PORT = process.env.PORT || 3000;

registerCommands();

app.post('/', (req, res) => {
  console.log("Received update:", JSON.stringify(req.body).substring(0, 200) + "...");
  try{
    bot.processUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error("Error processing update:", error);
    res.status(500).send('Error');
  }
});

app.get('/', (_req, res) => {
  res.send('🚀 Bubblemaps-telegram-bot');
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
