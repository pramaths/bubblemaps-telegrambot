const TELEGRAM_MESSAGE_LIMIT = 4096; // Telegram's official limit

export async function sendLargeMessage(bot: any, chatId: number, message: string, options: any) {
    const chunks: string[] = [];
    let currentChunk = '';

    const tokens = message.split('\n\n'); // Split at end of each token block

    for (const token of tokens) {
        if ((currentChunk + token + '\n\n').length > TELEGRAM_MESSAGE_LIMIT) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        currentChunk += token + '\n\n';
    }

    if (currentChunk) chunks.push(currentChunk);

    for (let i = 0; i < chunks.length; i++) {
        const chunkMessage = i === 0 ? chunks[i] : `...continued\n\n${chunks[i]}`;
        await bot.sendMessage(chatId, chunkMessage.trim(), options);
    }
}