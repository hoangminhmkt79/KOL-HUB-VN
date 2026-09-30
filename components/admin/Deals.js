import { useState, useEffect } from 'react';
import { api, useLoad, Avatar, Badge, Modal, Drawer, Field, Kpi, Countdown, Stat, vnd } from '../ui';
import { CreatorPicker } from './Samples';
import { DEAL_STATUS, DEAL_TYPES, DEAL_OPEN, TIERS, PAYOUT_STATUS, dealTypeLabel, nicheLabel, fmtMoney, fmtNum, fmtDate, fmtDateTime } from '../../lib/constants';
import { approvalLevel } from '../../lib/pricing';

const FILTERS = [['open', 'Đang thương lượng'], ['booked', 'Đã chốt'], ['delivered', 'Đã nghiệm thu'], ['completed', 'Hoàn tất'], ['all', 'Tất cả']];
const LEVEL = {
  ops:     { l: 'Ops tự duyệt',      tone: 'green' },
  manager: { l: 'Cần Manager duyệt', tone: 'amber' },
  cfo:     { l: 'Cần CFO duyệt',     tone: 'red' },
};
const ACTION_L = { offer: 'Gửi offer', counter: 'Trả giá', accept: 'Chấp nhận', decline: 'Từ chối', cancel: 'Huỷ', deliver: 'Nghiệm thu', note: 'Ghi chú', expire: 'Hết hạn', apply: 'Ứng tuyển' };
const KIND_L = { deposit: 'Cọc', final: 'Phần còn lại' };
const num = v => (v === '' || v === null || v === undefined ? '' : Number(v));
const fairFeeOf = q => (q?.fair && typeof q.fair === 'object' ? q.fair.fee : q?.fair ?? q?.econ?.fair);
const formulaOf = q => q?.formula || (q?.fair && typeof q.fair === 'object' ? q.fair.formula : '');

// Xem trước kinh tế deal — debounce 400ms
function useQuote(params) {
  const [state, setState] = useState({ q: null, err: '', loading: false });
  const key = params ? JSON.stringify(params) : '';
  useEffect(() => {
    if (!key) { setState({ q: null, err: '', loading: false }); return; }
    let alive = true;
    setState(s => ({ ...s, loading: true }));
    const t = setTimeout(async () => {
      const qs = new URLSearchParams(Object.entries(JSON.parse(key)).filter(([, v]) => v !== '' && v !== null && v !== undefined)).toString();
      try { const d = await api('/api/deals/quote?' + qs); if (alive) setState({ q: d, err: '', loading: false }); }
      catch (e) { if (alive) setState({ q: null, err: e.message, loading: false }); }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [key]);
  return state;
}

export function EconPanel({ econ, fair, formula, tier, level, fee, loading, err, title = 'Kinh tế deal' }) {
  if (err) return <div className="alert alert-error small">⚠ Không tính được kinh tế deal: {err}</div>;
  if (!econ || !Object.keys(econ).length) return <div className="card-flat small muted" style={{ padding: 14 }}>{loading ? 'Đang tính kinh tế deal…' : 'Chưa có số liệu kinh tế.'}</div>;
  const t = tier || econ.tier;
  const ratio = econ.breakeven_ratio;
  const overCap = Number(fee) > 0 && Number(econ.max_fee) >= 0 && Number(fee) > Number(econ.max_fee);
  const warnings = econ.warnings || [];
  return (
    <div className={`card-flat${econ.red ? ' card-risk' : ''}`} style={{ padding: 14, opacity: loading ? 0.6 : 1 }}>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <b className="small">{title}</b>
        <div className="row" style={{ gap: 6 }}>
          {t && TIERS[t] && <Badge tone={TIERS[t].tone}>{TIERS[t].l}</Badge>}
          {level && LEVEL[level] && <Badge tone={LEVEL[level].tone} dot>{LEVEL[level].l}</Badge>}
          {econ.red ? <Badge tone="red">⚠ Rủi ro</Badge> : <Badge tone="green">An toàn</Badge>}
        </div>
      </div>
      {econ.red && (
        <div className="alert alert-error small" style={{ marginBottom: 10 }}>
          <b>⚠</b><div><b>Deal lỗ theo mô hình.</b> {warnings.length ? warnings.join(' · ') + '.' : 'Hoà vốn cần GMV cao hơn kỳ vọng.'} Muốn chấp nhận phải ghi lý do override (lưu log).</div>
        </div>
      )}
      <div className="grid g3" style={{ gap: 8 }}>
        <Stat label="Giá hợp lý" value={fair !== undefined && fair !== null ? vnd(fair) : econ.fair !== undefined ? vnd(econ.fair) : '—'} />
        <Stat label="Trần phí (CFO)" value={econ.max_fee !== undefined ? vnd(econ.max_fee) : '—'} tone={overCap ? 'red' : undefined} />
        <Stat label="CM%" value={econ.cm_pct !== undefined ? `${econ.cm_pct}%` : '—'} />
        <Stat label="GMV kỳ vọng" value={econ.expected_gmv !== undefined ? vnd(econ.expected_gmv) : '—'} />
        <Stat label="Hoà vốn" value={econ.breakeven_gmv ? `${vnd(econ.breakeven_gmv)}` : '—'} tone={econ.red ? 'red' : undefined} />
        <Stat label="Tỷ số hoà vốn" value={ratio !== null && ratio !== undefined ? `${ratio}× · ${econ.breakeven_orders ?? '—'} đơn` : '∞'} tone={ratio === null || ratio > 1 ? 'red' : ratio > 0.7 ? 'amber' : 'green'} />
      </div>
      {overCap && <div className="small" style={{ color: 'var(--red)', marginTop: 8 }}>Phí {vnd(fee)} vượt trần {vnd(econ.max_fee)} {Number(econ.max_fee) > 0 ? ` (+${Math.round((Number(fee) / Number(econ.max_fee) - 1) * 100)}%)` : ' — mô hình không cho phép trả phí cố định với creator này'}.</div>}
      {!econ.red && warnings.length > 0 && <div className="small" style={{ color: 'var(--amber)', marginTop: 8 }}>{warnings.join(' · ')}</div>}
      {formula && <div className="xs muted" style={{ marginTop: 8 }}>Giá hợp lý = {formula}</div>}
      <div className="xs muted" style={{ marginTop: 2 }}>Tỷ số = GMV hoà vốn / GMV kỳ vọng · &gt; 1 là báo đỏ</div>
    </div>
  );
}

// Ô bắt buộc theo guardrail: người duyệt (khi vượt mức ops) + lý do override (khi báo đỏ)
function Guardrail({ level, red, f, set }) {
  if ((!level || level === 'ops') && !red) return null;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {level && level !== 'ops' && (
        <Field label={`Người duyệt (${level === 'cfo' ? 'CFO' : 'Manager'}) *`} hint="Deal vượt mức ops tự duyệt phải ghi tên người duyệt.">
          <input className="input input-sm" value={f.approved_by} onChange={set('approved_by')} placeholder="Họ tên người duyệt" />
        </Field>
      )}
      {red && (
        <Field label="Lý do override rủi ro *" hint="Bắt buộc vì deal đang báo đỏ (tối thiểu 5 ký tự). Lý do được ghi log.">
          <textarea className="textarea" rows={2} value={f.override_reason} onChange={set('override_reason')} placeholder="VD: creator ra đơn tốt ở brand khác, chấp nhận lỗ để test kênh" />
        </Field>
      )}
    </div>
  );
}
const guardOk = (level, red, f) => (!level || level === 'ops' || f.approved_by.trim()) && (!red || f.override_reason.trim().length >= 5);

function Terms({ d }) {
  return (
    <div className="grid g4" style={{ gap: 8 }}>
      <Stat label="Phí (gross)" value={Number(d.fee) > 0 ? vnd(d.fee) : 'Barter'} />
      <Stat label="Hoa hồng" value={`${Number(d.commission_pct) || 0}%`} />
      <Stat label="Số video" value={d.videos ?? 1} />
      <Stat label="Cọc" value={`${Number(d.deposit_pct) || 0}%`} />
    </div>
  );
}

function OfferModal({ onClose, onSaved, toast, camps, rules }) {
  const [creator, setCreator] = useState(null);
  const [f, setF] = useState({ campaign_id: '', deal_type: 'hybrid', fee: '', commission_pct: '', videos: 1, spark_code: false, message: '', approved_by: '', override_reason: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => { const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setF(p => ({ ...p, [k]: v })); setErr(''); };
  const barter = f.deal_type === 'barter';
  const fee = barter ? 0 : num(f.fee) || 0;
  const videos = barter ? 1 : Math.max(1, num(f.videos) || 1);
  const { q, err: qErr, loading } = useQuote(creator ? { creator_id: creator.id, campaign_id: f.campaign_id, fee, commission_pct: num(f.commission_pct) || 0, videos } : null);
  const level = q?.approval_level || (rules.approve_ops_max ? approvalLevel(fee, rules) : null);
  const red = !!q?.econ?.red;
  const tier = q?.tier || q?.econ?.tier;
  const seedBlocked = tier === 'seed' && f.deal_type === 'fee';

  const pickCampaign = e => {
    const id = e.target.value;
    const c = camps.find(x => String(x.id) === id);
    setF(p => ({ ...p, campaign_id: id, ...(c ? { deal_type: c.deal_type || p.deal_type, commission_pct: Number(c.commission_pct) || p.commission_pct, fee: Number(c.fee_min) || p.fee, videos: c.posts_per || p.videos } : {}) }));
  };

  const save = async () => {
    if (!creator) return setErr('Chọn creator.');
    if (seedBlocked) return setErr('Creator Seed (chưa có GMV) chỉ nhận Barter hoặc Hybrid.');
    if (!guardOk(level, red, f)) return setErr(level !== 'ops' && !f.approved_by.trim() ? 'Cần ghi tên người duyệt.' : 'Cần lý do override vì deal báo đỏ.');
    setBusy(true);
    try {
      await api('/api/deals', { method: 'POST', body: {
        creator_id: creator.id, campaign_id: f.campaign_id || null, deal_type: f.deal_type, fee, commission_pct: num(f.commission_pct) || 0,
        videos, spark_code: !!f.spark_code, message: f.message, approved_by: f.approved_by, override_reason: f.override_reason,
      } });
      toast('Đã gửi offer cho creator'); onSaved(); onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title="Tạo offer">
      <div className="stack">
        {creator ? (
          <div className="row" style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}>
            <Avatar name={creator.name} size={28} />
            <div className="grow"><b className="small">{creator.name}</b><div className="xs muted">{creator.handle ? '@' + creator.handle + ' · ' : ''}{fmtNum(creator.followers)} followers · {fmtNum(creator.avg_views)} views TB</div></div>
            <button className="btn btn-sm" onClick={() => setCreator(null)}>Đổi</button>
          </div>
        ) : <Field label="Creator *"><CreatorPicker onPick={setCreator} /></Field>}
        <Field label="Chiến dịch"><select className="select" value={f.campaign_id} onChange={pickCampaign}><option value="">— Không gắn chiến dịch —</option>{camps.map(c => <option key={c.id} value={c.id}>{c.name}{c.brand_name ? ` · ${c.brand_name}` : ''}</option>)}</select></Field>
        <Field label="Loại deal">
          <div className="grid g3" style={{ gap: 6 }}>
            {DEAL_TYPES.map(t => (
              <div key={t.v} className={`opt${f.deal_type === t.v ? ' on' : ''}`} style={{ padding: '8px 6px' }} onClick={() => { setF(p => ({ ...p, deal_type: t.v })); setErr(''); }}>
                <div className="bold small">{t.l}</div><div className="xs muted">{t.s}</div>
              </div>
            ))}
          </div>
        </Field>
        <div className="grid g3" style={{ gap: 10 }}>
          <Field label="Phí (VNĐ, gross)"><input className="input" type="number" min="0" disabled={barter} value={barter ? 0 : f.fee} onChange={set('fee')} /></Field>
          <Field label="% hoa hồng"><input className="input" type="number" min="0" step="0.5" value={f.commission_pct} onChange={set('commission_pct')} /></Field>
          <Field label="Số video"><input className="input" type="number" min="1" disabled={barter} value={barter ? 1 : f.videos} onChange={set('videos')} /></Field>
        </div>
        {barter && <div className="hint" style={{ marginTop: -6 }}>Barter: phí 0đ, tối đa 1 video.</div>}
        {fairFeeOf(q) > 0 && !barter && Number(f.fee) !== fairFeeOf(q) && (
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setF(p => ({ ...p, fee: fairFeeOf(q) }))}>Dùng giá hợp lý {vnd(fairFeeOf(q))}</button>
        )}
        <label className="chk"><input type="checkbox" checked={f.spark_code} onChange={set('spark_code')} /> Yêu cầu Spark code (boost ads)</label>
        <Field label="Lời nhắn cho creator"><textarea className="textarea" rows={2} value={f.message} onChange={set('message')} placeholder="Chào bạn, brand muốn mời bạn…" /></Field>
        {creator ? <EconPanel econ={q?.econ} fair={fairFeeOf(q)} formula={formulaOf(q)} tier={tier} level={level} fee={fee} loading={loading} err={qErr} /> : <div className="small muted">Chọn creator để xem giá hợp lý và kinh tế deal.</div>}
        {seedBlocked && <div className="alert alert-error small">⚠ Creator Seed (chưa có GMV) chỉ nhận Barter hoặc Hybrid (phí ≤ {vnd(rules.seed_fee_cap || 1500000)}).</div>}
        <Guardrail level={level} red={red} f={f} set={set} />
        {err && <div className="alert alert-error small">⚠ {err}</div>}
        <div className="hint">Creator nhận đúng offer này → tự chốt deal (brand đã duyệt mức này). Hạn trả lời {rules.creator_reply_hours || 72}h.</div>
        <button className="btn btn-primary" disabled={busy || !creator || loading || seedBlocked || !guardOk(level, red, f)} onClick={save}>{busy ? 'Đang gửi…' : 'Gửi offer'}</button>
      </div>
    </Modal>
  );
}

function PayoutRow({ p, onPaid }) {
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const st = PAYOUT_STATUS[p.status] || { l: p.status, tone: 'slate' };
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
      <div className="row-between">
        <b className="small">{KIND_L[p.kind] || p.kind}</b>
        <Badge tone={st.tone} dot>{st.l}</Badge>
      </div>
      <div className="money-row" style={{ marginTop: 6 }}>
        <span className="muted">Gross</span><span>{vnd(p.gross)}</span>
        <span className="muted">TNCN khấu trừ</span><span style={{ color: Number(p.pit) > 0 ? 'var(--red)' : undefined }}>{Number(p.pit) > 0 ? `−${vnd(p.pit)}` : '0đ'}</span>
        <span className="bold">Thực nhận</span><span className="bold">{vnd(p.net)}</span>
      </div>
      <div className="xs muted" style={{ marginTop: 4 }}>{p.paid_at ? `Đã trả ${fmtDateTime(p.paid_at)}${p.ref ? ' · ' + p.ref : ''}` : p.due_at ? `Hạn trả ${fmtDate(p.due_at)}` : 'Chờ nghiệm thu video mới đến hạn'}</div>
      {p.status === 'due' && (
        <div className="row" style={{ marginTop: 6 }}>
          <input className="input input-sm grow" placeholder="Mã giao dịch / ghi chú (không bắt buộc)" value={ref} onChange={e => setRef(e.target.value)} />
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={async () => { setBusy(true); await onPaid(p.id, ref); setBusy(false); }}>Đã trả</button>
        </div>
      )}
    </div>
  );
}

function DealDrawer({ id, onClose, onChanged, toast, rules, openCreator }) {
  const { data, error, loading, reload } = useLoad(() => api(`/api/deals/${id}`), [id]);
  const [mode, setMode] = useState('');
  const [f, setF] = useState({ fee: '', commission_pct: '', videos: '', message: '', approved_by: '', override_reason: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const set = k => e => { setF(p => ({ ...p, [k]: e.target.value })); setErr(''); };
  const d = data?.deal;
  const counterParams = d && mode === 'counter'
    ? { creator_id: d.creator_id, campaign_id: d.campaign_id || '', fee: num(f.fee) || 0, commission_pct: num(f.commission_pct) || 0, videos: Math.max(1, num(f.videos) || 1) }
    : d ? { creator_id: d.creator_id, campaign_id: d.campaign_id || '', fee: Number(d.fee) || 0, commission_pct: Number(d.commission_pct) || 0, videos: d.videos || 1 } : null;
  const { q, err: qErr, loading: qLoading } = useQuote(counterParams);

  if (loading && !data) return <Drawer onClose={onClose} title="Deal"><div className="empty">Đang tải…</div></Drawer>;
  if (error || !d) return <Drawer onClose={onClose} title="Deal"><div className="alert alert-error">⚠ {error || 'Không tìm thấy deal'}</div></Drawer>;

  const { rounds = [], payouts = [], creator = {}, campaign, rate_card: rc } = data;
  const st = DEAL_STATUS[d.status] || { l: d.status, tone: 'slate' };
  const maxRounds = rules.deal_rounds_max || 3;
  const econ = mode === 'counter' ? q?.econ : (d.econ && Object.keys(d.econ).length ? d.econ : q?.econ);
  const feeNow = mode === 'counter' ? num(f.fee) || 0 : Number(d.fee) || 0;
  const level = mode === 'counter' ? (q?.approval_level || (rules.approve_ops_max ? approvalLevel(feeNow, rules) : null)) : (d.approval_level || q?.approval_level);
  const red = !!econ?.red;

  const startCounter = () => { setF(p => ({ ...p, fee: Number(d.fee) || 0, commission_pct: Number(d.commission_pct) || 0, videos: d.videos || 1, message: '' })); setMode('counter'); setErr(''); };
  const needsGuard = mode === 'accept' || mode === 'counter';
  const doAction = async action => {
    if (needsGuard && !guardOk(level, red, f)) return setErr(level && level !== 'ops' && !f.approved_by.trim() ? 'Cần ghi tên người duyệt.' : 'Cần lý do override vì deal báo đỏ.');
    setBusy(true);
    try {
      const body = { action, message: f.message };
      if (needsGuard) Object.assign(body, { approved_by: f.approved_by, override_reason: f.override_reason });
      if (action === 'counter') Object.assign(body, { fee: num(f.fee) || 0, commission_pct: num(f.commission_pct) || 0, videos: Math.max(1, num(f.videos) || 1) });
      await api(`/api/deals/${d.id}`, { method: 'PATCH', body });
      toast({ counter: 'Đã gửi giá mới cho creator', accept: 'Đã chốt deal', decline: 'Đã từ chối', cancel: 'Đã huỷ deal', deliver: 'Đã nghiệm thu — phần còn lại chuyển sang đến hạn trả' }[action] || 'Đã cập nhật');
      setMode(''); setF(p => ({ ...p, message: '' })); reload(); onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const addNote = async () => {
    setBusy(true);
    try { await api(`/api/deals/${d.id}`, { method: 'PATCH', body: { action: 'note', message: note.trim() } }); setNote(''); reload(); }
    catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const markPaid = async (pid, ref) => {
    try { await api(`/api/payouts/${pid}`, { method: 'PATCH', body: { status: 'paid', ref } }); toast('Đã ghi nhận thanh toán'); reload(); onChanged(); }
    catch (e) { toast(e.message); }
  };

  const canCounter = d.status === 'countered' && (d.round || 1) < maxRounds;
  const tot = payouts.reduce((a, p) => ({ gross: a.gross + (Number(p.gross) || 0), pit: a.pit + (Number(p.pit) || 0), net: a.net + (Number(p.net) || 0) }), { gross: 0, pit: 0, net: 0 });

  return (
    <Drawer onClose={onClose} title={`${creator.name || d.creator_name || 'Creator'} · ${d.campaign_name || campaign?.name || 'Không gắn chiến dịch'}`} sub={`Deal #${d.id} · ${dealTypeLabel(d.deal_type)} · vòng ${d.round || 1}/${maxRounds}`}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row-between">
            <div className="row" style={{ gap: 6 }}><Badge tone={st.tone} dot>{st.l}</Badge>{DEAL_OPEN.includes(d.status) && d.expires_at && <Countdown to={d.expires_at} />}</div>
            {creator.id && openCreator && <button className="btn btn-sm" onClick={() => openCreator(creator.id)}>Hồ sơ creator</button>}
          </div>
          <Terms d={d} />
          {d.status === 'offered' && <div className="small muted">Đang chờ creator trả lời. Creator nhận → tự chốt.</div>}
          {d.status === 'countered' && <div className="small" style={{ color: 'var(--amber)' }}><b>Creator đã trả giá</b> — brand cần phản hồi trong {rules.brand_reply_hours || 48}h, quá hạn deal tự hết hạn và báo cả hai bên.</div>}
          {(d.approved_by || d.override_reason) && <div className="xs muted">{d.approved_by && <>Duyệt bởi <b>{d.approved_by}</b>. </>}{d.override_reason && <>Override: {d.override_reason}</>}</div>}
        </div>

        <EconPanel econ={econ} fair={mode === 'counter' ? fairFeeOf(q) : (econ?.fair ?? fairFeeOf(q))} formula={formulaOf(q)} tier={econ?.tier || q?.tier} level={level} fee={feeNow} loading={qLoading && mode === 'counter'} err={mode === 'counter' ? qErr : ''} title={mode === 'counter' ? 'Kinh tế nếu trả giá mới' : 'Kinh tế deal (snapshot)'} />

        {/* Hành động */}
        {['offered', 'countered', 'booked'].includes(d.status) && (
          <div className="card stack" style={{ gap: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Hành động</div>
            {!mode && (
              <div className="row wrap">
                {d.status === 'countered' && <button className="btn btn-primary" onClick={() => { setMode('accept'); setErr(''); }}>✓ Chấp nhận giá creator</button>}
                {d.status === 'countered' && <button className="btn" disabled={!canCounter} title={canCounter ? '' : 'Đã hết số vòng'} onClick={startCounter}>↔ Trả giá</button>}
                {d.status === 'countered' && <button className="btn btn-danger" onClick={() => setMode('decline')}>Từ chối</button>}
                {d.status === 'booked' && <button className="btn btn-primary" onClick={() => setMode('deliver')}>✓ Nghiệm thu (video đã duyệt)</button>}
                {['offered', 'booked'].includes(d.status) && <button className="btn btn-danger" onClick={() => setMode('cancel')}>Huỷ deal</button>}
              </div>
            )}
            {d.status === 'countered' && !canCounter && !mode && <div className="xs muted">Đã đủ {maxRounds} vòng — chỉ còn Chấp nhận hoặc Từ chối.</div>}
            {mode === 'counter' && (
              <div className="grid g3" style={{ gap: 10 }}>
                <Field label="Phí mới (VNĐ)"><input className="input input-sm" type="number" min="0" value={f.fee} onChange={set('fee')} /></Field>
                <Field label="% hoa hồng"><input className="input input-sm" type="number" min="0" step="0.5" value={f.commission_pct} onChange={set('commission_pct')} /></Field>
                <Field label="Số video"><input className="input input-sm" type="number" min="1" value={f.videos} onChange={set('videos')} /></Field>
              </div>
            )}
            {mode === 'accept' && <div className="small">Chốt deal với phí <b>{vnd(d.fee)}</b> · {Number(d.commission_pct) || 0}% HH · {d.videos || 1} video. Hệ thống tạo khoản cọc {Number(d.deposit_pct) || 0}% (đến hạn ngay) và 1 đơn mẫu.</div>}
            {mode === 'cancel' && <div className="small" style={{ color: 'var(--red)' }}>{d.status === 'booked' ? 'Huỷ deal đã chốt: các khoản chưa trả bị xoá, đơn mẫu chưa gửi bị huỷ, slot chiến dịch được giải phóng. Nếu đã trả cọc, bắt buộc ghi lý do.' : 'Huỷ offer đang chờ creator trả lời. Creator sẽ thấy deal đã huỷ.'}</div>}
            {mode === 'deliver' && <div className="small">Xác nhận video đã được duyệt (có disclaimer, nhãn quảng cáo, không claim chữa bệnh). Phần còn lại đến hạn trả trong {rules.payment_days || 7} ngày.</div>}
            {mode && needsGuard && <Guardrail level={level} red={red} f={f} set={set} />}
            {mode && mode !== 'deliver' && <Field label={mode === 'accept' ? 'Lời nhắn (không bắt buộc)' : 'Lời nhắn cho creator'}><textarea className="textarea" rows={2} value={f.message} onChange={set('message')} /></Field>}
            {err && <div className="alert alert-error small">⚠ {err}</div>}
            {mode && (
              <div className="row">
                <button className={`btn ${['decline', 'cancel'].includes(mode) ? 'btn-danger' : 'btn-primary'}`} disabled={busy || (needsGuard && !guardOk(level, red, f)) || (mode === 'counter' && qLoading)} onClick={() => doAction(mode)}>
                  {busy ? 'Đang xử lý…' : { accept: 'Xác nhận chốt deal', counter: 'Gửi giá mới', decline: 'Xác nhận từ chối', cancel: 'Xác nhận huỷ', deliver: 'Xác nhận nghiệm thu' }[mode]}
                </button>
                <button className="btn" onClick={() => { setMode(''); setErr(''); }}>Thôi</button>
              </div>
            )}
          </div>
        )}

        {/* Thanh toán */}
        {payouts.length > 0 && (
          <div className="card">
            <div className="card-title">Thanh toán <span className="xs muted tnum">Thực nhận {vnd(tot.net)} / gross {vnd(tot.gross)}</span></div>
            {payouts.map(p => <PayoutRow key={p.id || p.kind} p={p} onPaid={markPaid} />)}
            <div className="xs muted" style={{ marginTop: 8 }}>TNCN {rules.pit_rate_pct || 10}% khấu trừ cho mỗi lần trả ≥ {vnd(rules.pit_threshold || 2000000)} (cần kế toán xác minh).</div>
          </div>
        )}

        {/* Lịch sử vòng */}
        <div className="card">
          <div className="card-title">Lịch sử thương lượng</div>
          <div className="row" style={{ marginBottom: 6 }}>
            <input className="input input-sm grow" placeholder="Ghi chú nội bộ (VD: đã gọi điện xác nhận)" value={note} onChange={e => setNote(e.target.value)} />
            <button className="btn btn-sm" disabled={!note.trim() || busy} onClick={addNote}>Ghi</button>
          </div>
          {rounds.map((r, i) => (
            <div key={r.id || i} className="feed-item">
              <span className="feed-dot" style={{ background: `var(--${r.by_party === 'creator' ? 'accent' : r.by_party === 'brand' ? 'brand' : 'slate'})` }} />
              <div className="grow">
                <div className="small"><b>{r.by_party === 'creator' ? (creator.name || 'Creator') : r.by_party === 'brand' ? 'Brand' : 'Hệ thống'}</b> · {ACTION_L[r.action] || r.action}{r.round_no ? <span className="muted"> · vòng {r.round_no}</span> : null}</div>
                {['offer', 'counter', 'apply'].includes(r.action) && <div className="xs tnum">{Number(r.fee) > 0 ? vnd(r.fee) : 'Barter'} · {Number(r.commission_pct) || 0}% HH · {r.videos || 1} video</div>}
                {r.message && <div className="xs muted">“{r.message}”</div>}
              </div>
              <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.created_at)}</span>
            </div>
          ))}
          {!rounds.length && <div className="small muted">Chưa có lịch sử.</div>}
        </div>

        {/* Creator + rate card */}
        <div className="card">
          <div className="card-title">Creator</div>
          <div className="grid g3" style={{ gap: 8 }}>
            <Stat label="Followers" value={fmtNum(creator.followers)} />
            <Stat label="Views TB" value={fmtNum(creator.avg_views)} />
            <Stat label="GMV" value={fmtMoney(creator.gmv) + 'đ'} />
          </div>
          <div className="xs muted" style={{ marginTop: 6 }}>{nicheLabel(creator.niche)}{creator.handle ? ` · @${creator.handle}` : ''}</div>
          {rc ? (
            <div style={{ marginTop: 10 }}>
              <div className="label">Bảng giá creator tự khai (tham khảo)</div>
              <div className="small">Video {rc.video_fee ? vnd(rc.video_fee) : '—'} · Live/giờ {rc.live_hour_fee ? vnd(rc.live_hour_fee) : '—'} · HH {rc.commission_pct ?? '—'}% · Spark +{rc.spark_fee_pct ?? 0}% · {rc.accepts_barter ? 'Nhận barter' : 'Không nhận barter'}</div>
              {rc.note && <div className="xs muted">“{rc.note}”</div>}
            </div>
          ) : <div className="xs muted" style={{ marginTop: 8 }}>Creator chưa khai bảng giá.</div>}
        </div>
      </div>
    </Drawer>
  );
}

export default function Deals({ toast, openCreator, initial }) {
  const [status, setStatus] = useState(initial?.status || 'open');
  const [campaign, setCampaign] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const { data, error, loading, reload } = useLoad(() => api(`/api/deals?status=${status}${campaign ? '&campaign=' + campaign : ''}`), [status, campaign]);
  const campsL = useLoad(() => api('/api/campaigns'), []);
  const settings = useLoad(() => api('/api/admin/settings'), []);
  const rules = settings.data?.rules || {};
  const camps = campsL.data?.campaigns || [];
  const deals = data?.deals || [];
  const s = data?.summary || {};
  const maxRounds = rules.deal_rounds_max || 3;

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Deals</h1><div className="small muted">Offer ⇄ trả giá (≤ {maxRounds} vòng) → chốt → nghiệm thu → thanh toán</div></div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>＋ Tạo offer</button>
      </div>

      <div className="grid g4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <Kpi label="Đang thương lượng" value={fmtNum(s.open)} />
        <Kpi label="Đã chốt" value={fmtNum(s.booked)} />
        <Kpi hero label="Committed" value={fmtMoney(s.committed) + 'đ'} sub="Tổng phí deal đã chốt" />
        <Kpi label="Đã trả" value={fmtMoney(s.paid) + 'đ'} />
        <Kpi label="Đến hạn trả" value={fmtMoney(s.due) + 'đ'} tone={Number(s.due) > 0 ? 'red' : undefined} sub={Number(s.due) > 0 ? 'Trả đúng hạn để giữ uy tín' : 'Không có khoản đến hạn'} />
      </div>

      <div className="row-between">
        <div className="tabs">{FILTERS.map(([v, l]) => <button key={v} className={`tab${status === v ? ' on' : ''}`} onClick={() => setStatus(v)}>{l}</button>)}</div>
        <select className="select input-sm" style={{ width: 'auto', maxWidth: '100%' }} value={campaign} onChange={e => setCampaign(e.target.value)}>
          <option value="">Mọi chiến dịch</option>{camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error ? <div className="alert alert-error">⚠ {error} <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={reload}>Thử lại</button></div> : (
        <div className="card-flat table-wrap">
          <table className="table">
            <thead><tr><th>Creator</th><th className="hide-sm">Chiến dịch</th><th>Phí · HH</th><th className="hide-sm">Video</th><th>Trạng thái · hạn</th><th className="hide-sm">Vòng</th></tr></thead>
            <tbody>
              {deals.map(d => {
                const st = DEAL_STATUS[d.status] || { l: d.status, tone: 'slate' };
                const red = d.econ?.red;
                return (
                  <tr key={d.id} className="clickable" onClick={() => setOpenId(d.id)}>
                    <td><div className="row" style={{ gap: 8 }}><Avatar name={d.creator_name} size={26} /><div style={{ minWidth: 0 }}><div className="bold ellipsis" style={{ maxWidth: 160 }}>{d.creator_name || '—'}</div><div className="xs muted">{d.handle ? '@' + d.handle : dealTypeLabel(d.deal_type)}</div></div></div></td>
                    <td className="hide-sm"><div className="ellipsis" style={{ maxWidth: 180 }}>{d.campaign_name || '—'}</div><div className="xs muted">{dealTypeLabel(d.deal_type)}</div></td>
                    <td className="tnum"><b>{Number(d.fee) > 0 ? fmtMoney(d.fee) + 'đ' : 'Barter'}</b><div className="xs muted">{Number(d.commission_pct) || 0}% HH</div></td>
                    <td className="hide-sm tnum">{d.videos || 1}</td>
                    <td>
                      <div className="stack" style={{ gap: 4, alignItems: 'flex-start' }}>
                        <Badge tone={st.tone} dot>{st.l}</Badge>
                        {DEAL_OPEN.includes(d.status) && d.expires_at && <Countdown to={d.expires_at} prefix="" />}
                        {red ? <Badge tone="red">⚠ Rủi ro</Badge> : d.econ?.cm_pct !== undefined ? <span className="xs muted">CM {d.econ.cm_pct}%</span> : null}
                      </div>
                    </td>
                    <td className="hide-sm tnum small">{d.round || 1}/{maxRounds}<div className="xs muted">{d.last_by === 'creator' ? 'creator vừa trả' : 'brand vừa gửi'}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && !data && <div className="empty">Đang tải…</div>}
          {data && !deals.length && <div className="empty">Không có deal nào{status !== 'all' ? ' ở trạng thái này' : ''}. Bấm “Tạo offer” để mời creator với mức phí cụ thể.</div>}
        </div>
      )}

      {creating && <OfferModal onClose={() => setCreating(false)} onSaved={reload} toast={toast} camps={camps} rules={rules} />}
      {openId && <DealDrawer id={openId} onClose={() => setOpenId(null)} onChanged={reload} toast={toast} rules={rules} openCreator={openCreator} />}
    </div>
  );
}
