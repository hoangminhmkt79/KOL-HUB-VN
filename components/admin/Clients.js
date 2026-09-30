import { useState, useRef } from 'react';
import { api, useLoad, Badge, Drawer, Field, Kpi, copy, parseCsv, downloadCsv } from '../ui';
import { fmtMoney, fmtNum, fmtDate, fmtDateTime, nicheLabel } from '../../lib/constants';
import { SERVICES, REQUEST_STATUS, REQUEST_STATUS_KEYS, GMV_BANDS, AD_BANDS, KOL_TIERS, PAIN_POINTS, CURRENT_PARTNER, TIMELINES, CONTACT_CHANNELS, HEARD_FROM, optLabel, serviceLabel, flagLabel } from '../../lib/clientOffer';
import { NICHES } from '../../lib/constants';
import { DISCOVERY_AREAS, QUESTIONS, questionsFor, preCallText } from '../../lib/discovery';

const bandL = (arr, v) => arr.find(x => x.v === v)?.l || '—';
const scoreTone = s => (s >= 70 ? 'green' : s >= 45 ? 'amber' : 'slate');
const due = d => d && new Date(d) <= new Date();
const yn = v => (v === true ? 'Có' : v === false ? 'Chưa' : '? (cần hỏi)');
const ACT = { note: '📝 Ghi chú', zalo: '💬 Zalo', call: '📞 Gọi', email: '✉ Email', meeting: '🤝 Họp', audit: '🔍 Gửi audit', proposal: '📄 Báo giá', status: '🔁 Trạng thái', created: '🆕 Tạo' };

const Info = ({ l, v }) => (
  <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px', minWidth: 0 }}>
    <div className="xs muted bold">{l}</div><div className="small bold" style={{ overflowWrap: 'anywhere' }}>{v || <span className="muted" style={{ fontWeight: 400 }}>— cần hỏi</span>}</div>
  </div>
);
const Section = ({ title, children }) => (
  <div style={{ marginTop: 12 }}><div className="label">{title}</div><div className="grid g3" style={{ gap: 8 }}>{children}</div></div>
);

// Tóm tắt 1 khách để dán vào proposal / chat nội bộ
function summaryText(r) {
  const lines = [
    `KHÁCH HÀNG ${r.ref} — ${r.company}${r.legal_name ? ` (${r.legal_name}${r.tax_code ? `, MST ${r.tax_code}` : ''})` : ''}`,
    `Liên hệ: ${r.contact_name}${r.role ? ` · ${r.role}` : ''} · ${r.phone || ''} ${r.email || ''} · ưu tiên ${optLabel(CONTACT_CHANNELS, r.contact_channel) || '—'} ${r.contact_time || ''}`,
    `Dịch vụ: ${(r.services || []).map(serviceLabel).join(', ')}`,
    `Kênh: ${(r.platforms || []).join(', ')} · Ngành: ${r.niche ? nicheLabel(r.niche) : '—'} · GMV ${bandL(GMV_BANDS, r.gmv_band)} · Ads ${bandL(AD_BANDS, r.ad_spend_band)} · AOV ${Number(r.aov) ? fmtMoney(r.aov) + 'đ' : '—'}`,
    `Shop: ${String(r.shop_links || '').replace(/\n+/g, ' | ')}`,
    `Sản phẩm chủ lực: ${r.top_products || r.sample_product || '—'} · KH mục tiêu: ${r.target_customer || '—'} · Đối thủ: ${r.competitors || '—'}`,
    `Vấn đề: ${(r.pain_points || []).map(p => optLabel(PAIN_POINTS, p)).join(', ') || '—'} · Đang làm với: ${optLabel(CURRENT_PARTNER, r.current_partner) || '—'}`,
    `Mục tiêu: ${r.goal || '—'} · Triển khai: ${optLabel(TIMELINES, r.timeline) || '—'}`,
    `KOL: ${r.creators_count} × ${r.videos_per_creator} video · tier ${(r.kol_tiers || []).join(', ') || '—'} · budget booking ${fmtMoney(r.budget_booking)}đ · ads ${fmtMoney(r.budget_ads)}đ/tháng`,
    `Mini-audit: ${r.audit?.total ?? '—'}/100 · Điểm lead ${r.score}`,
  ];
  const ans = QUESTIONS.filter(q => r.discovery?.[q.key]);
  if (ans.length) lines.push('', 'TRẢ LỜI AUDIT:', ...ans.map(q => `• ${q.q}\n  → ${r.discovery[q.key]}`));
  return lines.join('\n');
}

const EDIT_FIELDS = ['company', 'contact_name', 'role', 'phone', 'email', 'contact_channel', 'contact_time', 'legal_name', 'tax_code', 'website', 'fanpage', 'shop_links',
  'niche', 'gmv_band', 'ad_spend_band', 'aov', 'top_products', 'target_customer', 'competitors', 'pain_points', 'current_partner', 'goal', 'timeline',
  'creators_count', 'videos_per_creator', 'budget_booking', 'budget_ads', 'brief', 'kol_requirements', 'heard_from'];

function ProfileEditor({ r, onCancel, onSave, busy }) {
  const [f, setF] = useState(() => Object.fromEntries(EDIT_FIELDS.map(k => [k, Array.isArray(r[k]) ? r[k] : r[k] ?? ''])));
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const sel = (k, opts) => <select className="select input-sm" value={f[k] || ''} onChange={set(k)}><option value="">—</option>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>;
  const inp = (k, ph, type) => <input className="input input-sm" type={type || 'text'} value={f[k] ?? ''} onChange={set(k)} placeholder={ph} />;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="grid g2" style={{ gap: 8 }}>
        <Field label="Brand">{inp('company')}</Field><Field label="Người liên hệ">{inp('contact_name')}</Field>
        <Field label="Vai trò">{inp('role')}</Field><Field label="SĐT / Zalo">{inp('phone')}</Field>
        <Field label="Email">{inp('email')}</Field><Field label="Kênh liên hệ ưu tiên">{sel('contact_channel', CONTACT_CHANNELS)}</Field>
        <Field label="Khung giờ liên hệ">{inp('contact_time', '9h–11h')}</Field><Field label="Biết qua">{sel('heard_from', HEARD_FROM)}</Field>
        <Field label="Tên pháp nhân">{inp('legal_name')}</Field><Field label="Mã số thuế">{inp('tax_code')}</Field>
        <Field label="Website">{inp('website', 'https://')}</Field><Field label="Fanpage">{inp('fanpage')}</Field>
        <Field label="Ngành">{sel('niche', NICHES)}</Field><Field label="GMV / tháng">{sel('gmv_band', GMV_BANDS)}</Field>
        <Field label="Ads / tháng">{sel('ad_spend_band', AD_BANDS)}</Field><Field label="AOV (VNĐ)">{inp('aov', '', 'number')}</Field>
        <Field label="Đang làm với">{sel('current_partner', CURRENT_PARTNER)}</Field><Field label="Triển khai">{sel('timeline', TIMELINES)}</Field>
        <Field label="Số KOL">{inp('creators_count', '', 'number')}</Field><Field label="Video / KOL">{inp('videos_per_creator', '', 'number')}</Field>
        <Field label="Budget booking">{inp('budget_booking', '', 'number')}</Field><Field label="Budget ads / tháng">{inp('budget_ads', '', 'number')}</Field>
      </div>
      <Field label="Vấn đề đang gặp">
        <div className="row wrap" style={{ gap: 4 }}>{PAIN_POINTS.map(p => <button key={p.v} type="button" className={`btn btn-sm${(f.pain_points || []).includes(p.v) ? ' btn-primary' : ''}`} onClick={() => setF(x => ({ ...x, pain_points: (x.pain_points || []).includes(p.v) ? x.pain_points.filter(y => y !== p.v) : [...(x.pain_points || []), p.v] }))}>{p.l}</button>)}</div>
      </Field>
      <Field label="Link shop (mỗi dòng 1 link)"><textarea className="textarea small" rows={2} value={f.shop_links} onChange={set('shop_links')} /></Field>
      <div className="grid g2" style={{ gap: 8 }}>
        <Field label="Sản phẩm chủ lực">{inp('top_products')}</Field><Field label="Khách hàng mục tiêu">{inp('target_customer')}</Field>
        <Field label="Đối thủ">{inp('competitors')}</Field><Field label="Mục tiêu">{inp('goal')}</Field>
      </div>
      <Field label="Brief"><textarea className="textarea small" rows={3} value={f.brief} onChange={set('brief')} /></Field>
      <Field label="Yêu cầu KOL"><textarea className="textarea small" rows={2} value={f.kol_requirements} onChange={set('kol_requirements')} /></Field>
      <div className="row"><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onSave({ ...f, website_url: f.website })}>Lưu hồ sơ</button><button className="btn btn-sm" onClick={onCancel}>Huỷ</button></div>
    </div>
  );
}

function Discovery({ r, id, toast, onSaved }) {
  const qs = questionsFor(r);
  const [area, setArea] = useState(() => {
    const cnt = {}; qs.filter(q => q.priority).forEach(q => { cnt[q.area] = (cnt[q.area] || 0) + 1; });
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || 'business';
  });
  const [ans, setAns] = useState(() => ({ ...(r.discovery || {}) }));
  const [busy, setBusy] = useState(false);
  const answered = QUESTIONS.filter(q => (r.discovery || {})[q.key]).length;
  const dirty = QUESTIONS.some(q => (ans[q.key] || '') !== ((r.discovery || {})[q.key] || ''));
  const save = async () => {
    setBusy(true);
    try {
      const diff = Object.fromEntries(QUESTIONS.filter(q => (ans[q.key] || '') !== ((r.discovery || {})[q.key] || '')).map(q => [q.key, ans[q.key] || '']));
      await api(`/api/clients/${id}`, { method: 'PATCH', body: { discovery: diff } });
      toast('Đã lưu câu trả lời'); onSaved();
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const inArea = qs.filter(q => q.area === area);
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="card-title">🎯 Bộ câu hỏi audit & tư vấn <span className="xs muted">{answered}/{QUESTIONS.length} đã trả lời</span></div>
      <div className="xs muted" style={{ marginTop: -6, marginBottom: 8 }}>Câu có ⭐ là ưu tiên theo dịch vụ + vấn đề khách chọn. Gửi trước qua Zalo để buổi gọi ngắn và sát hơn.</div>
      <button className="btn btn-sm" style={{ marginBottom: 10 }} onClick={async () => toast((await copy(preCallText(r))) ? 'Đã copy bộ câu hỏi gửi khách' : 'Không copy được')}>⧉ Copy câu hỏi gửi khách trước buổi gọi</button>
      <div className="tabs" style={{ marginBottom: 10 }}>
        {DISCOVERY_AREAS.map(a => {
          const n = qs.filter(q => q.area === a.v); const star = n.some(q => q.priority); const done = n.filter(q => ans[q.key]).length;
          return <button key={a.v} className={`tab${area === a.v ? ' on' : ''}`} onClick={() => setArea(a.v)}>{a.ic} {a.l}{star ? ' ⭐' : ''} <span className="muted">{done}/{n.length}</span></button>;
        })}
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {inArea.map(q => (
          <div key={q.key}>
            <div className="small bold">{q.priority ? '⭐ ' : ''}{q.q}</div>
            <div className="xs muted" style={{ margin: '2px 0 4px' }}>Vì sao hỏi: {q.why}</div>
            <textarea className="textarea small" rows={2} placeholder="Ghi câu trả lời…" value={ans[q.key] || ''} onChange={e => setAns(p => ({ ...p, [q.key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} disabled={busy || !dirty} onClick={save}>Lưu câu trả lời</button>
    </div>
  );
}

function ClientDrawer({ id, onClose, toast, onChanged, go }) {
  const { data, reload, error } = useLoad(() => api(`/api/clients/${id}`), [id]);
  const [msg, setMsg] = useState('');
  const [type, setType] = useState('zalo');
  const [lost, setLost] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(null);
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
          <div className="card-title">Hồ sơ khách hàng
            <div className="row" style={{ gap: 4 }}>
              <button className="btn btn-sm" onClick={async () => toast((await copy(summaryText(r))) ? 'Đã copy tóm tắt khách hàng' : 'Không copy được')}>⧉ Tóm tắt</button>
              {!editing && <button className="btn btn-sm btn-primary" onClick={() => setEditing(true)}>✎ Sửa / bổ sung</button>}
            </div>
          </div>
          {data.completeness && (
            <div style={{ marginBottom: 8 }}>
              <div className="row" style={{ gap: 8 }}><div className="progress grow"><span style={{ width: `${data.completeness.pct}%`, background: data.completeness.pct >= 80 ? 'var(--green)' : data.completeness.pct >= 50 ? 'var(--amber)' : 'var(--red)' }} /></div><b className="small tnum">{data.completeness.pct}%</b></div>
              {data.completeness.missing.length > 0 && <div className="xs muted" style={{ marginTop: 4 }}>📋 Hỏi thêm khi gọi: {data.completeness.missing.join(' · ')}</div>}
            </div>
          )}
          {editing ? <ProfileEditor r={r} busy={busy} onCancel={() => setEditing(false)} onSave={profile => run(() => api(`/api/clients/${id}`, { method: 'PATCH', body: { profile } }).then(() => setEditing(false)), 'Đã lưu hồ sơ & chấm lại điểm')} /> : <>
          <div className="row wrap" style={{ gap: 4 }}>{(r.services || []).map(s => <Badge key={s} tone="blue">{serviceLabel(s)}</Badge>)}</div>
          <Section title="Công ty & liên hệ">
            <Info l="Pháp nhân" v={r.legal_name} /><Info l="Mã số thuế" v={r.tax_code} /><Info l="Vai trò" v={r.role ? `${r.role}${r.is_decision_maker ? ' · người quyết định' : ''}` : ''} />
            <Info l="Liên hệ qua" v={[optLabel(CONTACT_CHANNELS, r.contact_channel), r.contact_time].filter(Boolean).join(' · ')} /><Info l="Website" v={r.website} /><Info l="Fanpage" v={r.fanpage} />
          </Section>
          <Section title="Kênh bán & quy mô">
            <Info l="Kênh" v={(r.platforms || []).join(', ')} /><Info l="Ngành" v={r.niche ? nicheLabel(r.niche) : ''} /><Info l="GMV / tháng" v={r.gmv_band ? bandL(GMV_BANDS, r.gmv_band) : ''} />
            <Info l="Ads / tháng" v={r.ad_spend_band ? bandL(AD_BANDS, r.ad_spend_band) : ''} /><Info l="AOV" v={Number(r.aov) ? fmtMoney(r.aov) + 'đ' : ''} /><Info l="Đang làm với" v={optLabel(CURRENT_PARTNER, r.current_partner)} />
          </Section>
          <Section title="Sản phẩm & khách hàng">
            <Info l="Sản phẩm chủ lực" v={r.top_products} /><Info l="Mẫu" v={r.sample_product ? `${r.sample_product}${r.sample_qty ? ` ×${r.sample_qty}` : ''}${Number(r.sample_value) ? ` · ${fmtMoney(r.sample_value)}đ/mẫu` : ''}` : ''} /><Info l="KH mục tiêu" v={r.target_customer} />
            <Info l="Đối thủ" v={r.competitors} /><Info l="Mục tiêu" v={r.goal} /><Info l="Triển khai" v={optLabel(TIMELINES, r.timeline)} />
          </Section>
          <Section title="Yêu cầu KOL & ngân sách">
            <Info l="Số KOL × video" v={r.creators_count ? `${r.creators_count} × ${r.videos_per_creator}` : ''} /><Info l="Tier" v={(r.kol_tiers || []).map(t => KOL_TIERS.find(x => x.v === t)?.l).join(', ')} /><Info l="Lĩnh vực KOL" v={(r.kol_niches || []).map(nicheLabel).join(', ')} />
            <Info l="Budget booking" v={Number(r.budget_booking) ? fmtMoney(r.budget_booking) + 'đ' : ''} /><Info l="Budget ads / tháng" v={Number(r.budget_ads) ? fmtMoney(r.budget_ads) + 'đ' : ''} /><Info l="Biết qua" v={optLabel(HEARD_FROM, r.heard_from)} />
          </Section>
          {(r.pain_points || []).length > 0 && <div style={{ marginTop: 10 }}><div className="label">Vấn đề đang gặp</div><div className="row wrap" style={{ gap: 4 }}>{r.pain_points.map(p => <Badge key={p} tone="red">{optLabel(PAIN_POINTS, p)}</Badge>)}</div></div>}
          </>}
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

        <Discovery key={`d-${r.updated_at}`} r={r} id={id} toast={toast} onSaved={() => { reload(); onChanged(); }} />

        <div className="card" style={{ padding: 14 }}>
          <div className="card-title">Ghi chú nội bộ & giá trị deal</div>
          <textarea className="textarea small" rows={3} placeholder="Insight sau cuộc gọi, người ra quyết định, đối thủ đang báo giá…" value={notes ?? r.internal_notes ?? ''} onChange={e => setNotes(e.target.value)} />
          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <input className="input input-sm" type="number" min="0" step="1000000" style={{ width: 170 }} placeholder="Giá trị deal (VNĐ)" defaultValue={Number(r.deal_value) || ''} id={`dv-${id}`} />
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => patch({ internal_notes: notes ?? r.internal_notes ?? '', deal_value: document.getElementById(`dv-${id}`).value || 0 })}>Lưu</button>
            {Number(r.deal_value) > 0 && <span className="small muted">Deal: <b>{fmtMoney(r.deal_value)}đ</b></span>}
          </div>
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
