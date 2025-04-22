import TelegramBot, { Message } from 'node-telegram-bot-api';
import { getMapAvailability, getMapData, getMapIframeUrl, getMapMetadata, MapNode } from './bubblemapsService';
import { generateMapScreenshot } from './screenshotService';
import { analyzeToken } from './geminiService';
import dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN as string, { polling: false });

export function registerCommands() {

    bot.onText(/\/start/, (msg: Message) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `👋 Hello ${msg.from?.first_name || 'there'}! Welcome to the Bubblemaps Telegram Bot 🤖.\n\nType /help to see available commands.`);
    });

    // /help
    bot.onText(/\/help/, (msg: Message) => {
        const chatId = msg.chat.id;
        console.log(`[LOG] Help command requested by user ${msg.from?.id} (${msg.from?.username || 'unknown'})`);
        console.log(`[LOG] Chat ID: ${chatId}`);
        bot.sendMessage(chatId, `Here are the available commands:

<b>🔹 Basic Commands:</b>
/start - <i>Welcome message</i>
/help - <i>Show this help message</i>
/echo [text] - <i>Echo back your text</i>
/time - <i>Show current time</i>

<b>🔹 Bubblemaps Commands:</b>
/analytics [chain] [token] - <i>Get basic token info,decentralisation score,top holders info and map link</i>
/screenshot [chain] [token] - <i>Get a screenshot of the bubble map</i>

<b>Example command:</b>
/analytics bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95

Available chains: <i>eth, bsc, ftm, avax, cro, arbi, poly, base, sol, sonic</i>`, { parse_mode: 'HTML' });
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

    bot.onText(/\/analytics\s+(\w+)\s+(0x[a-fA-F0-9]+)/, async (msg: Message, match: RegExpExecArray | null) => {
        const chatId = msg.chat.id;
        const username = msg.from?.username || 'unknown';
        const userId = msg.from?.id;

        console.log(`[LOG] /map command by user ${userId} (${username})`);

        if (!match || match.length < 3) {
            console.log(`[LOG] Invalid /map command parameters`);
            bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /map bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
            return;
        }

        const chain = match[1].toLowerCase();
        const token = match[2];
        console.log(`[LOG] Fetching data for chain: ${chain}, token: ${token}`);

        bot.sendMessage(chatId, `🔍 Fetching data for ${token} on ${chain}...`);

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

            // Get score metadata
            const metadata = await getMapMetadata(chain, token);
            if (metadata.status !== 'OK') {
                bot.sendMessage(chatId, `❌ Error: ${metadata.message || 'Failed to fetch metadata'}`);
                return;
            }

            // Get top 5 holders
            const topHolders = mapData.nodes.slice(0, 5);

            // let holdersText = `👥 *Top Holders of ${mapData.full_name} (${mapData.symbol})*\n\n`;
            let holdersText = `👥 *Top Holders*\n\n`;

            topHolders.forEach((holder: MapNode, index: number) => {
                const name = holder.name || holder.address;
                holdersText += `${index + 1}. ${name.substring(0, 20)}${name.length > 20 ? '...' : ''}\n`;
                holdersText += `   *Percentage:* ${holder.percentage.toFixed(2)}%\n`;
                holdersText += `   *Amount:* ${holder.amount.toLocaleString()}\n`;
                holdersText += `   *Type:* ${holder.is_contract ? 'Contract' : 'Wallet'}\n\n`;
            });

            holdersText += `\n*Total Holders Analyzed:* ${mapData.nodes.length}`;

            // Score emoji logic
            let scoreEmoji = '🟢';
            const score = metadata.decentralisation_score || 0;
            if (score < 50) {
                scoreEmoji = '🔴';
            } else if (score < 70) {
                scoreEmoji = '🟠';
            }

            const mapUrl = getMapIframeUrl(chain, token);
            const message = `🔵 *${mapData.full_name} (${mapData.symbol})*

*Token Address:* \`${token}\`
*Chain:* \`${chain.toUpperCase()}\`
*Last Updated:* \`${new Date(mapData.dt_update).toLocaleString()}\`

🌐 *Interactive Map:*
${mapUrl}

${scoreEmoji} *Decentralization Score:* \`${score}/100\`
- *Supply in CEXs:* \`${metadata.identified_supply?.percent_in_cexs || 'N/A'}%\`
- *Supply in Contracts:* \`${metadata.identified_supply?.percent_in_contracts || 'N/A'}%\`

${holdersText}`;
            
            const response = await analyzeToken(token, topHolders.map(holder => ({
                address: holder.address,
                balance: holder.amount.toString(),
                percentage: holder.percentage.toFixed(2)
            })));
            const AImessage = `*AI Analysis 🤖 -*\n\n${response}`;

            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            bot.sendMessage(chatId, AImessage, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Error in merged /map command:', error);
            bot.sendMessage(chatId, '❌ An error occurred while fetching the data. Please try again later.');
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

        bot.sendMessage(chatId, `📸 Generating screenshot for ${token} on ${chain}. This may take a moment...`);

        try {
            // const response = await axios.post(
            //     `${process.env.SCREENSHOT_SERVICE_URL}/api/screenshot`,
            //     { chain, token },
            //     {
            //         headers: {
            //             'Content-Type': 'application/json',
            //         },
            //         responseType: 'arraybuffer', // receive raw image data
            //     }
            // );

            // if (response.status !== 200 || !response.data) {
            //     bot.sendMessage(chatId, '❌ Failed to generate screenshot. The map might not be available.');
            //     return;
            // }

            // // Create a buffer from the response data
            // const screenshotBuffer = Buffer.from(response.data);

            const screenshot = await generateMapScreenshot(chain, token);
            if (!screenshot) {
                bot.sendMessage(chatId, '❌ Failed to generate screenshot. The map might not be available.');
                return;
            }
            // Fetch token data for caption
            const mapData = await getMapData(chain, token);
            const metadata = await getMapMetadata(chain, token);

            const caption = `🔵 *${mapData.full_name} (${mapData.symbol})*
    *Chain:* ${chain.toUpperCase()}
    *Decentralization Score:* ${metadata.decentralisation_score || 'N/A'}/100
    *Token Address:* \`${token}\``;

            // Send the photo using Telegram's file options
            await bot.sendPhoto(chatId, screenshot, {
                caption,
                parse_mode: 'Markdown',
            });

        } catch (error) {
            console.error('Error in /screenshot command:', error);
            bot.sendMessage(chatId, '❌ An error occurred while generating the screenshot. Please try again later.');
        }
    });

    // Fallback for non-command text messages
    bot.on('message', (msg: Message) => {
        const chatId = msg.chat.id;

        if (!msg.text?.startsWith('/')) {
            bot.sendMessage(chatId, `🤖 I received: "${msg.text}". Type /help for options.`);
        }
    });


    // // /map [chain] [token]
    // bot.onText(/\/map(?:\s+(\w+)\s+(0x[a-fA-F0-9]+))?/, async (msg: Message, match: RegExpExecArray | null) => {
    //     const chatId = msg.chat.id;
    //     console.log(`[LOG] Map command requested by user ${msg.from?.id} (${msg.from?.username || 'unknown'})`);

    //     if (!match || match.length < 3 || !match[1] || !match[2]) {
    //         console.log(`[LOG] Invalid map command parameters`);
    //         bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /map bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
    //         return;
    //     }

    //     const chain = match[1].toLowerCase();
    //     const token = match[2];
    //     console.log(`[LOG] Fetching map for chain: ${chain}, token: ${token}`);

    //     bot.sendMessage(chatId, `🔍 Fetching map data for ${token} on ${chain}...`);

    //     try {
    //         // Check map availability
    //         const availability = await getMapAvailability(chain, token);

    //         if (availability.status !== 'OK' || !availability.availability) {
    //             bot.sendMessage(chatId, `❌ Map not available for this token. ${availability.message || ''}`);
    //             return;
    //         }

    //         // Get map data
    //         const mapData = await getMapData(chain, token);

    //         if ('message' in mapData && mapData.message) {
    //             bot.sendMessage(chatId, `❌ Error: ${mapData.message}`);
    //             return;
    //         }

    //         const mapUrl = getMapIframeUrl(chain, token);

    //         const message = `🔵 *${mapData.full_name} (${mapData.symbol})*

    // *Token Address:* \`${token}\`
    // *Chain:* ${chain.toUpperCase()}
    // *Last Updated:* ${new Date(mapData.dt_update).toLocaleString()}

    // *View the interactive bubble map:*
    // ${mapUrl}`;

    //         bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    //     } catch (error) {
    //         console.error('Error in /map command:', error);
    //         bot.sendMessage(chatId, '❌ An error occurred while fetching the map data. Please try again later.');
    //     }
    // });

    // // /score [chain] [token]
    // bot.onText(/\/score\s+(\w+)\s+(0x[a-fA-F0-9]+)/, async (msg: Message, match: RegExpExecArray | null) => {
    //     const chatId = msg.chat.id;

    //     if (!match || match.length < 3) {
    //         bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /score bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
    //         return;
    //     }
        
    //     const chain = match[1].toLowerCase();
    //     const token = match[2];

    //     bot.sendMessage(chatId, `🔍 Fetching decentralization score for ${token} on ${chain}...`);

    //     try {
    //         const metadata = await getMapMetadata(chain, token);

    //         if (metadata.status !== 'OK') {
    //             bot.sendMessage(chatId, `❌ Error: ${metadata.message || 'Failed to fetch metadata'}`);
    //             return;
    //         }

    //         // Get token data for additional info
    //         const mapData = await getMapData(chain, token);

    //         let scoreEmoji = '🟢';
    //         if (metadata.decentralisation_score && metadata.decentralisation_score < 50) {
    //             scoreEmoji = '🔴';
    //         } else if (metadata.decentralisation_score && metadata.decentralisation_score < 70) {
    //             scoreEmoji = '🟠';
    //         }

    //         const message = `${scoreEmoji} *Decentralization Score for ${mapData.full_name} (${mapData.symbol})*

    // *Score:* ${metadata.decentralisation_score || 'N/A'}/100
    // *Supply in CEXs:* ${metadata.identified_supply?.percent_in_cexs || 'N/A'}%
    // *Supply in Contracts:* ${metadata.identified_supply?.percent_in_contracts || 'N/A'}%
    // *Last Updated:* ${new Date(metadata.dt_update || '').toLocaleString()}

    // *Token Address:* \`${token}\`
    // *Chain:* ${chain.toUpperCase()}`;

    //         bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    //     } catch (error) {
    //         console.error('Error in /score command:', error);
    //         bot.sendMessage(chatId, '❌ An error occurred while fetching the score data. Please try again later.');
    //     }
    // });

    // /map [chain] [token]


    // - *Score Last Updated:* ${new Date(metadata.dt_update || '').toLocaleString()}

     // // /holders [chain] [token]
    // bot.onText(/\/holders\s+(\w+)\s+(0x[a-fA-F0-9]+)/, async (msg: Message, match: RegExpExecArray | null) => {
    //     const chatId = msg.chat.id;

    //     if (!match || match.length < 3) {
    //         bot.sendMessage(chatId, 'Please provide both chain and token address. Example: /holders bsc 0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95');
    //         return;
    //     }

    //     const chain = match[1].toLowerCase();
    //     const token = match[2];

    //     bot.sendMessage(chatId, `🔍 Fetching top holders for ${token} on ${chain}...`);

    //     try {
    //         const mapData = await getMapData(chain, token);

    //         if ('message' in mapData && mapData.message) {
    //             bot.sendMessage(chatId, `❌ Error: ${mapData.message}`);
    //             return;
    //         }

    //         // Get top 10 holders
    //         const topHolders = mapData.nodes.slice(0, 10);

    //         let holdersText = `👥 *Top Holders of ${mapData.full_name} (${mapData.symbol})*\n\n`;

    //         topHolders.forEach((holder: MapNode, index: number) => {
    //             const name = holder.name || holder.address;
    //             holdersText += `${index + 1}. ${name.substring(0, 20)}${name.length > 20 ? '...' : ''}\n`;
    //             holdersText += `   *Percentage:* ${holder.percentage.toFixed(2)}%\n`;
    //             holdersText += `   *Amount:* ${holder.amount.toLocaleString()}\n`;
    //             holdersText += `   *Type:* ${holder.is_contract ? 'Contract' : 'Wallet'}\n\n`;
    //         });

    //         holdersText += `\n*Total Holders Analyzed:* ${mapData.nodes.length}`;

    //         bot.sendMessage(chatId, holdersText, { parse_mode: 'Markdown' });
    //     } catch (error) {
    //         console.error('Error in /holders command:', error);
    //         bot.sendMessage(chatId, '❌ An error occurred while fetching the holders data. Please try again later.');
    //     }
    // });

}

export default bot;