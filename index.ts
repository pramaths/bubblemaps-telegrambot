import dotenv from 'dotenv';
import express from 'express';
import bot, { registerCommands } from './services/bot';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

registerCommands();

app.post('/', (req, res) => {
  console.log("Received update:", req.body);
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
