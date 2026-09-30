import { useState, useRef } from 'react';
import { api, useLoad, Badge, Drawer, Field, Kpi, copy, parseCsv, downloadCsv } from '../ui';
import { fmtMoney, fmtNum, fmtDate, fmtDateTime, nicheLabel } from '../../lib/constants';
import { SERVICES, REQUEST_STATUS, REQUEST_STATUS_KEYS, GMV_BANDS, AD_BANDS, KOL_TIERS, serviceLabel, flagLabel } from '../../lib/clientOffer';

const bandL = (arr, v) => arr.find(x => x.v === v)?.l || '—';
const scoreTone = s => (s >= 70 ? 'green' : s >= 45 ? 'amber' : 'slate');
const due = d => d && new Date(d) <= new Date();
const yn = v => (v === true ? 'Có' : v === false ? 'Chưa' : '—');
const ACT = { note: '📝 Ghi chú', zalo: '💬 Zalo', call: '📞 Gọi', email: '✉ Email', meeting: '🤝 Họp', audit: '🔍 Gửi audit', proposal: '📄 Báo giá', status: '🔁 Trạng thái', created: '🆕 Tạo' };

function ClientDrawer({ id, onClose, toast, onChanged, go }) {
  const { data, reload, error } = useLoad(() => api(`/api/clients/${id}`), [id]);
  const [msg, setMsg] = useState('');
  const [type, setType] = useState('zalo');
  const [lost, setLost] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn, ok) => { setBusy(true); try { await fn(); if (ok) toast(ok); reload(); onChanged(); } catch (e) { toast(e.message); } finally { setBusy(false); } };
  if (error) return <Drawer onClose={onClose} title="Lỗi"><div className="alert alert-error">{error}</div></Drawer>;
  if (!data) return <Drawer onClose={onClose} title="Đang tải…"><div className="empty">Đang tải…</div></Drawer>;
  const r = data.request;
  const est = r.estimate || {}; const au = r.audit || {};
  const patch = body => run(() => api(`/api/clients/${id}`, { method: 'PATCH', body }), 'Đã cập nhật');
  return (
    <Drawer onClose={onClose} title={`${r.company || 'Lead'} · ${r.ref}`} sub={`${r.contact_name || '—'}${r.role ? ` · ${r.role}` : ''} · ${r.source === 'outbound' ? 'Outbound' : 'Inbound'} · ${fmtDate(r.created_at)}`}>
      <div className="stack" style={{ gap: 14 }}>
        {(r.flags || []).map(f => <div key={f} className={`alert ${f === 'coi' ? 'alert-error' : 'alert-info'} small`}>{flagLabel(f)}</div>)}
        {r.do_not_contact && <div className="alert alert-error small">⛔ Lead đã yêu cầu KHÔNG liên hệ — chỉ được ghi chú.</div>}

        <div className="card" style={{ padding: 14 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <Badge tone={REQUEST_STATUS[r.status]?.tone} dot>{REQUEST_STATUS[r.status]?.l}</Badge>
            <Badge tone={scoreTone(r.score)}>Điểm {r.score}</Badge>
          </div>
          <div className="xs muted" style={{ marginBottom: 10 }}>{r.score_reason}</div>
          <div className="grid g2" style={{ gap: 8 }}>
            <Field label="Trạng thái">
              <select className="select input-sm" value={r.status} disabled={busy} onChange={e => { if (e.target.value === 'lost') { if (!lost.trim()) { toast('Nhập lý do mất khách bên dưới trước'); return; } patch({ status: 'lost', lost_reason: lost }); } else patch({ status: e.target.value }); }}>
                {REQUEST_STATUS_KEYS.map(s => <option key={s} value={s}>{REQUEST_STATUS[s].l}</option>)}
              </select>
            </Field>
            <Field label="Hẹn liên hệ tiếp"><input className="input input-sm" type="date" value={r.next_action_at ? r.next_action_at.slice(0, 10) : ''} onChange={e => patch({ next_action_at: e.target.value || null })} /></Field>
          </div>
          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <input className="input input-sm grow" placeholder="Lý do mất khách (khi chọn Mất)" value={lost} onChange={e => setLost(e.target.value)} />
            <button className={`btn btn-sm${r.do_not_contact ? '' : ' btn-danger'}`} onClick={() => patch({ do_not_contact: !r.do_not_contact })}>{r.do_not_contact ? 'Bỏ chặn' : '⛔ Opt-out'}</button>
          </div>
          <div className="stack small" style={{ gap: 4, marginTop: 10 }}>
            <div>📞 {r.phone ? <a className="link" href={`tel:${r.phone}`}>{r.phone}</a> : '—'} {r.phone && <a className="link" href={`https://zalo.me/${r.phone.replace(/^\+84/, '0')}`} target="_blank" rel="noreferrer">· Zalo</a>} {r.email && <>· <a className="link" href={`mailto:${r.email}`}>{r.email}</a></>}</div>
            {r.shop_links && r.shop_links.split(/\n+/).filter(Boolean).map(l => <div key={l} className="ellipsis">🏪 <a className="link" href={l.startsWith('http') ? l : `https://${l}`} target="_blank" rel="noreferrer">{l}</a></div>)}
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Yêu cầu</div>
          <div className="row wrap" style={{ gap: 4, marginBottom: 8 }}>{(r.services || []).map(s => <Badge key={s} tone="blue">{serviceLabel(s)}</Badge>)}</div>
          <div className="grid g3" style={{ gap: 8 }}>
            {[['Ngành', r.niche ? nicheLabel(r.niche) : '—'], ['GMV/tháng', bandL(GMV_BANDS, r.gmv_band)], ['Ads/tháng', bandL(AD_BANDS, r.ad_spend_band)],
              ['Số KOL × video', `${r.creators_count} × ${r.videos_per_creator}`], ['Budget booking', fmtMoney(r.budget_booking) + 'đ'], ['Budget ads', fmtMoney(r.budget_ads) + 'đ'],
              ['Tier', (r.kol_tiers || []).map(t => KOL_TIERS.find(x => x.v === t)?.l).join(', ') || '—'], ['Mẫu', r.sample_product ? `${r.sample_product}${r.sample_qty ? ` ×${r.sample_qty}` : ''}` : '—'], ['Bắt đầu', fmtDate(r.start_date)]].map(([l, v]) => (
              <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}><div className="xs muted bold">{l}</div><div className="small bold">{v}</div></div>
            ))}
          </div>
          {r.brief && <div className="small" style={{ marginTop: 10, whiteSpace: 'pre-line' }}><b>Brief:</b> {r.brief}</div>}
          {r.kol_requirements && <div className="small" style={{ marginTop: 6 }}><b>Yêu cầu KOL:</b> {r.kol_requirements}</div>}
          {r.goal && <div className="small" style={{ marginTop: 6 }}><b>Mục tiêu:</b> {r.goal}</div>}
          {est.total > 0 && <div className="alert alert-info small" style={{ marginTop: 10 }}>📊 Ước tính {est.videos} video ≈ {fmtMoney(est.total)}đ{est.fit != null ? ` · budget đáp ứng ${Math.round(est.fit * 100)}%` : ''}</div>}
          {au.total != null && (
            <div className="small" style={{ marginTop: 8 }}>
              <b>Mini-audit {au.total}/100</b> — Ads {yn(r.ads_active)}{r.roas ? ` (ROAS ${r.roas})` : ''} · GMV Max {yn(r.gmv_max_active)} · Live {yn(r.live_active)} · KOC {yn(r.koc_active)}
              {(au.actions || []).map((t, i) => <div key={i} className="xs muted">{i + 1}. {t}</div>)}
            </div>
          )}
          {!r.campaign_id
            ? <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={() => { if (confirm('Chốt khách và tạo chiến dịch (ẩn khỏi landing) từ yêu cầu này?')) run(() => api(`/api/clients/${id}`, { method: 'POST', body: { action: 'convert' } }), 'Đã tạo chiến dịch'); }}>✓ Chốt → tạo chiến dịch</button>
            : <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => go('campaigns')}>Xem chiến dịch #{r.campaign_id} →</button>}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Outreach soạn sẵn <span className="xs muted">link audit riêng: {data.link_clicks} click</span></div>
          <div className="xs muted" style={{ marginTop: -6, marginBottom: 8 }}>Người thật gửi — không gửi hàng loạt. Tối đa 1 lần chạm / kênh / 24h, có câu từ chối.</div>
          {data.drafts.map(d => (
            <div key={d.key} style={{ borderTop: '1px solid var(--line-2)', padding: '8px 0' }}>
              <div className="row-between"><b className="small">D{d.day} · {d.ch}</b><button className="btn btn-sm" onClick={async () => toast((await copy(d.text)) ? 'Đã copy' : 'Không copy được')}>⧉ Copy</button></div>
              <div className="xs" style={{ whiteSpace: 'pre-line', color: 'var(--ink-2)', marginTop: 4 }}>{d.text}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Lịch sử chăm sóc ({r.touch_count} lần chạm)</div>
          <div className="row" style={{ gap: 6, marginBottom: 8 }}>
            <select className="select input-sm" style={{ width: 'auto' }} value={type} onChange={e => setType(e.target.value)}>{['zalo', 'call', 'email', 'meeting', 'audit', 'proposal', 'note'].map(t => <option key={t} value={t}>{ACT[t]}</option>)}</select>
            <input className="input input-sm grow" placeholder="Kết quả / nội dung…" value={msg} onChange={e => setMsg(e.target.value)} />
            <button className="btn btn-sm btn-primary" disabled={busy || !msg.trim()} onClick={() => run(() => api(`/api/clients/${id}`, { method: 'POST', body: { type, message: msg } }).then(() => setMsg('')), 'Đã ghi')}>Ghi</button>
          </div>
          {data.activities.map(a => (
            <div key={a.id} className="feed-item"><span className="xs" style={{ width: 86, flexShrink: 0 }}>{ACT[a.type] || a.type}</span><div className="grow small">{a.message}<div className="xs muted">{fmtDateTime(a.created_at)}</div></div></div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

export default function Clients({ toast, go }) {
  const [f, setF] = useState({ status: 'open', service: 'all', source: 'all', search: '', flag: '' });
  const [openId, setOpenId] = useState(null);
  const fileRef = useRef();
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== 'all')).toString();
  const { data, reload, error, loading } = useLoad(() => api('/api/clients?' + qs), [qs]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const rs = data?.requests || []; const s = data?.summary || {};
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const onFile = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      const r = await api('/api/clients', { method: 'POST', body: { rows } });
      toast(`Import: +${r.created} lead · trùng ${r.duplicate} · opt-out ${r.suppressed} · thiếu cơ sở pháp lý ${r.invalid}`); reload();
    } catch (err) { toast(err.message); }
  };
  const template = () => downloadCsv('mau-import-lead.csv',
    ['shop_name', 'shop_url', 'platform', 'category', 'gmv_band', 'ads_active', 'gmv_max_active', 'live_active', 'koc_active', 'contact_name', 'role', 'phone', 'email', 'lawful_basis', 'source'],
    [['Brand A', 'https://www.tiktok.com/@brand_a', 'tiktok', 'lam_dep', '500m_2b', 'y', 'n', 'n', 'y', 'Chị Mai', 'Marketing Lead', '0901234567', 'mai@branda.vn', 'referral', 'Giới thiệu từ anh X']]);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Khách hàng (Brand)</h1><div className="small muted">Inbound từ trang <a className="link" href="/brands" target="_blank" rel="noreferrer">/brands</a> + outbound import · chấm điểm tự động · nhắc follow-up</div></div>
        <div className="row wrap">
          <button className="btn" onClick={async () => toast((await copy(`${origin}/brands`)) ? 'Đã copy link trang đăng ký cho brand' : `${origin}/brands`)}>🔗 Copy link /brands</button>
          <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={onFile} />
          <button className="btn" onClick={() => fileRef.current.click()}>⬆ Import lead outbound</button>
          <button className="btn btn-sm" onClick={template}>⬇ File mẫu</button>
        </div>
      </div>

      <div className="grid g4">
        <Kpi label="Lead mới 7 ngày" value={fmtNum(s.new_7d)} sub={`${fmtNum(s.open)} đang mở`} />
        <Kpi label="Đến hạn follow-up" value={fmtNum(s.due)} tone={s.due ? 'red' : undefined} sub="Hôm nay cần liên hệ" />
        <Kpi hero label="Pipeline (budget đang mở)" value={fmtMoney(s.pipeline) + 'đ'} sub={`Đã chốt ${fmtMoney(s.won_value)}đ`} />
        <Kpi label="Win rate" value={s.win_rate != null ? `${s.win_rate}%` : '—'} sub={`${fmtNum(s.won)} khách chốt`} />
      </div>

      <div className="alert alert-info small">🛡 <span>Chỉ import lead có <b>cơ sở pháp lý</b> (consent / B2B hợp lệ / referral) — không import dữ liệu scrape. Lead nói "không" → bấm <b>Opt-out</b>, app sẽ chặn mọi lần import sau.</span></div>

      <div className="row wrap" style={{ gap: 8 }}>
        <div className="tabs">
          {[['open', 'Đang mở'], ['all', 'Tất cả'], ['won', 'Chốt'], ['lost', 'Mất']].map(([v, l]) => <button key={v} className={`tab${f.status === v && !f.flag ? ' on' : ''}`} onClick={() => setF(p => ({ ...p, status: v, flag: '' }))}>{l}</button>)}
          <button className={`tab${f.flag === 'due' ? ' on' : ''}`} onClick={() => set('flag', f.flag === 'due' ? '' : 'due')}>⏰ Đến hạn</button>
        </div>
        <input className="input input-sm" style={{ width: 200 }} placeholder="Tìm brand, SĐT, link shop…" value={f.search} onChange={e => set('search', e.target.value)} />
        <select className="select input-sm" style={{ width: 'auto' }} value={f.service} onChange={e => set('service', e.target.value)}><option value="all">Mọi dịch vụ</option>{SERVICES.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}</select>
        <select className="select input-sm" style={{ width: 'auto' }} value={f.source} onChange={e => set('source', e.target.value)}><option value="all">Inbound + outbound</option><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select>
      </div>

      {error && <div className="alert alert-error">⚠ {error}</div>}
      <div className="card-flat table-wrap">
        <table className="table">
          <thead><tr><th>Brand</th><th className="hide-sm">Dịch vụ</th><th className="hide-sm">Quy mô</th><th>Budget</th><th>Điểm</th><th className="hide-sm">Trạng thái</th><th>Liên hệ tiếp</th></tr></thead>
          <tbody>
            {rs.map(r => (
              <tr key={r.id} className="clickable" onClick={() => setOpenId(r.id)}>
                <td><div className="bold ellipsis" style={{ maxWidth: 200 }}>{r.company || '—'}</div><div className="xs muted">{r.ref} · {r.contact_name || '—'} · {r.source === 'outbound' ? 'Outbound' : 'Inbound'}</div></td>
                <td className="hide-sm"><div className="row wrap" style={{ gap: 3 }}>{(r.services || []).slice(0, 3).map(x => <Badge key={x} tone="blue">{serviceLabel(x)}</Badge>)}</div></td>
                <td className="hide-sm small">{bandL(GMV_BANDS, r.gmv_band)}<div className="xs muted">{r.niche ? nicheLabel(r.niche) : ''}</div></td>
                <td className="tnum small bold">{fmtMoney(Number(r.budget_booking) + Number(r.budget_ads))}đ{r.creators_count ? <div className="xs muted">{r.creators_count} KOL × {r.videos_per_creator}</div> : null}</td>
                <td><Badge tone={scoreTone(r.score)}>{r.score}</Badge>{(r.flags || []).includes('coi') && <span title={flagLabel('coi')}> ⚠</span>}{(r.flags || []).some(x => x.startsWith('partner:')) && <span title={flagLabel(r.flags.find(x => x.startsWith('partner:')))}> ↗</span>}</td>
                <td className="hide-sm"><Badge tone={REQUEST_STATUS[r.status]?.tone} dot>{REQUEST_STATUS[r.status]?.l}</Badge></td>
                <td className="small">{r.do_not_contact ? <span className="muted">⛔ opt-out</span> : r.next_action_at ? <span style={{ color: due(r.next_action_at) ? 'var(--red)' : undefined, fontWeight: due(r.next_action_at) ? 700 : 400 }}>{fmtDate(r.next_action_at)}</span> : '—'}<div className="xs muted">{r.touch_count} lần chạm</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && !data && <div className="empty">Đang tải…</div>}
        {data && !rs.length && <div className="empty">Chưa có lead. Gửi link <b>/brands</b> cho khách hoặc tạo link tracking đích "Brand" ở tab Tuyển & Link.</div>}
      </div>
      {data?.score_formula && <div className="xs muted">Điểm = {data.score_formula}</div>}
      {openId && <ClientDrawer id={openId} onClose={() => setOpenId(null)} toast={toast} onChanged={reload} go={go} />}
    </div>
  );
}
