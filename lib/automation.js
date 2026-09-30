// Engine tự động: sàng lọc creator, nộp video, và "tick" định kỳ (cron) cho SLA content.
import { query, tx } from './db';
import { logEvent } from './events';
import { getRules } from './settings';
import { screen, statusFromScreen } from './scoring';
import { inspectVideo } from './video';
import { notifyTeam } from './notify';
import { HttpError } from './http';
import { expireDeals } from './deals';

// ---------- Sàng lọc đơn đăng ký ----------

export async function screenCreator(db, creator, rules) {
  if (!rules.auto_screen) return creator.status;
  const { decision, reason } = screen(creator, rules);
  const status = statusFromScreen(decision, rules);
  await db.query('UPDATE creators SET status=$1, screen_reason=$2, updated_at=NOW() WHERE id=$3', [status, reason, creator.id]);
  await logEvent(db, { type: `screen_${decision}`, creator_id: creator.id, message: `Tự sàng lọc → ${status}: ${reason}` });
  return status;
}

// ---------- Nộp video ----------

export async function submitVideo({ creator, url, actor, sampleId = null }) {
  const rules = await getRules();
  const info = await inspectVideo(url);
  if (!info) throw new HttpError(400, 'Link video không hợp lệ (hỗ trợ TikTok, Facebook, Shopee).');

  const dup = await query('SELECT id, creator_id FROM videos WHERE url=$1 OR (video_id<>\'\' AND video_id=$2)', [info.url, info.video_id]);
  if (dup.rows.length) throw new HttpError(409, 'Video này đã được nộp trước đó.');

  const handle = (creator.handle || '').toLowerCase();
  const verified = !!(info.author && handle && info.author === handle);
  if (info.platform === 'TikTok' && info.author && handle && !verified) {
    throw new HttpError(400, `Video thuộc @${info.author}, không khớp kênh @${handle} đã đăng ký.`);
  }
  // Video của deal trả phí luôn cần người duyệt (checklist: disclaimer, nhãn quảng cáo, không claim chữa bệnh)
  // Gắn video vào deal đã chốt cũ nhất còn thiếu video (1 video chỉ tính cho 1 deal)
  const open = await query(
    `SELECT d.id, d.fee FROM deals d WHERE d.creator_id=$1 AND d.status='booked'
       AND (SELECT COUNT(*) FROM videos v WHERE v.deal_id=d.id AND v.status<>'rejected') < d.videos
     ORDER BY d.booked_at LIMIT 1`,
    [creator.id]
  );
  const dealId = open.rows[0]?.id || null;
  const paidDeal = Number(open.rows[0]?.fee) > 0;
  const status = verified && rules.auto_approve_verified_video && !paidDeal ? 'approved' : 'submitted';

  return tx(async db => {
    let sample = null;
    if (sampleId) {
      const r = await db.query('SELECT * FROM samples WHERE id=$1 AND creator_id=$2', [sampleId, creator.id]);
      sample = r.rows[0] || null;
    } else {
      // Ghép vào đơn mẫu gần nhất chưa có video
      const r = await db.query(
        `SELECT * FROM samples WHERE creator_id=$1 AND status IN ('delivered','overdue','shipped','approved')
         ORDER BY CASE status WHEN 'overdue' THEN 0 WHEN 'delivered' THEN 1 WHEN 'shipped' THEN 2 ELSE 3 END, requested_at LIMIT 1`,
        [creator.id]
      );
      sample = r.rows[0] || null;
    }

    const v = await db.query(
      `INSERT INTO videos (creator_id, sample_id, campaign_id, url, platform, video_id, title, thumbnail, author, verified, status, submitted_by, deal_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [creator.id, sample?.id || null, sample?.campaign_id || null, info.url, info.platform, info.video_id, info.title, info.thumbnail, info.author, verified, status, actor, dealId]
    );
    const video = v.rows[0];

    if (sample && sample.status !== 'posted') {
      await db.query(`UPDATE samples SET status='posted', posted_at=NOW(), updated_at=NOW() WHERE id=$1`, [sample.id]);
      if (sample.campaign_id) {
        await db.query('UPDATE campaign_creators SET posts_done=posts_done+1 WHERE campaign_id=$1 AND creator_id=$2', [sample.campaign_id, creator.id]);
      }
    }
    await db.query(
      `UPDATE creators SET status='content_posted', updated_at=NOW() WHERE id=$1 AND status NOT IN ('scaling','content_posted')`,
      [creator.id]
    );
    await logEvent(db, {
      type: 'video_submitted', creator_id: creator.id, sample_id: sample?.id || null, video_id: video.id, actor,
      message: `${info.platform} video ${verified ? '✓ đúng kênh' : '(chưa xác minh)'}${paidDeal ? ' · deal trả phí → chờ duyệt tay' : ''}${sample ? ` · đơn ${sample.tiktok_order_id || '#' + sample.id}` : ''}`,
    });
    return video;
  });
}

// Cộng dồn GMV video → GMV creator; đạt ngưỡng → scaling
export async function rollupCreator(db, creatorId, rules) {
  const r = await db.query(
    `SELECT COALESCE(SUM(gmv),0) AS gmv, COALESCE(SUM(views),0) AS views FROM videos WHERE creator_id=$1 AND status<>'rejected'`,
    [creatorId]
  );
  const { gmv, views } = r.rows[0];
  if (Number(gmv) > 0) await db.query('UPDATE creators SET gmv=$1, updated_at=NOW() WHERE id=$2', [gmv, creatorId]);
  if (Number(gmv) >= rules.scale_min_gmv || Number(views) >= rules.scale_min_views) {
    const up = await db.query(
      `UPDATE creators SET status='scaling', updated_at=NOW() WHERE id=$1 AND status NOT IN ('scaling','rejected') RETURNING name`,
      [creatorId]
    );
    if (up.rows.length) {
      await logEvent(db, { type: 'creator_scaling', creator_id: creatorId, message: `Đạt ngưỡng scale: GMV ${Number(gmv).toLocaleString('vi-VN')}đ · ${Number(views).toLocaleString('vi-VN')} views` });
      return up.rows[0].name;
    }
  }
  return null;
}

// ---------- Tick định kỳ ----------

export async function runTick({ notify = true } = {}) {
  const rules = await getRules();
  const out = { screened: 0, due_set: 0, reminders: 0, overdue: 0, inactive: 0, scaled: 0 };

  // 1. Sàng lọc các đơn còn "applied" (vd: vừa bật auto_screen)
  if (rules.auto_screen) {
    const r = await query(`SELECT * FROM creators WHERE status='applied' AND source<>'invite' LIMIT 500`);
    for (const c of r.rows) { await screenCreator({ query }, c, rules); out.screened++; }
  }

  // 2. Đơn đã nhận nhưng chưa có hạn content
  const due = await query(
    `UPDATE samples SET content_due_at = COALESCE(delivered_at, NOW()) + ($1 || ' days')::interval, updated_at=NOW()
     WHERE status='delivered' AND content_due_at IS NULL RETURNING id`,
    [String(rules.content_sla_days)]
  );
  out.due_set = due.rowCount;

  // 3. Sắp tới hạn → đánh dấu nhắc (creator thấy trên portal, team nhận tin)
  const remind = await query(
    `UPDATE samples s SET reminded_at=NOW()
     FROM creators c
     WHERE c.id=s.creator_id AND s.status='delivered' AND s.reminded_at IS NULL
       AND s.content_due_at <= NOW() + ($1 || ' days')::interval AND s.content_due_at > NOW()
     RETURNING s.id, s.creator_id, c.name, s.content_due_at`,
    [String(rules.remind_before_days)]
  );
  for (const s of remind.rows) {
    await logEvent(null, { type: 'sample_reminder', creator_id: s.creator_id, sample_id: s.id, message: `Nhắc đăng video trước ${new Date(s.content_due_at).toLocaleDateString('vi-VN')}` });
  }
  out.reminders = remind.rowCount;

  // 4. Quá hạn → overdue
  const over = await query(
    `UPDATE samples s SET status='overdue', updated_at=NOW()
     FROM creators c
     WHERE c.id=s.creator_id AND s.status='delivered' AND s.content_due_at < NOW()
     RETURNING s.id, s.creator_id, c.name, c.phone`
  );
  for (const s of over.rows) {
    await logEvent(null, { type: 'sample_overdue', creator_id: s.creator_id, sample_id: s.id, message: 'Quá hạn đăng video' });
  }
  out.overdue = over.rowCount;

  // 5. Overdue quá lâu → creator inactive
  const inact = await query(
    `UPDATE creators c SET status='inactive', updated_at=NOW()
     WHERE c.status IN ('sample_sent','approved','in_campaign')
       AND EXISTS (SELECT 1 FROM samples s WHERE s.creator_id=c.id AND s.status='overdue'
                   AND s.content_due_at < NOW() - ($1 || ' days')::interval)
       AND NOT EXISTS (SELECT 1 FROM videos v WHERE v.creator_id=c.id)
     RETURNING c.id, c.name`,
    [String(rules.inactive_after_overdue_days)]
  );
  for (const c of inact.rows) await logEvent(null, { type: 'creator_inactive', creator_id: c.id, message: `Không đăng video sau ${rules.inactive_after_overdue_days} ngày quá hạn` });
  out.inactive = inact.rowCount;

  // 6. Scale creator đạt ngưỡng
  const cands = await query(`SELECT DISTINCT creator_id FROM videos WHERE gmv>0 OR views>0`);
  const scaledNames = [];
  for (const { creator_id } of cands.rows) {
    const n = await rollupCreator({ query }, creator_id, rules);
    if (n) scaledNames.push(n);
  }
  out.scaled = scaledNames.length;

  // 7. Deal quá hạn phản hồi → expired (creator thấy trên portal, team nhận thông báo)
  const expired = await expireDeals();
  out.deals_expired = expired.length;

  // 8. Payout đến hạn / quá hạn chưa trả → nhắc team
  const payDue = await query(
    `SELECT p.id, p.kind, p.net, p.due_at, d.id AS deal_id, c.name
     FROM payouts p JOIN deals d ON d.id=p.deal_id JOIN creators c ON c.id=d.creator_id
     WHERE p.status IN ('pending','due') AND p.due_at IS NOT NULL AND p.due_at < NOW() ORDER BY p.due_at`
  );
  out.payouts_overdue = payDue.rowCount;

  await logEvent(null, { type: 'tick', message: `Automation chạy: ${out.screened} sàng lọc · ${out.reminders} nhắc · ${out.overdue} trễ hạn · ${out.inactive} inactive · ${out.scaled} scale · ${out.deals_expired} deal hết hạn · ${out.payouts_overdue} khoản cần trả` });

  if (notify && (out.overdue || out.reminders || out.scaled || out.inactive || out.deals_expired || out.payouts_overdue)) {
    const lines = ['KOL Hub — báo cáo tự động'];
    if (over.rows.length) lines.push(`⏰ ${over.rows.length} creator quá hạn video: ${over.rows.slice(0, 10).map(s => s.name).join(', ')}`);
    if (remind.rows.length) lines.push(`🔔 ${remind.rows.length} creator sắp tới hạn: ${remind.rows.slice(0, 10).map(s => s.name).join(', ')}`);
    if (inact.rows.length) lines.push(`💤 ${inact.rows.length} creator chuyển inactive`);
    if (scaledNames.length) lines.push(`🚀 Scale: ${scaledNames.slice(0, 10).join(', ')}`);
    if (expired.length) lines.push(`⌛ ${expired.length} deal hết hạn (đã báo creator trên portal): ${expired.slice(0, 10).map(d => `#${d.id} ${d.creator_name} — ${d.last_by === 'brand' ? 'creator' : 'brand'} chưa trả lời`).join(', ')}`);
    if (payDue.rows.length) lines.push(`💸 ${payDue.rows.length} khoản cần trả creator: ${payDue.rows.slice(0, 10).map(p => `${p.name} ${p.kind === 'deposit' ? 'cọc' : 'phần còn lại'} ${Math.round(p.net).toLocaleString('vi-VN')}đ`).join(', ')}`);
    await notifyTeam(lines.join('\n'));
  }
  return out;
}
