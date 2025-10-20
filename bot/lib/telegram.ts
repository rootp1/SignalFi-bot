import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error(
    "TELEGRAM_BOT_TOKEN is not defined in the environment variables.",
  );
}
const backendApiUrl = process.env.BACKEND_API_URL;
if (!backendApiUrl) {
  throw new Error("BACKEND_API_URL is not defined.");
}
const dappUrl = process.env.NEXT_PUBLIC_DAPP_URL;
if (!dappUrl) {
  throw new Error("NEXT_PUBLIC_DAPP_URL is not defined.");
}

export const bot = new TelegramBot(token);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage =
    "Welcome to Arc-Yellow Trader! Here's how I can help:\n\n/deposit - Get a link to deposit funds.\n/balance - Check your current balance.";
  bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/deposit/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Please visit our secure dApp to make a deposit: ${dappUrl}`,
  );
});

bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from?.id;

  if (!telegramUserId) {
    bot.sendMessage(chatId, "Sorry, I couldn't identify your user ID.");
    return;
  }

  try {
    bot.sendMessage(chatId, "Fetching your balance, please wait...");

    const response = await fetch(
      `${backendApiUrl}/api/balance/${telegramUserId}`,
    );

    if (!response.ok) {
      throw new Error(
        `Backend service responded with status: ${response.status}`,
      );
    }

    const data = await response.json();
    const balance = data.balance;

    bot.sendMessage(chatId, `Your current balance is: ${balance} tokens.`);
  } catch (error) {
    console.error("Failed to fetch balance:", error);
    bot.sendMessage(
      chatId,
      "Sorry, I was unable to fetch your balance at this time. Please try again later.",
    );
  }
});

export const sendNotification = (userId: string | number, message: string) => {
  try {
    bot.sendMessage(userId, message);
  } catch (error) {
    console.error(`Failed to send notification to user ${userId}`, error);
  }
};

console.log("Bot server started...");
