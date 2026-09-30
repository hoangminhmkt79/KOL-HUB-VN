// Phễu theo mã nguồn (acq_code): áp dụng cho cả link tracking đa kênh lẫn bài group FB.
export const FUNNEL_SQL = `
  (SELECT COUNT(*)::int FROM creators c WHERE c.acq_code=x.code) AS signups,
  (SELECT COUNT(*)::int FROM creators c WHERE c.acq_code=x.code
     AND c.status IN ('approved','in_campaign','sample_sent','content_posted','scaling')) AS approved,
  (SELECT COUNT(DISTINCT d.creator_id)::int FROM deals d JOIN creators c ON c.id=d.creator_id
     WHERE c.acq_code=x.code AND d.status IN ('booked','delivered','completed')) AS booked,
  (SELECT COUNT(*)::int FROM creators c WHERE c.acq_code=x.code
     AND EXISTS (SELECT 1 FROM videos v WHERE v.creator_id=c.id AND v.status<>'rejected')) AS activated,
  (SELECT COALESCE(SUM(c.gmv),0) FROM creators c WHERE c.acq_code=x.code) AS gmv,
  (SELECT COUNT(*)::int FROM client_requests r WHERE r.acq_code=x.code) AS leads,
  (SELECT COUNT(*)::int FROM client_requests r WHERE r.acq_code=x.code AND r.status='won') AS leads_won`;

// Map mã nguồn → creators.source khi đăng ký
export async function resolveAcq(db, code) {
  if (!/^[A-Z0-9]{4,16}$/.test(code || '')) return null;
  const fb = await db.query('SELECT code FROM fb_posts WHERE code=$1', [code]);
  if (fb.rows.length) return { code, source: 'fb_group' };
  const tl = await db.query('SELECT code, channel FROM track_links WHERE code=$1', [code]);
  if (tl.rows.length) return { code, source: tl.rows[0].channel === 'fb_group' ? 'fb_group' : tl.rows[0].channel };
  return null;
}
