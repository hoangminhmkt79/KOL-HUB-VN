import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/* ── constants ─────────────────────────────────── */
const ASC = {
  pending:     { l: 'Chờ duyệt', c: '#92400e', bg: '#fef3c7' },
  approved:    { l: 'Đã duyệt',  c: '#065f46', bg: '#dcfce7' },
  rejected:    { l: 'Từ chối',   c: '#991b1b', bg: '#fee2e2' },
  in_campaign: { l: 'Trong CĐ', c: '#1e40af', bg: '#dbeafe' },
};
const STATS = ['pending', 'approved', 'rejected', 'in_campaign'];
const TRACK = ['Chờ xác nhận', 'Đã xác nhận', 'Đang làm content', 'Content Posted', 'Đã thanh toán'];
const NICHES = [
  { v: 'lam_dep',    l: 'Làm đẹp' },
  { v: 'nha_cua',    l: 'Nhà cửa' },
  { v: 'cong_nghe',  l: 'Đồ công nghệ' },
  { v: 'thoi_trang', l: 'Thời trang' },
];
const CTYPES = [
  { v: 'video',      l: 'Video' },
  { v: 'livestream', l: 'Livestream' },
  { v: 'both',       l: 'Cả hai' },
];
const PLAT_CFG = {
  TikTok:   { c: '#1d4ed8', bg: '#dbeafe' },
  Facebook: { c: '#1e40af', bg: '#eff6ff' },
  Shopee:   { c: '#c2410c', bg: '#fff7ed' },
};
const CT_CFG = {
  video:      { l: 'Video',        c: '#1d4ed8', bg: '#dbeafe' },
  livestream: { l: 'Livestream',   c: '#be185d', bg: '#fce7f3' },
  both:       { l: 'Video + Live', c: '#059669', bg: '#dcfce7' },
};

const fN = n => Math.round(n || 0).toLocaleString('vi-VN');
const fM = n => { const v = Math.round(n || 0); return v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v); };
const scV = c => c.followers ? (c.avg_views / c.followers).toFixed(2) : '0.00';
const scC = s => { const v = parseFloat(s); return v >= 0.3 ? '#059669' : v >= 0.15 ? '#d97706' : '#ef4444'; };
const nL  = v => NICHES.find(n => n.v === v)?.l || v;
// Lấy @username từ link bất kỳ
const getUN = link => {
  if (!link) return '—';
  const m = link.match(/@([A-Za-z0-9._\-]+)/);
  if (m) return '@' + m[1];
  // fallback: lấy phần cuối URL
  const p = link.replace(/\?.*$/,'').split('/').filter(Boolean).pop();
  return p ? '@' + p : '—';
};

/* ── shared UI components ──────────────────────── */
const Badge = ({ v, c, bg, style = {} }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, color: c, background: bg, ...style }}>{v}</span>
);
const Av = ({ name, size = 32 }) => {
  const colors = ['#7c3aed', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  const c = colors[name.charCodeAt(0) % colors.length];
  return <div style={{ width: size, height: size, borderRadius: '50%', background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.4), fontWeight: 800, flexShrink: 0 }}>{name[0]}</div>;
};
const Met = ({ label, value, color = '#0f0f1a', bg = '#fafafa' }) => (
  <div style={{ background: bg, border: '1px solid #f0f0f0', borderRadius: 16, padding: '14px 16px' }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#71717a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-.5px' }}>{value}</div>
  </div>
);
const SbItem = ({ id, icon, label, badge, active, onClick }) => (
  <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', margin: '2px 7px', borderRadius: 12, fontSize: 13, color: active ? '#6d28d9' : '#6b7280', cursor: 'pointer', fontWeight: active ? 700 : 400, background: active ? '#ede9fe' : 'transparent', transition: 'all .15s' }}>
    <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{icon}</span>
    {label}
    {badge > 0 && <span style={{ marginLeft: 'auto', background: '#fee2e2', color: '#dc2626', fontSize: 10, padding: '2px 7px', borderRadius: 100, fontWeight: 700 }}>{badge}</span>}
  </div>
);

/* ── main component ────────────────────────────── */
export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState('dash');
  const [creators, setCreators] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fSt, setFSt] = useState('all');
  const [fNi, setFNi] = useState('all');
  const [fCt, setFCt] = useState('all');
  const [srch, setSrch] = useState('');
  const [eGmv, setEGmv] = useState({ id: null, v: '' });
  const [ePrm, setEPrm] = useState({ id: null, v: '' });
  const [campStep, setCampStep] = useState(0);
  const [cf, setCf] = useState({});
  const [sel, setSel] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('kol_admin')) router.replace('/admin');
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, cm] = await Promise.all([
        fetch('/api/creators').then(r => r.json()),
        fetch('/api/campaigns').then(r => r.json()),
      ]);
      setCreators(cr.creators || []);
      setCampaigns(cm.campaigns || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const patchCreator = async (id, body) => {
    await fetch(`/api/creators/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    loadAll();
  };
  const patchCampaign = async (id, body) => {
    await fetch(`/api/campaigns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    loadAll();
  };
  const createCampaign = async () => {
    await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cf, creator_ids: sel }) });
    setCampStep(0); setSel([]); setCf({});
    setTab('campaigns'); loadAll();
  };
  const initCf = () => {
    const today = new Date().toISOString().slice(0, 10);
    const end   = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    setCf({ name: '', product: '', start_date: today, end_date: end, budget: '', goal: '', brief: '', req: '', format: 'TikTok video (15-60s)', content_type: 'video', posts_per: 2, slots: 10, note: '' });
    setSel([]);
  };

  const totalGMV = creators.reduce((s, c) => s + parseFloat(c.gmv || 0), 0);
  const pending   = creators.filter(c => c.status === 'pending').length;
  const highPot   = creators.filter(c => c.potential === 'high').length;
  const filtered  = creators
    .filter(c => fSt === 'all' || c.status === fSt)
    .filter(c => fNi === 'all' || c.niche === fNi)
    .filter(c => fCt === 'all' || c.content_type === fCt)
    .filter(c => !srch || c.name.toLowerCase().includes(srch.toLowerCase()) || c.email.toLowerCase().includes(srch.toLowerCase()));

  /* ── shared styles ── */
  const IN = { background: '#fafafa', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '8px 11px', color: '#0f0f1a', outline: 'none', fontSize: 13 };
  const BTN_P = { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
  const BTN_G = { background: 'transparent', color: '#6b7280', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer' };
  const CARD  = { background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, padding: '16px 18px', marginBottom: 12 };
  const TH    = { padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a1a1aa', borderBottom: '1px solid #f4f4f5', background: '#fafafa', whiteSpace: 'nowrap' };
  const TD    = { padding: '11px 12px', borderBottom: '1px solid #fafafa', fontSize: 13, verticalAlign: 'middle' };

  const selBtn = (on) => ({
    border: `2px solid ${on ? '#7c3aed' : '#e4e4e7'}`, background: on ? '#f5f3ff' : '#fff',
    borderRadius: 14, padding: '11px 8px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 5, cursor: 'pointer', textAlign: 'center', transition: 'all .18s',
  });

  return (
    <>
      <Head><title>Admin Dashboard — KOL Hub</title></Head>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#fafafa' }}>

        {/* ── Mobile bottom nav ── */}
        <div className="admin-mobile-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #f0f0f0', zIndex: 100, justifyContent: 'space-around', padding: '8px 0 12px' }}>
          {[['dash','◈','Dashboard'],['apps','◉','Đơn ĐK'],['campaigns','◇','Chiến dịch'],['creators','◆','Creators']].map(([id,ic,lb]) => (
            <div key={id} onClick={() => setTab(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', minWidth: 60 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: tab===id ? '#ede9fe' : '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: tab===id ? '#7c3aed' : '#71717a', position: 'relative' }}>
                {ic}
                {id==='apps' && pending > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pending}</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: tab===id ? 700 : 400, color: tab===id ? '#7c3aed' : '#71717a' }}>{lb}</span>
            </div>
          ))}
        </div>

        {/* ── Sidebar ── */}
        <aside className="admin-sidebar" style={{ width: 210, flexShrink: 0, background: '#fff', borderRight: '1px solid #f4f4f5', display: 'flex', flexDirection: 'column', padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 14px', borderBottom: '1px solid #f4f4f5', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg,#7c3aed,#c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 900 }}>K</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f0f1a', letterSpacing: '-.3px' }}>KOL Hub</div>
              <div style={{ fontSize: 10, color: '#a1a1aa', fontWeight: 600 }}>Admin · 2026</div>
            </div>
          </div>
          <SbItem id="dash"  icon="◈" label="Dashboard"    active={tab==='dash'}      onClick={() => setTab('dash')} />
          <SbItem id="apps"  icon="◉" label="Đơn đăng ký" badge={pending} active={tab==='apps'}  onClick={() => setTab('apps')} />
          <SbItem id="camps" icon="◇" label="Chiến dịch"  active={tab==='campaigns'} onClick={() => setTab('campaigns')} />
          <SbItem id="crtrs" icon="◆" label="Creators"    active={tab==='creators'}  onClick={() => setTab('creators')} />
          <div style={{ marginTop: 'auto', padding: '12px 14px', borderTop: '1px solid #f4f4f5' }}>
            <div style={{ background: 'linear-gradient(135deg,#0f0f1a,#1e1040)', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 10, color: '#c4b5fd', fontWeight: 700, letterSpacing: '.05em', marginBottom: 5 }}>TOTAL GMV</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-.5px' }}>{fM(totalGMV)}đ</div>
            </div>
            <button onClick={() => { sessionStorage.removeItem('kol_admin'); router.push('/admin'); }} style={{ ...BTN_G, width: '100%', marginTop: 10, textAlign: 'center' }}>Đăng xuất</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="admin-main" style={{ flex: 1, padding: '20px 24px', minWidth: 0, overflow: 'auto', paddingBottom: 80 }}>

          {/* ── DASHBOARD ── */}
          {tab === 'dash' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f0f1a', letterSpacing: '-.5px' }}>Dashboard</div>
                  <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>Tổng quan · {new Date().toLocaleDateString('vi-VN')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={BTN_G} onClick={() => window.open('/', '_blank')}>Xem form ↗</button>
                  <button style={BTN_P} onClick={() => { setTab('campaigns'); setCampStep(1); initCf(); }}>+ Tạo chiến dịch</button>
                </div>
              </div>
              <div className="admin-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                <Met label="Tổng đơn"   value={creators.length} />
                <Met label="Chờ duyệt"  value={pending}   color="#d97706" bg="#fffbeb" />
                <Met label="High Potential" value={'⚡ '+highPot} color="#059669" bg="#f0fdf4" />
                <Met label="Total GMV"  value={fM(totalGMV)+'đ'} color="#7c3aed" bg="#faf5ff" />
              </div>
              <div className="admin-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={CARD}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, letterSpacing: '-.3px' }}>Top creators GMV</div>
                  {[...creators].sort((a, b) => b.gmv - a.gmv).slice(0, 5).map(c => {
                    const s = ASC[c.status] || ASC.pending;
                    const pc = PLAT_CFG[c.platform] || PLAT_CFG.TikTok;
                    return (
                      <div key={c.id} onClick={() => setTab('apps')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #fafafa', cursor: 'pointer' }}>
                        <Av name={c.name} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: '#a1a1aa', marginTop: 2 }}>
                            <span style={{ color: pc.c, fontWeight: 600 }}>{c.platform}</span> · score <span style={{ color: scC(scV(c)), fontWeight: 700 }}>{scV(c)}</span>
                            {c.potential === 'high' && ' ⚡'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{fM(c.gmv)}đ</div>
                          <Badge v={s.l} c={s.c} bg={s.bg} style={{ fontSize: 10 }} />
                        </div>
                      </div>
                    );
                  })}
                  {creators.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#a1a1aa', fontSize: 13 }}>Chưa có creator nào</div>}
                </div>
                <div style={CARD}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, letterSpacing: '-.3px' }}>Chiến dịch đang chạy</div>
                  {campaigns.filter(c => c.status === 'active').map(c => {
                    const tot = (c.creators || []).length * (c.posts_per || 2);
                    const dn  = (c.creators || []).reduce((s, cr) => s + (cr.posts_done || 0), 0);
                    const pct = tot > 0 ? Math.round(dn / tot * 100) : 0;
                    const ct  = CT_CFG[c.content_type] || CT_CFG.video;
                    return (
                      <div key={c.id} onClick={() => setTab('campaigns')} style={{ padding: '8px 0', borderBottom: '1px solid #fafafa', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>{pct}%</span>
                        </div>
                        <div style={{ fontSize: 10, marginBottom: 4 }}><Badge v={ct.l} c={ct.c} bg={ct.bg} /></div>
                        <div style={{ height: 5, background: '#f4f4f5', borderRadius: 100, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#c084fc)', borderRadius: 100 }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#a1a1aa', marginTop: 4 }}>{dn}/{tot} bài · {c.end_date}</div>
                      </div>
                    );
                  })}
                  {campaigns.filter(c => c.status === 'active').length === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#a1a1aa', fontSize: 13 }}>Chưa có chiến dịch</div>}
                  <button style={{ ...BTN_P, marginTop: 12, width: '100%', textAlign: 'center' }} onClick={() => { setTab('campaigns'); setCampStep(1); initCf(); }}>+ Tạo chiến dịch</button>
                </div>
              </div>
            </div>
          )}

          {/* ── APPLICATIONS ── */}
          {tab === 'apps' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div><div style={{ fontSize: 20, fontWeight: 800, color: '#0f0f1a', letterSpacing: '-.5px' }}>Đơn đăng ký</div><div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{filtered.length} / {creators.length}</div></div>
                <button style={BTN_G} onClick={() => window.open('/', '_blank')}>Xem form ↗</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'flex-end' }}>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: '#71717a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tìm</div><input value={srch} onChange={e => setSrch(e.target.value)} placeholder="Tên hoặc email…" style={{ ...IN, width: 155 }} /></div>
                {[
                  { label: 'Lĩnh vực', v: fNi, set: setFNi, opts: [['all', 'Tất cả'], ...NICHES.map(n => [n.v, n.l])] },
                  { label: 'Loại',     v: fCt, set: setFCt, opts: [['all', 'Tất cả'], ...CTYPES.map(n => [n.v, n.l])] },
                  { label: 'Status',   v: fSt, set: setFSt, opts: [['all', 'Tất cả'], ...STATS.map(s  => [s, ASC[s].l])] },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#71717a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>{f.label}</div>
                    <select value={f.v} onChange={e => f.set(e.target.value)} style={IN}>
                      {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
                <button style={{ ...BTN_G, alignSelf: 'flex-end' }} onClick={() => { setSrch(''); setFNi('all'); setFCt('all'); setFSt('all'); }}>Reset</button>
              </div>
              {/* Mobile cards */}
              <div className="mobile-cards">
                {loading ? <div style={{ textAlign: 'center', padding: 36, color: '#a1a1aa' }}>Đang tải…</div> :
                 filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 36, color: '#a1a1aa', fontSize: 14 }}>Không có kết quả</div> :
                 filtered.map(c => {
                  const sv = scV(c);
                  const pc2 = PLAT_CFG[c.platform] || PLAT_CFG.TikTok;
                  const ct2 = CT_CFG[c.content_type] || CT_CFG.video;
                  const pt2 = c.potential === 'high' ? { l: '⚡ High', c: '#15803d', bg: '#dcfce7' } : c.potential === 'medium' ? { l: '◈ Medium', c: '#c2410c', bg: '#fff7ed' } : null;
                  const gL = { under_1M:'< 1M', '1_10M':'1-10M', '10_50M':'10-50M', '50_100M':'50-100M', '100_300M':'100-300M', '300_1B':'300M-1B', over_1B:'> 1 tỷ' };
                  return (
                    <div key={'m'+c.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <Av name={c.name} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 1 }}>{c.email}</div>
                        </div>
                        <Badge v={ASC[c.status]?.l||'—'} c={ASC[c.status]?.c} bg={ASC[c.status]?.bg} />
                      </div>
                      {c.tiktok_link && (
                        <a href={c.tiktok_link.startsWith('http')?c.tiktok_link:'https://'+c.tiktok_link} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f5f3ff', borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#7c3aed', fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🔗 {getUN(c.tiktok_link)}
                        </a>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
                        {[['Followers', fN(c.followers), '#0f0f1a'], ['Score', sv, scC(sv)], ['GMV kênh', gL[c.channel_gmv]||'—', '#059669']].map(([l,v,co]) => (
                          <div key={l} style={{ background: '#fafafa', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: '#71717a', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: co }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                        <Badge v={c.platform} c={pc2.c} bg={pc2.bg} />
                        <Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5" />
                        <Badge v={ct2.l} c={ct2.c} bg={ct2.bg} />
                        {pt2 && <Badge v={pt2.l} c={pt2.c} bg={pt2.bg} />}
                      </div>
                      {c.address && <div style={{ fontSize: 11, color: '#71717a', marginBottom: 8 }}>📍 {c.address}</div>}
                      {c.phone && <a href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0f0f1a', textDecoration: 'none', marginBottom: 8, background: '#f4f4f5', borderRadius: 8, padding: '6px 12px' }}>📞 {c.phone}</a>}
                      {c.applied_at && <div style={{ fontSize: 10, color: '#a1a1aa', marginBottom: 10 }}>Đăng ký: {new Date(c.applied_at).toLocaleDateString('vi-VN')}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select style={{ flex: 1, ...IN, fontSize: 13, padding: '10px 12px', borderRadius: 10, fontWeight: 600 }} value={c.status} onChange={e => patchCreator(c.id, { status: e.target.value })}>
                          {STATS.map(s => <option key={s} value={s}>{ASC[s].l}</option>)}
                        </select>
                        {c.status === 'pending' && (
                          <button style={{ ...BTN_P, padding: '10px 16px', fontSize: 13, borderRadius: 10, flexShrink: 0 }} onClick={() => patchCreator(c.id, { status: 'approved' })}>✓ Duyệt</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="desktop-table" style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
                    <thead><tr>{['Creator','Username','Link','Nền tảng','Lĩnh vực','Loại','Followers','Score','Tiềm năng','GMV kênh','Địa chỉ','GMV','Promo','Status'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {loading ? <tr><td colSpan={10} style={{ ...TD, textAlign: 'center', padding: 36, color: '#a1a1aa' }}>Đang tải…</td></tr> :
                       filtered.length === 0 ? <tr><td colSpan={10} style={{ ...TD, textAlign: 'center', padding: 36, color: '#a1a1aa' }}>Không có kết quả</td></tr> :
                       filtered.map(c => {
                        const sv = scV(c);
                        const pc = PLAT_CFG[c.platform] || PLAT_CFG.TikTok;
                        const ct = CT_CFG[c.content_type] || CT_CFG.video;
                        const pt = c.potential === 'high' ? { l: '⚡ High', c: '#15803d', bg: '#dcfce7' } : c.potential === 'medium' ? { l: '◈ Medium', c: '#c2410c', bg: '#fff7ed' } : null;
                        const gmvLabels = { under_1M:'< 1M', '1_10M':'1-10M', '10_50M':'10-50M', '50_100M':'50-100M', '100_300M':'100-300M', '300_1B':'300M-1B', over_1B:'> 1 tỷ' };
                        return (
                          <tr key={c.id} style={{ cursor: 'default' }}>
                            <td style={TD}><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Av name={c.name} size={32} /><div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 10, color: '#a1a1aa' }}>{c.email}</div><div style={{ fontSize: 10, color: '#a1a1aa' }}>{new Date(c.applied_at).toLocaleDateString('vi-VN')}</div></div></div></td>
                            <td style={TD}>
                              <a href={c.tiktok_link ? (c.tiktok_link.startsWith('http') ? c.tiktok_link : 'https://'+c.tiktok_link) : '#'} target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', textDecoration: 'none', background: '#f5f3ff', borderRadius: 8, padding: '3px 8px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                {getUN(c.tiktok_link)}
                              </a>
                            </td>
                            <td style={TD}>{c.tiktok_link ? <a href={c.tiktok_link.startsWith('http') ? c.tiktok_link : 'https://'+c.tiktok_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, textDecoration: 'none', display: 'block', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.tiktok_link}</a> : <span style={{ color: '#a1a1aa', fontSize: 11 }}>—</span>}</td>
                            <td style={TD}><Badge v={c.platform} c={pc.c} bg={pc.bg} /></td>
                            <td style={TD}><Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5" /></td>
                            <td style={TD}><Badge v={ct.l} c={ct.c} bg={ct.bg} /></td>
                            <td style={{ ...TD, fontWeight: 800, fontSize: 13 }}>{fN(c.followers)}</td>
                            <td style={TD}><span style={{ fontSize: 15, fontWeight: 900, color: scC(sv) }}>{sv}</span></td>
                            <td style={TD}>{pt ? <Badge v={pt.l} c={pt.c} bg={pt.bg} /> : <span style={{ color: '#a1a1aa', fontSize: 11 }}>—</span>}</td>
                            <td style={TD}><span style={{ fontSize: 12, fontWeight: 600, color: c.channel_gmv ? '#059669' : '#a1a1aa' }}>{gmvLabels[c.channel_gmv] || '—'}</span></td>
                            <td style={TD}><span style={{ fontSize: 11, color: '#374151', maxWidth: 120, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</span></td>
                            <td style={TD}>
                              {eGmv.id === c.id
                                ? <div style={{ display: 'flex', gap: 4 }}>
                                    <input type="number" defaultValue={eGmv.v} id={`g${c.id}`} style={{ ...IN, width: 80 }} />
                                    <button style={{ ...BTN_P, padding: '4px 10px', fontSize: 12 }} onClick={() => { patchCreator(c.id, { gmv: parseFloat(document.getElementById(`g${c.id}`).value) || 0 }); setEGmv({ id: null, v: '' }); }}>✓</button>
                                    <button style={{ ...BTN_G, padding: '4px 9px', fontSize: 12 }} onClick={() => setEGmv({ id: null, v: '' })}>✕</button>
                                  </div>
                                : <span onClick={() => setEGmv({ id: c.id, v: String(c.gmv || 0) })} style={{ cursor: 'pointer', fontSize: 13, fontWeight: 800, color: c.gmv > 0 ? '#059669' : '#a1a1aa' }}>{c.gmv > 0 ? fM(c.gmv) + 'đ' : '+ GMV'}</span>
                              }
                            </td>
                            <td style={TD}>
                              {ePrm.id === c.id
                                ? <div style={{ display: 'flex', gap: 4 }}>
                                    <input defaultValue={ePrm.v} id={`p${c.id}`} placeholder="CODE" style={{ ...IN, width: 90, letterSpacing: '.04em' }} />
                                    <button style={{ ...BTN_P, padding: '4px 10px', fontSize: 12 }} onClick={() => { patchCreator(c.id, { promo_code: document.getElementById(`p${c.id}`).value }); setEPrm({ id: null, v: '' }); }}>✓</button>
                                    <button style={{ ...BTN_G, padding: '4px 9px', fontSize: 12 }} onClick={() => setEPrm({ id: null, v: '' })}>✕</button>
                                  </div>
                                : <span onClick={() => setEPrm({ id: c.id, v: c.promo_code || '' })} style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: c.promo_code ? '#7c3aed' : '#a1a1aa' }}>{c.promo_code || '+ Promo'}</span>
                              }
                            </td>
                            <td style={TD}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <Badge v={ASC[c.status]?.l || '—'} c={ASC[c.status]?.c} bg={ASC[c.status]?.bg} />
                                <select style={{ ...IN, fontSize: 11, padding: '4px 8px', borderRadius: 8, width: 'auto' }} value={c.status} onChange={e => patchCreator(c.id, { status: e.target.value })}>
                                  {STATS.map(s => <option key={s} value={s}>{ASC[s].l}</option>)}
                                </select>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CAMPAIGNS LIST ── */}
          {tab === 'campaigns' && campStep === 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div><div style={{ fontSize: 20, fontWeight: 800, color: '#0f0f1a', letterSpacing: '-.5px' }}>Chiến dịch</div><div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{campaigns.length} chiến dịch</div></div>
                <button style={BTN_P} onClick={() => { setCampStep(1); initCf(); }}>+ Tạo chiến dịch</button>
              </div>
              {campaigns.length === 0 ? (
                <div style={{ ...CARD, textAlign: 'center', padding: 52 }}><div style={{ fontSize: 36, marginBottom: 12 }}>◇</div><div style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>Chưa có chiến dịch</div><button style={BTN_P} onClick={() => { setCampStep(1); initCf(); }}>Tạo ngay</button></div>
              ) : campaigns.map(c => {
                const tot = (c.creators || []).length * (c.posts_per || 2);
                const dn  = (c.creators || []).reduce((s, cr) => s + (cr.posts_done || 0), 0);
                const pct = tot > 0 ? Math.round(dn / tot * 100) : 0;
                const stC = c.status === 'active' ? { c: '#065f46', bg: '#dcfce7' } : c.status === 'completed' ? { c: '#1d4ed8', bg: '#dbeafe' } : { c: '#92400e', bg: '#fef3c7' };
                const stL = { active: 'Đang chạy', paused: 'Tạm dừng', completed: 'Hoàn thành' };
                const ct  = CT_CFG[c.content_type] || CT_CFG.video;
                return (
                  <div key={c.id} style={CARD}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 3, display: 'flex', alignItems: 'center', gap: 7 }}>
                          {c.product} · {c.end_date} <Badge v={ct.l} c={ct.c} bg={ct.bg} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select style={{ ...IN, fontSize: 12, padding: '6px 9px', borderRadius: 9, width: 'auto' }} value={c.status} onChange={e => patchCampaign(c.id, { status: e.target.value })}>
                          <option value="active">Đang chạy</option><option value="paused">Tạm dừng</option><option value="completed">Hoàn thành</option>
                        </select>
                        <Badge v={stL[c.status]} c={stC.c} bg={stC.bg} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                      {[['Budget', fM(c.budget) + 'đ', '#6d28d9', '#faf5ff'], ['Creators', (c.creators || []).length, '#0f0f1a', '#fafafa'], ['Bài/Live', (c.posts_per || 2) + '/người', '#0f0f1a', '#fafafa'], ['Tiến độ', pct + '%', '#059669', '#f0fdf4']].map(([l, v, co, bg]) => (
                        <div key={l} style={{ background: bg, border: '1px solid #f0f0f0', borderRadius: 12, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: '#71717a', fontWeight: 700, marginBottom: 3 }}>{l}</div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: co }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 6, background: '#f4f4f5', borderRadius: 100, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#c084fc)', borderRadius: 100 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 12 }}>{dn} / {tot} bài đã đăng</div>
                    {(c.creators || []).length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                          <thead><tr>{['Creator', 'Loại', 'Promo', 'Đã đăng', 'Trạng thái'].map(h => <th key={h} style={{ ...TH, borderBottom: '1px solid #f4f4f5' }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {c.creators.map(cr => (
                              <tr key={cr.creator_id}>
                                <td style={TD}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Av name={cr.name} size={26} /><span style={{ fontSize: 13, fontWeight: 600 }}>{cr.name}</span></div></td>
                                <td style={TD}><Badge v={CT_CFG[cr.content_type]?.l || 'Video'} c={CT_CFG[cr.content_type]?.c || '#1d4ed8'} bg={CT_CFG[cr.content_type]?.bg || '#dbeafe'} /></td>
                                <td style={TD}><span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>{cr.promo_code || '—'}</span></td>
                                <td style={TD}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <button onClick={() => { if (cr.posts_done > 0) patchCampaign(c.id, { creator_id: cr.creator_id, posts_done: cr.posts_done - 1 }); }} style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                                    <span style={{ fontSize: 14, fontWeight: 900, minWidth: 36, textAlign: 'center' }}>{cr.posts_done}/{c.posts_per}</span>
                                    <button onClick={() => { if (cr.posts_done < c.posts_per) patchCampaign(c.id, { creator_id: cr.creator_id, posts_done: cr.posts_done + 1 }); }} style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                                  </div>
                                </td>
                                <td style={TD}>
                                  <select style={{ ...IN, fontSize: 11, padding: '5px 8px', borderRadius: 8, width: 'auto' }} value={cr.camp_status || ''} onChange={e => patchCampaign(c.id, { creator_id: cr.creator_id, camp_status: e.target.value })}>
                                    {TRACK.map(s => <option key={s}>{s}</option>)}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CAMPAIGN WIZARD ── */}
          {tab === 'campaigns' && campStep > 0 && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <button style={BTN_G} onClick={() => setCampStep(0)}>← Huỷ</button>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0f0f1a', letterSpacing: '-.4px' }}>Tạo chiến dịch mới</div>
              </div>
              {/* Steps indicator */}
              <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: 12, overflow: 'hidden', border: '1px solid #e4e4e7', marginBottom: 20 }}>
                {['Thông tin', 'Brief & YC', 'Creator', 'Xác nhận'].map((s, i) => (
                  <div key={s} style={{ flex: 1, padding: '10px 6px', textAlign: 'center', fontSize: 11, fontWeight: campStep === i+1 ? 800 : i+1 < campStep ? 700 : 500, background: campStep === i+1 ? '#fff' : i+1 < campStep ? '#f0fdf4' : 'transparent', color: campStep === i+1 ? '#6d28d9' : i+1 < campStep ? '#15803d' : '#a1a1aa', borderRight: i < 3 ? '1px solid #e4e4e7' : 'none' }}>
                    <span style={{ display: 'inline-flex', width: 17, height: 17, borderRadius: '50%', fontSize: 9, alignItems: 'center', justifyContent: 'center', marginRight: 4, background: i+1 < campStep ? '#15803d' : campStep === i+1 ? '#7c3aed' : '#e4e4e7', color: i+1 <= campStep ? '#fff' : '#a1a1aa', fontWeight: 800 }}>{i+1 < campStep ? '✓' : i+1}</span>
                    {s}
                  </div>
                ))}
              </div>
              <div style={{ ...CARD, borderRadius: 20, padding: '20px 22px', marginBottom: 14 }}>
                {campStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid #f4f4f5' }}>Thông tin chiến dịch</div>
                    <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Tên *</label><input style={IN} value={cf.name || ''} onChange={e => setCf(p => ({ ...p, name: e.target.value }))} placeholder="VD: Ra mắt Son Velvet Mùa Thu 2026" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Bắt đầu</label><input type="date" style={IN} value={cf.start_date || ''} onChange={e => setCf(p => ({ ...p, start_date: e.target.value }))} /></div>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Deadline</label><input type="date" style={IN} value={cf.end_date || ''} onChange={e => setCf(p => ({ ...p, end_date: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Budget (VNĐ)</label><input type="number" style={IN} value={cf.budget || ''} onChange={e => setCf(p => ({ ...p, budget: e.target.value }))} placeholder="50,000,000" /></div>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Slots creator</label><input type="number" style={IN} value={cf.slots || 10} onChange={e => setCf(p => ({ ...p, slots: parseInt(e.target.value) || 10 }))} /></div>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Sản phẩm</label><input style={IN} value={cf.product || ''} onChange={e => setCf(p => ({ ...p, product: e.target.value }))} placeholder="Son Velvet No.12" /></div>
                    </div>
                    <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Mục tiêu</label><textarea style={{ ...IN, width: '100%', resize: 'none', lineHeight: 1.6 }} rows={2} value={cf.goal || ''} onChange={e => setCf(p => ({ ...p, goal: e.target.value }))} placeholder="1M views trong 30 ngày…" /></div>
                  </div>
                )}
                {campStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid #f4f4f5' }}>Brief & Yêu cầu</div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 8 }}>Loại nội dung *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                        {CTYPES.map(ct => (
                          <div key={ct.v} style={selBtn(cf.content_type === ct.v)} onClick={() => setCf(p => ({ ...p, content_type: ct.v }))}>
                            <span style={{ fontSize: 20 }}>{CT_CFG[ct.v]?.l === 'Video' ? '▶' : CT_CFG[ct.v]?.l === 'Livestream' ? '◉' : '◈'}</span>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{ct.l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {[['brief', 'Brief tổng quan', 'Mô tả sản phẩm, thông điệp, tone & manner…', 3], ['req', 'Yêu cầu nội dung', 'VD: 2 video TikTok 30-60s + livestream 60 phút…', 3], ['note', 'Lưu ý', 'Điều cần tránh, phong cách ưu tiên…', 2]].map(([k, l, ph, r]) => (
                      <div key={k}><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>{l}</label><textarea style={{ ...IN, width: '100%', resize: 'none', lineHeight: 1.6 }} rows={r} value={cf[k] || ''} onChange={e => setCf(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} /></div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Định dạng</label>
                        <select style={{ ...IN, width: '100%' }} value={cf.format || ''} onChange={e => setCf(p => ({ ...p, format: e.target.value }))}>
                          {['TikTok video (15-60s)', 'TikTok video (60-180s)', 'TikTok Live', 'Facebook Reels', 'Facebook Live', 'Shopee Video', 'Shopee Live', 'Đa nền tảng'].map(f => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#71717a', marginBottom: 6 }}>Số bài/live mỗi creator</label><input type="number" style={IN} value={cf.posts_per || 2} onChange={e => setCf(p => ({ ...p, posts_per: parseInt(e.target.value) || 1 }))} /></div>
                    </div>
                  </div>
                )}
                {campStep === 3 && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Chọn creators tham gia</div>
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 14 }}>Đã chọn: <strong style={{ color: '#0f0f1a' }}>{sel.length}</strong> / {cf.slots || 10} slots · Budget/creator: <strong style={{ color: '#7c3aed' }}>{sel.length > 0 ? fM((cf.budget || 0) / sel.length) + 'đ' : '—'}</strong></div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                      {creators.filter(c => c.status === 'approved' || c.status === 'in_campaign').map(c => {
                        const on = sel.includes(c.id);
                        const pc = PLAT_CFG[c.platform] || PLAT_CFG.TikTok;
                        return (
                          <div key={c.id} onClick={() => setSel(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `2px solid ${on ? '#7c3aed' : '#e4e4e7'}`, background: on ? '#f5f3ff' : '#fff', borderRadius: 12, padding: '7px 12px', margin: 4, cursor: 'pointer', transition: 'all .18s' }}>
                            <Av name={c.name} size={22} />
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                              <div style={{ fontSize: 10, color: '#a1a1aa' }}><span style={{ color: pc.c, fontWeight: 600 }}>{c.platform}</span> · score <span style={{ color: scC(scV(c)), fontWeight: 700 }}>{scV(c)}</span>{c.potential === 'high' ? ' ⚡' : ''}</div>
                            </div>
                          </div>
                        );
                      })}
                      {creators.filter(c => c.status === 'approved' || c.status === 'in_campaign').length === 0 && <div style={{ color: '#a1a1aa', fontSize: 13, padding: 16 }}>Chưa có creator được duyệt.</div>}
                    </div>
                  </div>
                )}
                {campStep === 4 && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f4f4f5' }}>Xác nhận chiến dịch</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      {[['Tên', cf.name], ['Sản phẩm', cf.product], ['Thời gian', `${cf.start_date} → ${cf.end_date}`], ['Budget', fM(cf.budget || 0) + 'đ']].map(([l, v]) => (
                        <div key={l} style={{ background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 12, padding: '11px 13px' }}>
                          <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 3 }}>{l}</div>
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 12, padding: '11px 13px', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 4 }}>Loại · {cf.format}</div>
                      {cf.content_type && <Badge v={CT_CFG[cf.content_type]?.l || cf.content_type} c={CT_CFG[cf.content_type]?.c} bg={CT_CFG[cf.content_type]?.bg} />}
                    </div>
                    <div style={{ background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 12, padding: '11px 13px', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 4 }}>Brief</div>
                      <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.7 }}>{cf.brief || '—'}</div>
                    </div>
                    <div style={{ background: '#faf5ff', border: '1px solid #ede9fe', borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 6 }}>{sel.length} creators · {cf.slots || 10} slots</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {creators.filter(c => sel.includes(c.id)).map(c => <Badge key={c.id} v={c.name} c="#6d28d9" bg="#ede9fe" />)}
                        {sel.length === 0 && <span style={{ color: '#a1a1aa', fontSize: 12 }}>Chưa chọn creator nào</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {campStep > 1 ? <button style={BTN_G} onClick={() => setCampStep(s => s - 1)}>← Quay lại</button> : <div />}
                {campStep < 4
                  ? <button style={BTN_P} onClick={() => { if (campStep === 1 && !cf.name) { alert('Điền tên chiến dịch'); return; } setCampStep(s => s + 1); }}>Tiếp theo →</button>
                  : <button style={{ ...BTN_P, padding: '11px 28px', fontSize: 14, borderRadius: 12 }} onClick={createCampaign}>Tạo chiến dịch ✓</button>
                }
              </div>
            </div>
          )}

          {/* ── CREATORS ── */}
          {tab === 'creators' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div><div style={{ fontSize: 20, fontWeight: 800, color: '#0f0f1a', letterSpacing: '-.5px' }}>Creators</div><div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{creators.length} đã đăng ký</div></div>
                <button style={BTN_G} onClick={() => window.open('/', '_blank')}>Trang đăng ký ↗</button>
              </div>
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                    <thead><tr>{['Creator','Nền tảng','Lĩnh vực','Loại','Followers','Score','Tiềm năng','Chiến dịch','Status'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {loading ? <tr><td colSpan={9} style={{ ...TD, textAlign: 'center', padding: 36, color: '#a1a1aa' }}>Đang tải…</td></tr> :
                       creators.map(c => {
                        const sv = scV(c);
                        const pc = PLAT_CFG[c.platform] || PLAT_CFG.TikTok;
                        const ct = CT_CFG[c.content_type] || CT_CFG.video;
                        const pt = c.potential === 'high' ? { l: '⚡ High', c: '#15803d', bg: '#dcfce7' } : c.potential === 'medium' ? { l: '◈ Medium', c: '#c2410c', bg: '#fff7ed' } : null;
                        const inC = campaigns.filter(cm => (cm.creators || []).some(cr => cr.creator_id === c.id));
                        return (
                          <tr key={c.id}>
                            <td style={TD}><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Av name={c.name} size={32} /><div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 10, color: '#a1a1aa' }}>{c.email}</div></div></div></td>
                            <td style={TD}><Badge v={c.platform} c={pc.c} bg={pc.bg} /></td>
                            <td style={TD}><Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5" /></td>
                            <td style={TD}><Badge v={ct.l} c={ct.c} bg={ct.bg} /></td>
                            <td style={{ ...TD, fontWeight: 800 }}>{fN(c.followers)}</td>
                            <td style={TD}><span style={{ fontSize: 15, fontWeight: 900, color: scC(sv) }}>{sv}</span></td>
                            <td style={TD}>{pt ? <Badge v={pt.l} c={pt.c} bg={pt.bg} /> : <span style={{ color: '#a1a1aa', fontSize: 11 }}>—</span>}</td>
                            <td style={TD}>{inC.length > 0 ? inC.map(cm => <Badge key={cm.id} v={cm.name.slice(0, 14) + '…'} c="#6d28d9" bg="#ede9fe" style={{ fontSize: 10, marginRight: 3 }} />) : <span style={{ color: '#a1a1aa', fontSize: 11 }}>—</span>}</td>
                            <td style={TD}><Badge v={ASC[c.status]?.l || '—'} c={ASC[c.status]?.c} bg={ASC[c.status]?.bg} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
