import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const ASC = {
  applied:        { l: 'Applied',        c: '#92400e', bg: '#fef3c7' },
  pending:        { l: 'Chờ duyệt',      c: '#92400e', bg: '#fef3c7' },
  approved:       { l: 'Đã duyệt',       c: '#065f46', bg: '#dcfce7' },
  rejected:       { l: 'Từ chối',        c: '#991b1b', bg: '#fee2e2' },
  sample_sent:    { l: 'Sample Sent',    c: '#1e40af', bg: '#dbeafe' },
  content_posted: { l: 'Content Posted', c: '#6d28d9', bg: '#ede9fe' },
  scaling:        { l: 'Scaling',        c: '#065f46', bg: '#d1fae5' },
  inactive:       { l: 'Inactive',       c: '#71717a', bg: '#f4f4f5' },
  in_campaign:    { l: 'Trong CĐ',       c: '#1e40af', bg: '#dbeafe' },
};
const ALL_STATS = ['applied','pending','approved','rejected','sample_sent','content_posted','scaling','inactive','in_campaign'];
const NICHES = [{v:'lam_dep',l:'Làm đẹp'},{v:'nha_cua',l:'Nhà cửa'},{v:'cong_nghe',l:'Công nghệ'},{v:'thoi_trang',l:'Thời trang'}];
const CTYPES = [{v:'video',l:'Video'},{v:'livestream',l:'Livestream'},{v:'both',l:'Cả hai'}];
const PLAT = { TikTok:{c:'#1d4ed8',bg:'#dbeafe'}, Facebook:{c:'#1e40af',bg:'#eff6ff'}, Shopee:{c:'#c2410c',bg:'#fff7ed'} };
const CT = { video:{l:'Video',c:'#1d4ed8',bg:'#dbeafe'}, livestream:{l:'Livestream',c:'#be185d',bg:'#fce7f3'}, both:{l:'Video+Live',c:'#059669',bg:'#dcfce7'} };
const GMV_L = { under_1M:'< 1M','1_10M':'1–10M','10_50M':'10–50M','50_100M':'50–100M','100_300M':'100–300M','300_1B':'300M–1B',over_1B:'> 1 tỷ' };

const fN = n => Math.round(n||0).toLocaleString('vi-VN');
const fM = n => { const v=Math.round(n||0); return v>=1e9?(v/1e9).toFixed(1)+'Bđ':v>=1e6?(v/1e6).toFixed(1)+'Mđ':v>=1e3?(v/1e3).toFixed(0)+'K':String(v); };
const scV = c => c.followers ? parseFloat((c.avg_views/c.followers).toFixed(2)) : 0;
const scC = s => s>=0.3?'#059669':s>=0.15?'#d97706':'#dc2626';
const nL  = v => NICHES.find(n=>n.v===v)?.l||v;
const getUN = l => { if(!l)return'—'; const m=l.match(/@([A-Za-z0-9._-]+)/); return m?'@'+m[1]:'—'; };

const Badge = ({v,c,bg,style={}}) => <span style={{display:'inline-flex',alignItems:'center',padding:'2px 9px',borderRadius:100,fontSize:11,fontWeight:600,color:c,background:bg,...style}}>{v}</span>;
const Av = ({name,size=32}) => {
  const colors=['#7c3aed','#0ea5e9','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899'];
  const c=colors[name.charCodeAt(0)%colors.length];
  return <div style={{width:size,height:size,borderRadius:'50%',background:c,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.round(size*.4),fontWeight:800,flexShrink:0}}>{name[0]}</div>;
};
const Met = ({label,value,color='#0f0f1a',bg='#fafafa'}) => (
  <div style={{background:bg,border:'1px solid #f0f0f0',borderRadius:14,padding:'13px 15px'}}>
    <div style={{fontSize:11,fontWeight:600,color:'#71717a',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{label}</div>
    <div style={{fontSize:20,fontWeight:800,color,letterSpacing:'-.5px'}}>{value}</div>
  </div>
);

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState('dash');
  const [creators, setCreators] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [fSt, setFSt] = useState('all');
  const [fNi, setFNi] = useState('all');
  const [fCt, setFCt] = useState('all');
  const [srch, setSrch] = useState('');
  const [eGmv, setEGmv] = useState({id:null,v:''});
  const [ePrm, setEPrm] = useState({id:null,v:''});
  const [campStep, setCampStep] = useState(0);
  const [cf, setCf] = useState({});
  const [sel, setSel] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('kol_admin')) router.replace('/admin');
  }, [router]);

  const loadCreators = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({page});
      if (fSt !== 'all') params.set('status', fSt);
      if (fNi !== 'all') params.set('niche', fNi);
      if (fCt !== 'all') params.set('ct', fCt);
      if (srch) params.set('search', srch);
      const r = await fetch('/api/creators?' + params);
      const d = await r.json();
      setCreators(d.creators || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, fSt, fNi, fCt, srch]);

  const loadCamps = useCallback(async () => {
    try { const r = await fetch('/api/campaigns'); const d = await r.json(); setCampaigns(d.campaigns||[]); } catch {}
  }, []);

  useEffect(() => { loadCreators(); }, [loadCreators]);
  useEffect(() => { loadCamps(); }, [loadCamps]);

  const patch = async (id, body) => {
    await fetch(`/api/creators/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    loadCreators();
  };
  const patchCamp = async (id, body) => {
    await fetch(`/api/campaigns/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    loadCamps();
  };
  const initCf = () => {
    const today = new Date().toISOString().slice(0,10);
    const end = new Date(Date.now()+30*864e5).toISOString().slice(0,10);
    setCf({ name:'',product:'',start_date:today,end_date:end,budget:'',goal:'',brief:'',req:'',format:'TikTok video (15-60s)',content_type:'video',posts_per:2,slots:10,note:'' });
    setSel([]);
  };
  const createCamp = async () => {
    await fetch('/api/campaigns', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...cf,creator_ids:sel}) });
    setCampStep(0); setSel([]); setCf({}); setTab('campaigns'); loadCamps(); loadCreators();
  };

  const exportCSV = () => {
    const headers = ['Tên','Email','SĐT','Username','Link','Nền tảng','Lĩnh vực','Loại','Followers','Avg views','Score','Tiềm năng','GMV kênh','Địa chỉ','GMV','Promo','Status','Ngày đăng ký'];
    const rows = creators.map(c => [
      c.name, c.email||'', c.phone||'', getUN(c.tiktok_link), c.tiktok_link||'',
      c.platform, nL(c.niche), c.content_type, c.followers, c.avg_views,
      scV(c).toFixed(2), c.potential||'', GMV_L[c.channel_gmv]||'',
      c.address||'', c.gmv||0, c.promo_code||'', c.status,
      c.applied_at ? new Date(c.applied_at).toLocaleDateString('vi-VN') : '',
    ]);
    const csv = [headers,...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`kol-hub-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const totalGMV = creators.reduce((s,c)=>s+parseFloat(c.gmv||0),0);
  const pending = creators.filter(c=>c.status==='applied'||c.status==='pending').length;
  const highPot = creators.filter(c=>c.potential==='high').length;

  const IN = {background:'#fafafa',border:'1px solid #e4e4e7',borderRadius:9,padding:'7px 11px',color:'#0f0f1a',outline:'none',fontSize:13,fontFamily:'inherit'};
  const BP = {background:'#7c3aed',color:'#fff',border:'none',borderRadius:9,padding:'8px 15px',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'};
  const BG = {background:'transparent',color:'#6b7280',border:'1px solid #e4e4e7',borderRadius:9,padding:'8px 13px',fontSize:13,cursor:'pointer',fontFamily:'inherit'};
  const CARD = {background:'#fff',border:'1px solid #f0f0f0',borderRadius:18,padding:'16px 18px',marginBottom:12};
  const TH = {padding:'9px 11px',textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'#a1a1aa',borderBottom:'1px solid #f4f4f5',background:'#fafafa',whiteSpace:'nowrap'};
  const TD = {padding:'10px 11px',borderBottom:'1px solid #fafafa',fontSize:13,verticalAlign:'middle'};

  const Pagination = () => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',borderTop:'1px solid #f4f4f5',background:'#fafafa',borderRadius:'0 0 16px 16px'}}>
      <div style={{fontSize:12,color:'#71717a'}}>{creators.length} / {total} creators</div>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        <button style={{...BG,padding:'5px 11px',fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>←</button>
        <span style={{fontSize:12,fontWeight:600,minWidth:64,textAlign:'center'}}>Trang {page}/{pages}</span>
        <button style={{...BG,padding:'5px 11px',fontSize:12}} onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}>→</button>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>Admin — KOL Hub</title></Head>
      <div style={{display:'flex',minHeight:'100vh',background:'#fafafa'}}>

        {/* Mobile bottom nav */}
        <div className="admin-mob-nav" style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #f0f0f0',zIndex:100,justifyContent:'space-around',padding:'8px 0 12px'}}>
          {[['dash','Dashboard'],['apps','Đơn ĐK'],['campaigns','Chiến dịch'],['creators','Creators']].map(([id,lb]) => (
            <div key={id} onClick={()=>setTab(id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',minWidth:60}}>
              <div style={{width:34,height:34,borderRadius:10,background:tab===id?'#ede9fe':'#f4f4f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:tab===id?'#7c3aed':'#71717a',position:'relative'}}>
                {id==='apps'&&pending>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#ef4444',color:'#fff',fontSize:9,fontWeight:700,width:15,height:15,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{pending}</span>}
                {id[0].toUpperCase()}
              </div>
              <span style={{fontSize:10,fontWeight:tab===id?700:400,color:tab===id?'#7c3aed':'#71717a'}}>{lb}</span>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <aside className="admin-sidebar" style={{width:205,flexShrink:0,background:'#fff',borderRight:'1px solid #f4f4f5',display:'flex',flexDirection:'column',padding:'14px 0'}}>
          <div style={{display:'flex',alignItems:'center',gap:9,padding:'0 13px 13px',borderBottom:'1px solid #f4f4f5',marginBottom:8}}>
            <div style={{width:32,height:32,borderRadius:10,background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:15,fontWeight:900}}>K</div>
            <div><div style={{fontSize:13,fontWeight:800,color:'#0f0f1a'}}>KOL Hub</div><div style={{fontSize:10,color:'#a1a1aa'}}>Admin · 2026</div></div>
          </div>
          {[['dash','Dashboard',''],['apps','Đơn đăng ký',pending],['campaigns','Chiến dịch',''],['creators','Creators','']].map(([id,lb,ba]) => (
            <div key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',margin:'2px 6px',borderRadius:10,fontSize:13,color:tab===id?'#6d28d9':'#6b7280',cursor:'pointer',fontWeight:tab===id?700:400,background:tab===id?'#ede9fe':'transparent',transition:'all .15s'}}>
              <span style={{fontSize:14,width:17,textAlign:'center'}}>{id[0].toUpperCase()}</span>{lb}
              {ba>0&&<span style={{marginLeft:'auto',background:'#fee2e2',color:'#dc2626',fontSize:10,padding:'1px 6px',borderRadius:100,fontWeight:700}}>{ba}</span>}
            </div>
          ))}
          <div style={{marginTop:'auto',padding:'11px 13px',borderTop:'1px solid #f4f4f5'}}>
            <div style={{background:'#0f0f1a',borderRadius:12,padding:13,marginBottom:8}}>
              <div style={{fontSize:10,color:'#c4b5fd',fontWeight:700,letterSpacing:'.05em',marginBottom:3}}>TOTAL GMV</div>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{fM(totalGMV)}</div>
            </div>
            <button onClick={()=>{sessionStorage.removeItem('kol_admin');router.push('/admin');}} style={{...BG,width:'100%',textAlign:'center',fontSize:12}}>Đăng xuất</button>
          </div>
        </aside>

        {/* Main */}
        <main className="admin-main" style={{flex:1,padding:'18px 22px',minWidth:0,overflow:'auto',paddingBottom:80}}>

          {/* DASHBOARD */}
          {tab==='dash'&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
                <div><div style={{fontSize:19,fontWeight:800,letterSpacing:'-.4px'}}>Dashboard</div><div style={{fontSize:12,color:'#a1a1aa',marginTop:1}}>{new Date().toLocaleDateString('vi-VN')}</div></div>
                <div style={{display:'flex',gap:7}}>
                  <button style={BG} onClick={()=>window.open('/','_blank')}>Xem form ↗</button>
                  <button style={BP} onClick={()=>{setTab('campaigns');setCampStep(1);initCf();}}>+ Tạo chiến dịch</button>
                </div>
              </div>
              <div className="grid-4col" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                <Met label="Tổng creators" value={total} />
                <Met label="Chờ duyệt" value={pending} color="#d97706" bg="#fffbeb" />
                <Met label="High potential" value={'⚡ '+highPot} color="#059669" bg="#f0fdf4" />
                <Met label="Total GMV" value={fM(totalGMV)} color="#7c3aed" bg="#faf5ff" />
              </div>
              <div className="grid-2col" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div style={CARD}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:11}}>Top creators GMV</div>
                  {[...creators].sort((a,b)=>b.gmv-a.gmv).slice(0,5).map(c=>{
                    const s=ASC[c.status]||ASC.applied;
                    const pc=PLAT[c.platform]||PLAT.TikTok;
                    return <div key={c.id} onClick={()=>setTab('apps')} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 0',borderBottom:'1px solid #fafafa',cursor:'pointer'}}>
                      <Av name={c.name} size={28} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                        <div style={{fontSize:10,color:'#a1a1aa',marginTop:1}}><span style={{color:pc.c,fontWeight:600}}>{c.platform}</span> · {scV(c).toFixed(2)}{c.potential==='high'?' ⚡':''}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:12,fontWeight:800,color:'#059669'}}>{fM(c.gmv)}</div>
                        <Badge v={s.l} c={s.c} bg={s.bg} style={{fontSize:9}} />
                      </div>
                    </div>;
                  })}
                  {creators.length===0&&<div style={{textAlign:'center',padding:20,color:'#a1a1aa',fontSize:13}}>Chưa có creator nào</div>}
                </div>
                <div style={CARD}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:11}}>Chiến dịch đang chạy</div>
                  {campaigns.filter(c=>c.status==='active').map(c=>{
                    const tot=(c.creators||[]).length*(c.posts_per||2);
                    const dn=(c.creators||[]).reduce((s,cr)=>s+(cr.posts_done||0),0);
                    const pct=tot>0?Math.round(dn/tot*100):0;
                    return <div key={c.id} onClick={()=>setTab('campaigns')} style={{padding:'7px 0',borderBottom:'1px solid #fafafa',cursor:'pointer'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:12,fontWeight:700}}>{c.name}</span><span style={{fontSize:12,fontWeight:800,color:'#7c3aed'}}>{pct}%</span></div>
                      <div style={{height:4,background:'#f4f4f5',borderRadius:100,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:'#7c3aed',borderRadius:100}} /></div>
                    </div>;
                  })}
                  {campaigns.filter(c=>c.status==='active').length===0&&<div style={{textAlign:'center',padding:20,color:'#a1a1aa',fontSize:13}}>Chưa có chiến dịch</div>}
                  <button style={{...BP,marginTop:11,width:'100%',textAlign:'center',fontSize:12}} onClick={()=>{setTab('campaigns');setCampStep(1);initCf();}}>+ Tạo chiến dịch</button>
                </div>
              </div>
            </div>
          )}

          {/* APPLICATIONS */}
          {tab==='apps'&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                <div><div style={{fontSize:19,fontWeight:800,letterSpacing:'-.4px'}}>Đơn đăng ký</div><div style={{fontSize:12,color:'#a1a1aa',marginTop:1}}>{total} creators</div></div>
                <div style={{display:'flex',gap:7}}>
                  <button style={{...BG,fontSize:12}} onClick={exportCSV}>⬇ Export CSV</button>
                  <button style={BG} onClick={()=>window.open('/','_blank')}>Xem form ↗</button>
                </div>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:12,alignItems:'flex-end'}}>
                <div><div style={{fontSize:10,fontWeight:600,color:'#71717a',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Tìm</div><input value={srch} onChange={e=>{setSrch(e.target.value);setPage(1);}} placeholder="Tên, email hoặc SĐT…" style={{...IN,width:165}} /></div>
                {[{l:'Status',v:fSt,set:v=>{setFSt(v);setPage(1);},opts:[['all','Tất cả'],...ALL_STATS.map(s=>[s,ASC[s]?.l||s])]},{l:'Niche',v:fNi,set:v=>{setFNi(v);setPage(1);},opts:[['all','Tất cả'],...NICHES.map(n=>[n.v,n.l])]},{l:'Loại',v:fCt,set:v=>{setFCt(v);setPage(1);},opts:[['all','Tất cả'],...CTYPES.map(c=>[c.v,c.l])]}].map(f=>(
                  <div key={f.l}><div style={{fontSize:10,fontWeight:600,color:'#71717a',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{f.l}</div>
                  <select value={f.v} onChange={e=>f.set(e.target.value)} style={IN}>{f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                ))}
                <button style={{...BG,alignSelf:'flex-end',fontSize:12}} onClick={()=>{setSrch('');setFSt('all');setFNi('all');setFCt('all');setPage(1);}}>Reset</button>
              </div>

              {/* Mobile cards */}
              <div className="mobile-cards">
                {loading?<div style={{textAlign:'center',padding:32,color:'#a1a1aa'}}>Đang tải…</div>:
                 creators.length===0?<div style={{textAlign:'center',padding:32,color:'#a1a1aa'}}>Không có kết quả</div>:
                 creators.map(c=>{
                  const sv=scV(c);
                  const lc=ASC[c.status]||ASC.applied;
                  const pc=PLAT[c.platform]||PLAT.TikTok;
                  return <div key={'m'+c.id} style={{background:'#fff',border:'1px solid #f0f0f0',borderRadius:14,padding:'13px 15px',marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:9}}>
                      <Av name={c.name} size={38} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:800}}>{c.name}</div>
                        <div style={{fontSize:11,color:'#a1a1aa',marginTop:1}}>{c.email||c.phone}</div>
                      </div>
                      <Badge v={lc.l} c={lc.c} bg={lc.bg} />
                    </div>
                    {c.tiktok_link&&<a href={c.tiktok_link.startsWith('http')?c.tiktok_link:'https://'+c.tiktok_link} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f5f3ff',borderRadius:8,padding:'6px 11px',marginBottom:9,fontSize:12,color:'#7c3aed',fontWeight:600,textDecoration:'none'}}>Link: {getUN(c.tiktok_link)}</a>}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,marginBottom:8}}>
                      {[['Followers',fN(c.followers),'#0f0f1a'],['Score',sv.toFixed(2),scC(sv)],['GMV kênh',GMV_L[c.channel_gmv]||'—','#059669']].map(([l,v,co])=>(
                        <div key={l} style={{background:'#fafafa',borderRadius:8,padding:'7px 9px',textAlign:'center'}}>
                          <div style={{fontSize:9,color:'#71717a',fontWeight:700,textTransform:'uppercase'}}>{l}</div>
                          <div style={{fontSize:12,fontWeight:800,color:co,marginTop:1}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:7}}>
                      <Badge v={c.platform} c={pc.c} bg={pc.bg} />
                      <Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5" />
                      {c.phone&&<a href={`tel:${c.phone}`} style={{fontSize:11,fontWeight:700,color:'#0f0f1a',textDecoration:'none',background:'#f4f4f5',borderRadius:6,padding:'2px 8px'}}>📞 {c.phone}</a>}
                    </div>
                    {c.address&&<div style={{fontSize:11,color:'#71717a',marginBottom:7}}>📍 {c.address}</div>}
                    <div style={{display:'flex',gap:6}}>
                      <select style={{flex:1,...IN,fontSize:12,padding:'9px 11px',borderRadius:8,fontWeight:600}} value={c.status} onChange={e=>patch(c.id,{status:e.target.value})}>
                        {ALL_STATS.map(s=><option key={s} value={s}>{ASC[s]?.l||s}</option>)}
                      </select>
                      {(c.status==='applied'||c.status==='pending')&&<button style={{...BP,padding:'9px 14px',fontSize:12,flexShrink:0}} onClick={()=>patch(c.id,{status:'approved'})}>✓ Duyệt</button>}
                    </div>
                  </div>;
                 })}
                <Pagination />
              </div>

              {/* Desktop table */}
              <div className="desktop-table" style={{background:'#fff',border:'1px solid #f0f0f0',borderRadius:16,overflow:'hidden'}}>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
                    <thead><tr>{['Creator','SĐT','Username','Nền tảng','Lĩnh vực','Loại','Followers','Score','Tiềm năng','GMV kênh','Địa chỉ','GMV','Promo','Status'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {loading?<tr><td colSpan={14} style={{...TD,textAlign:'center',padding:32,color:'#a1a1aa'}}>Đang tải…</td></tr>:
                       creators.length===0?<tr><td colSpan={14} style={{...TD,textAlign:'center',padding:32,color:'#a1a1aa'}}>Không có kết quả</td></tr>:
                       creators.map(c=>{
                        const sv=scV(c);
                        const lc=ASC[c.status]||ASC.applied;
                        const pc=PLAT[c.platform]||PLAT.TikTok;
                        const ct=CT[c.content_type]||CT.video;
                        const pt=c.potential==='high'?{l:'⚡ High',c:'#15803d',bg:'#dcfce7'}:c.potential==='medium'?{l:'◈ Med',c:'#c2410c',bg:'#fff7ed'}:null;
                        return <tr key={c.id}>
                          <td style={TD}><div style={{display:'flex',alignItems:'center',gap:8}}><Av name={c.name} size={30} /><div><div style={{fontWeight:700,fontSize:13}}>{c.name}</div><div style={{fontSize:10,color:'#a1a1aa'}}>{c.email||c.phone}</div><div style={{fontSize:10,color:'#a1a1aa'}}>{c.applied_at?new Date(c.applied_at).toLocaleDateString('vi-VN'):''}</div></div></div></td>
                          <td style={TD}>{c.phone?<a href={`tel:${c.phone}`} style={{fontSize:11,fontWeight:700,color:'#0f0f1a',textDecoration:'none',background:'#f4f4f5',borderRadius:6,padding:'2px 8px',whiteSpace:'nowrap'}}>📞 {c.phone}</a>:<span style={{color:'#a1a1aa',fontSize:11}}>—</span>}</td>
                          <td style={TD}><a href={c.tiktok_link?(c.tiktok_link.startsWith('http')?c.tiktok_link:'https://'+c.tiktok_link):'#'} target="_blank" rel="noreferrer" style={{fontSize:12,fontWeight:700,color:'#7c3aed',textDecoration:'none',background:'#f5f3ff',borderRadius:7,padding:'2px 8px',display:'inline-block',whiteSpace:'nowrap'}}>{getUN(c.tiktok_link)}</a></td>
                          <td style={TD}><Badge v={c.platform} c={pc.c} bg={pc.bg} /></td>
                          <td style={TD}><Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5" /></td>
                          <td style={TD}><Badge v={ct.l} c={ct.c} bg={ct.bg} /></td>
                          <td style={{...TD,fontWeight:800}}>{fN(c.followers)}</td>
                          <td style={TD}><span style={{fontSize:14,fontWeight:900,color:scC(sv)}}>{sv.toFixed(2)}</span></td>
                          <td style={TD}>{pt?<Badge v={pt.l} c={pt.c} bg={pt.bg} />:<span style={{color:'#a1a1aa',fontSize:11}}>—</span>}</td>
                          <td style={TD}><span style={{fontSize:11,fontWeight:600,color:c.channel_gmv?'#059669':'#a1a1aa'}}>{GMV_L[c.channel_gmv]||'—'}</span></td>
                          <td style={TD}><span style={{fontSize:11,color:'#374151',maxWidth:120,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.address||'—'}</span></td>
                          <td style={TD}>
                            {eGmv.id===c.id
                              ?<div style={{display:'flex',gap:3}}><input type="number" defaultValue={eGmv.v} id={`g${c.id}`} style={{...IN,width:75,padding:'4px 8px'}} /><button style={{...BP,padding:'4px 9px',fontSize:11}} onClick={()=>{patch(c.id,{gmv:parseFloat(document.getElementById(`g${c.id}`).value)||0});setEGmv({id:null,v:''});}}>✓</button><button style={{...BG,padding:'4px 8px',fontSize:11}} onClick={()=>setEGmv({id:null,v:''})}>✕</button></div>
                              :<span onClick={()=>setEGmv({id:c.id,v:String(c.gmv||0)})} style={{cursor:'pointer',fontSize:12,fontWeight:800,color:c.gmv>0?'#059669':'#a1a1aa'}}>{c.gmv>0?fM(c.gmv):'+ GMV'}</span>}
                          </td>
                          <td style={TD}>
                            {ePrm.id===c.id
                              ?<div style={{display:'flex',gap:3}}><input defaultValue={ePrm.v} id={`p${c.id}`} placeholder="CODE" style={{...IN,width:80,padding:'4px 8px',letterSpacing:'.04em'}} /><button style={{...BP,padding:'4px 9px',fontSize:11}} onClick={()=>{patch(c.id,{promo_code:document.getElementById(`p${c.id}`).value});setEPrm({id:null,v:''});}}>✓</button><button style={{...BG,padding:'4px 8px',fontSize:11}} onClick={()=>setEPrm({id:null,v:''})}>✕</button></div>
                              :<span onClick={()=>setEPrm({id:c.id,v:c.promo_code||''})} style={{cursor:'pointer',fontSize:12,fontWeight:700,color:c.promo_code?'#7c3aed':'#a1a1aa'}}>{c.promo_code||'+ Promo'}</span>}
                          </td>
                          <td style={TD}>
                            <div style={{display:'flex',flexDirection:'column',gap:4}}>
                              <Badge v={lc.l} c={lc.c} bg={lc.bg} />
                              <select style={{...IN,fontSize:11,padding:'3px 7px',borderRadius:7,width:'auto'}} value={c.status} onChange={e=>patch(c.id,{status:e.target.value})}>
                                {ALL_STATS.map(s=><option key={s} value={s}>{ASC[s]?.l||s}</option>)}
                              </select>
                            </div>
                          </td>
                        </tr>;
                       })}
                    </tbody>
                  </table>
                </div>
                <Pagination />
              </div>
            </div>
          )}

          {/* CAMPAIGNS + CREATORS tabs (reuse existing code) */}
          {tab==='campaigns'&&campStep===0&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div><div style={{fontSize:19,fontWeight:800,letterSpacing:'-.4px'}}>Chiến dịch</div><div style={{fontSize:12,color:'#a1a1aa',marginTop:1}}>{campaigns.length} chiến dịch</div></div>
                <button style={BP} onClick={()=>{setCampStep(1);initCf();}}>+ Tạo chiến dịch</button>
              </div>
              {campaigns.length===0?<div style={{...CARD,textAlign:'center',padding:48}}><div style={{color:'#a1a1aa',fontSize:14,marginBottom:14}}>Chưa có chiến dịch</div><button style={BP} onClick={()=>{setCampStep(1);initCf();}}>Tạo ngay</button></div>:
               campaigns.map(c=>{
                const tot=(c.creators||[]).length*(c.posts_per||2);
                const dn=(c.creators||[]).reduce((s,cr)=>s+(cr.posts_done||0),0);
                const pct=tot>0?Math.round(dn/tot*100):0;
                return <div key={c.id} style={CARD}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:11,flexWrap:'wrap',gap:7}}>
                    <div><div style={{fontSize:14,fontWeight:800}}>{c.name}</div><div style={{fontSize:11,color:'#a1a1aa',marginTop:2}}>{c.product} · {c.end_date}</div></div>
                    <select style={{...IN,fontSize:11,padding:'5px 8px',width:'auto',borderRadius:8}} value={c.status} onChange={e=>patchCamp(c.id,{status:e.target.value})}>
                      <option value="active">Đang chạy</option><option value="paused">Tạm dừng</option><option value="completed">Hoàn thành</option>
                    </select>
                  </div>
                  <div style={{height:5,background:'#f4f4f5',borderRadius:100,overflow:'hidden',marginBottom:5}}><div style={{height:'100%',width:`${pct}%`,background:'#7c3aed',borderRadius:100}} /></div>
                  <div style={{fontSize:11,color:'#a1a1aa'}}>{dn}/{tot} bài · {pct}%</div>
                </div>;
               })}
            </div>
          )}

          {tab==='campaigns'&&campStep>0&&(
            <div style={{maxWidth:560}}>
              <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:16}}>
                <button style={BG} onClick={()=>setCampStep(0)}>← Huỷ</button>
                <div style={{fontSize:16,fontWeight:800}}>Tạo chiến dịch mới — bước {campStep}/4</div>
              </div>
              <div style={{...CARD,padding:'18px 20px'}}>
                {campStep===1&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:2}}>Thông tin chiến dịch</div>
                  <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>Tên *</label><input style={IN} value={cf.name||''} onChange={e=>setCf(p=>({...p,name:e.target.value}))} placeholder="VD: Ra mắt Son Velvet 2026" /></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>Bắt đầu</label><input type="date" style={IN} value={cf.start_date||''} onChange={e=>setCf(p=>({...p,start_date:e.target.value}))} /></div>
                    <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>Deadline</label><input type="date" style={IN} value={cf.end_date||''} onChange={e=>setCf(p=>({...p,end_date:e.target.value}))} /></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>Budget (VNĐ)</label><input type="number" style={IN} value={cf.budget||''} onChange={e=>setCf(p=>({...p,budget:e.target.value}))} placeholder="50000000" /></div>
                    <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>Sản phẩm</label><input style={IN} value={cf.product||''} onChange={e=>setCf(p=>({...p,product:e.target.value}))} placeholder="Son Velvet No.12" /></div>
                  </div>
                  <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>Mục tiêu</label><textarea style={{...IN,resize:'none',lineHeight:1.6,width:'100%'}} rows={2} value={cf.goal||''} onChange={e=>setCf(p=>({...p,goal:e.target.value}))} placeholder="1M views trong 30 ngày…" /></div>
                </div>}
                {campStep===2&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:2}}>Brief & Yêu cầu</div>
                  {[['brief','Brief tổng quan','Mô tả sản phẩm, thông điệp…',3],['req','Yêu cầu nội dung','VD: 2 video TikTok 30-60s…',3],['note','Lưu ý','Điều cần tránh…',2]].map(([k,l,ph,r])=>(
                    <div key={k}><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>{l}</label><textarea style={{...IN,resize:'none',lineHeight:1.6,width:'100%'}} rows={r} value={cf[k]||''} onChange={e=>setCf(p=>({...p,[k]:e.target.value}))} placeholder={ph} /></div>
                  ))}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>Định dạng</label>
                    <select style={{...IN,width:'100%'}} value={cf.format||''} onChange={e=>setCf(p=>({...p,format:e.target.value}))}>
                      {['TikTok video (15-60s)','TikTok video (60-180s)','TikTok Live','Facebook Reels','Facebook Live','Shopee Video','Shopee Live','Đa nền tảng'].map(f=><option key={f}>{f}</option>)}
                    </select></div>
                    <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:5}}>Số bài/creator</label><input type="number" style={IN} value={cf.posts_per||2} onChange={e=>setCf(p=>({...p,posts_per:parseInt(e.target.value)||1}))} /></div>
                  </div>
                </div>}
                {campStep===3&&<div>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:6}}>Chọn creators ({sel.length} đã chọn)</div>
                  <div style={{display:'flex',flexWrap:'wrap'}}>
                    {creators.filter(c=>c.status==='approved'||c.status==='sample_sent').map(c=>{
                      const on=sel.includes(c.id);
                      return <div key={c.id} onClick={()=>setSel(p=>p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])} style={{display:'inline-flex',alignItems:'center',gap:7,border:`${on?'1.5px solid #7c3aed':'1px solid #e4e4e7'}`,background:on?'#f5f3ff':'#fff',borderRadius:10,padding:'6px 11px',margin:3,cursor:'pointer',transition:'all .15s'}}>
                        <Av name={c.name} size={20} />
                        <div><div style={{fontSize:11,fontWeight:700}}>{c.name}</div><div style={{fontSize:10,color:'#a1a1aa'}}>{scV(c).toFixed(2)}</div></div>
                      </div>;
                    })}
                    {creators.filter(c=>c.status==='approved'||c.status==='sample_sent').length===0&&<div style={{color:'#a1a1aa',fontSize:13,padding:12}}>Chưa có creator được duyệt.</div>}
                  </div>
                </div>}
                {campStep===4&&<div>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:11}}>Xác nhận chiến dịch</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                    {[['Tên',cf.name],['Sản phẩm',cf.product],['Thời gian',`${cf.start_date} → ${cf.end_date}`],['Budget',cf.budget?parseInt(cf.budget).toLocaleString('vi-VN')+'đ':'—']].map(([l,v])=>(
                      <div key={l} style={{background:'#faf5ff',border:'1px solid #ede9fe',borderRadius:10,padding:'10px 12px'}}><div style={{fontSize:10,color:'#7c3aed',fontWeight:700,marginBottom:2}}>{l}</div><div style={{fontSize:12,fontWeight:700}}>{v||'—'}</div></div>
                    ))}
                  </div>
                  <div style={{background:'#faf5ff',border:'1px solid #ede9fe',borderRadius:10,padding:'10px 12px'}}><div style={{fontSize:10,color:'#7c3aed',fontWeight:700,marginBottom:5}}>{sel.length} creators đã chọn</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>{creators.filter(c=>sel.includes(c.id)).map(c=><Badge key={c.id} v={c.name} c="#6d28d9" bg="#ede9fe" />)}</div></div>
                </div>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                {campStep>1?<button style={BG} onClick={()=>setCampStep(s=>s-1)}>← Quay lại</button>:<div/>}
                {campStep<4?<button style={BP} onClick={()=>{if(campStep===1&&!cf.name){alert('Điền tên chiến dịch');return;}setCampStep(s=>s+1);}}>Tiếp theo →</button>:<button style={{...BP,padding:'11px 24px',fontSize:14}} onClick={createCamp}>Tạo chiến dịch ✓</button>}
              </div>
            </div>
          )}

          {tab==='creators'&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div><div style={{fontSize:19,fontWeight:800,letterSpacing:'-.4px'}}>Creators</div><div style={{fontSize:12,color:'#a1a1aa',marginTop:1}}>{total} đã đăng ký</div></div>
                <button style={BG} onClick={()=>window.open('/','_blank')}>Trang đăng ký ↗</button>
              </div>
              <div style={{background:'#fff',border:'1px solid #f0f0f0',borderRadius:16,overflow:'hidden'}}>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:620}}>
                    <thead><tr>{['Creator','Nền tảng','Lĩnh vực','Loại','Followers','Score','Tiềm năng','Status'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {loading?<tr><td colSpan={8} style={{...TD,textAlign:'center',padding:32,color:'#a1a1aa'}}>Đang tải…</td></tr>:
                       creators.map(c=>{
                        const sv=scV(c);
                        const pc=PLAT[c.platform]||PLAT.TikTok;
                        const ct=CT[c.content_type]||CT.video;
                        const lc=ASC[c.status]||ASC.applied;
                        const pt=c.potential==='high'?{l:'⚡ High',c:'#15803d',bg:'#dcfce7'}:c.potential==='medium'?{l:'◈ Med',c:'#c2410c',bg:'#fff7ed'}:null;
                        return <tr key={c.id}>
                          <td style={TD}><div style={{display:'flex',alignItems:'center',gap:8}}><Av name={c.name} size={28} /><div><div style={{fontWeight:700,fontSize:13}}>{c.name}</div><div style={{fontSize:10,color:'#a1a1aa'}}>{c.email||c.phone}</div></div></div></td>
                          <td style={TD}><Badge v={c.platform} c={pc.c} bg={pc.bg} /></td>
                          <td style={TD}><Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5" /></td>
                          <td style={TD}><Badge v={ct.l} c={ct.c} bg={ct.bg} /></td>
                          <td style={{...TD,fontWeight:800}}>{fN(c.followers)}</td>
                          <td style={TD}><span style={{fontSize:14,fontWeight:900,color:scC(sv)}}>{sv.toFixed(2)}</span></td>
                          <td style={TD}>{pt?<Badge v={pt.l} c={pt.c} bg={pt.bg} />:<span style={{color:'#a1a1aa',fontSize:11}}>—</span>}</td>
                          <td style={TD}><Badge v={lc.l} c={lc.c} bg={lc.bg} /></td>
                        </tr>;
                       })}
                    </tbody>
                  </table>
                </div>
                <Pagination />
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
