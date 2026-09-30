// TikTok Shop Open API (Partner Center). Cần app được duyệt + OAuth với shop.
// Env: TTS_APP_KEY, TTS_APP_SECRET, TTS_ACCESS_TOKEN, TTS_SHOP_CIPHER
// Không có env → dùng luồng import CSV (Seller Center → Đơn hàng → Xuất).
import crypto from 'crypto';

const BASE = process.env.TTS_API_BASE || 'https://open-api.tiktokglobalshop.com';
const ORDER_SEARCH = '/order/202309/orders/search';

export const tiktokConfigured = () =>
  !!(process.env.TTS_APP_KEY && process.env.TTS_APP_SECRET && process.env.TTS_ACCESS_TOKEN && process.env.TTS_SHOP_CIPHER);

// Thuật toán ký v2: secret + path + (key+value đã sort, bỏ sign/access_token) + body + secret → HMAC-SHA256
export function signRequest(path, params, body, secret) {
  const base = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'access_token')
    .sort()
    .map(k => k + params[k])
    .join('');
  const str = secret + path + base + (body || '') + secret;
  return crypto.createHmac('sha256', secret).update(str).digest('hex');
}

async function call(path, params, bodyObj) {
  const { TTS_APP_KEY, TTS_APP_SECRET, TTS_ACCESS_TOKEN, TTS_SHOP_CIPHER } = process.env;
  const q = { app_key: TTS_APP_KEY, shop_cipher: TTS_SHOP_CIPHER, timestamp: String(Math.floor(Date.now() / 1000)), ...params };
  const body = bodyObj ? JSON.stringify(bodyObj) : '';
  q.sign = signRequest(path, q, body, TTS_APP_SECRET);
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(q)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tts-access-token': TTS_ACCESS_TOKEN },
    body,
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (json.code !== 0) throw new Error(`TikTok API ${json.code ?? res.status}: ${json.message || 'lỗi không rõ'}`);
  return json.data || {};
}

// Lấy đơn được cập nhật trong khoảng [since, until)
export async function fetchOrdersUpdatedSince(since, until = new Date(), maxPages = 10) {
  const orders = [];
  let pageToken = '';
  for (let i = 0; i < maxPages; i++) {
    const params = { page_size: '50', sort_field: 'update_time', sort_order: 'ASC' };
    if (pageToken) params.page_token = pageToken;
    const data = await call(ORDER_SEARCH, params, {
      update_time_ge: Math.floor(since.getTime() / 1000),
      update_time_lt: Math.floor(until.getTime() / 1000),
    });
    orders.push(...(data.orders || []));
    pageToken = data.next_page_token;
    if (!pageToken) break;
  }
  return orders;
}
