// Vercel Cron gọi endpoint này (xem vercel.json). Bảo vệ bằng CRON_SECRET.
import { runTick } from '../../../lib/automation';
import { tiktokConfigured } from '../../../lib/tiktok';
import { syncTikTok } from '../../../lib/sync';
import { safeEqual } from '../../../lib/auth';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.authorization || '', `Bearer ${secret}`)) return res.status(401).json({ error: 'unauthorized' });
  const out = {};
  try {
    if (tiktokConfigured()) out.sync = await syncTikTok().catch(e => ({ error: e.message }));
    out.tick = await runTick();
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message, ...out });
  }
}
