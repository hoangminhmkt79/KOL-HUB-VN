import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NICHES, PLATFORMS, CTYPES, CITIES, GMV_OPTS, dealTypeLabel, nicheLabel, fmtNum, fmtDate, fmtMoney } from '../lib/constants';
import { payoutSplit, NICHE_MULT } from '../lib/pricing';
import { Modal, Stat, vnd } from '../components/ui';

// Mặc định công bố (docs/DEBATE.md) — campaign có thể ghi đè cọc / hạn trả
const PAY = { deposit_pct: 30, payment_days: 7, pit_threshold: 2000000, pit_rate_pct: 10 };
let PAY_DEFAULTS = PAY;
const payOf = c => ({ ...PAY_DEFAULTS, ...(c?.deposit_pct !== undefined && c?.deposit_pct !== null ? { deposit_pct: Number(c.deposit_pct) } : {}), ...(c?.payment_days ? { payment_days: Number(c.payment_days) } : {}), ...(c?.pit_threshold ? { pit_threshold: Number(c.pit_threshold) } : {}), ...(c?.pit_rate_pct ? { pit_rate_pct: Number(c.pit_rate_pct) } : {}) });
const isBarter = c => c.deal_type === 'barter' || (!Number(c.fee_min) && !Number(c.fee_max));
const feeText = c => (isBarter(c) ? 'Mẫu miễn phí + hoa hồng' : Number(c.fee_max) > Number(c.fee_min) ? `${fmtMoney(c.fee_min)} – ${fmtMoney(c.fee_max)}đ` : `${fmtMoney(c.fee_min || c.fee_max)}đ`);
const lines = t => String(t || '').split(/\n+/).map(x => x.replace(/^[-•*\s]+/, '').trim()).filter(Boolean);

function PayBreakdown({ fee, pay }) {
  const parts = payoutSplit(fee, pay.deposit_pct, pay);
  if (!parts.length) return null;
  const label = { deposit: `Cọc ${pay.deposit_pct}% — khi chốt deal`, final: `Phần còn lại — trong ${pay.payment_days} ngày sau khi video được duyệt` };
  return (
    <div className="stack" style={{ gap: 8 }}>
      {parts.map(p => (
        <div key={p.kind} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}>
          <div className="xs bold muted" style={{ marginBottom: 4 }}>{label[p.kind]}</div>
          <div className="money-row">
            <span className="muted">Gross</span><span>{vnd(p.gross)}</span>
            <span className="muted">TNCN {p.pit ? `${pay.pit_rate_pct}%` : '(dưới ngưỡng)'}</span><span style={{ color: p.pit ? 'var(--red)' : undefined }}>{p.pit ? `−${vnd(p.pit)}` : '0đ'}</span>
            <span className="bold">Bạn nhận</span><span className="bold" style={{ color: 'var(--brand-700)' }}>{vnd(p.net)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BriefModal({ c, onClose, onApply }) {
  const pay = payOf(c);
  const fee = Number(c.fee_max) || Number(c.fee_min) || 0;
  const ok = lines(c.claims_allowed), ban = lines(c.claims_banned);
  return (
    <Modal onClose={onClose} title={c.name}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          {c.brand_name && <span className="badge tone-blue">Brand: {c.brand_name}</span>}
          <span className="badge tone-violet">{dealTypeLabel(c.deal_type || 'barter')}</span>
          <span className="badge tone-green">{c.niche ? nicheLabel(c.niche) : 'Mọi lĩnh vực'}</span>
          {c.slots_left !== undefined && <span className={`badge tone-${c.slots_left > 3 ? 'blue' : 'red'}`}>Còn {c.slots_left} slot</span>}
        </div>
        <div className="small muted">{c.product}{c.format ? ` · ${c.format}` : ''}{c.end_date ? ` · hạn ${fmtDate(c.end_date)}` : ''}</div>
        <div className="grid g2 g2k" style={{ gap: 8 }}>
          <Stat label="Phí booking (gross)" value={feeText(c)} />
          <Stat label="Hoa hồng" value={`${Number(c.commission_pct) || 0}% / đơn`} />
          <Stat label="Số video" value={isBarter(c) ? '1 video' : `${c.posts_per || 1} video`} />
          <Stat label="Số lần sửa" value={`Tối đa ${c.revisions ?? 1} lần`} />
        </div>
        {c.brief && <div><div className="label">Brief</div><p className="small" style={{ whiteSpace: 'pre-line' }}>{c.brief}</p></div>}
        {c.req && <div><div className="label">Yêu cầu nội dung</div><p className="small" style={{ whiteSpace: 'pre-line' }}>{c.req}</p></div>}
        {(ok.length > 0 || ban.length > 0) && (
          <div className="grid g2" style={{ gap: 10 }}>
            <div><div className="label" style={{ color: 'var(--green)' }}>✓ Được nói</div>{ok.length ? ok.map(x => <div key={x} className="small">• {x}</div>) : <div className="small muted">—</div>}</div>
            <div><div className="label" style={{ color: 'var(--red)' }}>✕ Không được nói</div>{ban.length ? ban.map(x => <div key={x} className="small">• {x}</div>) : <div className="small muted">—</div>}</div>
          </div>
        )}
        {c.note && <div className="alert alert-error small">⚠ {c.note}</div>}
        <div>
          <div className="label">Thanh toán {fee > 0 ? `— ví dụ với phí ${vnd(fee)}` : ''}</div>
          {fee > 0 ? <PayBreakdown fee={fee} pay={pay} /> : <div className="small">Barter: nhận sản phẩm mẫu miễn phí + {Number(c.commission_pct) || 0}% hoa hồng mỗi đơn. Không phạt nếu video không ra đơn.</div>}
          {fee > 0 && <div className="xs muted" style={{ marginTop: 6 }}>Khấu trừ thuế TNCN {pay.pit_rate_pct}% với mỗi lần trả từ {vnd(pay.pit_threshold)} trở lên, theo quy định. Phí công bố là gross (trước thuế).</div>}
        </div>
        {c.contact_name && <div className="small">👤 Người liên hệ: <b>{c.contact_name}</b></div>}
        <button className="btn btn-primary btn-block" disabled={c.slots_left !== undefined && c.slots_left <= 0} onClick={onApply}>Đăng ký để ứng tuyển</button>
        <div className="hint" style={{ textAlign: 'center', marginTop: -6 }}>Sau khi được duyệt, bạn đề xuất giá hoặc nhận offer trong trang cá nhân.</div>
      </div>
    </Modal>
  );
}

const EMPTY = { name: '', email: '', phone: '', link: '', followers: '', avg_views: '', avg_viewers: '', platform: 'TikTok', ct: '', niche: '', gmv_kenh: '', address: '', website: '', consent: false };
const calcScore = (f, v) => { const F = parseInt(f) || 0; return F > 0 ? Math.round(((parseInt(v) || 0) / F) * 100) / 100 : 0; };
const scoreTone = s => (s >= 0.3 ? 'green' : s >= 0.15 ? 'amber' : 'red');
const scoreText = s => (s >= 0.3 ? 'Rất tốt — ưu tiên duyệt' : s >= 0.15 ? 'Tốt — có tiềm năng' : 'Còn thấp — nên cải thiện chất lượng content');

function ApplyForm({ initial, onDone, onBack }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = k => e => { setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); setErr(''); };
  const pick = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErr(''); };
  const score = calcScore(form.followers, form.avg_views);
  const showLive = form.ct === 'livestream' || form.ct === 'both';

  const next1 = () => {
    if (!form.name.trim() || !form.link.trim() || !form.followers || !form.avg_views) return setErr('Vui lòng điền họ tên, link kênh, followers và avg views.');
    if (!form.phone.trim() && !form.email.trim()) return setErr('Cần SĐT hoặc email để liên lạc.');
    if (form.phone.trim() && !/^(\+84|0)[0-9]{9,10}$/.test(form.phone.replace(/\s/g, ''))) return setErr('SĐT chưa đúng (VD: 0901234567).');
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr('Email chưa đúng định dạng.');
    setStep(2);
  };
  const next2 = () => {
    if (!form.platform || !form.ct || !form.niche) return setErr('Chọn nền tảng, loại nội dung và lĩnh vực.');
    if (showLive && !form.avg_viewers) return setErr('Điền số người xem trung bình mỗi livestream.');
    setStep(3);
  };
  const submit = async () => {
    if (!form.address) return setErr('Chọn tỉnh/thành nhận mẫu.');
    if (!form.consent) return setErr('Vui lòng tick đồng ý xử lý dữ liệu cá nhân để gửi đơn.');
    setLoading(true);
    try {
      const r = await fetch('/api/creators', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone.replace(/\s/g, ''), tiktok_link: form.link,
          followers: form.followers, avg_views: form.avg_views, avg_viewers: form.avg_viewers,
          platform: form.platform, content_type: form.ct, niche: form.niche, channel_gmv: form.gmv_kenh,
          address: form.address, ref: form.ref, website: form.website, consent: true, ...(form.acq ? { acq: form.acq } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gửi đơn thất bại.');
      onDone({ ...d, name: form.name });
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="form-wrap">
      <div className="row-between" style={{ marginBottom: 14 }}>
        <button className="btn btn-sm" onClick={() => (step === 1 ? onBack() : (setStep(step - 1), setErr('')))}>← {step === 1 ? 'Trang chủ' : 'Quay lại'}</button>
        <span className="small muted">Bước {step}/3 · ~2 phút</span>
      </div>
      <div className="steps" style={{ marginBottom: 18 }}>
        {['Thông tin', 'Kênh', 'Nhận mẫu'].map((l, i) => <div key={l} className={i < step ? 'done' : ''}>{l}</div>)}
      </div>
      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      {step === 1 && (
        <div className="card stack" style={{ gap: 14 }}>
          <div className="grid g2" style={{ gap: 12 }}>
            <div><label className="label">Họ tên *</label><input className="input" value={form.name} onChange={set('name')} placeholder="Nguyễn Văn A" /></div>
            <div><label className="label">Link kênh *</label><input className="input" value={form.link} onChange={set('link')} placeholder="tiktok.com/@handle" /></div>
            <div><label className="label">Số điện thoại</label><input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="0901 234 567" /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} placeholder="ban@email.com" /></div>
          </div>
          <div className="hint" style={{ marginTop: -6 }}>Chỉ cần SĐT <b>hoặc</b> email. SĐT giúp tự nhận diện đơn mẫu TikTok của bạn nhanh hơn.</div>
          <div className="grid g2" style={{ gap: 12 }}>
            <div><label className="label">Followers *</label><input className="input" type="number" min="0" value={form.followers} onChange={set('followers')} placeholder="15000" /></div>
            <div><label className="label">Avg views / video *</label><input className="input" type="number" min="0" value={form.avg_views} onChange={set('avg_views')} placeholder="5000" /></div>
          </div>
          <div><label className="label">Doanh thu kênh / tháng (không bắt buộc)</label>
            <select className="select" value={form.gmv_kenh} onChange={set('gmv_kenh')}><option value="">Chọn mức gần đúng…</option>{GMV_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
          </div>
          {parseInt(form.followers) > 0 && form.avg_views && (
            <div className={`alert tone-${scoreTone(score)}`} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div className="bold small">Engagement score</div><div className="xs">{scoreText(score)}</div></div>
              <div style={{ fontSize: 26, fontWeight: 900 }} className="tnum">{score.toFixed(2)}</div>
            </div>
          )}
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
          <button className="btn btn-primary btn-lg btn-block" onClick={next1}>Tiếp theo →</button>
        </div>
      )}

      {step === 2 && (
        <div className="card stack" style={{ gap: 16 }}>
          <div><label className="label">Nền tảng chính *</label>
            <div className="grid g3" style={{ gap: 8 }}>{PLATFORMS.map(p => (
              <div key={p.v} className={`opt${form.platform === p.v ? ' on' : ''}`} onClick={() => pick('platform', p.v)}><div className="bold small">{p.v}</div><div className="xs muted">{p.d}</div></div>
            ))}</div>
          </div>
          <div><label className="label">Loại nội dung *</label>
            <div className="grid g3" style={{ gap: 8 }}>{CTYPES.map(c => (
              <div key={c.v} className={`opt${form.ct === c.v ? ' on' : ''}`} onClick={() => pick('ct', c.v)}><div className="bold small">{c.l}</div><div className="xs muted">{c.s}</div></div>
            ))}</div>
          </div>
          {showLive && <div><label className="label">Avg viewers / livestream *</label><input className="input" type="number" value={form.avg_viewers} onChange={set('avg_viewers')} /></div>}
          <div><label className="label">Lĩnh vực chính *</label>
            <div className="grid g2" style={{ gap: 8 }}>{NICHES.map(n => (
              <div key={n.v} className={`opt${form.niche === n.v ? ' on' : ''}`} style={{ textAlign: 'left' }} onClick={() => pick('niche', n.v)}><div className="bold small">{n.l}</div><div className="xs muted">{n.s}</div></div>
            ))}</div>
          </div>
          <button className="btn btn-primary btn-lg btn-block" onClick={next2}>Tiếp theo →</button>
        </div>
      )}

      {step === 3 && (
        <div className="card stack" style={{ gap: 14 }}>
          <div><label className="label">Tỉnh / thành nhận mẫu *</label>
            <select className="select" value={form.address} onChange={set('address')}><option value="">Chọn tỉnh/thành…</option>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
            <div className="hint">Địa chỉ chi tiết bạn tự cập nhật trong trang theo dõi sau khi được duyệt.</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14 }}>
            <div className="bold small" style={{ color: 'var(--brand-700)', marginBottom: 8 }}>Tóm tắt hồ sơ</div>
            <div className="grid g2" style={{ gap: 8 }}>
              {[['Họ tên', form.name], ['Kênh', form.link], ['Followers', fmtNum(form.followers)], ['Score', score.toFixed(2)], ['Nền tảng', form.platform], ['Lĩnh vực', nicheLabel(form.niche)]].map(([l, v]) => (
                <div key={l}><div className="xs muted bold">{l}</div><div className="small bold ellipsis">{v || '—'}</div></div>
              ))}
            </div>
          </div>
          <label className="chk" style={{ background: form.consent ? 'var(--brand-50)' : 'var(--surface-2)', borderRadius: 12, padding: 12 }}>
            <input type="checkbox" checked={form.consent} onChange={set('consent')} />
            <span>
              <b>Tôi đồng ý</b> cho KOL Hub xử lý dữ liệu cá nhân (họ tên, SĐT/email, link và số liệu kênh, tỉnh/thành) để xét duyệt, ghép chiến dịch, gửi mẫu và liên hệ hợp tác, theo <b>Nghị định 13/2023/NĐ-CP</b>.
              <span className="muted"> Bạn có thể yêu cầu xem, sửa, xoá dữ liệu hoặc rút lại đồng ý bất cứ lúc nào. Chưa thu CCCD / số tài khoản ở bước này. *</span>
            </span>
          </label>
          <button className="btn btn-primary btn-lg btn-block" disabled={loading || !form.consent} onClick={submit}>{loading ? 'Đang gửi…' : 'Gửi đơn đăng ký'}</button>
          <div className="hint" style={{ textAlign: 'center' }}>Thông tin chỉ dùng để gửi mẫu và liên lạc — không chia sẻ bên thứ ba.</div>
        </div>
      )}
    </div>
  );
}

function Success({ res, onHome }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const portal = `${origin}/portal/${res.portal_token}`;
  const approved = res.status === 'approved';
  return (
    <div className="form-wrap" style={{ textAlign: 'center', paddingTop: 50 }}>
      <div style={{ fontSize: 46 }}>{approved ? '🎉' : '✅'}</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '10px 0 8px' }}>{approved ? 'Bạn đã được duyệt!' : 'Đã nhận đơn của bạn'}</h1>
      <p className="muted" style={{ maxWidth: 420, margin: '0 auto 22px' }}>
        {approved ? 'Hồ sơ đạt chuẩn và được duyệt tự động. Cập nhật địa chỉ nhận mẫu ngay trong trang theo dõi.' : 'Team sẽ xem hồ sơ trong 24–48h. Bạn theo dõi trạng thái bất cứ lúc nào qua link bên dưới.'}
      </p>
      <div className="card" style={{ textAlign: 'left', maxWidth: 440, margin: '0 auto 16px' }}>
        <div className="label">Link theo dõi riêng của bạn — lưu lại nhé</div>
        <div className="row"><input className="input input-sm grow" readOnly value={portal} onFocus={e => e.target.select()} /><a className="btn btn-primary btn-sm" href={portal}>Mở</a></div>
        <div className="hint">Xem đơn mẫu đang giao, hạn đăng video, nộp link video tại đây.</div>
      </div>
      <button className="btn" onClick={onHome}>Về trang chủ</button>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState('landing');
  const [pub, setPub] = useState(null);
  const [res, setRes] = useState(null);
  const [prefill, setPrefill] = useState({});
  const [brief, setBrief] = useState(null);

  useEffect(() => { fetch('/api/public/campaigns').then(r => r.json()).then(setPub).catch(() => setPub({ campaigns: [], stats: {} })); }, []);
  useEffect(() => {
    if (!router.isReady) return;
    const { ref, h, acq } = router.query;
    const p = {};
    if (ref) p.ref = String(ref);
    if (acq) p.acq = String(acq).slice(0, 16);
    if (h) { p.link = `tiktok.com/@${String(h).replace(/^@/, '')}`; }
    setPrefill(p);
    if (h) setView('apply');
  }, [router.isReady, router.query]);

  const apply = () => { setBrief(null); setView('apply'); window.scrollTo(0, 0); };
  if (pub?.terms) PAY_DEFAULTS = { ...PAY, ...pub.terms };
  const pay = payOf(pub?.campaigns?.[0]);
  const camps = pub?.campaigns || [];
  const stats = pub?.stats || {};

  return (
    <>
      <Head>
        <title>KOL Hub · Tuyển creator — phí công khai, trả đúng hạn</title>
        <meta name="description" content="Đăng ký làm creator: nhận sản phẩm mẫu miễn phí, được boost ads, hoa hồng rõ ràng. Duyệt tự động, theo dõi đơn mẫu minh bạch." />
      </Head>
      <div className="hero" style={{ minHeight: '100vh' }}>
        <div className="pub-wrap">
          <nav className="pub-nav">
            <div className="row"><div className="brand-logo">K</div><b>KOL Hub</b></div>
            {view === 'landing' && <button className="btn btn-primary" onClick={apply}>Đăng ký</button>}
          </nav>

          {view === 'apply' && <ApplyForm initial={prefill} onBack={() => setView('landing')} onDone={r => { setRes(r); setView('done'); window.scrollTo(0, 0); }} />}
          {view === 'done' && res && <Success res={res} onHome={() => setView('landing')} />}

          {view === 'landing' && (
            <>
              <section className="hero-grid">
                <div className="stack" style={{ gap: 18 }}>
                  <span className="pill" style={{ alignSelf: 'flex-start' }}><span className="dot" style={{ color: 'var(--brand)' }} />{camps.length ? `${camps.length} chiến dịch đang tuyển` : 'Đang mở đăng ký creator'}</span>
                  <h1>Brand rõ ràng.<br /><em>Phí công khai.</em><br />Trả tiền đúng hạn.</h1>
                  <p className="muted" style={{ fontSize: 16, maxWidth: 470 }}>Xem trước brand, brief, mức phí, % hoa hồng và lịch thanh toán <b style={{ color: 'var(--ink)' }}>trước khi đăng ký</b>. Cọc {pay.deposit_pct}% khi chốt, phần còn lại trả trong {pay.payment_days} ngày sau khi video được duyệt. Không cần triệu follower — chúng tôi ưu tiên <b style={{ color: 'var(--ink)' }}>tỉ lệ xem thật</b>.</p>
                  <div className="row wrap">
                    <button className="btn btn-primary btn-lg" onClick={apply}>Đăng ký ngay — miễn phí</button>
                    <a className="btn btn-lg" href="#campaigns">Xem chiến dịch</a>
                  </div>
                  {stats.creators >= 10 && (
                    <div className="row" style={{ gap: 26, marginTop: 6 }}>
                      {[[stats.creators, 'creator đang hợp tác'], [stats.samples, 'mẫu đã gửi'], [stats.videos, 'video đã đăng'], ...(Number(stats.paid_on_time) > 0 ? [[stats.paid_on_time, 'lần đã thanh toán']] : [])].map(([v, l]) => (
                        <div key={l}><div style={{ fontSize: 24, fontWeight: 900, color: 'var(--brand-700)' }} className="tnum">{fmtNum(v)}</div><div className="xs muted">{l}</div></div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: 22 }}>
                  <div className="bold" style={{ marginBottom: 14 }}>Hành trình của bạn</div>
                  {[
                    ['📝', 'Đăng ký 2 phút', 'Hồ sơ đạt chuẩn được duyệt tự động ngay lập tức'],
                    ['🤝', 'Nhận offer hoặc tự báo giá', 'Nhận / trả giá / từ chối trong 1 chạm, có hạn trả lời rõ ràng'],
                    ['🎬', 'Đăng video, dán link', 'Hệ thống tự xác minh video đúng kênh của bạn'],
                    ['💸', 'Nhận phí + hoa hồng', `Cọc ${pay.deposit_pct}% khi chốt, phần còn lại trong ${pay.payment_days} ngày sau duyệt video`],
                  ].map(([ic, t, s], i) => (
                    <div key={t} className="benefit" style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line-2)' : 'none' }}>
                      <div className="benefit-ico">{ic}</div>
                      <div><div className="bold small">{t}</div><div className="xs muted">{s}</div></div>
                    </div>
                  ))}
                </div>
              </section>

              <section id="campaigns" style={{ paddingBottom: 50 }}>
                <div className="row-between" style={{ marginBottom: 14 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900 }}>Chiến dịch đang tuyển</h2>
                </div>
                {camps.length ? (
                  <div className="grid g3">
                    {camps.map(c => {
                      const cp = payOf(c);
                      return (
                        <div key={c.id} className="card stack" style={{ gap: 10 }}>
                          <div className="row-between"><span className="badge tone-violet">{dealTypeLabel(c.deal_type || 'barter')}</span><span className={`badge tone-${c.slots_left > 3 ? 'blue' : 'red'}`}>Còn {c.slots_left ?? '—'} slot</span></div>
                          <div>
                            {c.brand_name && <div className="xs bold" style={{ color: 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{c.brand_name}</div>}
                            <h3 style={{ fontSize: 17 }}>{c.name}</h3>
                            <div className="small muted">{c.product}{c.niche ? ` · ${nicheLabel(c.niche)}` : ''}</div>
                          </div>
                          {(c.brief_short || c.brief) && <p className="small" style={{ color: 'var(--ink-2)' }}>{c.brief_short || String(c.brief).slice(0, 220)}{String(c.brief || '').length > 220 ? '…' : ''}</p>}
                          <div className="grid g2 g2k" style={{ gap: 6 }}>
                            <Stat label="Phí / creator" value={feeText(c)} />
                            <Stat label="Hoa hồng" value={`${Number(c.commission_pct) || 0}%`} />
                          </div>
                          <div className="xs muted">{isBarter(c) ? `💳 Barter · 1 video · không phạt` : `💳 Cọc ${cp.deposit_pct}% · trả nốt trong ${cp.payment_days} ngày sau duyệt · ${c.posts_per || 1} video`}</div>
                          <div className="row-between" style={{ marginTop: 'auto' }}>
                            <span className="xs muted">{c.end_date ? `Hạn ${fmtDate(c.end_date)}` : ''}</span>
                            <div className="row" style={{ gap: 6 }}>
                              <button className="btn btn-sm" onClick={() => setBrief(c)}>Xem brief</button>
                              <button className="btn btn-primary btn-sm" disabled={c.slots_left <= 0} onClick={apply}>Ứng tuyển</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="card empty">Chiến dịch mới sẽ mở sớm — đăng ký trước để được ưu tiên ghép.</div>
                )}
              </section>

              <section style={{ paddingBottom: 50 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 14 }}>Cam kết thanh toán</h2>
                <div className="grid g-main">
                  <div className="card stack" style={{ gap: 12 }}>
                    {[
                      ['💰', `Cọc ${pay.deposit_pct}% ngay khi chốt deal`, 'Không phải chờ video lên mới có tiền.'],
                      ['📅', `Phần còn lại trong ${pay.payment_days} ngày`, 'Tính từ lúc video được duyệt. Quá hạn bạn thấy ngay trong trang cá nhân.'],
                      ['🧾', `Thuế TNCN ${pay.pit_rate_pct}% hiển thị minh bạch`, `Chỉ khấu trừ với mỗi lần trả từ ${vnd(pay.pit_threshold)}. Mọi khoản đều ghi rõ gross → thuế → thực nhận.`],
                      ['📐', 'Giá hợp lý công khai', `views TB / 1000 × CPM × hệ số ngành (${Object.entries(NICHE_MULT).filter(([, m]) => m > 1).map(([k, m]) => `${nicheLabel(k)} ×${m}`).join(', ')}). Bạn tự báo giá được — bảng giá chỉ để tham khảo.`],
                    ].map(([ic, t, s]) => (
                      <div key={t} className="benefit"><div className="benefit-ico">{ic}</div><div><div className="bold small">{t}</div><div className="xs muted">{s}</div></div></div>
                    ))}
                  </div>
                  <div className="card">
                    <div className="bold small" style={{ marginBottom: 10 }}>Ví dụ: deal phí 3.000.000đ</div>
                    <PayBreakdown fee={3000000} pay={pay} />
                    <div className="xs muted" style={{ marginTop: 8 }}>Tổng thực nhận {vnd(payoutSplit(3000000, pay.deposit_pct, pay).reduce((a, p) => a + p.net, 0))} + hoa hồng mỗi đơn.</div>
                  </div>
                </div>
              </section>

              <section style={{ paddingBottom: 60 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 14 }}>Chúng tôi tìm creator thế nào?</h2>
                <div className="how">
                  {[
                    ['Tỉ lệ xem thật', 'Avg views / followers ≥ 0.2 được duyệt ngay. Follower ảo không giúp gì.'],
                    ['Đúng lĩnh vực', 'Làm đẹp, sức khoẻ, mẹ & bé, nhà cửa… ghép đúng sản phẩm bạn thật sự dùng.'],
                    ['Đăng đúng hạn', 'Đăng video trong 7 ngày sau khi nhận mẫu để được mời chiến dịch tiếp.'],
                    ['Ra đơn thật', 'Creator có GMV tốt được lên nhóm Scaling: boost ads + hoa hồng cao hơn.'],
                  ].map(([t, s], i) => (
                    <div key={t} className="card"><div className="how-num">{i + 1}</div><div className="bold">{t}</div><div className="small muted" style={{ marginTop: 4 }}>{s}</div></div>
                  ))}
                </div>
                <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 30, background: 'linear-gradient(135deg,#0b8a5f,#0e9f6e 60%,#34c38f)', color: '#fff', border: 'none' }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900 }}>Sẵn sàng nhận mẫu đầu tiên?</h2>
                  <p style={{ opacity: .85, margin: '6px 0 16px' }}>Miễn phí · Không ràng buộc · Duyệt tự động</p>
                  <button className="btn btn-lg" style={{ color: 'var(--brand-700)', fontWeight: 800 }} onClick={apply}>Đăng ký ngay →</button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
      {brief && <BriefModal c={brief} onClose={() => setBrief(null)} onApply={apply} />}
    </>
  );
}
