import { useState } from 'react';
import { api, useLoad, Avatar, Badge, CreatorStatus, SampleStatus, VideoStatus, Drawer, Field, downloadCsv, copy } from '../ui';
import {
  CREATOR_STATUS, CREATOR_STATUS_KEYS, NICHES, TIERS, nicheLabel, gmvLabel,
  fmtNum, fmtMoney, fmtDate, fmtDateTime, trackingUrl,
} from '../../lib/constants';

const scoreTone = s => (s >= 0.3 ? 'green' : s >= 0.15 ? 'amber' : 'red');
const profileUrl = l => (l ? (l.startsWith('http') ? l : 'https://' + l) : '#');

const SOURCES = [['all', 'Mọi nguồn'], ['form', 'Tự đăng ký'], ['fb_group', 'Group FB'], ['referral', 'Giới thiệu'], ['invite', 'Được mời'], ['invite_accepted', 'Mời → đã điền']];
const SOURCE_L = Object.fromEntries(SOURCES);
const healthTone = h => (h >= 70 ? 'green' : h >= 45 ? 'amber' : 'red');
const ago = d => {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d)) / 864e5);
  return days <= 0 ? 'hôm nay' : days === 1 ? 'hôm qua' : `${days} ngày trước`;
};

export default function Creators({ openCreator, initial = {}, toast, go }) {
  const [f, setF] = useState({ segment: initial.segment || '', status: initial.status || 'all', niche: 'all', ct: 'all', source: 'all', tier: 'all', sort: 'health', search: '', page: 1 });
  const set = (k, v) => setF(p => ({ ...p, [k]: v, page: k === 'page' ? v : 1 }));
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== '' && v !== 'all')).toString();
  const { data, loading, error, reload } = useLoad(() => api('/api/creators?' + qs), [qs]);
  const [busy, setBusy] = useState(null);
  const [sel, setSel] = useState([]);

  const quick = async (id, status) => {
    setBusy(id);
    try { await api(`/api/creators/${id}`, { method: 'PATCH', body: { status } }); toast(`Đã chuyển → ${CREATOR_STATUS[status].l}`); reload(); }
    catch (e) { toast(e.message); } finally { setBusy(null); }
  };
  const bulk = async status => {
    if (!sel.length) return;
    setBusy('bulk');
    try { const r = await api('/api/creators/bulk', { method: 'POST', body: { ids: sel, status } }); toast(`Đã cập nhật ${r.updated} creator`); setSel([]); reload(); }
    catch (e) { toast(e.message); } finally { setBusy(null); }
  };

  const runAction = async (c, a) => {
    const portal = `${window.location.origin}/portal/${c.portal_token}`;
    if (a.key === 'review') return openCreator(c.id);
    if (a.key === 'offer') return go('deals', { offerFor: c });
    if (a.key === 'invite') { const ok = await copy(`${window.location.origin}/?h=${encodeURIComponent(c.handle || '')}&utm_source=invite`); return toast(ok ? 'Đã copy link mời — gửi lại cho creator' : 'Không copy được'); }
    if (a.key === 'nudge' || a.key === 'address') {
      const msg = a.key === 'nudge'
        ? `Chào ${c.name}, bạn đã nhận mẫu nhưng chưa đăng video. Nộp link video tại: ${portal}`
        : `Chào ${c.name}, cập nhật địa chỉ nhận mẫu giúp team tại: ${portal}`;
      const ok = await copy(msg); return toast(ok ? 'Đã copy tin nhắn nhắc (kèm link portal) — gửi qua Zalo/SĐT' : msg);
    }
    if (a.tab) return go(a.tab);
  };

  const exportAll = async () => {
    try {
      const q = new URLSearchParams(Object.entries({ ...f, page: '' }).filter(([, v]) => v !== '' && v !== 'all'));
      q.set('export', '1');
      const d = await api('/api/creators?' + q.toString());
      const rows = d.creators.map(c => [c.name, c.handle, c.phone, c.email, SOURCE_L[c.source] || c.source, c.platform, nicheLabel(c.niche), c.followers, c.avg_views, c.score, TIERS[c.tier]?.l, c.health, c.gmv, c.gpv ?? '', c.on_time_rate == null ? '' : Math.round(c.on_time_rate * 100) + '%', c.sample_count, c.video_count, c.active_deals, c.booked_fee, c.ask_fee ?? '', c.ask_videos ?? '', c.next_action?.l || '', c.status, c.address, c.ship_address, fmtDate(c.applied_at), fmtDate(c.last_activity)]);
      downloadCsv(`kol-${new Date().toISOString().slice(0, 10)}.csv`, ['Tên', 'Handle', 'SĐT', 'Email', 'Nguồn', 'Nền tảng', 'Lĩnh vực', 'Followers', 'Avg views', 'Score', 'Tier', 'Sức khoẻ', 'GMV', 'GMV/view', 'Đúng hạn', 'Số mẫu', 'Số video', 'Deal đang chạy', 'Phí đã chốt', 'Giá mong muốn/video', 'Video mong muốn/tháng', 'Việc tiếp theo', 'Status', 'Tỉnh', 'Địa chỉ nhận', 'Ngày ĐK', 'Hoạt động cuối'], rows);
      toast(`Đã xuất ${rows.length} creator`);
    } catch (e) { toast(e.message); }
  };

  const cs = data?.creators || [];
  const allOn = cs.length > 0 && cs.every(c => sel.includes(c.id));
  const segTabs = [['', 'Tất cả'], ['todo', '⚡ Cần xử lý'], ['idle', '💤 Chưa có việc'], ['top', '🏆 Ra GMV']];
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Bảng KOL</h1><div className="small muted">{data ? `${fmtNum(data.total)} hồ sơ` : '…'} · sắp theo điểm sức khoẻ, mỗi dòng có gợi ý việc tiếp theo</div></div>
        <div className="row"><button className="btn" onClick={exportAll}>⬇ Export tất cả (theo bộ lọc)</button><a className="btn" href="/" target="_blank" rel="noreferrer">Trang đăng ký ↗</a></div>
      </div>

      <div className="tabs">
        {segTabs.map(([v, l]) => <button key={v || 'all'} className={`tab${f.segment === v ? ' on' : ''}`} onClick={() => set('segment', v)}>{l}</button>)}
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        <input className="input input-sm" style={{ width: 200 }} placeholder="Tìm tên, @handle, SĐT…" value={f.search} onChange={e => set('search', e.target.value)} />
        <select className="select input-sm" style={{ width: 'auto' }} value={f.status} onChange={e => set('status', e.target.value)}>
          <option value="all">Mọi trạng thái</option>{CREATOR_STATUS_KEYS.map(s => <option key={s} value={s}>{CREATOR_STATUS[s].l}</option>)}
        </select>
        <select className="select input-sm" style={{ width: 'auto' }} value={f.tier} onChange={e => set('tier', e.target.value)}>
          <option value="all">Mọi tier</option>{Object.entries(TIERS).map(([k, t]) => <option key={k} value={k}>{t.l}</option>)}
        </select>
        <select className="select input-sm" style={{ width: 'auto' }} value={f.source} onChange={e => set('source', e.target.value)}>
          {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="select input-sm" style={{ width: 'auto' }} value={f.niche} onChange={e => set('niche', e.target.value)}>
          <option value="all">Mọi lĩnh vực</option>{NICHES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
        </select>
        <select className="select input-sm" style={{ width: 'auto' }} value={f.sort} onChange={e => set('sort', e.target.value)}>
          <option value="health">Sức khoẻ cao</option><option value="gpv">GMV/view cao</option><option value="gmv">GMV cao</option><option value="score">Engagement cao</option><option value="activity">Hoạt động gần nhất</option><option value="new">Mới đăng ký</option><option value="followers">Followers</option>
        </select>
      </div>

      {sel.length > 0 && (
        <div className="card row wrap" style={{ padding: '10px 14px', gap: 8, background: 'var(--brand-50)', borderColor: 'var(--brand-100)' }}>
          <b className="small">Đã chọn {sel.length}</b>
          <button className="btn btn-sm btn-primary" disabled={busy === 'bulk'} onClick={() => bulk('approved')}>✓ Duyệt</button>
          <button className="btn btn-sm btn-danger" disabled={busy === 'bulk'} onClick={() => bulk('rejected')}>✕ Từ chối</button>
          <button className="btn btn-sm" disabled={busy === 'bulk'} onClick={() => bulk('inactive')}>Tạm nghỉ</button>
          <button className="btn btn-sm" onClick={() => setSel([])}>Bỏ chọn</button>
        </div>
      )}

      {error && <div className="alert alert-error">⚠ {error}</div>}

      <div className="card-flat">
        <div className="table-wrap">
          <table className="table kol-table">
            <thead><tr>
              <th style={{ width: 32 }}><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? sel.filter(id => !cs.some(c => c.id === id)) : [...new Set([...sel, ...cs.map(c => c.id)])])} aria-label="Chọn tất cả" /></th>
              <th>Creator</th><th className="hide-sm">Kênh</th><th title={data?.health_formula}>Sức khoẻ ⓘ</th><th className="hide-sm">Hiệu quả</th><th className="hide-sm">Mức cast</th><th className="hide-sm">Mẫu · Video · Deal</th><th className="hide-sm">Việc tiếp theo</th><th className="hide-sm">Trạng thái</th>
            </tr></thead>
            <tbody>
              {loading && !cs.length ? <tr><td colSpan={9} className="empty">Đang tải…</td></tr> :
               !cs.length ? <tr><td colSpan={9} className="empty">Không có creator phù hợp</td></tr> :
               cs.map(c => {
                const s = Number(c.score) || 0;
                const a = c.next_action;
                return (
                  <tr key={c.id} className="clickable" onClick={() => openCreator(c.id)}>
                    <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel.includes(c.id)} onChange={() => setSel(p => (p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id]))} aria-label={`Chọn ${c.name}`} /></td>
                    <td>
                      <div className="row" style={{ gap: 9 }}>
                        <Avatar name={c.name} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div className="bold ellipsis" style={{ maxWidth: 170 }}>{c.name}</div>
                          <div className="xs muted">{SOURCE_L[c.source] || c.source} · {ago(c.last_activity)}</div>
                          {c.next_action && <button className={`badge tone-${c.next_action.tone} show-sm`} style={{ border: 'none', marginTop: 4 }} onClick={e => { e.stopPropagation(); runAction(c, c.next_action); }}>{c.next_action.l} →</button>}
                        </div>
                      </div>
                    </td>
                    <td className="hide-sm">
                      <a className="link small" href={profileUrl(c.tiktok_link)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{c.handle ? '@' + c.handle : c.platform}</a>
                      <div className="xs muted">{fmtNum(c.followers)} fl · <span style={{ color: `var(--${scoreTone(s)})` }}>ER {s.toFixed(2)}</span> · {nicheLabel(c.niche)}</div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <b className="tnum" style={{ color: `var(--${healthTone(c.health)})`, minWidth: 24 }}>{c.health}</b>
                        <div className="progress" style={{ width: 54 }}><span style={{ width: `${c.health}%`, background: `var(--${healthTone(c.health)})` }} /></div>
                      </div>
                      <Badge tone={TIERS[c.tier]?.tone}>{TIERS[c.tier]?.l}</Badge>
                    </td>
                    <td className="small tnum hide-sm">
                      <b style={{ color: c.gmv > 0 ? 'var(--brand-700)' : 'var(--muted)' }}>{c.gmv > 0 ? fmtMoney(c.gmv) + 'đ' : '—'}</b>
                      <div className="xs muted">{c.gpv != null ? `${fmtNum(c.gpv)}đ/view` : 'chưa có view'}{c.on_time_rate != null ? ` · đúng hạn ${Math.round(c.on_time_rate * 100)}%` : ''}</div>
                    </td>
                    <td className="small tnum hide-sm">
                      {c.ask_fee != null ? <b>{fmtMoney(c.ask_fee)}đ</b> : <span className="muted">{c.ask_types ? 'Barter' : '—'}</span>}
                      {c.ask_videos ? <div className="xs muted">{c.ask_videos} video/tháng</div> : null}
                    </td>
                    <td className="small tnum hide-sm">{c.sample_count} · {c.video_count} · {c.active_deals}{c.booked_fee > 0 && <div className="xs muted">phí {fmtMoney(c.booked_fee)}đ</div>}</td>
                    <td className="hide-sm" onClick={e => e.stopPropagation()}>
                      {a ? (
                        a.key === 'review' ? (
                          <div className="row" style={{ gap: 4 }}>
                            <button className="btn btn-sm btn-primary" disabled={busy === c.id} onClick={() => quick(c.id, 'approved')}>Duyệt</button>
                            <button className="btn btn-sm btn-danger" disabled={busy === c.id} onClick={() => quick(c.id, 'rejected')}>✕</button>
                          </div>
                        ) : <button className={`badge tone-${a.tone}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => runAction(c, a)}>{a.l} →</button>
                      ) : <span className="xs muted">—</span>}
                    </td>
                    <td className="hide-sm"><CreatorStatus s={c.status} />{c.screen_reason && ['pending', 'rejected'].includes(c.status) && <div className="xs muted ellipsis" style={{ maxWidth: 150 }} title={c.screen_reason}>{c.screen_reason}</div>}</td>
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
      {data?.health_formula && <div className="xs muted">Điểm sức khoẻ = {data.health_formula}</div>}
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
  const { creator: c, samples, videos, events, referrals, rate_card: rc } = data;
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
          <div className="card-title">💵 Mức cast creator đề xuất</div>
          {rc ? (
            <div className="grid g3" style={{ gap: 8 }}>
              {[['Giá / video', rc.video_fee != null ? fmtMoney(rc.video_fee) + 'đ' : 'Barter'], ['Video / tháng', rc.videos_per_month ?? '—'], ['% hoa hồng', rc.commission_pct != null ? rc.commission_pct + '%' : '—'],
                ['Live / giờ', rc.live_hour_fee != null ? fmtMoney(rc.live_hour_fee) + 'đ' : '—'], ['Spark code', rc.spark_fee_pct != null ? `+${rc.spark_fee_pct}%` : '—'], ['Hình thức', (rc.deal_types || []).join(', ') || '—']].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}><div className="xs muted bold">{l}</div><div className="bold tnum small">{v}</div></div>
              ))}
            </div>
          ) : <div className="small muted">Creator chưa khai mức cast.</div>}
          {rc?.note && <div className="xs muted" style={{ marginTop: 6 }}>{rc.note}</div>}
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
