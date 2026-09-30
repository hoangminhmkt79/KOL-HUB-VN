import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { NICHES, fmtMoney, nicheLabel } from '../lib/constants';
import { SERVICES, PLATFORMS_B2B, GMV_BANDS, AD_BANDS, KOL_TIERS, PAIN_POINTS, CURRENT_PARTNER, TIMELINES, CONTACT_CHANNELS, HEARD_FROM, estimateBooking, serviceLabel } from '../lib/clientOffer';

const EMPTY = {
  services: ['kol_booking'], platforms: ['tiktok'], niche: '', gmv_band: '', ad_spend_band: '',
  ads_active: null, gmv_max_active: null, live_active: null, koc_active: null, roas: '',
  shop_links: '', sample_product: '', sample_qty: '', sample_value: '', brief: '', goal: '', start_date: '',
  kol_tiers: ['nano', 'micro'], kol_niches: [], kol_requirements: '', creators_count: 20, videos_per_creator: 1, live_sessions: '',
  budget_booking: '', budget_ads: '',
  company: '', contact_name: '', role: '', is_decision_maker: null, phone: '', email: '', consent: false, website: '',
  pain_points: [], current_partner: '', aov: '', top_products: '', target_customer: '', competitors: '', site: '', fanpage: '',
  timeline: '', contact_channel: 'zalo', contact_time: '', heard_from: '', legal_name: '', tax_code: '',
};
const vnd = n => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`;
const toggle = (arr, v) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

function YesNo({ label, value, onChange }) {
  return (
    <div>
      <div className="xs bold muted" style={{ marginBottom: 4 }}>{label}</div>
      <div className="row" style={{ gap: 6 }}>
        {[[true, 'Có'], [false, 'Chưa']].map(([v, l]) => <button key={l} type="button" className={`btn btn-sm${value === v ? ' btn-primary' : ''}`} onClick={() => onChange(value === v ? null : v)}>{l}</button>)}
      </div>
    </div>
  );
}

function RequestForm({ initial, onDone }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = k => e => { setF(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); setErr(''); };
  const put = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(''); };
  const wantsKol = f.services.some(s => ['kol_booking', 'kol_strategy', 'livestream'].includes(s));
  const wantsAds = f.services.some(s => ['gmv_max', 'ads_audit', 'google_fb', 'shop_ops'].includes(s));
  const est = estimateBooking({ ...f, budget_booking: Number(f.budget_booking) || 0, sample_value: Number(f.sample_value) || 0 });
  const steps = ['Dịch vụ', 'Shop & sản phẩm', wantsKol ? 'Yêu cầu KOL' : 'Mục tiêu', 'Liên hệ'];

  const next = () => {
    if (step === 1 && !f.services.length) return setErr('Chọn ít nhất 1 dịch vụ.');
    if (step === 2 && !f.shop_links.trim()) return setErr('Gửi link shop (TikTok Shop / Shopee / website) để team audit.');
    setErr(''); setStep(step + 1); window.scrollTo(0, 0);
  };
  const submit = async () => {
    if (!f.company.trim() || !f.contact_name.trim()) return setErr('Nhập tên brand và người liên hệ.');
    if (!f.phone.trim() && !f.email.trim()) return setErr('Cần SĐT hoặc email.');
    if (!f.consent) return setErr('Vui lòng đồng ý xử lý dữ liệu để team liên hệ.');
    setLoading(true);
    try {
      const r = await fetch('/api/public/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, website: f.website, consent: true, site: undefined, ...(f.site ? { website_url: f.site } : {}) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gửi thất bại.');
      onDone({ ...d, company: f.company });
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="form-wrap" style={{ maxWidth: 680 }}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        {step > 1 ? <button className="btn btn-sm" onClick={() => { setStep(step - 1); setErr(''); }}>← Quay lại</button> : <span />}
        <span className="small muted">Bước {step}/4 · ~4 phút</span>
      </div>
      <div className="steps" style={{ marginBottom: 16 }}>{steps.map((l, i) => <div key={l} className={i < step ? 'done' : ''}>{l}</div>)}</div>
      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      {step === 1 && (
        <div className="card stack" style={{ gap: 16 }}>
          <div><label className="label">Bạn cần hỗ trợ gì? * (chọn nhiều)</label>
            <div className="grid g2" style={{ gap: 8 }}>{SERVICES.map(s => (
              <div key={s.v} className={`opt${f.services.includes(s.v) ? ' on' : ''}`} style={{ textAlign: 'left' }} onClick={() => put('services', toggle(f.services, s.v))}>
                <div className="bold small">{s.ic} {s.l}</div><div className="xs muted">{s.s}</div>
              </div>
            ))}</div>
          </div>
          <div><label className="label">Bạn đang gặp vấn đề gì? (chọn nhiều)</label>
            <div className="row wrap" style={{ gap: 6 }}>{PAIN_POINTS.map(p => <button key={p.v} type="button" className={`btn btn-sm${f.pain_points.includes(p.v) ? ' btn-primary' : ''}`} onClick={() => put('pain_points', toggle(f.pain_points, p.v))}>{p.l}</button>)}</div>
          </div>
          <div><label className="label">Kênh đang bán</label>
            <div className="row wrap" style={{ gap: 6 }}>{PLATFORMS_B2B.map(p => <button key={p.v} type="button" className={`btn btn-sm${f.platforms.includes(p.v) ? ' btn-primary' : ''}`} onClick={() => put('platforms', toggle(f.platforms, p.v))}>{p.l}</button>)}</div>
          </div>
          <div className="grid g3" style={{ gap: 10 }}>
            <div><label className="label">Ngành hàng</label><select className="select" value={f.niche} onChange={set('niche')}><option value="">Chọn…</option>{NICHES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}</select></div>
            <div><label className="label">GMV / tháng</label><select className="select" value={f.gmv_band} onChange={set('gmv_band')}><option value="">Chọn…</option>{GMV_BANDS.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}</select></div>
            <div><label className="label">Chi phí ads / tháng</label><select className="select" value={f.ad_spend_band} onChange={set('ad_spend_band')}><option value="">Chọn…</option>{AD_BANDS.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}</select></div>
          </div>
          <div><label className="label">Hiện đang làm marketing sàn với ai?</label>
            <div className="row wrap" style={{ gap: 6 }}>{CURRENT_PARTNER.map(p => <button key={p.v} type="button" className={`btn btn-sm${f.current_partner === p.v ? ' btn-primary' : ''}`} onClick={() => put('current_partner', f.current_partner === p.v ? '' : p.v)}>{p.l}</button>)}</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12 }}>
            <div className="small bold" style={{ marginBottom: 8 }}>⚡ Mini-audit miễn phí — trả lời nhanh để nhận điểm sức khoẻ shop ngay sau khi gửi</div>
            <div className="grid g2" style={{ gap: 10 }}>
              <YesNo label="Đang chạy ads trên sàn?" value={f.ads_active} onChange={v => put('ads_active', v)} />
              <YesNo label="Đã bật GMV Max?" value={f.gmv_max_active} onChange={v => put('gmv_max_active', v)} />
              <YesNo label="Có livestream bán hàng?" value={f.live_active} onChange={v => put('live_active', v)} />
              <YesNo label="Đang hợp tác KOC?" value={f.koc_active} onChange={v => put('koc_active', v)} />
            </div>
            {f.ads_active && <div style={{ marginTop: 10, maxWidth: 200 }}><label className="label">ROAS hiện tại (nếu biết)</label><input className="input input-sm" type="number" step="0.1" min="0" value={f.roas} onChange={set('roas')} placeholder="VD: 4.5" /></div>}
          </div>
          <button className="btn btn-primary btn-lg btn-block" onClick={next}>Tiếp theo →</button>
        </div>
      )}

      {step === 2 && (
        <div className="card stack" style={{ gap: 14 }}>
          <div><label className="label">Link shop * (mỗi dòng 1 link)</label><textarea className="textarea" rows={3} value={f.shop_links} onChange={set('shop_links')} placeholder={'https://www.tiktok.com/@shop…\nhttps://shopee.vn/…'} /></div>
          <div className="grid g3" style={{ gap: 10 }}>
            <div style={{ gridColumn: 'span 1' }}><label className="label">Sản phẩm mẫu / chủ lực</label><input className="input" value={f.sample_product} onChange={set('sample_product')} placeholder="Serum B5 30ml" /></div>
            <div><label className="label">SL mẫu có thể gửi</label><input className="input" type="number" min="0" value={f.sample_qty} onChange={set('sample_qty')} placeholder="50" /></div>
            <div><label className="label">Giá vốn + ship / mẫu</label><input className="input" type="number" min="0" step="10000" value={f.sample_value} onChange={set('sample_value')} placeholder="120000" /></div>
          </div>
          <details style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 12px' }}>
            <summary className="small bold" style={{ cursor: 'pointer' }}>➕ Thêm chi tiết (AOV, khách mục tiêu, đối thủ…) — giúp audit chính xác hơn</summary>
          <div className="grid g2" style={{ gap: 10, marginTop: 10 }}>
            <div><label className="label">Sản phẩm chủ lực / top SKU</label><input className="input" value={f.top_products} onChange={set('top_products')} placeholder="Serum B5, kem chống nắng SPF50…" /></div>
            <div><label className="label">Giá trị đơn trung bình (AOV, VNĐ)</label><input className="input" type="number" min="0" step="10000" value={f.aov} onChange={set('aov')} placeholder="250000" /></div>
            <div><label className="label">Khách hàng mục tiêu</label><input className="input" value={f.target_customer} onChange={set('target_customer')} placeholder="Nữ 22–35, da dầu mụn, văn phòng…" /></div>
            <div><label className="label">Đối thủ / shop tham chiếu</label><input className="input" value={f.competitors} onChange={set('competitors')} placeholder="Tên shop hoặc link" /></div>
            <div><label className="label">Website</label><input className="input" value={f.site} onChange={set('site')} placeholder="https://…" /></div>
            <div><label className="label">Fanpage</label><input className="input" value={f.fanpage} onChange={set('fanpage')} placeholder="facebook.com/…" /></div>
          </div>
          </details>
          <div><label className="label">Brief / mô tả sản phẩm & thông điệp</label><textarea className="textarea" rows={4} value={f.brief} onChange={set('brief')} placeholder="USP, đối tượng khách, claim được phép, điều cần tránh…" /></div>
          <div><label className="label">Mục tiêu</label><input className="input" value={f.goal} onChange={set('goal')} placeholder="VD: tăng GMV TikTok Shop 2× trong 3 tháng" /></div>
          <button className="btn btn-primary btn-lg btn-block" onClick={next}>Tiếp theo →</button>
        </div>
      )}

      {step === 3 && (
        <div className="card stack" style={{ gap: 14 }}>
          {wantsKol ? (
            <>
              <div><label className="label">Tier KOL mong muốn (chọn nhiều)</label>
                <div className="grid g2" style={{ gap: 8 }}>{KOL_TIERS.map(t => (
                  <div key={t.v} className={`opt${f.kol_tiers.includes(t.v) ? ' on' : ''}`} style={{ textAlign: 'left' }} onClick={() => put('kol_tiers', toggle(f.kol_tiers, t.v))}>
                    <div className="bold small">{t.l}</div><div className="xs muted">{t.s} · ~{fmtMoney(t.fee)}đ/video</div>
                  </div>
                ))}</div>
              </div>
              <div><label className="label">Lĩnh vực KOL</label>
                <div className="row wrap" style={{ gap: 6 }}>{NICHES.map(n => <button key={n.v} type="button" className={`btn btn-sm${f.kol_niches.includes(n.v) ? ' btn-primary' : ''}`} onClick={() => put('kol_niches', toggle(f.kol_niches, n.v))}>{n.l}</button>)}</div>
              </div>
              <div><label className="label">Yêu cầu khác về KOL</label><textarea className="textarea" rows={2} value={f.kol_requirements} onChange={set('kol_requirements')} placeholder="Giới tính, độ tuổi, khu vực, phong cách, đã từng review sản phẩm tương tự…" /></div>
              <div className="grid g3" style={{ gap: 10 }}>
                <div><label className="label">Số KOL</label><input className="input" type="number" min="0" value={f.creators_count} onChange={set('creators_count')} /></div>
                <div><label className="label">Video / KOL</label>
                  <div className="row" style={{ gap: 4 }}>{[1, 2, 3, 5].map(n => <button key={n} type="button" className={`btn btn-sm${Number(f.videos_per_creator) === n ? ' btn-primary' : ''}`} onClick={() => put('videos_per_creator', n)}>{n}</button>)}</div>
                </div>
                {f.services.includes('livestream') && <div><label className="label">Số phiên live</label><input className="input" type="number" min="0" value={f.live_sessions} onChange={set('live_sessions')} /></div>}
              </div>
              <div><label className="label">Budget booking KOL (VNĐ)</label><input className="input" type="number" min="0" step="1000000" value={f.budget_booking} onChange={set('budget_booking')} placeholder="30000000" /></div>
              <div style={{ background: 'var(--brand-50)', borderRadius: 12, padding: 12 }}>
                <div className="small bold" style={{ color: 'var(--brand-700)' }}>📊 Ước tính tức thì</div>
                <div className="small" style={{ marginTop: 4 }}>{est.videos} video · phí KOL ~<b>{vnd(est.fees)}</b>{est.samples ? <> + mẫu ~{vnd(est.samples)}</> : null} = <b>{vnd(est.total)}</b></div>
                {est.budget > 0 && <div className="xs muted" style={{ marginTop: 2 }}>Với {vnd(est.budget)}: ~{est.per_tier.map(t => `${t.videos} video ${t.l}`).join(' · ')}</div>}
                {est.advice.map(a => <div key={a} className="xs" style={{ marginTop: 4 }}>💡 {a}</div>)}
                <div className="xs muted" style={{ marginTop: 4 }}>Giá tham khảo thị trường, báo giá chính xác sau audit.</div>
              </div>
            </>
          ) : <div className="small muted">Bạn không chọn dịch vụ KOL — chuyển sang bước liên hệ.</div>}
          {wantsAds && <div><label className="label">Ngân sách ads dự kiến / tháng (VNĐ)</label><input className="input" type="number" min="0" step="1000000" value={f.budget_ads} onChange={set('budget_ads')} placeholder="50000000" /></div>}
          <button className="btn btn-primary btn-lg btn-block" onClick={next}>Tiếp theo →</button>
        </div>
      )}

      {step === 4 && (
        <div className="card stack" style={{ gap: 14 }}>
          <div className="grid g2" style={{ gap: 10 }}>
            <div><label className="label">Brand / công ty *</label><input className="input" value={f.company} onChange={set('company')} /></div>
            <div><label className="label">Người liên hệ *</label><input className="input" value={f.contact_name} onChange={set('contact_name')} /></div>
            <div><label className="label">SĐT / Zalo</label><input className="input" type="tel" value={f.phone} onChange={set('phone')} placeholder="0901234567" /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={set('email')} /></div>
            <div><label className="label">Vai trò</label><input className="input" value={f.role} onChange={set('role')} placeholder="Founder, Marketing Manager…" /></div>
            <YesNo label="Bạn là người quyết định ngân sách?" value={f.is_decision_maker} onChange={v => put('is_decision_maker', v)} />
            <div><label className="label">Muốn triển khai khi nào?</label><select className="select" value={f.timeline} onChange={set('timeline')}><option value="">Chọn…</option>{TIMELINES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
            <div><label className="label">Biết đến chúng tôi qua</label><select className="select" value={f.heard_from} onChange={set('heard_from')}><option value="">Chọn…</option>{HEARD_FROM.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
            <div><label className="label">Liên hệ qua</label>
              <div className="row" style={{ gap: 6 }}>{CONTACT_CHANNELS.map(c => <button key={c.v} type="button" className={`btn btn-sm${f.contact_channel === c.v ? ' btn-primary' : ''}`} onClick={() => put('contact_channel', c.v)}>{c.l}</button>)}</div>
            </div>
            <div><label className="label">Khung giờ tiện liên hệ</label><input className="input" value={f.contact_time} onChange={set('contact_time')} placeholder="VD: 9h–11h sáng" /></div>
          </div>
          <details style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '10px 12px' }}>
            <summary className="small bold" style={{ cursor: 'pointer' }}>Thông tin xuất hoá đơn / hợp đồng (không bắt buộc)</summary>
            <div className="grid g2" style={{ gap: 10, marginTop: 10 }}>
              <div><label className="label">Tên pháp nhân</label><input className="input" value={f.legal_name} onChange={set('legal_name')} placeholder="Công ty TNHH …" /></div>
              <div><label className="label">Mã số thuế</label><input className="input" inputMode="numeric" value={f.tax_code} onChange={set('tax_code')} /></div>
            </div>
          </details>
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12 }} className="small">
            <b>Tóm tắt:</b> {f.services.map(serviceLabel).join(', ')}{f.niche ? ` · ${nicheLabel(f.niche)}` : ''}{wantsKol ? ` · ${f.creators_count} KOL × ${f.videos_per_creator} video` : ''}{Number(f.budget_booking) ? ` · booking ${vnd(f.budget_booking)}` : ''}{Number(f.budget_ads) ? ` · ads ${vnd(f.budget_ads)}/tháng` : ''}
          </div>
          <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
          <label className="chk" style={{ background: f.consent ? 'var(--brand-50)' : 'var(--surface-2)', borderRadius: 12, padding: 12 }}>
            <input type="checkbox" checked={f.consent} onChange={set('consent')} />
            <span>Tôi đồng ý cho KOL Hub xử lý thông tin trên để <b>liên hệ tư vấn và gửi báo giá / audit</b> (Nghị định 13/2023). Có thể yêu cầu xoá dữ liệu bất cứ lúc nào. *</span>
          </label>
          <button className="btn btn-primary btn-lg btn-block" disabled={loading || !f.consent} onClick={submit}>{loading ? 'Đang gửi…' : 'Gửi yêu cầu & nhận mini-audit'}</button>
        </div>
      )}
    </div>
  );
}

function Done({ res, onBack }) {
  const a = res.audit; const e = res.estimate;
  const tone = s => (s >= 70 ? 'var(--green)' : s >= 45 ? 'var(--amber)' : 'var(--red)');
  return (
    <div className="form-wrap" style={{ maxWidth: 640, paddingTop: 30 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 42 }}>✅</div>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Đã nhận yêu cầu {res.ref}</h1>
        <p className="muted" style={{ margin: '6px 0 18px' }}>Team sẽ liên hệ {res.company} trong <b>2 giờ làm việc</b> với audit chi tiết và báo giá.</p>
      </div>
      {a && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row-between"><b>Điểm sức khoẻ shop (mini-audit)</b><span style={{ fontSize: 28, fontWeight: 900, color: tone(a.total) }}>{a.total}/100</span></div>
          <div className="stack" style={{ gap: 6, marginTop: 10 }}>
            {a.axes.map(x => (
              <div key={x.key} className="row" style={{ gap: 8 }}>
                <span className="small" style={{ width: 130 }}>{x.l}{x.unknown ? ' ?' : ''}</span>
                <div className="progress grow"><span style={{ width: `${(x.score / 20) * 100}%`, background: tone(x.score * 5) }} /></div>
                <span className="xs tnum" style={{ width: 36, textAlign: 'right' }}>{x.score}/20</span>
              </div>
            ))}
          </div>
          {a.unknown > 0 && <div className="xs muted" style={{ marginTop: 8 }}>? = chưa đủ thông tin — team sẽ hỏi thêm khi audit chi tiết.</div>}
          <div className="label" style={{ marginTop: 14 }}>3 việc nên làm ngay</div>
          {a.actions.map((t, i) => <div key={i} className="small" style={{ marginBottom: 4 }}>{i + 1}. {t}</div>)}
        </div>
      )}
      {e?.videos > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <b>Ước tính booking</b>
          <div className="small" style={{ marginTop: 6 }}>{e.videos} video · ~{vnd(e.total)} (phí KOL {vnd(e.fees)}{e.samples ? ` + mẫu ${vnd(e.samples)}` : ''})</div>
          {e.advice.map(t => <div key={t} className="xs muted" style={{ marginTop: 4 }}>💡 {t}</div>)}
        </div>
      )}
      <button className="btn" onClick={onBack}>← Về trang dịch vụ</button>
    </div>
  );
}

export default function Brands() {
  const router = useRouter();
  const [view, setView] = useState('landing');
  const [res, setRes] = useState(null);
  const [initial, setInitial] = useState({});
  useEffect(() => {
    if (!router.isReady) return;
    const p = {};
    if (router.query.acq) p.acq = String(router.query.acq).slice(0, 16);
    const utm = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) if (router.query[k]) utm[k] = String(router.query[k]).slice(0, 100);
    if (Object.keys(utm).length) p.utm = utm;
    if (router.query.service && SERVICES.some(s => s.v === router.query.service)) p.services = [String(router.query.service)];
    setInitial(p);
  }, [router.isReady, router.query]);
  const start = svc => { if (svc) setInitial(p => ({ ...p, services: [svc] })); setView('form'); window.scrollTo(0, 0); };

  return (
    <>
      <Head>
        <title>KOL Hub cho Brand · Scale GMV bằng KOC + GMV Max</title>
        <meta name="description" content="Tư vấn chiến lược KOC/KOL, tối ưu GMV Max Product & LIVE, livestream, vận hành đa sàn Shopee/TikTok và ads Google/Facebook. Nhận mini-audit miễn phí." />
      </Head>
      <div className="hero" style={{ minHeight: '100vh' }}>
        <div className="pub-wrap">
          <nav className="pub-nav">
            <a href="/brands" className="row" style={{ textDecoration: 'none' }}><div className="brand-logo">K</div><b>KOL Hub <span className="muted" style={{ fontWeight: 500 }}>for Brands</span></b></a>
            <div className="row"><a className="btn btn-sm hide-sm" href="/">Bạn là creator?</a>{view === 'landing' && <button className="btn btn-primary" onClick={() => start()}>Nhận audit</button>}</div>
          </nav>

          {view === 'form' && <RequestForm initial={initial} onDone={r => { setRes(r); setView('done'); window.scrollTo(0, 0); }} />}
          {view === 'done' && res && <Done res={res} onBack={() => setView('landing')} />}

          {view === 'landing' && (
            <>
              <section className="hero-grid">
                <div className="stack" style={{ gap: 18 }}>
                  <span className="pill" style={{ alignSelf: 'flex-start' }}><span className="dot" style={{ color: 'var(--brand)' }} />Mini-audit miễn phí · kết quả ngay</span>
                  <h1>Scale GMV bằng <em>KOC + GMV Max</em>, đo được từng đồng.</h1>
                  <p className="muted" style={{ fontSize: 16, maxWidth: 500 }}>
                    GMV Max chững thường không phải do setting — mà do <b style={{ color: 'var(--ink)' }}>thiếu video KOC mới</b> để nuôi thuật toán.
                    Chúng tôi xây nguồn creative KOC có guardrail hoà vốn, rồi đẩy video thắng vào GMV Max Product & LIVE.
                  </p>
                  <div className="row wrap"><button className="btn btn-primary btn-lg" onClick={() => start()}>Đăng ký campaign / nhận audit</button><a className="btn btn-lg" href="#services">Xem dịch vụ</a></div>
                </div>
                <div className="card" style={{ padding: 22 }}>
                  <div className="bold" style={{ marginBottom: 12 }}>Vì sao khác agency thường?</div>
                  {[
                    ['🧮', 'Trần phí theo hoà vốn', 'Mỗi booking có trần phí theo GMV kỳ vọng & biên lợi nhuận — không đốt ngân sách theo view.'],
                    ['📦', 'ROI mẫu minh bạch', 'Theo dõi từng mẫu → video → GMV. Báo cáo lợi nhuận đóng góp, không báo cáo view.'],
                    ['⚖️', 'Content đúng luật', 'Checklist claim cho ngành sức khoẻ, làm đẹp: disclaimer, nhãn quảng cáo, không claim chữa bệnh.'],
                    ['📈', 'KOC nuôi GMV Max', 'Video KOC thắng được authorize / Spark để scale GMV Max Product & LIVE.'],
                  ].map(([ic, t, s], i) => (
                    <div key={t} className="benefit" style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line-2)' : 'none' }}>
                      <div className="benefit-ico">{ic}</div><div><div className="bold small">{t}</div><div className="xs muted">{s}</div></div>
                    </div>
                  ))}
                </div>
              </section>

              <section id="services" style={{ paddingBottom: 40 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 14 }}>Dịch vụ</h2>
                <div className="grid g3">
                  {SERVICES.map(s => (
                    <div key={s.v} className="card stack" style={{ gap: 6 }}>
                      <div style={{ fontSize: 24 }}>{s.ic}</div>
                      <b>{s.l}</b>
                      <div className="small muted">{s.s}</div>
                      <button className="btn btn-sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onClick={() => start(s.v)}>Đăng ký →</button>
                    </div>
                  ))}
                </div>
              </section>

              <section style={{ paddingBottom: 60 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 14 }}>Quy trình</h2>
                <div className="how">
                  {[
                    ['Gửi yêu cầu', 'Link shop, sản phẩm mẫu, brief, yêu cầu KOL, số lượng video & budget. Nhận mini-audit ngay.'],
                    ['Audit & kế hoạch', 'Trong 24–48h: chẩn đoán ads/GMV Max/KOC + kế hoạch KOL theo tier và ngân sách.'],
                    ['Triển khai', 'Tuyển & duyệt KOC, gửi mẫu, theo dõi SLA video, tối ưu GMV Max / LIVE.'],
                    ['Báo cáo tuần', 'GMV, ROI mẫu, video đúng hạn, việc tuần sau. Bạn luôn sở hữu dữ liệu creator.'],
                  ].map(([t, s], i) => <div key={t} className="card"><div className="how-num">{i + 1}</div><div className="bold">{t}</div><div className="small muted" style={{ marginTop: 4 }}>{s}</div></div>)}
                </div>
                <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 30, background: 'linear-gradient(135deg,#0b8a5f,#0e9f6e 60%,#34c38f)', color: '#fff', border: 'none' }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900 }}>Shop của bạn đang ở mức nào?</h2>
                  <p style={{ opacity: .85, margin: '6px 0 16px' }}>4 phút · mini-audit 5 trục · ước tính ngân sách KOL ngay</p>
                  <button className="btn btn-lg" style={{ color: 'var(--brand-700)', fontWeight: 800 }} onClick={() => start()}>Bắt đầu →</button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
