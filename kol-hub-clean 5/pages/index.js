import { useState } from 'react';
import Head from 'next/head';

const PLATFORMS = [
  { v: 'TikTok',   ic: 'TK', c: '#1d4ed8', bg: '#dbeafe', d: 'Video · Live' },
  { v: 'Facebook', ic: 'FB', c: '#1e40af', bg: '#eff6ff', d: 'Reels · Live' },
  { v: 'Shopee',   ic: 'SP', c: '#c2410c', bg: '#fff7ed', d: 'Video · Live' },
];
const NICHES = [
  { v: 'lam_dep',    l: 'Làm đẹp',    s: 'Skincare, makeup' },
  { v: 'nha_cua',    l: 'Nhà cửa',    s: 'Đời sống, bếp núc' },
  { v: 'cong_nghe',  l: 'Công nghệ',  s: 'Review, unbox, tech' },
  { v: 'thoi_trang', l: 'Thời trang', s: 'OOTD, styling' },
];
const CTYPES = [
  { v: 'video',      l: 'Video',     s: 'Short video' },
  { v: 'livestream', l: 'Livestream', s: 'Live stream' },
  { v: 'both',       l: 'Cả hai',    s: 'Video + Live' },
];
const CITIES = ['TP. Hồ Chí Minh','Hà Nội','Đà Nẵng','Cần Thơ','Hải Phòng','Bình Dương','Đồng Nai','An Giang','Khánh Hoà','Huế','Quảng Ninh','Nghệ An','Thanh Hoá','Gia Lai','Lâm Đồng','Bà Rịa - Vũng Tàu','Long An','Tiền Giang','Kiên Giang','Bình Thuận'];
const GMV_OPTS = [
  { v: 'under_1M',  l: 'Mới bắt đầu — dưới 1 triệu' },
  { v: '1_10M',     l: 'Đang lên — 1 đến 10 triệu' },
  { v: '10_50M',    l: 'Ổn định — 10 đến 50 triệu' },
  { v: '50_100M',   l: 'Tốt — 50 đến 100 triệu' },
  { v: '100_300M',  l: 'Rất tốt — 100 đến 300 triệu' },
  { v: '300_1B',    l: 'Đỉnh — 300 triệu đến 1 tỷ' },
  { v: 'over_1B',   l: 'Top creator — trên 1 tỷ' },
];
const SLOTS_LEFT = 23;

const calcScore = (followers, avg_views) => {
  const f = parseInt(followers) || 0;
  const v = parseInt(avg_views) || 0;
  return f > 0 ? parseFloat((v / f).toFixed(2)) : 0;
};
const scC = s => s >= 0.3 ? '#059669' : s >= 0.15 ? '#d97706' : '#dc2626';

const S = {
  page: { minHeight: '100vh', background: '#fafafa' },
  btnMain: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .15s' },
  btnBack: { background: 'transparent', color: '#6b7280', border: '1px solid #e4e4e7', borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  inp: { background: '#fff', border: '1px solid #e4e4e7', borderRadius: 10, padding: '11px 13px', width: '100%', outline: 'none', fontSize: 14, color: '#0f0f1a', fontFamily: 'inherit', transition: 'border .15s' },
  card: { background: '#fff', border: '1px solid #f0f0f0', borderRadius: 18, padding: '20px 22px', marginBottom: 14 },
  lbl: { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 },
  body: { maxWidth: 540, margin: '0 auto', padding: '12px 20px 60px' },
  err: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '11px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14, display: 'flex', gap: 7, alignItems: 'center' },
};

export default function HomePage() {
  const [view, setView] = useState('landing');
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', link: '',
    followers: '', avg_views: '', avg_viewers: '',
    platform: '', ct: '', niche: '', gmv_kenh: '', address: '',
  });

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const pick = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErr(''); };

  const score = calcScore(form.followers, form.avg_views);
  const showLive = form.ct === 'livestream' || form.ct === 'both';
  const pct = step === 1 ? 33 : step === 2 ? 66 : 100;

  const resetForm = () => {
    setForm({ name:'', email:'', phone:'', link:'', followers:'', avg_views:'', avg_viewers:'', platform:'', ct:'', niche:'', gmv_kenh:'', address:'' });
    setStep(1); setErr('');
  };

  const doStep1 = () => {
    if (!form.name.trim() || !form.link.trim() || !form.followers || !form.avg_views) {
      setErr('Vui lòng điền đủ họ tên, link profile, số followers và avg views.'); return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setErr('Bạn cần điền SĐT hoặc Email để chúng tôi liên lạc.'); return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErr('Địa chỉ email chưa đúng định dạng.'); return;
    }
    if (form.phone.trim() && !/^(\+84|0)[0-9]{9,10}$/.test(form.phone.replace(/\s/g, ''))) {
      setErr('Số điện thoại chưa đúng định dạng (VD: 0901234567 hoặc +84901234567).'); return;
    }
    setErr(''); setStep(2);
  };

  const doStep2 = () => {
    if (!form.platform || !form.ct || !form.niche) {
      setErr('Vui lòng chọn đủ nền tảng, loại nội dung và lĩnh vực.'); return;
    }
    if (showLive && !form.avg_viewers) {
      setErr('Vui lòng điền số người xem trung bình mỗi livestream.'); return;
    }
    setErr(''); setStep(3);
  };

  const doSubmit = async () => {
    if (!form.address) { setErr('Vui lòng chọn tỉnh/thành phố nhận sample.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          tiktok_link: form.link,
          followers: parseInt(form.followers) || 0,
          avg_views: parseInt(form.avg_views) || 0,
          avg_viewers: parseInt(form.avg_viewers) || 0,
          platform: form.platform, content_type: form.ct, niche: form.niche,
          channel_gmv: form.gmv_kenh, address: form.address,
          score: score,
          potential: score >= 0.3 ? 'high' : score >= 0.15 ? 'medium' : 'low',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Lỗi khi gửi đơn.');
      setView('success');
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const selBtn = on => ({
    border: `${on ? '1.5px solid #7c3aed' : '1px solid #e4e4e7'}`,
    background: on ? '#f5f3ff' : '#fff',
    borderRadius: 12, padding: '11px 8px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 5, cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
  });

  const hintBox = text => (
    <div style={{ background: '#faf5ff', borderLeft: '3px solid #7c3aed', borderRadius: '0 10px 10px 0', padding: '11px 14px', marginBottom: 14 }}>
      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }} dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );

  if (view === 'success') return (
    <>
      <Head><title>Đăng ký thành công — KOL Hub</title></Head>
      <div style={S.page}>
        <div style={S.body}>
          <div style={{ textAlign: 'center', padding: '48px 0 24px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#059669' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Đơn đã gửi thành công!</h2>
            <p style={{ fontSize: 14, color: '#71717a', lineHeight: 1.7, marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
              Chúng tôi sẽ xem xét và phản hồi trong <strong style={{ color: '#7c3aed' }}>24–48 giờ</strong> qua {form.phone ? 'SĐT' : 'email'} của bạn.
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 16, margin: '0 auto 20px', textAlign: 'left', maxWidth: 360 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>Engagement score của bạn</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', marginBottom: 4 }}>{score.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>
                {score >= 0.3 ? 'Rất tốt — tỉ lệ tương tác cao, ưu tiên xét duyệt' : score >= 0.15 ? 'Tốt — có tiềm năng phát triển' : 'Còn thấp — hãy tập trung cải thiện chất lượng content'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={S.btnBack} onClick={() => { resetForm(); setView('apply'); }}>Đăng ký lần khác</button>
              <button style={{ ...S.btnMain, padding: '10px 20px' }} onClick={() => setView('landing')}>Về trang chủ</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (view === 'apply') return (
    <>
      <Head><title>Đăng ký Creator — KOL Hub</title></Head>
      <div style={S.page}>
        <div style={S.body}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button style={S.btnBack} onClick={() => { if (step === 1) setView('landing'); else { setStep(s => s - 1); setErr(''); } }}>
              ← {step === 1 ? 'Trang chủ' : 'Quay lại'}
            </button>
            <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>Bước {step} / 3</span>
          </div>

          <div style={{ height: 3, background: '#f0f0f0', borderRadius: 100, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#7c3aed', borderRadius: 100, transition: 'width .4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            {['Thông tin', 'Kênh', 'Khu vực'].map((l, i) => (
              <span key={l} style={{ fontSize: 11, fontWeight: 600, color: step === i+1 ? '#7c3aed' : step > i+1 ? '#059669' : '#a1a1aa' }}>
                {step > i+1 ? '✓ ' : ''}{l}
              </span>
            ))}
          </div>

          {err && <div style={S.err}><span>⚠</span>{err}</div>}

          {step === 1 && (
            <>
              {hintBox('<strong>Bước 1 — Thông tin cơ bản.</strong> Điền họ tên, link kênh và thông tin liên lạc. Bạn chỉ cần nhập <strong>SĐT hoặc Email</strong> — một trong hai là đủ.')}
              <div style={S.card}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={S.lbl}>Họ tên *</label>
                      <input style={S.input} value={form.name} onChange={set('name')} placeholder="Nguyễn Văn A"
                        onFocus={e => e.target.style.border='1.5px solid #7c3aed'} onBlur={e => e.target.style.border='1px solid #e4e4e7'} />
                    </div>
                    <div>
                      <label style={S.lbl}>Link profile *</label>
                      <input style={S.inp} value={form.link} onChange={set('link')} placeholder="tiktok.com/@handle"
                        onFocus={e => e.target.style.border='1.5px solid #7c3aed'} onBlur={e => e.target.style.border='1px solid #e4e4e7'} />
                    </div>
                  </div>

                  <div>
                    <label style={S.lbl}>Liên hệ * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#a1a1aa' }}>(SĐT hoặc Email — chọn 1)</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ border: `${form.phone ? '1.5px solid #7c3aed' : '1px solid #e4e4e7'}`, borderRadius: 12, padding: '10px 13px', background: form.phone ? '#faf5ff' : '#fff', transition: 'all .15s', cursor: 'text' }}
                        onClick={() => document.getElementById('ph').focus()}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Số điện thoại</div>
                        <input id="ph" type="tel" value={form.phone} onChange={e => { setForm(p => ({ ...p, phone: e.target.value, email: e.target.value ? '' : p.email })); setErr(''); }}
                          placeholder="+84 901 234 567" style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, width: '100%', fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ border: `${form.email ? '1.5px solid #7c3aed' : '1px solid #e4e4e7'}`, borderRadius: 12, padding: '10px 13px', background: form.email ? '#faf5ff' : '#fff', transition: 'all .15s', cursor: 'text' }}
                        onClick={() => document.getElementById('em').focus()}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Email</div>
                        <input id="em" type="email" value={form.email} onChange={e => { setForm(p => ({ ...p, email: e.target.value, phone: e.target.value ? '' : p.phone })); setErr(''); }}
                          placeholder="you@email.com" style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, width: '100%', fontFamily: 'inherit' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 5 }}>Dùng để liên lạc sau khi duyệt đơn</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={S.lbl}>Số followers *</label>
                      <input style={S.inp} type="number" min="0" value={form.followers} onChange={set('followers')} placeholder="50000"
                        onFocus={e => e.target.style.border='1.5px solid #7c3aed'} onBlur={e => e.target.style.border='1px solid #e4e4e7'} />
                    </div>
                    <div>
                      <label style={S.lbl}>Avg views / video *</label>
                      <input style={S.inp} type="number" min="0" value={form.avg_views} onChange={set('avg_views')} placeholder="15000"
                        onFocus={e => e.target.style.border='1.5px solid #7c3aed'} onBlur={e => e.target.style.border='1px solid #e4e4e7'} />
                    </div>
                  </div>

                  <div>
                    <label style={S.lbl}>Doanh thu kênh / tháng <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#a1a1aa' }}>(không bắt buộc)</span></label>
                    <select style={S.inp} value={form.gmv_kenh} onChange={set('gmv_kenh')}>
                      <option value="">Chọn mức gần đúng nhất...</option>
                      {GMV_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 5 }}>Giúp chúng tôi ghép chiến dịch phù hợp hơn</div>
                  </div>

                  {form.followers && form.avg_views && parseInt(form.followers) > 0 && (
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 3 }}>Engagement score của bạn</div>
                        <div style={{ fontSize: 11, color: '#71717a' }}>{score >= 0.3 ? 'Rất tốt — tỉ lệ cao' : score >= 0.15 ? 'Tốt — có tiềm năng' : 'Còn thấp — cải thiện content'}</div>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: scC(score) }}>{score.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
              <button style={{ ...S.btnMain, width: '100%', fontSize: 15, padding: 14 }} onClick={doStep1}>Tiếp theo →</button>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#a1a1aa' }}>Địa chỉ giao hàng sẽ được hỏi sau khi được duyệt</div>
            </>
          )}

          {step === 2 && (
            <>
              {hintBox('<strong>Bước 2 — Thông tin kênh.</strong> Cho chúng tôi biết bạn dùng nền tảng nào, làm loại content gì và lĩnh vực chính để ghép đúng chiến dịch.')}
              <div style={S.card}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={S.lbl}>Nền tảng chính *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 7 }}>
                      {PLATFORMS.map(p => (
                        <div key={p.v} style={selBtn(form.platform === p.v)} onClick={() => pick('platform', p.v)}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: p.bg, color: p.c, fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>{p.ic}</div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{p.v}</span>
                          <span style={{ fontSize: 10, color: '#a1a1aa' }}>{p.d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={S.lbl}>Loại nội dung *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 7 }}>
                      {CTYPES.map(ct => (
                        <div key={ct.v} style={selBtn(form.ct === ct.v)} onClick={() => { pick('ct', ct.v); setForm(p => ({ ...p, ct: ct.v, avg_viewers: '' })); }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{ct.l}</span>
                          <span style={{ fontSize: 10, color: '#a1a1aa' }}>{ct.s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {showLive && (
                    <div>
                      <label style={S.lbl}>Avg viewers / livestream *</label>
                      <input style={S.inp} type="number" min="0" value={form.avg_viewers} onChange={set('avg_viewers')} placeholder="Số người xem trung bình mỗi live"
                        onFocus={e => e.target.style.border='1.5px solid #7c3aed'} onBlur={e => e.target.style.border='1px solid #e4e4e7'} />
                    </div>
                  )}
                  <div>
                    <label style={S.lbl}>Lĩnh vực chính *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 7 }}>
                      {NICHES.map(n => (
                        <div key={n.v} style={{ ...selBtn(form.niche === n.v), flexDirection: 'row', justifyContent: 'flex-start', gap: 10, padding: '11px 13px', textAlign: 'left' }} onClick={() => pick('niche', n.v)}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: form.niche === n.v ? '#7c3aed' : '#e4e4e7', flexShrink: 0, marginTop: 3, transition: 'background .15s' }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{n.l}</div>
                            <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 1 }}>{n.s}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button style={{ ...S.btnMain, width: '100%', fontSize: 15, padding: 14 }} onClick={doStep2}>Tiếp theo →</button>
            </>
          )}

          {step === 3 && (
            <>
              {hintBox('<strong>Bước 3 — Hoàn tất.</strong> Chọn tỉnh/thành phố để chúng tôi biết khu vực giao sample. Địa chỉ chi tiết sẽ xác nhận sau khi đơn được duyệt.')}
              <div style={S.card}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={S.lbl}>Tỉnh / Thành phố *</label>
                    <select style={S.inp} value={form.address} onChange={set('address')}>
                      <option value="">Chọn tỉnh/thành phố...</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 5 }}>Địa chỉ đầy đủ sẽ được xác nhận sau khi duyệt</div>
                  </div>
                  <div style={{ background: '#fafafa', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 10 }}>Tóm tắt hồ sơ</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[['Họ tên', form.name||'—'], ['Username', form.link ? ('@' + (form.link.match(/@([A-Za-z0-9._-]+)/)||[])[1] || form.link.split('/').pop() || '—') : '—'], ['Followers', form.followers ? parseInt(form.followers).toLocaleString('vi-VN') : '—'], ['Score', form.followers && form.avg_views ? score.toFixed(2) : '—'], ['Nền tảng', form.platform||'—'], ['Lĩnh vực', NICHES.find(n=>n.v===form.niche)?.l||'—']].map(([l, v]) => (
                        <div key={l} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button style={{ ...S.btnMain, width: '100%', fontSize: 15, padding: 14, opacity: loading ? .7 : 1 }} onClick={doSubmit} disabled={loading}>
                {loading ? 'Đang gửi…' : 'Gửi đơn đăng ký'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#a1a1aa' }}>Thông tin chỉ dùng để giao sample — không chia sẻ bên thứ ba</div>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <Head>
        <title>KOL Hub — Creator Partnership 2026</title>
        <meta name="description" content="Hợp tác creator — nhận sample miễn phí, được đẩy ads, hoa hồng rõ ràng" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={S.page}>
        <div style={{ background: '#0f0f1a', padding: '10px 20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Chiến dịch Tháng 3 đang tuyển —</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>còn {SLOTS_LEFT} slot trống</span>
        </div>
        <div style={{ background: '#1e1040', padding: '44px 24px 40px', textAlign: 'center' }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ fontSize: 'clamp(22px,5vw,40px)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 12 }}>
              Đăng content.<br />
              <span style={{ color: '#a78bfa' }}>Nhận sample + được đẩy ads.</span>
            </div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.75 }}>
              Không cần follower lớn — chúng tôi ưu tiên creator có <strong style={{ color: '#fff' }}>tỉ lệ tương tác cao.</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340, margin: '0 auto 28px', textAlign: 'left' }}>
              {[['🎁', 'Nhận sample miễn phí', 'Giao tận nhà — không cần đặt cọc'], ['🚀', 'Được đẩy ads không giới hạn', 'Thương hiệu boost bài đăng của bạn'], ['💸', 'Hoa hồng rõ ràng', 'Càng tốt → càng nhiều chiến dịch']].map(([ic, t, s]) => (
                <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '11px 14px' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{ic}</span>
                  <div><div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{t}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{s}</div></div>
                </div>
              ))}
            </div>
            <button style={{ ...S.btnMain, fontSize: 15, padding: '14px 36px' }} onClick={() => { resetForm(); setView('apply'); }}>
              Đăng ký ngay — miễn phí
            </button>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 10 }}>Duyệt trong 24–48h</div>
          </div>
        </div>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f4f4f5', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', maxWidth: 600, margin: '0 auto' }}>
            {[['1,200+','Creators hợp tác'],['50+','Chiến dịch/năm'],['8.2%','Avg engagement'],['24h','Thời gian duyệt']].map(([v,l],i) => (
              <div key={l} style={{ textAlign: 'center', padding: '10px 4px', borderRight: i < 3 ? '1px solid #f4f4f5' : 'none' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#7c3aed' }}>{v}</div>
                <div style={{ fontSize: 11, color: '#71717a', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
            {NICHES.map(n => (
              <div key={n.v} style={{ border: '1px solid #f0f0f0', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{n.l}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, padding: '26px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c3aed', marginBottom: 8 }}>Còn {SLOTS_LEFT} slot tháng này</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Bắt đầu ngay hôm nay</div>
            <div style={{ fontSize: 13, color: '#71717a', marginBottom: 18 }}>Miễn phí · Không ràng buộc · Duyệt trong 24h</div>
            <button style={{ ...S.btnMain, fontSize: 14, padding: '12px 28px' }} onClick={() => { resetForm(); setView('apply'); }}>Đăng ký ngay →</button>
          </div>
        </div>
      </div>
    </>
  );
}
