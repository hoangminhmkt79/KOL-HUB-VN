import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const d = await r.json();
      if (d.ok) { sessionStorage.setItem('kol_admin','1'); sessionStorage.setItem('kol_token', d.token); router.push('/admin/dashboard'); }
      else { setErr('Mật khẩu không đúng.'); setPw(''); }
    } catch { setErr('Lỗi kết nối.'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Head><title>KOL Hub</title><meta name="robots" content="noindex,nofollow" /></Head>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fafafa', padding:20 }}>
        <div style={{ background:'#fff', border:'1px solid #f0f0f0', borderRadius:24, padding:'48px 40px', width:'100%', maxWidth:360, textAlign:'center', boxShadow:'0 4px 32px rgba(0,0,0,.06)' }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#c084fc)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', color:'#fff', fontSize:22, fontWeight:900 }}>K</div>
          <h1 style={{ fontSize:20, fontWeight:800, marginBottom:6, letterSpacing:'-.4px' }}>Đăng nhập</h1>
          <p style={{ color:'#71717a', fontSize:13, marginBottom:24 }}>Dành cho quản trị viên</p>
          {err && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', color:'#dc2626', fontSize:13, marginBottom:14 }}>{err}</div>}
          <form onSubmit={login} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr('');}} placeholder="••••••••"
              style={{ background:'#fafafa', border:'1.5px solid #e4e4e7', borderRadius:12, padding:'14px 16px', width:'100%', outline:'none', textAlign:'center', letterSpacing:'.2em', fontSize:20, fontFamily:'inherit' }} autoFocus />
            <button type="submit" disabled={loading}
              style={{ background: loading?'#a78bfa':'#7c3aed', color:'#fff', border:'none', borderRadius:12, padding:14, fontWeight:700, fontSize:15, fontFamily:'inherit' }}>
              {loading ? 'Đang xác thực…' : 'Đăng nhập →'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
