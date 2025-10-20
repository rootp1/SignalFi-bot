const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;

if (!token || !webhookUrl) {
  console.error(
    "Error: TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_WEBHOOK_URL must be set in your .env.local file.",
  );
  process.exit(1);
}

const telegramApiUrl = `https://api.telegram.org/bot${token}/setWebhook`;

(async () => {
  try {
    console.log(`Setting webhook to: ${webhookUrl}/api/telegram`);

    const response = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `${webhookUrl}/api/telegram`,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        `Telegram API responded with an error: ${data.description || "Unknown error"}`,
      );
    }

    console.log("Webhook set successfully:", data);
  } catch (error) {
    console.error("Failed to set webhook:", error.message);
  }
})();
