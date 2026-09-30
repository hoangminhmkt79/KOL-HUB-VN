// Đăng lên FANPAGE của brand qua Facebook Graph API (được phép chính thức).
// KHÔNG dùng cho group — Facebook đã bỏ API đăng vào group (04/2024), bot đăng group vi phạm ToS.
// Env: FB_PAGE_ID, FB_PAGE_TOKEN (Page access token, quyền pages_manage_posts), FB_GRAPH_VERSION (mặc định v21.0)

export const fbPageConfigured = () => !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN);

export async function publishToPage(message, link) {
  const ver = process.env.FB_GRAPH_VERSION || 'v21.0';
  const body = new URLSearchParams({ message, access_token: process.env.FB_PAGE_TOKEN });
  if (link) body.set('link', link);
  const r = await fetch(`https://graph.facebook.com/${ver}/${process.env.FB_PAGE_ID}/feed`, {
    method: 'POST', body, signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error(`Facebook: ${j.error?.message || `lỗi ${r.status}`}`);
  const [pageId, postId] = String(j.id).split('_');
  return { id: j.id, url: postId ? `https://www.facebook.com/${pageId}/posts/${postId}` : `https://www.facebook.com/${j.id}` };
}
