import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CreatorStatus, SampleStatus, VideoStatus, Steps, useToast, copy } from '../../components/ui';
import { trackingUrl, fmtDate, fmtNum, daysUntil } from '../../lib/constants';

const STEP_LABELS = ['Chờ gửi', 'Đang giao', 'Đã nhận', 'Đã đăng'];
const stepOf = s => ({ requested: 0, approved: 0, shipped: 1, delivered: 2, overdue: 2, posted: 3 }[s] ?? 0);

export default function Portal() {
  const router = useRouter();
  const { token } = router.query;
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [video, setVideo] = useState('');
  const [addr, setAddr] = useState('');
  const [order, setOrder] = useState('');
  const [busy, setBusy] = useState('');
  const [toastNode, toast] = useToast();

  const load = useCallback(async () => {
    if (!token) return;
    const r = await fetch(`/api/portal/${token}`);
    const d = await r.json();
    if (!r.ok) { setErr(d.error || 'Không tải được'); return; }
    setData(d); setAddr(d.creator.ship_address || '');
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const act = async (key, body, ok) => {
    setBusy(key);
    try {
      const r = await fetch(`/api/portal/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Có lỗi xảy ra');
      toast(typeof ok === 'function' ? ok(d) : ok); await load();
      return true;
    } catch (e) { toast(e.message); return false; } finally { setBusy(''); }
  };

  if (err) return <div className="form-wrap"><div className="alert alert-error" style={{ marginTop: 60 }}>⚠ {err}</div></div>;
  if (!data) return <div className="empty" style={{ paddingTop: 120 }}>Đang tải…</div>;
  const { creator: c, samples, videos, campaigns, referrals } = data;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const refLink = `${origin}/?ref=${c.ref_code}`;
  const active = samples.find(s => ['delivered', 'overdue'].includes(s.status));
  const canAct = !['rejected', 'prospect'].includes(c.status);

  return (
    <>
      <Head><title>{c.name} · Theo dõi hợp tác</title><meta name="robots" content="noindex" /></Head>
      <div className="hero" style={{ minHeight: '100vh' }}>
        <div className="form-wrap" style={{ maxWidth: 620 }}>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div className="row"><div className="brand-logo">K</div><b>KOL Hub</b></div>
            <CreatorStatus s={c.status} />
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="small muted">Xin chào</div>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>{c.name}</h1>
            <div className="small muted">{c.handle && `@${c.handle} · `}{fmtNum(c.followers)} followers · score {c.score.toFixed(2)}</div>
            {['applied', 'pending'].includes(c.status) && <div className="alert alert-info" style={{ marginTop: 12 }}>⏳ Hồ sơ đang được xem xét (24–48h). Trong lúc chờ, hãy cập nhật địa chỉ nhận mẫu bên dưới.</div>}
            {c.status === 'rejected' && <div className="alert alert-error" style={{ marginTop: 12 }}>Hồ sơ chưa phù hợp đợt này. Cải thiện tỉ lệ xem và đăng ký lại sau 30 ngày nhé.</div>}
            {c.promo_code && <div className="alert alert-ok" style={{ marginTop: 12 }}>🎟 Mã giảm giá của bạn: <b>{c.promo_code}</b></div>}
          </div>

          {active && (
            <div className="card" style={{ marginBottom: 14, borderColor: active.status === 'overdue' ? '#f6c5c1' : 'var(--brand-100)' }}>
              <div className="bold">{active.status === 'overdue' ? '⏰ Bạn đã trễ hạn đăng video' : '🎬 Đến lúc đăng video!'}</div>
              <div className="small muted" style={{ margin: '4px 0 12px' }}>
                {active.product || 'Sản phẩm mẫu'} · hạn {fmtDate(active.content_due_at)}
                {active.content_due_at && ` (${daysUntil(active.content_due_at) >= 0 ? `còn ${daysUntil(active.content_due_at)} ngày` : `trễ ${-daysUntil(active.content_due_at)} ngày`})`}
              </div>
            </div>
          )}

          {canAct && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">Nộp link video</div>
              <div className="row">
                <input className="input grow" placeholder="https://www.tiktok.com/@ban/video/..." value={video} onChange={e => setVideo(e.target.value)} />
                <button className="btn btn-primary" disabled={!video || busy === 'video'} onClick={async () => { if (await act('video', { action: 'video', url: video }, d => (d.video.verified ? 'Đã nhận video ✓ đúng kênh' : 'Đã nhận video, team sẽ duyệt'))) setVideo(''); }}>{busy === 'video' ? '…' : 'Nộp'}</button>
              </div>
              <div className="hint">Video phải đăng từ kênh bạn đã đăng ký. Gắn giỏ hàng sản phẩm để được tính hoa hồng.</div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">📦 Đơn mẫu của bạn</div>
            {samples.map(s => (
              <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
                <div className="row-between" style={{ marginBottom: 8 }}>
                  <div><b className="small">{s.product || 'Sản phẩm mẫu'}</b>{s.campaign_name && <div className="xs muted">{s.campaign_name}</div>}</div>
                  <SampleStatus s={s.status} />
                </div>
                <Steps labels={STEP_LABELS} current={stepOf(s.status)} late={s.status === 'overdue'} />
                <div className="xs muted" style={{ marginTop: 6 }}>
                  {s.tracking_no ? <>🚚 {s.carrier} · <a className="link" href={trackingUrl(s.carrier, s.tracking_no)} target="_blank" rel="noreferrer">{s.tracking_no}</a></> : 'Chưa có mã vận đơn'}
                  {s.tiktok_order_id && ` · Đơn #${s.tiktok_order_id}`}
                </div>
              </div>
            ))}
            {!samples.length && <div className="small muted">Chưa có đơn mẫu. Khi team gửi mẫu, tiến độ giao hàng sẽ hiện ở đây.</div>}
            {canAct && (
              <div style={{ marginTop: 12 }}>
                <label className="label">Đã đặt mẫu trên TikTok Shop? Khai mã đơn để theo dõi</label>
                <div className="row">
                  <input className="input input-sm grow" inputMode="numeric" placeholder="Mã đơn TikTok (VD: 5761…)" value={order} onChange={e => setOrder(e.target.value)} />
                  <button className="btn btn-sm" disabled={!order || busy === 'order'} onClick={async () => { if (await act('order', { action: 'order', order_id: order }, 'Đã ghi nhận mã đơn')) setOrder(''); }}>Gửi</button>
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">📍 Địa chỉ nhận mẫu</div>
            <textarea className="textarea" rows={2} value={addr} onChange={e => setAddr(e.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh — kèm tên + SĐT người nhận" />
            <button className="btn btn-sm btn-primary" style={{ marginTop: 8 }} disabled={busy === 'addr' || addr === (c.ship_address || '')} onClick={() => act('addr', { action: 'address', ship_address: addr }, 'Đã lưu địa chỉ')}>Lưu địa chỉ</button>
          </div>

          {campaigns.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">📋 Brief chiến dịch</div>
              {campaigns.map(cp => (
                <div key={cp.name} style={{ padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <div className="row-between"><b className="small">{cp.name}</b><span className="xs muted">{cp.posts_done}/{cp.posts_per} video · hạn {fmtDate(cp.end_date)}</span></div>
                  {cp.brief && <p className="small" style={{ marginTop: 4 }}>{cp.brief}</p>}
                  {cp.req && <p className="small muted" style={{ marginTop: 4 }}>✅ {cp.req}</p>}
                  {cp.note && <p className="small" style={{ marginTop: 4, color: 'var(--red)' }}>⚠ {cp.note}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">🎬 Video đã nộp ({videos.length})</div>
            {videos.map(v => (
              <div key={v.id} className="feed-item">
                <div className="grow"><a className="link small ellipsis" style={{ display: 'block' }} href={v.url} target="_blank" rel="noreferrer">{v.title || v.url}</a><div className="xs muted">{fmtDate(v.created_at)} · {fmtNum(v.views)} views</div></div>
                <VideoStatus s={v.status} />
              </div>
            ))}
            {!videos.length && <div className="small muted">Chưa có video.</div>}
          </div>

          {canAct && (
            <div className="card" style={{ marginBottom: 14, background: 'var(--accent-50)', borderColor: '#ffd9cc' }}>
              <div className="card-title">🤝 Giới thiệu bạn bè creator</div>
              <div className="small" style={{ marginBottom: 8 }}>Đã giới thiệu: <b>{referrals}</b> người. Creator giới thiệu nhiều được ưu tiên vào chiến dịch lớn.</div>
              <div className="row"><input className="input input-sm grow" readOnly value={refLink} onFocus={e => e.target.select()} /><button className="btn btn-sm btn-accent" onClick={async () => toast((await copy(refLink)) ? 'Đã copy link' : refLink)}>Copy</button></div>
            </div>
          )}
          <div className="hint" style={{ textAlign: 'center' }}>Đây là link riêng của bạn — đừng chia sẻ công khai.</div>
        </div>
      </div>
      {toastNode}
    </>
  );
}
