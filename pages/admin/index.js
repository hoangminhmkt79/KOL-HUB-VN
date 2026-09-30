import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (r.ok) router.replace('/admin/dashboard'); }).catch(() => {});
  }, [router]);

  const login = async e => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const d = await r.json();
      if (d.ok) router.push('/admin/dashboard');
      else { setErr(d.error || 'Mật khẩu không đúng.'); setPw(''); }
    } catch { setErr('Lỗi kết nối. Thử lại.'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Head><title>Đăng nhập · KOL Hub</title></Head>
      <div className="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <form onSubmit={login} className="card" style={{ width: '100%', maxWidth: 380, padding: '36px 30px', textAlign: 'center' }}>
          <div className="brand-logo" style={{ margin: '0 auto 14px', width: 46, height: 46, fontSize: 20, borderRadius: 14 }}>K</div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>KOL Hub Admin</h1>
          <p className="small muted" style={{ margin: '6px 0 22px' }}>Quản lý creator, đơn mẫu và video</p>
          {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠ {err}</div>}
          <input className="input" type="password" autoFocus placeholder="Mật khẩu" value={pw} onChange={e => setPw(e.target.value)} />
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }} disabled={loading || !pw}>{loading ? 'Đang kiểm tra…' : 'Đăng nhập'}</button>
        </form>
      </div>
    </>
  );
}
