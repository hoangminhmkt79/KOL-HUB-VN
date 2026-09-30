import { route } from '../../../lib/http';
import { getRules, setSetting, sanitizeRules, getSetting, DEFAULT_RULES } from '../../../lib/settings';
import { tiktokConfigured } from '../../../lib/tiktok';
import { notifyChannels } from '../../../lib/notify';
import { fbPageConfigured } from '../../../lib/fbpage';

async function read() {
  return {
    rules: await getRules(),
    defaults: DEFAULT_RULES,
    integrations: {
      tiktok: tiktokConfigured(),
      tiktok_sync: await getSetting('tiktok_sync', null),
      ...notifyChannels(),
      cron: !!process.env.CRON_SECRET,
      fb_page: fbPageConfigured(),
    },
  };
}

async function save(req) {
  const current = await getRules();
  await setSetting('rules', { ...current, ...sanitizeRules(req.body?.rules || {}) });
  return read();
}

export default route({ GET: read, PUT: save }, { admin: true });
