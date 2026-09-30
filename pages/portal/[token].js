import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CreatorStatus, SampleStatus, VideoStatus, Steps, Badge, Countdown, Stat, useToast, copy, vnd } from '../../components/ui';
import { trackingUrl, fmtDate, fmtDateTime, fmtNum, fmtMoney, daysUntil, DEAL_STATUS, TIERS, PAYOUT_STATUS, dealTypeLabel, nicheLabel } from '../../lib/constants';
import { payoutSplit } from '../../lib/pricing';

const STEP_LABELS = ['Chờ gửi', 'Đang giao', 'Đã nhận', 'Đã đăng'];
const stepOf = s => ({ requested: 0, approved: 0, shipped: 1, delivered: 2, overdue: 2, posted: 3 }[s] ?? 0);
// Mặc định công bố (docs/DEBATE.md). API có thể trả giá trị riêng.
const PAY = { deposit_pct: 30, payment_days: 7, pit_threshold: 2000000, pit_rate_pct: 10, deal_rounds_max: 3, brand_reply_hours: 48 };
const ACTIVE = ['offered', 'countered', 'booked', 'delivered'];
const ACTION_L = { offer: 'gửi offer', counter: 'trả giá', accept: 'chấp nhận', decline: 'từ chối', cancel: 'huỷ', deliver: 'nghiệm thu', note: 'ghi chú', expire: 'hết hạn', apply: 'đề xuất' };
const KIND_L = { deposit: 'Cọc', final: 'Phần còn lại' };
const numOr = (v, d) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? d : Number(v));
const isBarter = c => c.deal_type === 'barter' || (!Number(c.fee_min) && !Number(c.fee_max));
const lines = t => String(t || '').split(/\n+/).map(x => x.replace(/^[-•*\s]+/, '').trim()).filter(Boolean);

function Money({ parts, pay }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      {parts.map(p => {
        const st = p.status ? PAYOUT_STATUS[p.status] : null;
        return (
          <div key={p.kind} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}>
            <div className="row-between" style={{ marginBottom: 4 }}>
              <span className="xs bold muted">{p.kind === 'deposit' ? `Cọc ${pay.deposit_pct}% — khi chốt` : `Phần còn lại — trong ${pay.payment_days} ngày sau duyệt video`}</span>
              {st && <Badge tone={st.tone}>{st.l}</Badge>}
            </div>
            <div className="money-row">
              <span className="muted">Gross</span><span>{vnd(p.gross)}</span>
              <span className="muted">Thuế TNCN{Number(p.pit) > 0 ? ` ${pay.pit_rate_pct}%` : ''}</span><span style={{ color: Number(p.pit) > 0 ? 'var(--red)' : undefined }}>{Number(p.pit) > 0 ? `−${vnd(p.pit)}` : '0đ'}</span>
              <span className="bold">Bạn nhận</span><span className="bold" style={{ color: 'var(--brand-700)' }}>{vnd(p.net)}</span>
            </div>
            {(p.paid_at || p.due_at) && <div className="xs muted" style={{ marginTop: 4 }}>{p.paid_at ? `Đã trả ${fmtDate(p.paid_at)}` : `Hạn trả ${fmtDate(p.due_at)}`}</div>}
          </div>
        );
      })}
    </div>
  );
}

function DealCard({ d, fair, act, busy, pay }) {
  const [mode, setMode] = useState('');
  const [f, setF] = useState({ fee: '', commission_pct: '', videos: '', message: '' });
  const [showHist, setShowHist] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const st = DEAL_STATUS[d.status] || { l: d.status, tone: 'slate' };
  const dPay = { ...pay, deposit_pct: numOr(d.deposit_pct, pay.deposit_pct), payment_days: numOr(d.payment_days, pay.payment_days) };
  const fee = Number(d.fee) || 0;
  const rounds = d.rounds || [];
  const maxRounds = d.rounds_max || pay.deal_rounds_max;
  const canCounter = (d.round || 1) < maxRounds;
  const parts = d.payouts?.length ? d.payouts : fee > 0 ? payoutSplit(fee, dPay.deposit_pct, dPay) : [];
  const waitingMe = d.status === 'offered';
  const k = `deal-${d.id}`;

  const openCounter = () => { setF({ fee: fee || fair?.fee || '', commission_pct: Number(d.commission_pct) || 0, videos: d.videos || 1, message: '' }); setMode('counter'); };
  const counterFee = numOr(f.fee, 0);

  return (
    <div className="card stack" style={{ gap: 12, marginBottom: 14, borderColor: waitingMe ? 'var(--brand)' : undefined, boxShadow: waitingMe ? '0 0 0 3px var(--brand-50), var(--shadow)' : undefined }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          {d.brand_name && <div className="xs bold" style={{ color: 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d.brand_name}</div>}
          <div className="bold">{d.campaign_name || 'Booking riêng'}</div>
          <div className="xs muted">{dealTypeLabel(d.deal_type)} · vòng {d.round || 1}/{maxRounds}</div>
        </div>
        <Badge tone={st.tone} dot>{st.l}</Badge>
      </div>

      {['offered', 'countered'].includes(d.status) && d.expires_at && (
        <div className="row wrap" style={{ gap: 8 }}>
          <Countdown to={d.expires_at} />
          <span className="xs muted">{waitingMe ? `Bạn trả lời trước ${fmtDateTime(d.expires_at)}` : `Brand phải phản hồi trước ${fmtDateTime(d.expires_at)} — quá hạn bạn sẽ được báo`}</span>
        </div>
      )}

      <div className="grid g4" style={{ gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        <Stat label="Phí (gross)" value={fee > 0 ? vnd(fee) : 'Barter'} />
        <Stat label="Hoa hồng" value={`${Number(d.commission_pct) || 0}%`} />
        <Stat label="Số video" value={d.videos || 1} />
        <Stat label="Spark code" value={d.spark_code ? 'Có' : 'Không'} />
      </div>

      {parts.length > 0 && <Money parts={parts} pay={dPay} />}
      {fee > 0 && !d.payouts?.length && <div className="xs muted" style={{ marginTop: -4 }}>Khấu trừ TNCN {dPay.pit_rate_pct}% với mỗi lần trả ≥ {vnd(dPay.pit_threshold)}. Phí công bố là gross.</div>}
      {fee === 0 && <div className="small muted">Barter: nhận mẫu miễn phí + {Number(d.commission_pct) || 0}% hoa hồng mỗi đơn, 1 video, không phạt nếu không ra đơn.</div>}

      {d.status === 'countered' && <div className="alert alert-info small">⏳ Bạn đã đề xuất giá. Brand phản hồi trong tối đa {pay.brand_reply_hours}h.</div>}
      {d.status === 'booked' && <div className="alert alert-ok small">✅ Deal đã chốt. {fee > 0 ? `Cọc ${dPay.deposit_pct}% đang được chuyển; ` : ''}đăng video đúng brief rồi nộp link bên dưới.</div>}

      {waitingMe && !mode && (
        <div className="grid g3" style={{ gap: 8, gridTemplateColumns: '1.4fr 1fr 1fr' }}>
          <button className="btn btn-primary" disabled={busy === k} onClick={() => act(k, { action: 'deal_accept', deal_id: d.id }, 'Đã nhận offer — deal đã chốt 🎉')}>✓ Nhận</button>
          <button className="btn" disabled={!canCounter} title={canCounter ? '' : 'Đã hết số vòng thương lượng'} onClick={openCounter}>↔ Trả giá</button>
          <button className="btn btn-danger" onClick={() => setMode('decline')}>Từ chối</button>
        </div>
      )}
      {waitingMe && !canCounter && !mode && <div className="xs muted">Đã đủ {maxRounds} vòng thương lượng — chỉ còn Nhận hoặc Từ chối.</div>}

      {mode === 'counter' && (
        <div className="stack" style={{ gap: 10, background: 'var(--surface-2)', borderRadius: 12, padding: 12 }}>
          <div className="grid g3" style={{ gap: 8, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
            <div><label className="label">Phí (VNĐ)</label><input className="input input-sm" type="number" inputMode="numeric" min="0" value={f.fee} onChange={set('fee')} /></div>
            <div><label className="label">% HH</label><input className="input input-sm" type="number" inputMode="decimal" min="0" value={f.commission_pct} onChange={set('commission_pct')} /></div>
            <div><label className="label">Video</label><input className="input input-sm" type="number" inputMode="numeric" min="1" value={f.videos} onChange={set('videos')} /></div>
          </div>
          {fair?.fee > 0 && <div className="xs muted">Giá hợp lý của bạn: <b>{vnd(fair.fee)}</b>/video{counterFee > fair.fee * 1.5 ? ' — giá đề xuất cao hơn nhiều, brand có thể từ chối.' : ''}</div>}
          {counterFee > 0 && <Money parts={payoutSplit(counterFee, dPay.deposit_pct, dPay)} pay={dPay} />}
          <textarea className="textarea" rows={2} placeholder="Lời nhắn cho brand (VD: kênh mình ra đơn tốt ở ngành này…)" value={f.message} onChange={set('message')} />
          <div className="row">
            <button className="btn btn-primary grow" disabled={busy === k || !(counterFee >= 0)} onClick={async () => { if (await act(k, { action: 'deal_counter', deal_id: d.id, fee: counterFee, commission_pct: numOr(f.commission_pct, 0), videos: Math.max(1, numOr(f.videos, 1)), message: f.message }, 'Đã gửi đề xuất giá')) setMode(''); }}>Gửi đề xuất</button>
            <button className="btn" onClick={() => setMode('')}>Thôi</button>
          </div>
          <div className="xs muted">Còn {Math.max(0, maxRounds - (d.round || 1))} vòng. Brand phản hồi trong {pay.brand_reply_hours}h.</div>
        </div>
      )}

      {mode === 'decline' && (
        <div className="stack" style={{ gap: 8, background: 'var(--red-bg)', borderRadius: 12, padding: 12 }}>
          <div className="small bold" style={{ color: 'var(--red)' }}>Từ chối offer này?</div>
          <textarea className="textarea" rows={2} placeholder="Lý do (không bắt buộc) — giúp brand gửi offer phù hợp hơn" value={f.message} onChange={set('message')} />
          <div className="row">
            <button className="btn btn-danger grow" style={{ background: 'var(--surface)' }} disabled={busy === k} onClick={async () => { if (await act(k, { action: 'deal_decline', deal_id: d.id, message: f.message }, 'Đã từ chối offer')) setMode(''); }}>Xác nhận từ chối</button>
            <button className="btn" onClick={() => setMode('')}>Thôi</button>
          </div>
        </div>
      )}

      {rounds.length > 0 && (
        <div>
          <button className="btn btn-sm" onClick={() => setShowHist(v => !v)}>{showHist ? 'Ẩn lịch sử' : `Lịch sử thương lượng (${rounds.length})`}</button>
          {showHist && rounds.map((r, i) => (
            <div key={r.id || i} className="feed-item">
              <span className="feed-dot" style={{ background: `var(--${r.by_party === 'creator' ? 'accent' : 'brand'})` }} />
              <div className="grow">
                <div className="small"><b>{r.by_party === 'creator' ? 'Bạn' : r.by_party === 'brand' ? (d.brand_name || 'Brand') : 'Hệ thống'}</b> {ACTION_L[r.action] || r.action}{['offer', 'counter', 'apply'].includes(r.action) ? `: ${Number(r.fee) > 0 ? vnd(r.fee) : 'barter'} · ${Number(r.commission_pct) || 0}% HH · ${r.videos || 1} video` : ''}</div>
                {r.message && <div className="xs muted">“{r.message}”</div>}
              </div>
              <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RateCard({ rc, fair, tier, act, busy }) {
  const [f, setF] = useState({ video_fee: '', live_hour_fee: '', commission_pct: '', spark_fee_pct: '', accepts_barter: true, note: '' });
  useEffect(() => {
    if (rc) setF({ video_fee: rc.video_fee ?? '', live_hour_fee: rc.live_hour_fee ?? '', commission_pct: rc.commission_pct ?? '', spark_fee_pct: rc.spark_fee_pct ?? '', accepts_barter: rc.accepts_barter !== false, note: rc.note || '' });
  }, [rc]);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const t = TIERS[tier];
  const save = () => act('rate', { action: 'rate_card', video_fee: numOr(f.video_fee, null), live_hour_fee: numOr(f.live_hour_fee, null), commission_pct: numOr(f.commission_pct, null), spark_fee_pct: numOr(f.spark_fee_pct, null), accepts_barter: !!f.accepts_barter, note: f.note }, 'Đã lưu bảng giá');
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-title">💵 Bảng giá của tôi {t && <Badge tone={t.tone}>{t.l}</Badge>}</div>
      {t && <div className="xs muted" style={{ marginTop: -6, marginBottom: 10 }}>Hạng {t.l}: {t.s}</div>}
      {fair ? (
        <div style={{ background: 'var(--brand-50)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div className="xs bold" style={{ color: 'var(--brand-700)' }}>GIÁ HỢP LÝ CỦA BẠN (công thức công khai)</div>
          <div className="row wrap" style={{ gap: 16, margin: '4px 0' }}>
            <div><span style={{ fontSize: 22, fontWeight: 900 }} className="tnum">{vnd(fair.fee)}</span><span className="xs muted"> / video</span></div>
            {fair.live_hour > 0 && <div><span className="bold tnum">{vnd(fair.live_hour)}</span><span className="xs muted"> / giờ live</span></div>}
          </div>
          {fair.formula && <div className="xs" style={{ color: 'var(--ink-2)' }}>= {fair.formula}</div>}
          <div className="xs muted" style={{ marginTop: 4 }}>Views TB tăng → giá hợp lý tự tăng. Đây là mức gợi ý, bạn vẫn tự báo giá.</div>
        </div>
      ) : <div className="small muted" style={{ marginBottom: 10 }}>Giá hợp lý sẽ hiện khi hồ sơ có số views trung bình.</div>}
      <div className="grid g2" style={{ gap: 10 }}>
        <div><label className="label">Phí / video (VNĐ)</label><input className="input input-sm" type="number" inputMode="numeric" min="0" value={f.video_fee} onChange={set('video_fee')} placeholder={fair?.fee ? String(fair.fee) : ''} /></div>
        <div><label className="label">Phí / giờ live (VNĐ)</label><input className="input input-sm" type="number" inputMode="numeric" min="0" value={f.live_hour_fee} onChange={set('live_hour_fee')} placeholder={fair?.live_hour ? String(fair.live_hour) : ''} /></div>
        <div><label className="label">% hoa hồng mong muốn</label><input className="input input-sm" type="number" inputMode="decimal" min="0" value={f.commission_pct} onChange={set('commission_pct')} /></div>
        <div><label className="label">Phí Spark code (+%)</label><input className="input input-sm" type="number" inputMode="decimal" min="0" value={f.spark_fee_pct} onChange={set('spark_fee_pct')} /></div>
      </div>
      <label className="chk" style={{ margin: '10px 0' }}><input type="checkbox" checked={f.accepts_barter} onChange={set('accepts_barter')} /> Tôi nhận deal barter (mẫu + hoa hồng)</label>
      <textarea className="textarea" rows={2} value={f.note} onChange={set('note')} placeholder="Ghi chú cho brand (ngành mình mạnh, lịch quay…)" />
      <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} disabled={busy === 'rate'} onClick={save}>Lưu bảng giá</button>
      <div className="hint">Không bắt buộc — chỉ để brand tham khảo khi gửi offer.</div>
    </div>
  );
}

function OpenCampaign({ cp, fair, act, busy, applied, pay }) {
  const [open, setOpen] = useState('');
  const barter = isBarter(cp);
  const defFee = barter ? 0 : Math.min(Math.max(fair?.fee || 0, Number(cp.fee_min) || 0), Number(cp.fee_max) || Infinity) || Number(cp.fee_min) || 0;
  const [f, setF] = useState({ fee: defFee, commission_pct: Number(cp.commission_pct) || 0, message: '' });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const cPay = { ...pay, deposit_pct: numOr(cp.deposit_pct, pay.deposit_pct), payment_days: numOr(cp.payment_days, pay.payment_days) };
  const ok = lines(cp.claims_allowed), ban = lines(cp.claims_banned);
  const k = `apply-${cp.id}`;
  const fee = numOr(f.fee, 0);
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-2)' }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          {cp.brand_name && <div className="xs bold" style={{ color: 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{cp.brand_name}</div>}
          <b className="small">{cp.name}</b>
          <div className="xs muted">{cp.product}{cp.niche ? ` · ${nicheLabel(cp.niche)}` : ''}{cp.end_date ? ` · hạn ${fmtDate(cp.end_date)}` : ''}</div>
        </div>
        <Badge tone="violet">{dealTypeLabel(cp.deal_type || 'barter')}</Badge>
      </div>
      <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
        <Badge tone="green">{barter ? 'Mẫu + hoa hồng' : Number(cp.fee_max) > Number(cp.fee_min) ? `${fmtMoney(cp.fee_min)}–${fmtMoney(cp.fee_max)}đ` : `${fmtMoney(cp.fee_min || cp.fee_max)}đ`}</Badge>
        <Badge tone="blue">HH {Number(cp.commission_pct) || 0}%</Badge>
        {!barter && <Badge tone="slate">Cọc {cPay.deposit_pct}% · trả trong {cPay.payment_days} ngày</Badge>}
        <Badge tone="slate">{cp.revisions ?? 1} lần sửa</Badge>
        {cp.slots_left !== undefined && <Badge tone={cp.slots_left > 3 ? 'blue' : 'red'}>Còn {cp.slots_left} slot</Badge>}
      </div>
      <div className="row" style={{ gap: 6, marginTop: 8 }}>
        <button className="btn btn-sm" onClick={() => setOpen(open === 'brief' ? '' : 'brief')}>{open === 'brief' ? 'Ẩn brief' : 'Xem brief'}</button>
        {applied ? <Badge tone="amber">Đã đề xuất — chờ brand</Badge> : <button className="btn btn-sm btn-primary" onClick={() => setOpen(open === 'apply' ? '' : 'apply')}>Ứng tuyển</button>}
      </div>
      {open === 'brief' && (
        <div className="stack small" style={{ gap: 8, marginTop: 10 }}>
          {cp.brief && <p style={{ whiteSpace: 'pre-line' }}>{cp.brief}</p>}
          {cp.req && <p className="muted" style={{ whiteSpace: 'pre-line' }}>✅ {cp.req}</p>}
          {(ok.length > 0 || ban.length > 0) && (
            <div className="grid g2" style={{ gap: 8 }}>
              <div><div className="xs bold" style={{ color: 'var(--green)' }}>✓ ĐƯỢC NÓI</div>{ok.map(x => <div key={x}>• {x}</div>)}{!ok.length && <span className="muted">—</span>}</div>
              <div><div className="xs bold" style={{ color: 'var(--red)' }}>✕ KHÔNG ĐƯỢC NÓI</div>{ban.map(x => <div key={x}>• {x}</div>)}{!ban.length && <span className="muted">—</span>}</div>
            </div>
          )}
          {cp.note && <p style={{ color: 'var(--red)' }}>⚠ {cp.note}</p>}
          {cp.contact_name && <div>👤 Liên hệ: <b>{cp.contact_name}</b></div>}
        </div>
      )}
      {open === 'apply' && !applied && (
        <div className="stack" style={{ gap: 8, marginTop: 10, background: 'var(--surface-2)', borderRadius: 12, padding: 12 }}>
          <div className="grid g2" style={{ gap: 8, gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            <div><label className="label">Phí đề xuất (VNĐ)</label><input className="input input-sm" type="number" inputMode="numeric" min="0" disabled={barter} value={barter ? 0 : f.fee} onChange={set('fee')} /></div>
            <div><label className="label">% HH</label><input className="input input-sm" type="number" inputMode="decimal" min="0" value={f.commission_pct} onChange={set('commission_pct')} /></div>
          </div>
          {!barter && fair?.fee > 0 && <div className="xs muted">Giá hợp lý của bạn: {vnd(fair.fee)} · khoảng brand công bố: {fmtMoney(cp.fee_min)}–{fmtMoney(cp.fee_max)}đ</div>}
          {!barter && fee > 0 && <Money parts={payoutSplit(fee, cPay.deposit_pct, cPay)} pay={cPay} />}
          <textarea className="textarea" rows={2} placeholder="Giới thiệu ngắn: vì sao kênh bạn hợp sản phẩm này?" value={f.message} onChange={set('message')} />
          <button className="btn btn-primary" disabled={busy === k} onClick={async () => { if (await act(k, { action: 'apply_campaign', campaign_id: cp.id, fee: barter ? 0 : fee, commission_pct: numOr(f.commission_pct, 0), message: f.message }, 'Đã gửi đề xuất — brand phản hồi trong 48h')) setOpen(''); }}>Gửi đề xuất</button>
        </div>
      )}
    </div>
  );
}

export default function Portal() {
  const router = useRouter();
  const { token } = router.query;
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [video, setVideo] = useState('');
  const [addr, setAddr] = useState('');
  const [order, setOrder] = useState('');
  const [busy, setBusy] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [toastNode, toast] = useToast();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`/api/portal/${token}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || 'Không tải được'); return; }
      setData(d); setAddr(d.creator?.ship_address || '');
    } catch { setErr('Không kết nối được máy chủ. Thử tải lại trang.'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const act = async (key, body, ok) => {
    setBusy(key);
    try {
      const r = await fetch(`/api/portal/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Có lỗi xảy ra');
      toast(typeof ok === 'function' ? ok(d) : ok); await load();
      return true;
    } catch (e) { toast(e.message); return false; } finally { setBusy(''); }
  };

  if (err) return <div className="form-wrap"><div className="alert alert-error" style={{ marginTop: 60 }}>⚠ {err}</div></div>;
  if (!data) return <div className="empty" style={{ paddingTop: 120 }}>Đang tải…</div>;
  const c = data.creator || {};
  const samples = data.samples || [];
  const videos = data.videos || [];
  const campaigns = data.campaigns || [];
  const deals = data.deals || [];
  const openCamps = data.open_campaigns || [];
  const dr = data.deal_rules || {};
  const pay = { ...PAY, ...Object.fromEntries(Object.entries({ deal_rounds_max: dr.rounds_max, brand_reply_hours: dr.brand_reply_hours, pit_threshold: dr.pit_threshold, pit_rate_pct: dr.pit_rate_pct }).filter(([, v]) => v !== undefined && v !== null)) };
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const refLink = `${origin}/?ref=${c.ref_code}`;
  const active = samples.find(s => ['delivered', 'overdue'].includes(s.status));
  const canAct = !['rejected', 'prospect'].includes(c.status);
  const activeDeals = deals.filter(d => ACTIVE.includes(d.status)).sort((a, b) => (a.status === 'offered' ? -1 : 0) - (b.status === 'offered' ? -1 : 0));
  const pastDeals = deals.filter(d => !ACTIVE.includes(d.status));
  const payouts = deals.flatMap(d => (d.payouts || []).map(p => ({ ...p, deal_id: d.id, campaign_name: d.campaign_name, brand_name: d.brand_name })));
  const received = payouts.filter(p => p.status === 'paid').reduce((a, p) => a + (Number(p.net) || 0), 0);
  const upcoming = payouts.filter(p => p.status !== 'paid').reduce((a, p) => a + (Number(p.net) || 0), 0);
  const appliedNames = new Set(deals.filter(d => ['offered', 'countered', 'booked', 'delivered'].includes(d.status)).map(d => d.campaign_id || d.campaign_name));
  const waiting = activeDeals.filter(d => d.status === 'offered').length;

  return (
    <>
      <Head><title>{`${c.name || 'Creator'} · Theo dõi hợp tác`}</title><meta name="robots" content="noindex" /></Head>
      <div className="hero" style={{ minHeight: '100vh' }}>
        <div className="form-wrap" style={{ maxWidth: 620 }}>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div className="row"><div className="brand-logo">K</div><b>KOL Hub</b></div>
            <CreatorStatus s={c.status} />
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="small muted">Xin chào</div>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>{c.name}</h1>
            <div className="small muted">{c.handle && `@${c.handle} · `}{fmtNum(c.followers)} followers · score {Number(c.score || 0).toFixed(2)}{data.tier && TIERS[data.tier] ? ` · hạng ${TIERS[data.tier].l}` : ''}</div>
            {['applied', 'pending'].includes(c.status) && <div className="alert alert-info" style={{ marginTop: 12 }}>⏳ Hồ sơ đang được xem xét (24–48h). Trong lúc chờ, hãy cập nhật địa chỉ nhận mẫu bên dưới.</div>}
            {c.status === 'rejected' && <div className="alert alert-error" style={{ marginTop: 12 }}>Hồ sơ chưa phù hợp đợt này. Cải thiện tỉ lệ xem và đăng ký lại sau 30 ngày nhé.</div>}
            {c.promo_code && <div className="alert alert-ok" style={{ marginTop: 12 }}>🎟 Mã giảm giá của bạn: <b>{c.promo_code}</b></div>}
            {waiting > 0 && <a href="#offers" className="alert alert-ok" style={{ marginTop: 12, textDecoration: 'none' }}>💌 Bạn có <b>{waiting} offer</b> đang chờ trả lời →</a>}
          </div>

          {activeDeals.length > 0 && (
            <div id="offers" style={{ marginBottom: 4 }}>
              <div className="label" style={{ marginLeft: 4 }}>Offer & deal của bạn</div>
              {activeDeals.map(d => <DealCard key={d.id} d={d} fair={data.fair} act={act} busy={busy} pay={pay} />)}
            </div>
          )}

          {payouts.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">💳 Thanh toán</div>
              <div className="grid g2" style={{ gap: 8, marginBottom: 10, gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
                <Stat label="Đã nhận (net)" value={vnd(received)} tone="green" />
                <Stat label="Sắp nhận (net)" value={vnd(upcoming)} />
              </div>
              {payouts.map(p => {
                const st = PAYOUT_STATUS[p.status] || { l: p.status, tone: 'slate' };
                const late = p.status === 'due' && p.due_at && daysUntil(p.due_at) < 0;
                return (
                  <div key={`${p.deal_id}-${p.kind}`} className="feed-item" style={{ alignItems: 'center' }}>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="small bold ellipsis">{KIND_L[p.kind] || p.kind} · {p.brand_name || p.campaign_name || `Deal #${p.deal_id}`}</div>
                      <div className="xs muted tnum">{vnd(p.gross)} − TNCN {vnd(p.pit)} = <b style={{ color: 'var(--ink)' }}>{vnd(p.net)}</b></div>
                      <div className="xs muted">{p.paid_at ? `Đã trả ${fmtDate(p.paid_at)}` : p.due_at ? `Hạn ${fmtDate(p.due_at)}` : 'Đến hạn sau khi video được duyệt'}</div>
                    </div>
                    <Badge tone={late ? 'red' : st.tone} dot>{late ? 'Trễ hạn' : st.l}</Badge>
                  </div>
                );
              })}
              <div className="xs muted" style={{ marginTop: 8 }}>TNCN {pay.pit_rate_pct}% khấu trừ với mỗi lần trả ≥ {vnd(pay.pit_threshold)}. Chứng từ khấu trừ thuế được cấp theo yêu cầu.</div>
            </div>
          )}

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
                <button className="btn btn-primary" disabled={!video || busy === 'video'} onClick={async () => { if (await act('video', { action: 'video', url: video }, d => (d.video?.verified ? 'Đã nhận video ✓ đúng kênh' : 'Đã nhận video, team sẽ duyệt'))) setVideo(''); }}>{busy === 'video' ? '…' : 'Nộp'}</button>
              </div>
              <div className="hint">Video phải đăng từ kênh bạn đã đăng ký. Gắn giỏ hàng sản phẩm để được tính hoa hồng. Video của deal có phí luôn được người duyệt (disclaimer, nhãn quảng cáo, không claim chữa bệnh).</div>
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

          {canAct && openCamps.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">📣 Chiến dịch đang mở</div>
              <div className="xs muted" style={{ marginTop: -6 }}>Xem brief và điều khoản, rồi đề xuất giá của bạn. Brand phản hồi trong {pay.brand_reply_hours}h.</div>
              {openCamps.map(cp => <OpenCampaign key={cp.id} cp={cp} fair={data.fair} act={act} busy={busy} pay={pay} applied={!!cp.has_deal || appliedNames.has(cp.id) || appliedNames.has(cp.name)} />)}
            </div>
          )}

          {canAct && <RateCard rc={data.rate_card} fair={data.fair} tier={data.tier} act={act} busy={busy} />}

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

          {pastDeals.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">Deal đã đóng ({pastDeals.length}) <button className="btn btn-sm" onClick={() => setShowPast(v => !v)}>{showPast ? 'Ẩn' : 'Xem'}</button></div>
              {showPast && pastDeals.map(d => {
                const st = DEAL_STATUS[d.status] || { l: d.status, tone: 'slate' };
                return (
                  <div key={d.id} className="feed-item" style={{ alignItems: 'center' }}>
                    <div className="grow"><div className="small bold">{d.brand_name ? `${d.brand_name} · ` : ''}{d.campaign_name || 'Booking riêng'}</div><div className="xs muted">{Number(d.fee) > 0 ? vnd(d.fee) : 'Barter'} · {Number(d.commission_pct) || 0}% HH · {d.videos || 1} video</div></div>
                    <Badge tone={st.tone} dot>{st.l}</Badge>
                  </div>
                );
              })}
            </div>
          )}

          {canAct && (
            <div className="card" style={{ marginBottom: 14, background: 'var(--accent-50)', borderColor: '#ffd9cc' }}>
              <div className="card-title">🤝 Giới thiệu bạn bè creator</div>
              <div className="small" style={{ marginBottom: 8 }}>Đã giới thiệu: <b>{data.referrals ?? 0}</b> người. Creator giới thiệu nhiều được ưu tiên vào chiến dịch lớn.</div>
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
