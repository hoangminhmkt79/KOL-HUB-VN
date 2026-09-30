import { useState } from 'react';
import { api, useLoad, Avatar, Badge, Modal, Field, vnd } from '../ui';
import { NICHES, CTYPES, DEAL_TYPES, dealTypeLabel, nicheLabel, fmtMoney, fmtNum, fmtDate } from '../../lib/constants';

const feeRange = c => (c.deal_type === 'barter' || (!Number(c.fee_min) && !Number(c.fee_max)) ? 'Barter (mẫu + HH)' : Number(c.fee_max) > Number(c.fee_min) ? `${fmtMoney(c.fee_min)}–${fmtMoney(c.fee_max)}đ` : `${fmtMoney(c.fee_min || c.fee_max)}đ`);

const FORMATS = ['TikTok video (15-60s)', 'TikTok video (60-180s)', 'TikTok Live', 'Facebook Reels', 'Shopee Video', 'Shopee Live', 'Đa nền tảng'];

function CampaignForm({ onClose, onSaved, toast }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    name: '', product: '', niche: '', start_date: today, end_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    budget: '', sample_cost: '', goal: '', brief: '', req: '', note: '', format: FORMATS[0], content_type: 'video', posts_per: 1, slots: 20, is_public: true,
    brand_name: '', contact_name: '', deal_type: 'hybrid', fee_min: '', fee_max: '', commission_pct: '', revisions: 1, deposit_pct: 30, payment_days: 7, claims_allowed: '', claims_banned: '',
  });
  const [err, setErr] = useState('');
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState([]);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const pool = useLoad(() => api('/api/creators?status=approved&sort=score'), []);

  const barter = f.deal_type === 'barter';
  const tpcn = f.niche === 'suc_khoe';
  const next = () => {
    if (!f.name.trim()) return setErr('Nhập tên chiến dịch.');
    if (f.is_public && !f.brand_name.trim()) return setErr('Chiến dịch công khai cần tên brand — creator cần biết mình làm cho ai.');
    if (!barter && Number(f.fee_max) && Number(f.fee_max) < Number(f.fee_min)) return setErr('Phí tối đa phải ≥ phí tối thiểu.');
    if (tpcn && !/không phải là thuốc/i.test(f.claims_allowed + ' ' + f.req)) return setErr('TPCN bắt buộc có câu “Thực phẩm này không phải là thuốc…” trong claim được phép / yêu cầu.');
    setErr(''); setStep(2);
  };
  const save = async () => {
    const body = { ...f, creator_ids: sel };
    if (barter) Object.assign(body, { fee_min: 0, fee_max: 0, posts_per: 1 });
    ['fee_min', 'fee_max', 'commission_pct', 'revisions', 'deposit_pct', 'payment_days'].forEach(k => { body[k] = Number(body[k]) || 0; });
    try { await api('/api/campaigns', { method: 'POST', body }); toast('Đã tạo chiến dịch'); onSaved(); onClose(); }
    catch (e) { toast(e.message); }
  };

  return (
    <Modal onClose={onClose} title={`Chiến dịch mới · bước ${step}/2`}>
      {step === 1 ? (
        <div className="stack">
          <Field label="Tên chiến dịch *"><input className="input" value={f.name} onChange={set('name')} placeholder="VD: Seeding Serum B5 tháng 10" /></Field>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Sản phẩm"><input className="input" value={f.product} onChange={set('product')} /></Field>
            <Field label="Lĩnh vực"><select className="select" value={f.niche} onChange={set('niche')}><option value="">Mọi lĩnh vực</option>{NICHES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}</select></Field>
            <Field label="Bắt đầu"><input className="input" type="date" value={f.start_date} onChange={set('start_date')} /></Field>
            <Field label="Kết thúc"><input className="input" type="date" value={f.end_date} onChange={set('end_date')} /></Field>
            <Field label="Budget (VNĐ)"><input className="input" type="number" value={f.budget} onChange={set('budget')} /></Field>
            <Field label="Giá vốn / mẫu (VNĐ)"><input className="input" type="number" value={f.sample_cost} onChange={set('sample_cost')} /></Field>
            <Field label="Số slot"><input className="input" type="number" value={f.slots} onChange={set('slots')} /></Field>
            <Field label="Số video / creator"><input className="input" type="number" value={f.posts_per} onChange={set('posts_per')} /></Field>
            <Field label="Định dạng"><select className="select" value={f.format} onChange={set('format')}>{FORMATS.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Loại content"><select className="select" value={f.content_type} onChange={set('content_type')}>{CTYPES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}</select></Field>
          </div>
          <div className="label" style={{ marginTop: 6, marginBottom: 0, color: 'var(--brand-700)' }}>Điều khoản deal · hiện công khai cho creator</div>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Tên brand *"><input className="input" value={f.brand_name} onChange={set('brand_name')} placeholder="VD: Cocoon" /></Field>
            <Field label="Người liên hệ" hint="Tên người thật creator trao đổi"><input className="input" value={f.contact_name} onChange={set('contact_name')} placeholder="VD: Chị Lan — Creator Ops" /></Field>
          </div>
          <div className="grid g3" style={{ gap: 6 }}>
            {DEAL_TYPES.map(t => (
              <div key={t.v} className={`opt${f.deal_type === t.v ? ' on' : ''}`} style={{ padding: '8px 6px' }} onClick={() => setF(p => ({ ...p, deal_type: t.v }))}><div className="bold small">{t.l}</div><div className="xs muted">{t.s}</div></div>
            ))}
          </div>
          <div className="grid g3" style={{ gap: 10 }}>
            <Field label="Phí từ (VNĐ)"><input className="input" type="number" min="0" disabled={barter} value={barter ? 0 : f.fee_min} onChange={set('fee_min')} /></Field>
            <Field label="Phí đến (VNĐ)"><input className="input" type="number" min="0" disabled={barter} value={barter ? 0 : f.fee_max} onChange={set('fee_max')} /></Field>
            <Field label="% hoa hồng"><input className="input" type="number" min="0" step="0.5" value={f.commission_pct} onChange={set('commission_pct')} /></Field>
            <Field label="Số lần sửa"><input className="input" type="number" min="0" value={f.revisions} onChange={set('revisions')} /></Field>
            <Field label="Cọc (%)"><input className="input" type="number" min="0" max="100" value={f.deposit_pct} onChange={set('deposit_pct')} /></Field>
            <Field label="Trả trong (ngày)" hint="Sau khi video được duyệt"><input className="input" type="number" min="0" value={f.payment_days} onChange={set('payment_days')} /></Field>
          </div>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Claim được phép"><textarea className="textarea" rows={3} value={f.claims_allowed} onChange={set('claims_allowed')} placeholder={tpcn ? 'Thực phẩm này không phải là thuốc, không có tác dụng thay thế thuốc chữa bệnh.\nHỗ trợ…' : 'Dưỡng ẩm, làm dịu da…'} /></Field>
            <Field label="Claim bị cấm"><textarea className="textarea" rows={3} value={f.claims_banned} onChange={set('claims_banned')} placeholder="Chữa khỏi, trị dứt điểm, cam kết 100%…" /></Field>
          </div>
          {tpcn && <div className="hint" style={{ marginTop: -6 }}>TPCN: bắt buộc câu “Thực phẩm này không phải là thuốc…”.</div>}
          <Field label="Brief (hiện trên landing + portal)"><textarea className="textarea" rows={3} value={f.brief} onChange={set('brief')} placeholder="Sản phẩm, thông điệp chính, USP…" /></Field>
          <Field label="Yêu cầu nội dung"><textarea className="textarea" rows={2} value={f.req} onChange={set('req')} placeholder="Gắn giỏ hàng, hashtag, thời lượng…" /></Field>
          <Field label="Lưu ý / điều cần tránh"><textarea className="textarea" rows={2} value={f.note} onChange={set('note')} placeholder="Không claim chữa bệnh, không so sánh đối thủ…" /></Field>
          <label className="row small"><input type="checkbox" checked={f.is_public} onChange={set('is_public')} /> Hiện trên trang tuyển (landing) để creator tự ứng tuyển</label>
          {err && <div className="alert alert-error small">⚠ {err}</div>}
          <button className="btn btn-primary" disabled={!f.name.trim()} onClick={next}>Tiếp: chọn creator →</button>
        </div>
      ) : (
        <div className="stack">
          <div className="small muted">Chọn creator đã duyệt (sắp theo score). Có thể bỏ qua và thêm sau.</div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {(pool.data?.creators || []).filter(c => !f.niche || c.niche === f.niche).map(c => {
              const on = sel.includes(c.id);
              return (
                <div key={c.id} className="feed-item" style={{ cursor: 'pointer', background: on ? 'var(--brand-50)' : undefined, borderRadius: 8, padding: '8px 6px' }} onClick={() => setSel(p => (on ? p.filter(x => x !== c.id) : [...p, c.id]))}>
                  <input type="checkbox" readOnly checked={on} />
                  <Avatar name={c.name} size={24} />
                  <div className="grow"><b className="small">{c.name}</b> <span className="xs muted">{c.handle && '@' + c.handle} · {nicheLabel(c.niche)} · {fmtNum(c.followers)}</span></div>
                  <Badge tone="green">{Number(c.score).toFixed(2)}</Badge>
                </div>
              );
            })}
            {pool.data && !pool.data.creators.length && <div className="empty">Chưa có creator ở trạng thái "Đã duyệt"</div>}
          </div>
          <div className="row-between">
            <button className="btn" onClick={() => setStep(1)}>← Quay lại</button>
            <button className="btn btn-primary" onClick={save}>Tạo chiến dịch ({sel.length} creator)</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Campaigns({ toast }) {
  const { data, reload } = useLoad(() => api('/api/campaigns'), []);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const cs = data?.campaigns || [];

  const patch = async (id, body) => { try { await api(`/api/campaigns/${id}`, { method: 'PATCH', body }); reload(); } catch (e) { toast(e.message); } };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Chiến dịch</h1><div className="small muted">{cs.length} chiến dịch</div></div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>＋ Tạo chiến dịch</button>
      </div>

      {cs.map(c => {
        const target = Math.max(1, c.creators.length * (c.posts_per || 1));
        const done = c.creators.reduce((a, x) => a + (x.posts_done || 0), 0);
        const pct = Math.min(100, Math.round((done / target) * 100));
        const roi = Number(c.sample_spend) > 0 ? (Number(c.gmv) / Number(c.sample_spend)).toFixed(1) + 'x' : '—';
        return (
          <div key={c.id} className="card">
            <div className="row-between">
              <div>
                <div className="row" style={{ gap: 8 }}><h3 style={{ fontSize: 16 }}>{c.name}</h3>{c.is_public && <Badge tone="blue">Đang tuyển công khai</Badge>}</div>
                <div className="small muted">{c.brand_name ? <b style={{ color: 'var(--ink-2)' }}>{c.brand_name} · </b> : null}{c.product || '—'} · {c.niche ? nicheLabel(c.niche) + ' · ' : ''}{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</div>
              </div>
              <div className="row">
                <label className="row xs muted" style={{ gap: 4 }}><input type="checkbox" checked={c.is_public} onChange={e => patch(c.id, { is_public: e.target.checked })} /> Công khai</label>
                <select className="select input-sm" style={{ width: 'auto' }} value={c.status} onChange={e => patch(c.id, { status: e.target.value })}>
                  <option value="active">Đang chạy</option><option value="paused">Tạm dừng</option><option value="completed">Hoàn thành</option>
                </select>
              </div>
            </div>
            <div className="grid g4" style={{ gap: 8, margin: '14px 0 10px' }}>
              {[['Creator', `${c.creators.length}/${c.slots}`], ['Mẫu / Video', `${c.samples} / ${c.videos}`], ['GMV', fmtMoney(c.gmv) + 'đ'], ['ROI mẫu', roi]].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}><div className="xs muted bold">{l}</div><div className="bold tnum">{v}</div></div>
              ))}
            </div>
            <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
              <Badge tone="violet">{dealTypeLabel(c.deal_type || 'barter')}</Badge>
              <Badge tone="green">{feeRange(c)}</Badge>
              <Badge tone="blue">HH {Number(c.commission_pct) || 0}%</Badge>
              <Badge tone="slate">Cọc {Number(c.deposit_pct ?? 30)}% · trả trong {c.payment_days ?? 7} ngày</Badge>
              <Badge tone="slate">{c.revisions ?? 1} lần sửa</Badge>
              {Number(c.budget) > 0 && <Badge tone="amber">Budget {vnd(c.budget)}</Badge>}
              {c.contact_name && <span className="xs muted">Liên hệ: {c.contact_name}</span>}
              {c.is_public && !c.brand_name && <Badge tone="red">⚠ Thiếu tên brand</Badge>}
            </div>
            {(c.claims_allowed || c.claims_banned) && (
              <div className="grid g2 small" style={{ gap: 8, marginBottom: 10 }}>
                {c.claims_allowed && <div style={{ whiteSpace: 'pre-line' }}><span className="xs bold" style={{ color: 'var(--green)' }}>✓ ĐƯỢC NÓI</span><br />{c.claims_allowed}</div>}
                {c.claims_banned && <div style={{ whiteSpace: 'pre-line' }}><span className="xs bold" style={{ color: 'var(--red)' }}>✕ CẤM</span><br />{c.claims_banned}</div>}
              </div>
            )}
            <div className="row" style={{ gap: 10 }}><div className="progress grow"><span style={{ width: `${pct}%` }} /></div><span className="small bold tnum">{done}/{target} video · {pct}%</span></div>
            <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Ẩn creator' : `Xem ${c.creators.length} creator`}</button>
            {open === c.id && (
              <div style={{ marginTop: 8 }}>
                {c.creators.map(cr => (
                  <div key={cr.creator_id} className="feed-item">
                    <Avatar name={cr.name} size={24} />
                    <div className="grow"><b className="small">{cr.name}</b> <span className="xs muted">{cr.handle && '@' + cr.handle}</span></div>
                    <span className="small tnum">{cr.posts_done}/{c.posts_per}</span>
                    <select className="select input-sm" style={{ width: 'auto' }} value={cr.camp_status} onChange={e => patch(c.id, { creator_id: cr.creator_id, camp_status: e.target.value })}>
                      {['Chờ xác nhận', 'Đã xác nhận', 'Đã nhận mẫu', 'Đang làm content', 'Hoàn thành', 'Huỷ'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
                {!c.creators.length && <div className="small muted">Chưa có creator — gán đơn mẫu vào chiến dịch ở tab Đơn mẫu.</div>}
              </div>
            )}
          </div>
        );
      })}
      {data && !cs.length && <div className="card empty">Chưa có chiến dịch. Tạo chiến dịch công khai để landing tự hiển thị và tuyển creator.</div>}
      {creating && <CampaignForm onClose={() => setCreating(false)} onSaved={reload} toast={toast} />}
    </div>
  );
}
