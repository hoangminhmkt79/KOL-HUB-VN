// Kiểm tra link video: nhận diện nền tảng, video_id, và xác minh tác giả qua TikTok oEmbed (không cần API key)

export function parseVideoUrl(input) {
  let url;
  try { url = new URL(String(input).trim().startsWith('http') ? String(input).trim() : 'https://' + String(input).trim()); }
  catch { return null; }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  if (/(^|\.)tiktok\.com$/.test(host)) {
    const m = url.pathname.match(/\/@([^/]+)\/(?:video|photo)\/(\d+)/);
    return m
      ? { platform: 'TikTok', url: `https://www.tiktok.com/@${m[1]}/video/${m[2]}`, video_id: m[2], handle: m[1].toLowerCase(), short: false }
      : { platform: 'TikTok', url: url.href, video_id: '', handle: '', short: true };
  }
  if (/(^|\.)(facebook\.com|fb\.watch)$/.test(host)) return { platform: 'Facebook', url: url.href, video_id: '', handle: '' };
  if (/(^|\.)shopee\.vn$/.test(host) || /(^|\.)shp\.ee$/.test(host)) return { platform: 'Shopee', url: url.href, video_id: '', handle: '' };
  return null;
}

// Link rút gọn vt.tiktok.com → link đầy đủ
async function expandShort(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    return r.url;
  } catch { return url; }
}

export async function inspectVideo(input) {
  let v = parseVideoUrl(input);
  if (!v) return null;
  if (v.platform === 'TikTok' && v.short) {
    const full = await expandShort(v.url);
    const again = parseVideoUrl(full);
    if (again && !again.short) v = again;
  }
  const meta = { title: '', thumbnail: '', author: v.handle };
  if (v.platform === 'TikTok' && v.video_id) {
    try {
      const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(v.url)}`, { signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const j = await r.json();
        meta.title = (j.title || '').slice(0, 500);
        meta.thumbnail = j.thumbnail_url || '';
        const fromUrl = (j.author_url || '').match(/@([^/?]+)/)?.[1];
        meta.author = (j.author_unique_id || fromUrl || v.handle || '').toLowerCase();
      }
    } catch { /* oEmbed lỗi không chặn việc nộp video */ }
  }
  return { ...v, ...meta };
}
