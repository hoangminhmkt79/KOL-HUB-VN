import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { dealTypeLabel, nicheLabel, fmtNum, fmtDate, fmtMoney, parseMoney, normalizeTikTok } from '../lib/constants';
import { payoutSplit } from '../lib/pricing';
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
        <div className="hint" style={{ textAlign: 'center', marginTop: -6 }}>Đăng ký 30 giây — team liên hệ qua Zalo trong 24h.</div>
      </div>
    </Modal>
  );
}


// ================= Form đăng ký nhanh (5 trường, mobile-first) =================
const FEE_CHIPS = [[300000, '300k'], [500000, '500k'], [1000000, '1 triệu'], [2000000, '2 triệu']];
const PHONE_RE = /^(\+84|84|0)[0-9]{9,10}$/;
const EMPTY = { name: '', phone: '', link: '', followers: '', fee: '', website: '' };

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Nhập họ tên hoặc nickname của bạn.';
  if (!PHONE_RE.test(f.phone.replace(/[\s.-]/g, ''))) e.phone = 'Số Zalo chưa đúng (VD: 0901234567).';
  if (!normalizeTikTok(f.link).link) e.link = 'Dán link kênh TikTok (VD: tiktok.com/@tenkenh) hoặc @tenkenh.';
  const fl = parseMoney(f.followers);
  if (!(fl > 0)) e.followers = 'Nhập số follower (VD: 5000 hoặc 5k).';
  const fee = parseMoney(f.fee);
  if (!(fee >= 50000)) e.fee = 'Nhập con số cụ thể (VD: 500.000đ) — không để trống.';
  return e;
}

function QuickForm({ initial, onDone }) {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [err, setErr] = useState({});
  const [touched, setTouched] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = { name: useRef(), phone: useRef(), link: useRef(), followers: useRef(), fee: useRef() };
  useEffect(() => { setF(p => ({ ...p, ...initial })); }, [initial]);

  const set = k => e => {
    const v = e.target.value;
    setF(p => { const n = { ...p, [k]: v }; if (touched[k]) setErr(validate(n)); return n; });
    setServerErr('');
  };
  const blur = k => () => { setTouched(t => ({ ...t, [k]: true })); setErr(validate(f)); };
  const tt = normalizeTikTok(f.link);
  const followers = parseMoney(f.followers);
  const fee = parseMoney(f.fee);

  const submit = async e => {
    e.preventDefault();
    const v = validate(f);
    setErr(v); setTouched({ name: 1, phone: 1, link: 1, followers: 1, fee: 1 });
    const first = ['name', 'phone', 'link', 'followers', 'fee'].find(k => v[k]);
    if (first) { refs[first].current?.focus(); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/creators', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quick: true, consent: true, website: f.website,
          name: f.name.trim(), phone: f.phone.replace(/[\s.-]/g, ''), tiktok_link: f.link.trim(),
          followers: f.followers, package_fee: f.fee,
          ...(f.ref ? { ref: f.ref } : {}), ...(f.acq ? { acq: f.acq } : {}), ...(f.utm ? { utm: f.utm } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gửi chưa được, thử lại giúp mình nhé.');
      onDone({ ...d, name: f.name.trim() });
    } catch (x) { setServerErr(x.message); } finally { setLoading(false); }
  };

  const fieldErr = k => touched[k] && err[k];
  const input = (k, props) => (
    <input ref={refs[k]} className={`input input-lg${fieldErr(k) ? ' invalid' : ''}`} value={f[k]} onChange={set(k)} onBlur={blur(k)}
      aria-invalid={!!fieldErr(k)} aria-describedby={`${k}-msg`} {...props} />
  );

  return (
    <form onSubmit={submit} noValidate className="stack" style={{ gap: 14 }}>
      <div>
        <label className="label" htmlFor="f-name">Họ tên / Nickname</label>
        {input('name', { id: 'f-name', autoComplete: 'name', placeholder: 'Ví dụ: Thảo Nguyên (Reviewer)' })}
        {fieldErr('name') && <div className="field-err" id="name-msg">{err.name}</div>}
      </div>
      <div>
        <label className="label" htmlFor="f-phone">Số điện thoại / Zalo</label>
        {input('phone', { id: 'f-phone', type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: 'Số Zalo để team gửi thông tin nhận sample' })}
        {fieldErr('phone') && <div className="field-err" id="phone-msg">{err.phone}</div>}
      </div>
      <div>
        <label className="label" htmlFor="f-link">Link kênh TikTok cá nhân</label>
        {input('link', { id: 'f-link', inputMode: 'url', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, placeholder: 'Dán link kênh TikTok của bạn vào đây' })}
        {fieldErr('link') ? <div className="field-err" id="link-msg">{err.link}</div> : tt.handle && <div className="field-ok">✓ Kênh @{tt.handle}</div>}
      </div>
      <div>
        <label className="label" htmlFor="f-followers">Số follower TikTok</label>
        {input('followers', { id: 'f-followers', inputMode: 'numeric', placeholder: 'Ví dụ: 5000 hoặc 5k' })}
        {fieldErr('followers') ? <div className="field-err" id="followers-msg">{err.followers}</div> : followers > 0 && <div className="field-ok">= {fmtNum(followers)} follower</div>}
      </div>
      <div>
        <label className="label" htmlFor="f-fee">Booking fee mong muốn cho gói 2–3 video TikTok</label>
        {input('fee', { id: 'f-fee', inputMode: 'numeric', placeholder: 'Ví dụ: 500.000đ hoặc 1.000.000đ — Bắt buộc nhập con số cụ thể, không để trống' })}
        {fieldErr('fee') ? <div className="field-err" id="fee-msg">{err.fee}</div> : fee >= 50000 ? <div className="field-ok">= {fmtNum(fee)}đ cho gói 2–3 video</div> : <div className="hint">Bắt buộc nhập con số cụ thể, không để trống — hoặc chọn nhanh:</div>}
        <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
          {FEE_CHIPS.map(([v, lbl]) => (
            <button key={v} type="button" className={`chip${fee === v ? ' on' : ''}`}
              onClick={() => { setF(p => ({ ...p, fee: v.toLocaleString('vi-VN') + 'đ' })); setTouched(t => ({ ...t, fee: 1 })); setErr(validate({ ...f, fee: String(v) })); }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
      {serverErr && <div className="alert alert-error small" role="alert">⚠ {serverErr}</div>}
      <button type="submit" className="btn-cta" disabled={loading}>{loading ? 'Đang giữ slot cho bạn…' : 'Đăng Ký Nhận Sample & Giữ Slot Ngay 🚀'}</button>
      <div className="xs muted" style={{ textAlign: 'center', lineHeight: 1.5 }}>
        ⏱ Chỉ mất 30 giây · Bằng việc đăng ký, bạn đồng ý để KOL Hub dùng thông tin trên để liên hệ hợp tác (Nghị định 13/2023). Có thể yêu cầu xoá bất cứ lúc nào.
      </div>
    </form>
  );
}

function QuickSuccess({ res }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const portal = `${origin}/portal/${res.portal_token}`;
  return (
    <div className="stack" style={{ gap: 14, textAlign: 'center' }} role="status">
      <div className="success-ico">✓</div>
      <h2 style={{ fontSize: 22, fontWeight: 900 }}>Đăng ký thành công!</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.6 }}>Team KOL Hub đã ghi nhận và sẽ liên hệ qua <b>Zalo</b> cho bạn trong vòng <b>24h</b> tới.</p>
      <div className="card" style={{ textAlign: 'left', padding: 14, background: 'var(--brand-50)', borderColor: 'var(--brand-100)' }}>
        <div className="small bold">⚡ Muốn được duyệt ưu tiên?</div>
        <div className="xs muted" style={{ margin: '4px 0 10px' }}>Bổ sung lượt xem trung bình, lĩnh vực và tỉnh/thành nhận sample (30 giây) — hồ sơ đủ số liệu được duyệt tự động.</div>
        <a className="btn btn-primary btn-block" href={portal}>Hoàn thiện hồ sơ →</a>
      </div>
      <div className="xs muted">Lưu link theo dõi đơn sample của bạn: <a className="link" href={portal}>{portal.replace(/^https?:\/\//, '')}</a></div>
    </div>
  );
}

const TRUST = [
  ['🛡️', 'Không cần mật khẩu / Không liên kết tài khoản độc hại'],
  ['📦', 'Giao sample tận nơi hoàn toàn miễn phí'],
  ['🚀', 'Cam kết hỗ trợ đẩy Ads tối đa cho video đạt chuẩn'],
];

const FAQ = [
  ['Có mất phí gì không?', 'Không. Sample được giao tận nhà miễn phí, không cọc, không phí ẩn. Bạn không phải trả bất kỳ khoản nào.'],
  ['Cần bao nhiêu follower?', 'Không yêu cầu follower lớn. Team ưu tiên kênh có tương tác thật (lượt xem / follower tốt) và nội dung phù hợp sản phẩm.'],
  ['Có phải đưa mật khẩu hay đăng nhập TikTok không?', 'Không bao giờ. Bạn chỉ gửi link kênh công khai. KOL Hub không yêu cầu mật khẩu, không liên kết hay cấp quyền tài khoản.'],
  ['Booking fee để làm gì?', 'Là mức bạn mong muốn cho gói 2–3 video. Team dùng con số này để ghép chiến dịch có ngân sách phù hợp — bạn vẫn nhận, trả giá hoặc từ chối từng offer.'],
  ['Khi nào nhận được sample?', 'Team liên hệ qua Zalo trong 24h để xác nhận địa chỉ. Sample được gửi khi hồ sơ được duyệt; bạn theo dõi mã vận đơn ngay trên link cá nhân.'],
  ['"Đẩy Ads" là gì?', 'Video đạt chuẩn (đúng brief, đăng đúng hạn) được brand chạy quảng cáo bằng Spark Ads / GMV Max — kênh bạn có thêm lượt xem và đơn hàng.'],
];

export default function Home() {
  const router = useRouter();
  const [pub, setPub] = useState(null);
  const [res, setRes] = useState(null);
  const [prefill, setPrefill] = useState({});
  const [brief, setBrief] = useState(null);
  const [formVisible, setFormVisible] = useState(true);
  const formRef = useRef();

  useEffect(() => { fetch('/api/public/campaigns').then(r => r.json()).then(setPub).catch(() => setPub({ campaigns: [], stats: {} })); }, []);
  useEffect(() => {
    if (!router.isReady) return;
    const { ref, h, acq } = router.query;
    const p = {};
    if (ref) p.ref = String(ref);
    if (acq) p.acq = String(acq).slice(0, 16);
    const utm = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) if (router.query[k]) utm[k] = String(router.query[k]).slice(0, 100);
    if (Object.keys(utm).length) p.utm = utm;
    if (h) p.link = `tiktok.com/@${String(h).replace(/^@/, '')}`;
    setPrefill(p);
    if (h) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }, [router.isReady, router.query]);
  // Nút CTA dính đáy trên mobile khi form ra khỏi màn hình
  useEffect(() => {
    if (!formRef.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setFormVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(formRef.current);
    return () => io.disconnect();
  }, []);

  const toForm = () => { setBrief(null); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => document.getElementById('f-name')?.focus({ preventScroll: true }), 500); };
  if (pub?.terms) PAY_DEFAULTS = { ...PAY, ...pub.terms };
  const camps = pub?.campaigns || [];
  const stats = pub?.stats || {};
  const slots = pub?.slots;

  return (
    <>
      <Head>
        <title>Nhận Sample Miễn Phí & Đẩy Ads cho kênh TikTok · KOL Hub</title>
        <meta name="description" content="Không yêu cầu follower lớn — ưu tiên creator có tương tác thật. Giao sample tận nhà 100%, không cọc phí ẩn. Đăng ký 30 giây." />
        <meta property="og:title" content="Nhận Sample Miễn Phí & Đẩy Ads Độc Quyền Cho Kênh TikTok Của Bạn" />
        <meta property="og:description" content="Giao tận nhà 100%, không cọc phí ẩn. Đăng ký 30 giây — team liên hệ Zalo trong 24h." />
      </Head>
      <div className="hero" style={{ minHeight: '100vh' }}>
        <div className="pub-wrap">
          <nav className="pub-nav">
            <div className="row"><div className="brand-logo">K</div><b>KOL Hub</b></div>
            <div className="row"><a className="btn btn-sm hide-sm" href="/brands">Dành cho Brand →</a>{!res && <button className="btn btn-primary btn-sm" onClick={toForm}>Giữ slot</button>}</div>
          </nav>

          <section className="hero-grid hero-grid-form">
            <div className="stack" style={{ gap: 18 }}>
              {slots && (
                <div className="scarcity" role="status">
                  {slots.left > 0
                    ? <>⚡ Chỉ còn đúng <b className="tnum">{fmtNum(slots.left)}</b> slot nhận sample tháng này — Đóng đơn khi đủ số lượng.</>
                    : <>⚡ Đã kín slot sample tháng này — Đăng ký ngay để vào danh sách ưu tiên tháng sau.</>}
                </div>
              )}
              <h1 className="hero-h1">Nhận Sample Miễn Phí &amp; <em>Đẩy Ads Độc Quyền</em> Cho Kênh TikTok Của Bạn</h1>
              <p className="hero-sub">Không yêu cầu follower lớn — Ưu tiên creator có tương tác thật. Giao tận nhà 100%, không cọc phí ẩn.</p>
              <div className="hero-points">
                {['Đăng ký 30 giây, không cần đăng nhập', 'Team liên hệ Zalo trong 24h', 'Video đạt chuẩn được đẩy Ads'].map(t => <div key={t}>✓ {t}</div>)}
              </div>
              {stats.creators >= 10 && (
                <div className="row hero-stats" style={{ gap: 26 }}>
                  {[[stats.creators, 'creator đang hợp tác'], [stats.samples, 'sample đã gửi'], [stats.videos, 'video đã đăng']].map(([v, l]) => (
                    <div key={l}><div style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand-700)' }} className="tnum">{fmtNum(v)}</div><div className="xs muted">{l}</div></div>
                  ))}
                </div>
              )}
            </div>

            <div ref={formRef} id="dang-ky" className="card form-card">
              {res ? <QuickSuccess res={res} /> : (
                <>
                  <div className="trust-bar">
                    {TRUST.map(([ic, t]) => <div key={t} className="trust-item"><span className="trust-ico">{ic}</span><span>{t}</span></div>)}
                  </div>
                  <QuickForm initial={prefill} onDone={r => { setRes(r); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} />
                </>
              )}
            </div>
          </section>

          <section style={{ paddingBottom: 50 }}>
            <h2 className="sec-h2">Nhận sample chỉ với 3 bước</h2>
            <div className="grid g3">
              {[
                ['📝', 'Đăng ký 30 giây', 'Điền 5 thông tin — không cần mật khẩu, không đăng nhập, không mã số thuế.'],
                ['💬', 'Team nhắn Zalo trong 24h', 'Xác nhận địa chỉ, gửi sample tận nhà miễn phí. Theo dõi mã vận đơn trên link cá nhân.'],
                ['🚀', 'Đăng video, được đẩy Ads', 'Video đạt chuẩn được brand chạy Ads (Spark Ads / GMV Max) — tăng view và đơn cho kênh bạn.'],
              ].map(([ic, t, s], i) => (
                <div key={t} className="card"><div className="row" style={{ gap: 10 }}><div className="how-num">{i + 1}</div><span style={{ fontSize: 22 }}>{ic}</span></div><div className="bold" style={{ marginTop: 10 }}>{t}</div><div className="small muted" style={{ marginTop: 4 }}>{s}</div></div>
              ))}
            </div>
          </section>

          {camps.length > 0 && (
            <section id="campaigns" style={{ paddingBottom: 50 }}>
              <h2 className="sec-h2">Chiến dịch đang nhận creator</h2>
              <div className="grid g3">
                {camps.map(c => (
                  <div key={c.id} className="card stack" style={{ gap: 10 }}>
                    <div className="row-between"><span className="badge tone-violet">{dealTypeLabel(c.deal_type || 'barter')}</span><span className={`badge tone-${c.slots_left > 3 ? 'blue' : 'red'}`}>Còn {c.slots_left ?? '—'} slot</span></div>
                    <div>
                      {c.brand_name && <div className="xs bold" style={{ color: 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{c.brand_name}</div>}
                      <h3 style={{ fontSize: 17 }}>{c.name}</h3>
                      <div className="small muted">{c.product}{c.niche ? ` · ${nicheLabel(c.niche)}` : ''}</div>
                    </div>
                    <div className="grid g2 g2k" style={{ gap: 6 }}>
                      <Stat label="Quyền lợi" value={feeText(c)} />
                      <Stat label="Hoa hồng" value={`${Number(c.commission_pct) || 0}%`} />
                    </div>
                    <div className="row-between" style={{ marginTop: 'auto' }}>
                      <span className="xs muted">{c.end_date ? `Hạn ${fmtDate(c.end_date)}` : ''}</span>
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => setBrief(c)}>Xem brief</button>
                        <button className="btn btn-primary btn-sm" disabled={c.slots_left <= 0} onClick={toForm}>Giữ slot</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section style={{ paddingBottom: 40 }}>
            <h2 className="sec-h2">Câu hỏi thường gặp</h2>
            <div className="faq">
              {FAQ.map(([q, a], i) => (
                <details key={q} open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>

          {!res && (
            <section style={{ paddingBottom: 90 }}>
              <div className="card" style={{ textAlign: 'center', padding: 30, background: 'linear-gradient(135deg,#0b8a5f,#0e9f6e 60%,#34c38f)', color: '#fff', border: 'none' }}>
                <h2 style={{ fontSize: 24, fontWeight: 900 }}>{slots && slots.left > 0 ? `Còn ${fmtNum(slots.left)} slot sample tháng này` : 'Vào danh sách ưu tiên tháng sau'}</h2>
                <p style={{ opacity: .9, margin: '6px 0 16px' }}>Miễn phí · Giao tận nhà · Không cọc phí ẩn</p>
                <button className="btn btn-lg" style={{ color: 'var(--brand-700)', fontWeight: 800 }} onClick={toForm}>Đăng Ký Nhận Sample & Giữ Slot Ngay 🚀</button>
              </div>
            </section>
          )}
        </div>
      </div>

      {!res && !formVisible && (
        <div className="sticky-cta">
          <button className="btn-cta" onClick={toForm}>Đăng Ký Nhận Sample & Giữ Slot Ngay 🚀</button>
        </div>
      )}
      {brief && <BriefModal c={brief} onClose={() => setBrief(null)} onApply={toForm} />}
    </>
  );
}
