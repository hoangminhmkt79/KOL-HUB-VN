import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const router = useRouter();

  const login = (e) => {
    e.preventDefault();
    if (pw === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123')) {
      sessionStorage.setItem('kol_admin', '1');
      router.push('/admin/dashboard');
    } else {
      setErr('Mật khẩu không đúng.');
    }
  };

  const S = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: 20 },
    card: { background: '#fff', border: '1px solid #f0f0f0', borderRadius: 24, padding: '48px 40px', width: '100%', maxWidth: 380, textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,.06)' },
    logo: { width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', color: '#fff', fontSize: 22, fontWeight: 900 },
    input: { background: '#fafafa', border: '1.5px solid #e4e4e7', borderRadius: 12, padding: '14px 16px', width: '100%', outline: 'none', textAlign: 'center', letterSpacing: '.2em', fontSize: 20, color: '#0f0f1a' },
    btn: { width: '100%', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 },
    err: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 },
  };

  return (
    <>
      <Head><title>Admin — KOL Hub</title></Head>
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.logo}>K</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: '-.4px' }}>Admin Access</h1>
          <p style={{ color: '#71717a', fontSize: 13, marginBottom: 24 }}>Nhập mật khẩu để vào dashboard</p>
          {err && <div style={S.err}>{err}</div>}
          <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(''); }} placeholder="••••••••" style={S.input} autoFocus />
            <button type="submit" style={S.btn}>Đăng nhập →</button>
          </form>
          <a href="/" style={{ display: 'inline-block', marginTop: 20, color: '#a1a1aa', fontSize: 12 }}>← Về trang chủ</a>
        </div>
      </div>
    </>
  );
}
