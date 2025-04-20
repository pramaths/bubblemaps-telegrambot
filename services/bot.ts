import TelegramBot, { Message } from 'node-telegram-bot-api';
import { getMapAvailability, getMapData, getMapIframeUrl, getMapMetadata, MapNode } from './bubblemapsService';
import axios from 'axios';

const bot = new TelegramBot(process.env.BOT_TOKEN as string);


export function registerCommands() {
    
    bot.onText(/\/start/, (msg: Message) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `👋 Hello ${msg.from?.first_name || 'there'}! Welcome to the Bubblemaps Telegram Bot.
    
    Type /help to see available commands.`);
    });

    // /help
    bot.onText(/\/help/, (msg: Message) => {
        const chatId = msg.chat.id;
        console.log(`[LOG] Help command requested by user ${msg.from?.id} (${msg.from?.username || 'unknown'})`);
        console.log(`[LOG] Chat ID: ${chatId}`);
        bot.sendMessage(chatId, `Here are the available commands:

    🔹 Basic Commands:
    /start - Welcome message
    /help - Show this help message
    /echo [text] - Echo back your text
    /time - Show current time

    🔹 Bubblemaps Commands:
    /map [chain] [token] - Get basic token info and map link
    Example: /map bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95
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
    bot.onText(/\/map(?:\s+(\w+)\s+(0x[a-fA-F0-9]+))?/, async (msg: Message, match: RegExpExecArray | null) => {
        const chatId = msg.chat.id;
        console.log(`[LOG] Map command requested by user ${msg.from?.id} (${msg.from?.username || 'unknown'})`);

        if (!match || match.length < 3 || !match[1] || !match[2]) {
            console.log(`[LOG] Invalid map command parameters`);
            bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /map bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
            return;
        }

        const chain = match[1].toLowerCase();
        const token = match[2];
        console.log(`[LOG] Fetching map for chain: ${chain}, token: ${token}`);

        // Send initial loading message and store the message object
        const loadingMessage = await bot.sendMessage(chatId, `🔍 Fetching map data for ${token} on ${chain}...`);
        
        // Start loading animation
        const loadingAnimationFrames = ['⏳', '⌛️', '⏳', '⌛️'];
        let frameIndex = 0;
        const loadingInterval = setInterval(async () => {
            try {
                await bot.editMessageText(
                    `🔍 Fetching map data for ${token} on ${chain}... ${loadingAnimationFrames[frameIndex]}`,
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id
                    }
                );
                frameIndex = (frameIndex + 1) % loadingAnimationFrames.length;
            } catch (error) {
                // Ignore errors during animation (e.g., if the message was already deleted)
                console.log("Animation update error:", error);
            }
        }, 800);

        try {
            // Check map availability
            const availability = await getMapAvailability(chain, token);

            if (availability.status !== 'OK' || !availability.availability) {
                clearInterval(loadingInterval);
                bot.editMessageText(
                    `❌ Map not available for this token. ${availability.message || ''}`,
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id
                    }
                );
                return;
            }

            // Get map data
            const mapData = await getMapData(chain, token);

            // Clear the loading animation
            clearInterval(loadingInterval);

            if ('message' in mapData && mapData.message) {
                bot.editMessageText(
                    `❌ Error: ${mapData.message}`,
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id
                    }
                );
                return;
            }

            const mapUrl = getMapIframeUrl(chain, token);

            const message = `🔵 *${mapData.full_name} (${mapData.symbol})*

    *Token Address:* \`${token}\`
    *Chain:* ${chain.toUpperCase()}
    *Last Updated:* ${new Date(mapData.dt_update).toLocaleString()}

    *View the interactive bubble map:*
    ${mapUrl}`;

            bot.editMessageText(message, { 
                chat_id: chatId,
                message_id: loadingMessage.message_id,
                parse_mode: 'Markdown' 
            });
        } catch (error) {
            // Clear the loading animation
            clearInterval(loadingInterval);
            console.error('Error in /map command:', error);
            bot.editMessageText(
                '❌ An error occurred while fetching the map data. Please try again later.',
                {
                    chat_id: chatId,
                    message_id: loadingMessage.message_id
                }
            );
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

        // Send initial loading message and store the message object
        const loadingMessage = await bot.sendMessage(chatId, `🔍 Fetching decentralization score for ${token} on ${chain}...`);
        
        // Start loading animation with different emoji set
        const loadingAnimationFrames = ['🔍', '🔎', '🔍', '🔎'];
        let frameIndex = 0;
        const loadingInterval = setInterval(async () => {
            try {
                await bot.editMessageText(
                    `Analyzing token ${token} on ${chain}... ${loadingAnimationFrames[frameIndex]}`,
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id
                    }
                );
                frameIndex = (frameIndex + 1) % loadingAnimationFrames.length;
            } catch (error) {
                // Ignore errors during animation
                console.log("Animation update error:", error);
            }
        }, 800);

        try {
            const metadata = await getMapMetadata(chain, token);

            if (metadata.status !== 'OK') {
                clearInterval(loadingInterval);
                bot.editMessageText(
                    `❌ Error: ${metadata.message || 'Failed to fetch metadata'}`,
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id
                    }
                );
                return;
            }

            // Get token data for additional info
            const mapData = await getMapData(chain, token);

            // Clear the loading animation
            clearInterval(loadingInterval);

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

            bot.editMessageText(message, { 
                chat_id: chatId,
                message_id: loadingMessage.message_id,
                parse_mode: 'Markdown' 
            });
        } catch (error) {
            // Clear the loading animation
            clearInterval(loadingInterval);
            console.error('Error in /score command:', error);
            bot.editMessageText(
                '❌ An error occurred while fetching the score data. Please try again later.',
                {
                    chat_id: chatId,
                    message_id: loadingMessage.message_id
                }
            );
        }
    });

    // /screenshot [chain] [token]
    bot.onText(/\/screenshot\s+(\w+)\s+(0x[a-fA-F0-9]+)/, async (msg: Message, match: RegExpExecArray | null) => {
        const chatId = msg.chat.id;
        console.log(`[LOG] Screenshot command requested by user ${msg.from?.id} (${msg.from?.username || 'unknown'})`);

        if (!match || match.length < 3) {
            console.log(`[LOG] Invalid screenshot command parameters`);
            bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /screenshot bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
            return;
        }

        const chain = match[1].toLowerCase();
        const token = match[2];
        console.log(`[LOG] Generating screenshot for chain: ${chain}, token: ${token}`);

        // Send initial loading message and store the message object
        const loadingMessage = await bot.sendMessage(chatId, `📸 Generating screenshot for ${token} on ${chain}. This may take a moment...`);
        
        // Start loading animation with camera emoji
        const loadingAnimationFrames = ['📷', '📸', '📷', '📸'];
        let frameIndex = 0;
        const loadingInterval = setInterval(async () => {
            try {
                await bot.editMessageText(
                    `Generating screenshot for ${token} on ${chain}... ${loadingAnimationFrames[frameIndex]}`,
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id
                    }
                );
                frameIndex = (frameIndex + 1) % loadingAnimationFrames.length;
            } catch (error) {
                // Ignore errors during animation
                console.log("Animation update error:", error);
            }
        }, 800);

        try {
            const response = await axios.post(
                `${process.env.SCREENSHOT_SERVICE_URL}/api/screenshot`,
                { chain, token },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer', // receive raw image data
                }
            );

            // Clear the loading animation
            clearInterval(loadingInterval);
            
            // Delete the loading message since we'll send a new photo
            await bot.deleteMessage(chatId, loadingMessage.message_id);

            if (response.status !== 200 || !response.data) {
                bot.sendMessage(chatId, '❌ Failed to generate screenshot. The map might not be available.');
                return;
            }

            // Create a buffer from the response data
            const screenshotBuffer = Buffer.from(response.data);

            // Fetch token data for caption
            const mapData = await getMapData(chain, token);
            const metadata = await getMapMetadata(chain, token);

            const caption = `🔵 *${mapData.full_name} (${mapData.symbol})*
    *Chain:* ${chain.toUpperCase()}
    *Decentralization Score:* ${metadata.decentralisation_score || 'N/A'}/100
    *Token Address:* \`${token}\``;

            // Send the photo using Telegram's file options
            await bot.sendPhoto(chatId, screenshotBuffer, {
                caption,
                parse_mode: 'Markdown',
            });

        } catch (error) {
            // Clear the loading animation
            clearInterval(loadingInterval);
            console.error('Error in /screenshot command:', error);
            bot.editMessageText(
                '❌ An error occurred while generating the screenshot. Please try again later.',
                {
                    chat_id: chatId,
                    message_id: loadingMessage.message_id
                }
            );
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

        // Send initial loading message and store the message object
        const loadingMessage = await bot.sendMessage(chatId, `🔍 Fetching top holders for ${token} on ${chain}...`);
        
        // Start loading animation
        const loadingAnimationFrames = ['👥', '👤', '👥', '👤'];
        let frameIndex = 0;
        const loadingInterval = setInterval(async () => {
            try {
                await bot.editMessageText(
                    `Analyzing holders for ${token} on ${chain}... ${loadingAnimationFrames[frameIndex]}`,
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id
                    }
                );
                frameIndex = (frameIndex + 1) % loadingAnimationFrames.length;
            } catch (error) {
                // Ignore errors during animation
                console.log("Animation update error:", error);
            }
        }, 800);

        try {
            const mapData = await getMapData(chain, token);

            // Clear the loading animation
            clearInterval(loadingInterval);

            if ('message' in mapData && mapData.message) {
                bot.editMessageText(
                    `❌ Error: ${mapData.message}`,
                    {
                        chat_id: chatId,
                        message_id: loadingMessage.message_id
                    }
                );
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

            bot.editMessageText(holdersText, { 
                chat_id: chatId,
                message_id: loadingMessage.message_id,
                parse_mode: 'Markdown' 
            });
        } catch (error) {
            // Clear the loading animation
            clearInterval(loadingInterval);
            console.error('Error in /holders command:', error);
            bot.editMessageText(
                '❌ An error occurred while fetching the holders data. Please try again later.',
                {
                    chat_id: chatId,
                    message_id: loadingMessage.message_id
                }
            );
        }
    });

    // Fallback for non-command text messages
    bot.on('message', (msg: Message) => {
        const chatId = msg.chat.id;

        if (!msg.text?.startsWith('/')) {
            bot.sendMessage(chatId, `🤖 I received: "${msg.text}". Type /help for options.`);
        }
    });

}

export default bot;