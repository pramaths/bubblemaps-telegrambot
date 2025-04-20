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
