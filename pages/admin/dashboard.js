import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { api, useToast } from '../../components/ui';
import Overview from '../../components/admin/Overview';
import Creators, { CreatorDrawer } from '../../components/admin/Creators';
import Samples from '../../components/admin/Samples';
import Videos from '../../components/admin/Videos';
import Campaigns from '../../components/admin/Campaigns';
import Automation from '../../components/admin/Automation';
import Deals from '../../components/admin/Deals';
import Recruit from '../../components/admin/Recruit';
import Clients from '../../components/admin/Clients';

const NAV = [
  ['overview', 'Tổng quan', '◎'],
  ['creators', 'Bảng KOL', '☺'],
  ['samples', 'Đơn mẫu', '▣'],
  ['videos', 'Video', '▶'],
  ['clients', 'Khách hàng', '◆'],
  ['deals', 'Deals', '₫'],
  ['campaigns', 'Chiến dịch', '⚑'],
  ['recruit', 'Tuyển & Link', '✚'],
  ['automation', 'Automation', '⚙'],
];

export default function Dashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('overview');
  const [params, setParams] = useState({});
  const [creatorId, setCreatorId] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    api('/api/auth/me').then(() => setReady(true)).catch(() => router.replace('/admin'));
  }, [router]);

  useEffect(() => {
    if (!router.isReady) return;
    const t = String(router.query.tab || 'overview');
    if (NAV.some(([id]) => id === t)) setTab(t);
  }, [router.isReady, router.query.tab]);

  const go = useCallback((id, p = {}) => {
    setTab(id); setParams(p); setNonce(n => n + 1);
    router.replace({ pathname: '/admin/dashboard', query: { tab: id } }, undefined, { shallow: true });
    window.scrollTo(0, 0);
  }, [router]);

  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); router.push('/admin'); };

  if (!ready) return <div className="empty" style={{ paddingTop: 120 }}>Đang kiểm tra đăng nhập…</div>;

  const props = { go, toast, openCreator: setCreatorId, initial: params };
  const key = `${tab}-${nonce}`;

  return (
    <>
      <Head><title>KOL Hub · Admin</title></Head>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-logo">K</div>
            <div><div className="bold">KOL Hub</div><div className="xs muted">Creator Ops</div></div>
          </div>
          {NAV.map(([id, l, ic]) => (
            <button key={id} className={`nav-item${tab === id ? ' on' : ''}`} onClick={() => go(id)}>
              <span className="nav-ico">{ic}</span>{l}
            </button>
          ))}
          <div style={{ marginTop: 'auto' }} className="stack">
            <a className="nav-item" href="/" target="_blank" rel="noreferrer"><span className="nav-ico">↗</span>Trang tuyển creator</a>
            <button className="nav-item" onClick={logout}><span className="nav-ico">⎋</span>Đăng xuất</button>
          </div>
        </aside>

        <main className="main">
          {tab === 'overview' && <Overview key={key} {...props} />}
          {tab === 'creators' && <Creators key={key} {...props} />}
          {tab === 'samples' && <Samples key={key} {...props} />}
          {tab === 'videos' && <Videos key={key} {...props} />}
          {tab === 'campaigns' && <Campaigns key={key} {...props} />}
          {tab === 'deals' && <Deals key={key} {...props} />}
          {tab === 'recruit' && <Recruit key={key} {...props} />}
          {tab === 'clients' && <Clients key={key} {...props} />}
          {tab === 'automation' && <Automation key={key} {...props} />}
        </main>

        <nav className="mobnav">
          {NAV.map(([id, l, ic]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)}
              ref={el => { if (el && tab === id) el.scrollIntoView({ block: 'nearest', inline: 'center' }); }}><span className="nav-ico">{ic}</span>{l}</button>
          ))}
        </nav>
      </div>
      {creatorId && <CreatorDrawer id={creatorId} onClose={() => setCreatorId(null)} toast={toast} />}
      {toastNode}
    </>
  );
}
