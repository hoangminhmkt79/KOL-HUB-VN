import { HttpError } from './http';
import { tiktokConfigured, fetchOrdersUpdatedSince } from './tiktok';
import { normalizeApiOrder, upsertOrders } from './orders';
import { getRules, getSetting, setSetting } from './settings';
import { logEvent } from './events';

export async function syncTikTok() {
  if (!tiktokConfigured()) throw new HttpError(400, 'Chưa cấu hình TikTok Shop API (TTS_APP_KEY, TTS_APP_SECRET, TTS_ACCESS_TOKEN, TTS_SHOP_CIPHER).');
  const state = await getSetting('tiktok_sync', {});
  const until = new Date();
  // Lùi 1h so với lần trước để không sót đơn cập nhật sát mốc
  const since = state?.last_synced_at ? new Date(new Date(state.last_synced_at).getTime() - 3600e3) : new Date(Date.now() - 14 * 864e5);
  const raw = await fetchOrdersUpdatedSince(since, until);
  const out = await upsertOrders(raw.map(normalizeApiOrder), await getRules(), 'tiktok_api');
  await setSetting('tiktok_sync', { last_synced_at: until.toISOString(), last_result: out });
  await logEvent(null, { type: 'orders_synced', message: `Sync TikTok ${raw.length} đơn: +${out.created} mới, ${out.updated} cập nhật, ${out.unmatched} chưa map` });
  return { fetched: raw.length, ...out };
}
