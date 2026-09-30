import { useState } from 'react';
import { api, useLoad, Avatar, Badge, CreatorStatus, SampleStatus, VideoStatus, Drawer, Field, downloadCsv, copy } from '../ui';
import {
  CREATOR_STATUS, CREATOR_STATUS_KEYS, NICHES, CTYPES, nicheLabel, gmvLabel,
  fmtNum, fmtMoney, fmtDate, fmtDateTime, trackingUrl,
} from '../../lib/constants';

const scoreTone = s => (s >= 0.3 ? 'green' : s >= 0.15 ? 'amber' : 'red');
const profileUrl = l => (l ? (l.startsWith('http') ? l : 'https://' + l) : '#');

export default function Creators({ openCreator, initial = {}, toast }) {
  const [f, setF] = useState({ status: initial.status || 'all', niche: 'all', ct: 'all', potential: 'all', sort: 'new', search: '', page: 1 });
  const set = (k, v) => setF(p => ({ ...p, [k]: v, page: k === 'page' ? v : 1 }));
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '' && v !== 'all')).toString();
  const { data, loading, error, reload } = useLoad(() => api('/api/creators?' + qs), [qs]);
  const [busy, setBusy] = useState(null);

  const quick = async (id, status) => {
    setBusy(id);
    try { await api(`/api/creators/${id}`, { method: 'PATCH', body: { status } }); toast(`Đã chuyển → ${CREATOR_STATUS[status].l}`); reload(); }
    catch (e) { toast(e.message); } finally { setBusy(null); }
  };

  const exportCsv = () => {
    const rows = (data?.creators || []).map(c => [c.name, c.handle, c.phone, c.email, c.platform, nicheLabel(c.niche), c.followers, c.avg_views, c.score, c.potential, gmvLabel(c.channel_gmv), c.address, c.ship_address, c.gmv, c.promo_code, c.status, c.sample_count, c.video_count, fmtDate(c.applied_at)]);
    downloadCsv(`creators-${new Date().toISOString().slice(0, 10)}.csv`, ['Tên', 'Handle', 'SĐT', 'Email', 'Nền tảng', 'Lĩnh vực', 'Followers', 'Avg views', 'Score', 'Tiềm năng', 'GMV kênh', 'Tỉnh', 'Địa chỉ nhận', 'GMV', 'Promo', 'Status', 'Số mẫu', 'Số video', 'Ngày ĐK'], rows);
  };

  const cs = data?.creators || [];
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Creators</h1><div className="small muted">{data ? `${fmtNum(data.total)} hồ sơ` : '…'}</div></div>
        <div className="row"><button className="btn" onClick={exportCsv}>⬇ Export trang này</button><a className="btn" href="/" target="_blank" rel="noreferrer">Trang đăng ký ↗</a></div>
      </div>

      <div className="tabs">
        {[['all', 'Tất cả'], ['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['sample_sent', 'Đã gửi mẫu'], ['content_posted', 'Đã đăng'], ['scaling', 'Scaling'], ['prospect', 'Được mời'], ['inactive', 'Inactive'], ['rejected', 'Từ chối']].map(([v, l]) => (
          <button key={v} className={`tab${f.status === v ? ' on' : ''}`} onClick={() => set('status', v)}>{l}</button>
        ))}
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        <input className="input input-sm" style={{ width: 220 }} placeholder="Tìm tên, @handle, SĐT…" value={f.search} onChange={e => set('search', e.target.value)} />
        <select className="select input-sm" style={{ width: 'auto' }} value={f.niche} onChange={e => set('niche', e.target.value)}>
          <option value="all">Mọi lĩnh vực</option>{NICHES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
        </select>
        <select className="select input-sm" style={{ width: 'auto' }} value={f.ct} onChange={e => set('ct', e.target.value)}>
          <option value="all">Mọi loại content</option>{CTYPES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
        </select>
        <select className="select input-sm" style={{ width: 'auto' }} value={f.potential} onChange={e => set('potential', e.target.value)}>
          <option value="all">Mọi tiềm năng</option><option value="high">⚡ High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select className="select input-sm" style={{ width: 'auto' }} value={f.sort} onChange={e => set('sort', e.target.value)}>
          <option value="new">Mới nhất</option><option value="score">Score cao</option><option value="gmv">GMV cao</option><option value="followers">Followers</option>
        </select>
      </div>

      {error && <div className="alert alert-error">⚠ {error}</div>}

      <div className="card-flat">
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 820 }}>
            <thead><tr><th>Creator</th><th>Kênh</th><th>Followers</th><th>Score</th><th>Mẫu / Video</th><th>GMV</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {loading && !cs.length ? <tr><td colSpan={8} className="empty">Đang tải…</td></tr> :
               !cs.length ? <tr><td colSpan={8} className="empty">Không có creator phù hợp</td></tr> :
               cs.map(c => {
                const s = Number(c.score) || 0;
                return (
                  <tr key={c.id} className="clickable" onClick={() => openCreator(c.id)}>
                    <td>
                      <div className="row" style={{ gap: 9 }}>
                        <Avatar name={c.name} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div className="bold ellipsis" style={{ maxWidth: 180 }}>{c.name}</div>
                          <div className="xs muted">{c.phone || c.email || '—'} · {fmtDate(c.applied_at)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a className="link small" href={profileUrl(c.tiktok_link)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{c.handle ? '@' + c.handle : c.platform}</a>
                      <div className="xs muted">{nicheLabel(c.niche)} · {c.content_type}</div>
                    </td>
                    <td className="tnum bold">{fmtNum(c.followers)}</td>
                    <td><Badge tone={scoreTone(s)}>{s.toFixed(2)}{c.potential === 'high' ? ' ⚡' : ''}</Badge></td>
                    <td className="tnum small">{c.sample_count} / {c.video_count}</td>
                    <td className="tnum bold" style={{ color: c.gmv > 0 ? 'var(--brand-700)' : 'var(--muted)' }}>{c.gmv > 0 ? fmtMoney(c.gmv) : '—'}</td>
                    <td><CreatorStatus s={c.status} />{c.screen_reason && ['pending', 'rejected'].includes(c.status) && <div className="xs muted ellipsis" style={{ maxWidth: 170 }} title={c.screen_reason}>{c.screen_reason}</div>}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {['applied', 'pending'].includes(c.status) && (
                        <div className="row" style={{ gap: 4 }}>
                          <button className="btn btn-sm btn-primary" disabled={busy === c.id} onClick={() => quick(c.id, 'approved')}>Duyệt</button>
                          <button className="btn btn-sm btn-danger" disabled={busy === c.id} onClick={() => quick(c.id, 'rejected')}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="row-between" style={{ padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
            <span className="small muted">Trang {data.page}/{data.pages}</span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-sm" disabled={f.page <= 1} onClick={() => set('page', f.page - 1)}>←</button>
              <button className="btn btn-sm" disabled={f.page >= data.pages} onClick={() => set('page', f.page + 1)}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Hồ sơ chi tiết (drawer dùng chung cho mọi tab) ----------

export function CreatorDrawer({ id, onClose, toast, onChanged }) {
  const { data, error, reload } = useLoad(() => api(`/api/creators/${id}`), [id]);
  const [edit, setEdit] = useState({});
  const [video, setVideo] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast(ok); reload(); onChanged?.(); } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const patch = (body, ok = 'Đã lưu') => run(() => api(`/api/creators/${id}`, { method: 'PATCH', body }), ok);

  if (error) return <Drawer onClose={onClose} title="Lỗi"><div className="alert alert-error">{error}</div></Drawer>;
  if (!data) return <Drawer onClose={onClose} title="Đang tải…"><div className="empty">Đang tải…</div></Drawer>;
  const { creator: c, samples, videos, events, referrals } = data;
  const portal = typeof window !== 'undefined' ? `${window.location.origin}/portal/${c.portal_token}` : '';

  return (
    <Drawer onClose={onClose} title={c.name} sub={`${c.handle ? '@' + c.handle + ' · ' : ''}${c.platform} · ${nicheLabel(c.niche)}`}
      actions={<button className="btn btn-sm" onClick={async () => toast((await copy(portal)) ? 'Đã copy link portal' : portal)}>🔗 Link portal</button>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <CreatorStatus s={c.status} />
            <select className="select input-sm" style={{ width: 'auto' }} value={c.status} disabled={busy} onChange={e => patch({ status: e.target.value }, 'Đã đổi trạng thái')}>
              {CREATOR_STATUS_KEYS.map(s => <option key={s} value={s}>{CREATOR_STATUS[s].l}</option>)}
            </select>
          </div>
          {c.screen_reason && <div className="alert alert-info" style={{ marginBottom: 10 }}>🤖 {c.screen_reason}</div>}
          <div className="grid g3" style={{ gap: 8 }}>
            {[['Followers', fmtNum(c.followers)], ['Avg views', fmtNum(c.avg_views)], ['Score', Number(c.score).toFixed(2)], ['GMV kênh (khai)', gmvLabel(c.channel_gmv)], ['GMV thực', fmtMoney(c.gmv) + 'đ'], ['Giới thiệu', `${referrals} người`]].map(([l, v]) => (
              <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}><div className="xs muted bold">{l}</div><div className="bold tnum">{v}</div></div>
            ))}
          </div>
          <div className="stack small" style={{ gap: 4, marginTop: 10 }}>
            <div>📞 {c.phone ? <a className="link" href={`tel:${c.phone}`}>{c.phone}</a> : '—'} {c.email && <>· ✉ {c.email}</>}</div>
            <div>📍 {c.ship_address || <span className="muted">{c.address || '—'} (chưa có địa chỉ chi tiết)</span>}</div>
            <div>🔗 <a className="link" href={profileUrl(c.tiktok_link)} target="_blank" rel="noreferrer">{c.tiktok_link || '—'}</a></div>
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Cập nhật nhanh</div>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Promo code"><input className="input input-sm" defaultValue={c.promo_code || ''} onChange={e => setEdit(p => ({ ...p, promo_code: e.target.value }))} /></Field>
            <Field label="GMV (VNĐ)" hint="Tự cộng từ video nếu có số liệu"><input className="input input-sm" type="number" defaultValue={c.gmv || ''} onChange={e => setEdit(p => ({ ...p, gmv: e.target.value }))} /></Field>
          </div>
          <div style={{ marginTop: 10 }}><Field label="Địa chỉ nhận mẫu"><input className="input input-sm" defaultValue={c.ship_address || ''} onChange={e => setEdit(p => ({ ...p, ship_address: e.target.value }))} /></Field></div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} disabled={busy || !Object.keys(edit).length} onClick={() => { patch(edit); setEdit({}); }}>Lưu</button>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Đơn mẫu ({samples.length})</div>
          {samples.map(s => (
            <div key={s.id} className="feed-item">
              <div className="grow">
                <div className="row" style={{ gap: 6 }}><b className="ellipsis">{s.product || 'Sản phẩm'}</b><SampleStatus s={s.status} /></div>
                <div className="xs muted">
                  {[s.tiktok_order_id && `#${s.tiktok_order_id}`, s.content_due_at && s.status !== 'posted' && `hạn video ${fmtDate(s.content_due_at)}`, s.campaign_name].filter(Boolean).join(' · ')}
                  {s.tracking_no && <> · 🚚 <a className="link" href={trackingUrl(s.carrier, s.tracking_no)} target="_blank" rel="noreferrer">{s.carrier} {s.tracking_no}</a></>}
                </div>
              </div>
            </div>
          ))}
          {!samples.length && <div className="small muted">Chưa có đơn mẫu. Import đơn TikTok ở tab Đơn mẫu.</div>}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Video ({videos.length})</div>
          {videos.map(v => (
            <div key={v.id} className="feed-item">
              <div className="grow">
                <div className="row" style={{ gap: 6 }}><a className="link ellipsis" href={v.url} target="_blank" rel="noreferrer">{v.title || v.url}</a></div>
                <div className="xs muted">{fmtNum(v.views)} views · {fmtMoney(v.gmv)}đ GMV · {fmtDate(v.created_at)} {v.verified && '· ✓ đúng kênh'}</div>
              </div>
              <VideoStatus s={v.status} />
            </div>
          ))}
          <div className="row" style={{ marginTop: 8 }}>
            <input className="input input-sm grow" placeholder="Dán link video để nộp hộ…" value={video} onChange={e => setVideo(e.target.value)} />
            <button className="btn btn-sm btn-primary" disabled={busy || !video} onClick={() => run(() => api('/api/videos', { method: 'POST', body: { creator_id: id, url: video } }).then(() => setVideo('')), 'Đã thêm video')}>Thêm</button>
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Lịch sử</div>
          {events.map(e => (
            <div key={e.id} className="feed-item">
              <span className="feed-dot" style={{ background: e.actor === 'system' ? 'var(--brand)' : e.actor === 'creator' ? 'var(--accent)' : 'var(--blue)' }} />
              <div className="grow">{e.message}<div className="xs muted">{e.actor === 'system' ? '🤖 tự động' : e.actor} · {fmtDateTime(e.created_at)}</div></div>
            </div>
          ))}
        </div>

        <button className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { if (confirm(`Xoá vĩnh viễn ${c.name}? Đơn mẫu và video liên quan cũng bị xoá.`)) run(() => api(`/api/creators/${id}`, { method: 'DELETE' }).then(onClose), 'Đã xoá'); }}>Xoá creator</button>
      </div>
    </Drawer>
  );
}
