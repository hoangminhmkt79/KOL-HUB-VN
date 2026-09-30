// Gửi cảnh báo cho team (Telegram và/hoặc webhook bất kỳ: Slack, Lark, Google Chat, n8n…).
// Không cấu hình env → bỏ qua, không lỗi.
export async function notifyTeam(text) {
  const jobs = [];
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, NOTIFY_WEBHOOK_URL } = process.env;
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    jobs.push(fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    }));
  }
  if (NOTIFY_WEBHOOK_URL) {
    jobs.push(fetch(NOTIFY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }));
  }
  const res = await Promise.allSettled(jobs);
  res.filter(r => r.status === 'rejected').forEach(r => console.error('notify failed', r.reason));
}

export const notifyChannels = () => ({
  telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  webhook: !!process.env.NOTIFY_WEBHOOK_URL,
});
