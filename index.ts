import dotenv from 'dotenv';
import express from 'express';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { 
  getMapMetadata, 
  getMapAvailability, 
  getMapData, 
  getMapIframeUrl,
  MapNode
} from './services/bubblemapsService';
import { generateMapScreenshot } from './services/screenshotService';

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
  bot.sendMessage(chatId, `👋 Hello ${msg.from?.first_name || 'there'}! Welcome to the Bubblemaps Telegram Bot.
  
Type /help to see available commands.`);
});

// /help
bot.onText(/\/help/, (msg: Message) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Here are the available commands:

🔹 Basic Commands:
/start - Welcome message
/help - Show this help message
/echo [text] - Echo back your text
/time - Show current time

🔹 Bubblemaps Commands:
/map [chain] [token] - Get basic token info and map link
/score [chain] [token] - Get token decentralization score
/screenshot [chain] [token] - Get a screenshot of the bubble map
/holders [chain] [token] - Get top token holders

Available chains: eth, bsc, ftm, avax, cro, arbi, poly, base, sol, sonic`);
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

// /map [chain] [token]
bot.onText(/\/map\s+(\w+)\s+(0x[a-fA-F0-9]+)/, async (msg: Message, match: RegExpExecArray | null) => {
  const chatId = msg.chat.id;
  
  if (!match || match.length < 3) {
    bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /map bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
    return;
  }
  
  const chain = match[1].toLowerCase();
  const token = match[2];
  
  bot.sendMessage(chatId, `🔍 Fetching map data for ${token} on ${chain}...`);
  
  try {
    // Check map availability
    const availability = await getMapAvailability(chain, token);
    
    if (availability.status !== 'OK' || !availability.availability) {
      bot.sendMessage(chatId, `❌ Map not available for this token. ${availability.message || ''}`);
      return;
    }
    
    // Get map data
    const mapData = await getMapData(chain, token);
    
    if ('message' in mapData && mapData.message) {
      bot.sendMessage(chatId, `❌ Error: ${mapData.message}`);
      return;
    }
    
    const mapUrl = getMapIframeUrl(chain, token);
    
    const message = `🔵 *${mapData.full_name} (${mapData.symbol})*

*Token Address:* \`${token}\`
*Chain:* ${chain.toUpperCase()}
*Last Updated:* ${new Date(mapData.dt_update).toLocaleString()}

*View the interactive bubble map:*
${mapUrl}`;
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /map command:', error);
    bot.sendMessage(chatId, '❌ An error occurred while fetching the map data. Please try again later.');
  }
});

// /score [chain] [token]
bot.onText(/\/score\s+(\w+)\s+(0x[a-fA-F0-9]+)/, async (msg: Message, match: RegExpExecArray | null) => {
  const chatId = msg.chat.id;
  
  if (!match || match.length < 3) {
    bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /score bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
    return;
  }
  
  const chain = match[1].toLowerCase();
  const token = match[2];
  
  bot.sendMessage(chatId, `🔍 Fetching decentralization score for ${token} on ${chain}...`);
  
  try {
    const metadata = await getMapMetadata(chain, token);
    
    if (metadata.status !== 'OK') {
      bot.sendMessage(chatId, `❌ Error: ${metadata.message || 'Failed to fetch metadata'}`);
      return;
    }
    
    // Get token data for additional info
    const mapData = await getMapData(chain, token);
    
    let scoreEmoji = '🟢';
    if (metadata.decentralisation_score && metadata.decentralisation_score < 50) {
      scoreEmoji = '🔴';
    } else if (metadata.decentralisation_score && metadata.decentralisation_score < 70) {
      scoreEmoji = '🟠';
    }
    
    const message = `${scoreEmoji} *Decentralization Score for ${mapData.full_name} (${mapData.symbol})*

*Score:* ${metadata.decentralisation_score || 'N/A'}/100
*Supply in CEXs:* ${metadata.identified_supply?.percent_in_cexs || 'N/A'}%
*Supply in Contracts:* ${metadata.identified_supply?.percent_in_contracts || 'N/A'}%
*Last Updated:* ${new Date(metadata.dt_update || '').toLocaleString()}

*Token Address:* \`${token}\`
*Chain:* ${chain.toUpperCase()}`;
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /score command:', error);
    bot.sendMessage(chatId, '❌ An error occurred while fetching the score data. Please try again later.');
  }
});

// /screenshot [chain] [token]
bot.onText(/\/screenshot\s+(\w+)\s+(0x[a-fA-F0-9]+)/, async (msg: Message, match: RegExpExecArray | null) => {
  const chatId = msg.chat.id;
  
  if (!match || match.length < 3) {
    bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /screenshot bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
    return;
  }
  
  const chain = match[1].toLowerCase();
  const token = match[2];
  
  bot.sendMessage(chatId, `📸 Generating screenshot for ${token} on ${chain}. This may take a moment...`);
  
  try {
    const screenshot = await generateMapScreenshot(chain, token);
    
    if (!screenshot) {
      bot.sendMessage(chatId, '❌ Failed to generate screenshot. The map might not be available.');
      return;
    }
    
    // Get token data for caption
    const mapData = await getMapData(chain, token);
    const metadata = await getMapMetadata(chain, token);
    
    const caption = `🔵 *${mapData.full_name} (${mapData.symbol})*
*Chain:* ${chain.toUpperCase()}
*Decentralization Score:* ${metadata.decentralisation_score || 'N/A'}/100
*Token Address:* \`${token}\``;
    
    await bot.sendPhoto(chatId, screenshot, {
      caption: caption,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Error in /screenshot command:', error);
    bot.sendMessage(chatId, '❌ An error occurred while generating the screenshot. Please try again later.');
  }
});

// /holders [chain] [token]
bot.onText(/\/holders\s+(\w+)\s+(0x[a-fA-F0-9]+)/, async (msg: Message, match: RegExpExecArray | null) => {
  const chatId = msg.chat.id;
  
  if (!match || match.length < 3) {
    bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /holders bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
    return;
  }
  
  const chain = match[1].toLowerCase();
  const token = match[2];
  
  bot.sendMessage(chatId, `🔍 Fetching top holders for ${token} on ${chain}...`);
  
  try {
    const mapData = await getMapData(chain, token);
    
    if ('message' in mapData && mapData.message) {
      bot.sendMessage(chatId, `❌ Error: ${mapData.message}`);
      return;
    }
    
    // Get top 10 holders
    const topHolders = mapData.nodes.slice(0, 10);
    
    let holdersText = `👥 *Top Holders of ${mapData.full_name} (${mapData.symbol})*\n\n`;
    
    topHolders.forEach((holder: MapNode, index: number) => {
      const name = holder.name || holder.address;
      holdersText += `${index + 1}. ${name.substring(0, 20)}${name.length > 20 ? '...' : ''}\n`;
      holdersText += `   *Percentage:* ${holder.percentage.toFixed(2)}%\n`;
      holdersText += `   *Amount:* ${holder.amount.toLocaleString()}\n`;
      holdersText += `   *Type:* ${holder.is_contract ? 'Contract' : 'Wallet'}\n\n`;
    });
    
    holdersText += `\n*Total Holders Analyzed:* ${mapData.nodes.length}`;
    
    bot.sendMessage(chatId, holdersText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /holders command:', error);
    bot.sendMessage(chatId, '❌ An error occurred while fetching the holders data. Please try again later.');
  }
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
