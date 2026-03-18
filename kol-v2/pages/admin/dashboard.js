import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// ── constants ──────────────────────────────────────────────
const LIFECYCLE = {
  applied:         { l:'Applied',         c:'#92400e', bg:'#fef3c7' },
  approved:        { l:'Approved',        c:'#065f46', bg:'#dcfce7' },
  rejected:        { l:'Từ chối',         c:'#991b1b', bg:'#fee2e2' },
  sample_sent:     { l:'Sample Sent',     c:'#1e40af', bg:'#dbeafe' },
  content_posted:  { l:'Content Posted',  c:'#6d28d9', bg:'#ede9fe' },
  scaling:         { l:'⚡ Scaling',       c:'#065f46', bg:'#d1fae5' },
  inactive:        { l:'Inactive',        c:'#71717a', bg:'#f4f4f5' },
  in_campaign:     { l:'Trong CĐ',       c:'#1e40af', bg:'#dbeafe' },
};
const STATUSES = Object.keys(LIFECYCLE);
const NICHES = [{v:'lam_dep',l:'Làm đẹp'},{v:'nha_cua',l:'Nhà cửa'},{v:'cong_nghe',l:'Đồ công nghệ'},{v:'thoi_trang',l:'Thời trang'}];
const CTYPES  = [{v:'video',l:'Video'},{v:'livestream',l:'Livestream'},{v:'both',l:'Cả hai'}];
const PLAT = { TikTok:{c:'#1d4ed8',bg:'#dbeafe'}, Facebook:{c:'#1e40af',bg:'#eff6ff'}, Shopee:{c:'#c2410c',bg:'#fff7ed'} };
const CT   = { video:{l:'Video',c:'#1d4ed8',bg:'#dbeafe'}, livestream:{l:'Livestream',c:'#be185d',bg:'#fce7f3'}, both:{l:'Video+Live',c:'#059669',bg:'#dcfce7'} };
const TRACK = ['Chờ xác nhận','Đã xác nhận','Đang làm content','Content Posted','Đã thanh toán'];
const GMV_RANGES = [{l:'Tất cả',min:'',max:''},{l:'< 10M',min:'',max:'10000000'},{l:'10-50M',min:'10000000',max:'50000000'},{l:'50-100M',min:'50000000',max:'100000000'},{l:'> 100M',min:'100000000',max:''}];

// ── helpers ────────────────────────────────────────────────
const fN = n => Math.round(n||0).toLocaleString('vi-VN');
const fM = n => { const v=Math.round(n||0); return v>=1000000000?(v/1000000000).toFixed(1)+'B':v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'K':String(v); };
const fVND = n => n ? fM(n)+'đ' : '—';
const scV = c => c.followers?(c.avg_views/c.followers).toFixed(2):'0.00';
const scC = s => { const v=parseFloat(s); return v>=0.3?'#059669':v>=0.15?'#d97706':'#ef4444'; };
const nL  = v => NICHES.find(n=>n.v===v)?.l||v;

// ── UI atoms ───────────────────────────────────────────────
const Badge=({v,c,bg,style={}})=><span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:600,color:c,background:bg,...style}}>{v}</span>;
const Av=({name,size=32})=>{
  const colors=['#7c3aed','#0ea5e9','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899'];
  const c=colors[name.charCodeAt(0)%colors.length];
  return <div style={{width:size,height:size,borderRadius:'50%',background:c,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.round(size*.4),fontWeight:800,flexShrink:0}}>{name[0]}</div>;
};
const Met=({label,value,color='#0f0f1a',bg='#fafafa'})=>(
  <div style={{background:bg,border:'1px solid #f0f0f0',borderRadius:16,padding:'14px 16px'}}>
    <div style={{fontSize:11,fontWeight:600,color:'#71717a',marginBottom:5,textTransform:'uppercase',letterSpacing:'.05em'}}>{label}</div>
    <div style={{fontSize:22,fontWeight:800,color,letterSpacing:'-.5px'}}>{value}</div>
  </div>
);

// ── main ───────────────────────────────────────────────────
export default function Dashboard(){
  const router=useRouter();
  const [tab,setTab]=useState('dash');
  const [creators,setCreators]=useState([]);
  const [camps,setCamps]=useState([]);
  const [loading,setLoading]=useState(true);
  const [total,setTotal]=useState(0);
  const [pages,setPages]=useState(1);
  const [page,setPage]=useState(1);
  const [fSt,setFSt]=useState('all');
  const [fNi,setFNi]=useState('all');
  const [fCt,setFCt]=useState('all');
  const [fGmv,setFGmv]=useState(0);
  const [srch,setSrch]=useState('');
  const [sort,setSort]=useState('applied_at');
  const [order,setOrder]=useState('desc');
  const [editing,setEditing]=useState({});
  const [campStep,setCampStep]=useState(0);
  const [cf,setCf]=useState({});
  const [sel,setSel]=useState([]);
  const [showVideo,setShowVideo]=useState(null);

  useEffect(()=>{
    if(typeof window!=='undefined'&&!sessionStorage.getItem('kol_admin')) router.replace('/admin');
  },[router]);

  const loadCreators=useCallback(async()=>{
    setLoading(true);
    try{
      const range=GMV_RANGES[fGmv];
      const params=new URLSearchParams({page,sort,order});
      if(fSt!=='all') params.set('status',fSt);
      if(fNi!=='all') params.set('niche',fNi);
      if(fCt!=='all') params.set('ct',fCt);
      if(srch) params.set('search',srch);
      if(range.min) params.set('gmv_min',range.min);
      if(range.max) params.set('gmv_max',range.max);
      const r=await fetch('/api/creators?'+params);
      const d=await r.json();
      setCreators(d.creators||[]);
      setTotal(d.total||0);
      setPages(d.pages||1);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  },[page,sort,order,fSt,fNi,fCt,fGmv,srch]);

  const loadCamps=useCallback(async()=>{
    try{ const r=await fetch('/api/campaigns'); const d=await r.json(); setCamps(d.campaigns||[]); }catch{}
  },[]);

  useEffect(()=>{ loadCreators(); },[loadCreators]);
  useEffect(()=>{ loadCamps(); },[loadCamps]);

  const patch=async(id,body)=>{
    await fetch(`/api/creators/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    loadCreators();
  };
  const patchCamp=async(id,body)=>{
    await fetch(`/api/campaigns/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    loadCamps();
  };
  const quickAction=async(id,status)=>{ await patch(id,{status}); };

  const initCf=()=>{
    const today=new Date().toISOString().slice(0,10);
    const end=new Date(Date.now()+30*864e5).toISOString().slice(0,10);
    setCf({name:'',product:'',start_date:today,end_date:end,budget:'',goal:'',brief:'',req:'',format:'TikTok video (15-60s)',content_type:'video',posts_per:2,slots:10,note:''});
    setSel([]);
  };
  const createCamp=async()=>{
    await fetch('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...cf,creator_ids:sel})});
    setCampStep(0);setSel([]);setCf({});setTab('campaigns');loadCamps();loadCreators();
  };
  const toggleSort=col=>{ if(sort===col) setOrder(o=>o==='desc'?'asc':'desc'); else{setSort(col);setOrder('desc');}  setPage(1); };
  const sortIcon=col=>sort===col?(order==='desc'?'↓':'↑'):'↕';

  const totalGMV=creators.reduce((s,c)=>s+parseFloat(c.gmv||0),0);
  const totalRev=creators.reduce((s,c)=>s+parseFloat(c.revenue_generated||0),0);
  const pending=creators.filter(c=>c.status==='applied').length;
  const active=creators.filter(c=>['approved','sample_sent','content_posted','scaling'].includes(c.status)).length;
  const topCreators=[...creators].sort((a,b)=>b.revenue_generated-a.revenue_generated).slice(0,10);

  // ── styles ──────────────────────────────────────────────
  const IN={background:'#fafafa',border:'1.5px solid #e4e4e7',borderRadius:10,padding:'8px 11px',color:'#0f0f1a',outline:'none',fontSize:13,fontFamily:'inherit'};
  const BP={background:'#7c3aed',color:'#fff',border:'none',borderRadius:10,padding:'8px 16px',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit'};
  const BG={background:'transparent',color:'#6b7280',border:'1.5px solid #e4e4e7',borderRadius:10,padding:'8px 14px',fontSize:13,cursor:'pointer',fontFamily:'inherit'};
  const BG_SM={...BG,padding:'5px 10px',fontSize:12,borderRadius:8};
  const CARD={background:'#fff',border:'1px solid #f0f0f0',borderRadius:20,padding:'16px 18px',marginBottom:12};
  const TH={padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'#a1a1aa',borderBottom:'1px solid #f4f4f5',background:'#fafafa',whiteSpace:'nowrap',cursor:'pointer',userSelect:'none'};
  const TD={padding:'10px 12px',borderBottom:'1px solid #fafafa',fontSize:13,verticalAlign:'middle'};
  const selBtnS=(on)=>({border:`2px solid ${on?'#7c3aed':'#e4e4e7'}`,background:on?'#f5f3ff':'#fff',borderRadius:14,padding:'11px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:5,cursor:'pointer',textAlign:'center',transition:'all .18s'});

  // ── quick action bar ──────────────────────────────────────
  const QA=({c})=>{
    const btns=[];
    if(c.status==='applied')        btns.push({l:'✓ Duyệt',   s:'approved',   bg:'#059669'});
    if(c.status==='applied')        btns.push({l:'✕ Từ chối', s:'rejected',   bg:'#ef4444'});
    if(c.status==='approved')       btns.push({l:'📦 Sample', s:'sample_sent',bg:'#7c3aed'});
    if(c.status==='sample_sent')    btns.push({l:'📸 Posted', s:'content_posted',bg:'#6d28d9'});
    if(c.status==='content_posted') btns.push({l:'🚀 Scale',  s:'scaling',    bg:'#0ea5e9'});
    return(
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        {btns.map(b=>(
          <button key={b.s} style={{...BG_SM,background:b.bg,color:'#fff',border:'none',padding:'5px 10px'}} onClick={()=>quickAction(c.id,b.s)}>{b.l}</button>
        ))}
        <button style={{...BG_SM,fontSize:11}} onClick={()=>setShowVideo(c.id===showVideo?null:c.id)}>🎬</button>
      </div>
    );
  };

  // ── Pagination ────────────────────────────────────────────
  const Pagination=()=>(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderTop:'1px solid #f4f4f5',background:'#fafafa',borderRadius:'0 0 18px 18px'}}>
      <div style={{fontSize:12,color:'#71717a'}}>Hiển thị {creators.length} / {total} creators</div>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        <button style={{...BG,padding:'5px 12px',fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Trước</button>
        <span style={{fontSize:12,fontWeight:600,color:'#0f0f1a',minWidth:60,textAlign:'center'}}>Trang {page}/{pages}</span>
        <button style={{...BG,padding:'5px 12px',fontSize:12}} onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}>Sau →</button>
      </div>
    </div>
  );

  return(
    <>
      <Head><title>Admin Dashboard — KOL Hub</title></Head>
      <div style={{display:'flex',minHeight:'100vh',background:'#fafafa'}}>

        {/* Mobile nav */}
        <div className="admin-mob-nav" style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #f0f0f0',zIndex:100,justifyContent:'space-around',padding:'8px 0 12px'}}>
          {[['dash','◈','Dashboard'],['apps','◉','Đơn ĐK'],['campaigns','◇','Chiến dịch'],['creators','◆','Creators']].map(([id,ic,lb])=>(
            <div key={id} onClick={()=>setTab(id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',minWidth:60}}>
              <div style={{width:36,height:36,borderRadius:12,background:tab===id?'#ede9fe':'#f4f4f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:tab===id?'#7c3aed':'#71717a',position:'relative'}}>
                {ic}
                {id==='apps'&&pending>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#ef4444',color:'#fff',fontSize:9,fontWeight:700,width:16,height:16,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{pending}</span>}
              </div>
              <span style={{fontSize:10,fontWeight:tab===id?700:400,color:tab===id?'#7c3aed':'#71717a'}}>{lb}</span>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <aside className="admin-sidebar" style={{width:210,flexShrink:0,background:'#fff',borderRight:'1px solid #f4f4f5',display:'flex',flexDirection:'column',padding:'14px 0'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 14px 14px',borderBottom:'1px solid #f4f4f5',marginBottom:8}}>
            <div style={{width:34,height:34,borderRadius:11,background:'linear-gradient(135deg,#7c3aed,#c084fc)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:16,fontWeight:900}}>K</div>
            <div><div style={{fontSize:14,fontWeight:800,color:'#0f0f1a',letterSpacing:'-.3px'}}>KOL Hub</div><div style={{fontSize:10,color:'#a1a1aa',fontWeight:600}}>Admin · 2026</div></div>
          </div>
          {[['dash','◈','Dashboard',''],['apps','◉','Đơn đăng ký',pending],['campaigns','◇','Chiến dịch',''],['creators','◆','Creators','']].map(([id,ic,lb,ba])=>(
            <div key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:9,padding:'10px 13px',margin:'2px 7px',borderRadius:12,fontSize:13,color:tab===id?'#6d28d9':'#6b7280',cursor:'pointer',fontWeight:tab===id?700:400,background:tab===id?'#ede9fe':'transparent',transition:'all .15s'}}>
              <span style={{fontSize:15,width:18,textAlign:'center'}}>{ic}</span>{lb}
              {ba>0&&<span style={{marginLeft:'auto',background:'#fee2e2',color:'#dc2626',fontSize:10,padding:'2px 7px',borderRadius:100,fontWeight:700}}>{ba}</span>}
            </div>
          ))}
          <div style={{marginTop:'auto',padding:'12px 14px',borderTop:'1px solid #f4f4f5'}}>
            <div style={{background:'linear-gradient(135deg,#0f0f1a,#1e1040)',borderRadius:14,padding:14,marginBottom:8}}>
              <div style={{fontSize:10,color:'#c4b5fd',fontWeight:700,letterSpacing:'.05em',marginBottom:3}}>TOTAL REVENUE</div>
              <div style={{fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.5px'}}>{fM(totalRev)}đ</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.4)',marginTop:2}}>GMV: {fM(totalGMV)}đ</div>
            </div>
            <button onClick={()=>{sessionStorage.removeItem('kol_admin');router.push('/admin');}} style={{...BG,width:'100%',textAlign:'center',fontSize:12}}>Đăng xuất</button>
          </div>
        </aside>

        {/* Main */}
        <main className="admin-main" style={{flex:1,padding:'20px 24px',minWidth:0,overflow:'auto',paddingBottom:80}}>

          {/* ── DASHBOARD ── */}
          {tab==='dash'&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:20,fontWeight:800,color:'#0f0f1a',letterSpacing:'-.5px'}}>Dashboard</div>
                  <div style={{fontSize:12,color:'#a1a1aa',marginTop:2}}>{new Date().toLocaleDateString('vi-VN')}</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button style={BG} onClick={()=>window.open('/','_blank')}>Xem form ↗</button>
                  <button style={BP} onClick={()=>{setTab('campaigns');setCampStep(1);initCf();}}>+ Tạo chiến dịch</button>
                </div>
              </div>
              <div className="grid-4col" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                <Met label="Tổng creators" value={total}/>
                <Met label="Active" value={active} color="#059669" bg="#f0fdf4"/>
                <Met label="Chờ duyệt" value={pending} color="#d97706" bg="#fffbeb"/>
                <Met label="Total Revenue" value={fVND(totalRev)} color="#7c3aed" bg="#faf5ff"/>
              </div>
              <div className="grid-2col" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div style={CARD}>
                  <div style={{fontSize:14,fontWeight:800,marginBottom:12}}>Top 10 Creators Revenue</div>
                  {topCreators.length===0&&<div style={{color:'#a1a1aa',fontSize:13,textAlign:'center',padding:20}}>Chưa có data</div>}
                  {topCreators.map((c,i)=>{
                    const lc=LIFECYCLE[c.status]||LIFECYCLE.applied;
                    return(
                      <div key={c.id} onClick={()=>setTab('apps')} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #fafafa',cursor:'pointer'}}>
                        <div style={{width:20,fontSize:11,fontWeight:800,color:i<3?'#7c3aed':'#a1a1aa',flexShrink:0}}>#{i+1}</div>
                        <Av name={c.name} size={28}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                          <div style={{fontSize:10,color:'#a1a1aa'}}>KOC score: <span style={{color:scC(c.koc_score||0),fontWeight:700}}>{parseFloat(c.koc_score||0).toFixed(2)}</span></div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:12,fontWeight:800,color:'#059669'}}>{fVND(c.revenue_generated)}</div>
                          <Badge v={lc.l} c={lc.c} bg={lc.bg} style={{fontSize:9}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={CARD}>
                  <div style={{fontSize:14,fontWeight:800,marginBottom:12}}>Chiến dịch đang chạy</div>
                  {camps.filter(c=>c.status==='active').map(c=>{
                    const tot=(c.creators||[]).length*(c.posts_per||2);
                    const dn=(c.creators||[]).reduce((s,cr)=>s+(cr.posts_done||0),0);
                    const pct=tot>0?Math.round(dn/tot*100):0;
                    return(
                      <div key={c.id} onClick={()=>setTab('campaigns')} style={{padding:'8px 0',borderBottom:'1px solid #fafafa',cursor:'pointer'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                          <span style={{fontSize:12,fontWeight:700}}>{c.name}</span>
                          <span style={{fontSize:12,fontWeight:800,color:'#7c3aed'}}>{pct}%</span>
                        </div>
                        <div style={{height:5,background:'#f4f4f5',borderRadius:100,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#7c3aed,#c084fc)',borderRadius:100}}/>
                        </div>
                      </div>
                    );
                  })}
                  {camps.filter(c=>c.status==='active').length===0&&<div style={{color:'#a1a1aa',fontSize:13,textAlign:'center',padding:20}}>Chưa có chiến dịch</div>}
                  <button style={{...BP,marginTop:12,width:'100%',textAlign:'center'}} onClick={()=>{setTab('campaigns');setCampStep(1);initCf();}}>+ Tạo chiến dịch</button>
                </div>
              </div>
            </div>
          )}

          {/* ── APPLICATIONS ── */}
          {tab==='apps'&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
                <div><div style={{fontSize:20,fontWeight:800,color:'#0f0f1a',letterSpacing:'-.5px'}}>Đơn đăng ký</div><div style={{fontSize:12,color:'#a1a1aa',marginTop:2}}>{total} creators</div></div>
                <button style={BG} onClick={()=>window.open('/','_blank')}>Xem form ↗</button>
              </div>
              {/* Filters */}
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14,alignItems:'flex-end'}}>
                <div><div style={{fontSize:11,fontWeight:600,color:'#71717a',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Tìm</div><input value={srch} onChange={e=>{setSrch(e.target.value);setPage(1);}} placeholder="Tên hoặc email…" style={{...IN,width:155}}/></div>
                {[{l:'Status',v:fSt,set:v=>{setFSt(v);setPage(1);},opts:[['all','Tất cả'],...STATUSES.map(s=>[s,LIFECYCLE[s]?.l||s])]},
                  {l:'Niche',v:fNi,set:v=>{setFNi(v);setPage(1);},opts:[['all','Tất cả'],...NICHES.map(n=>[n.v,n.l])]},
                  {l:'Loại',v:fCt,set:v=>{setFCt(v);setPage(1);},opts:[['all','Tất cả'],...CTYPES.map(c=>[c.v,c.l])]},
                ].map(f=>(
                  <div key={f.l}><div style={{fontSize:11,fontWeight:600,color:'#71717a',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{f.l}</div>
                  <select value={f.v} onChange={e=>f.set(e.target.value)} style={IN}>{f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                ))}
                <div><div style={{fontSize:11,fontWeight:600,color:'#71717a',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>GMV Range</div>
                <select value={fGmv} onChange={e=>{setFGmv(parseInt(e.target.value));setPage(1);}} style={IN}>
                  {GMV_RANGES.map((r,i)=><option key={i} value={i}>{r.l}</option>)}
                </select></div>
                <button style={{...BG,alignSelf:'flex-end'}} onClick={()=>{setSrch('');setFSt('all');setFNi('all');setFCt('all');setFGmv(0);setPage(1);}}>Reset</button>
              </div>

              {/* Mobile cards */}
              <div className="mobile-cards">
                {loading?<div style={{textAlign:'center',padding:36,color:'#a1a1aa'}}>Đang tải…</div>:
                 creators.length===0?<div style={{textAlign:'center',padding:36,color:'#a1a1aa'}}>Không có kết quả</div>:
                 creators.map(c=>{
                  const sv=scV(c);
                  const lc=LIFECYCLE[c.status]||LIFECYCLE.applied;
                  const pc=PLAT[c.platform]||PLAT.TikTok;
                  return(
                    <div key={c.id} style={{background:'#fff',border:'1px solid #f0f0f0',borderRadius:16,padding:'14px 16px',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                        <Av name={c.name} size={40}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:800}}>{c.name}</div>
                          <div style={{fontSize:11,color:'#a1a1aa',marginTop:1}}>{c.email}</div>
                        </div>
                        <Badge v={lc.l} c={lc.c} bg={lc.bg}/>
                      </div>
                      {c.tiktok_link&&<a href={c.tiktok_link.startsWith('http')?c.tiktok_link:'https://'+c.tiktok_link} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:7,background:'#f5f3ff',borderRadius:10,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#7c3aed',fontWeight:600,textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🔗 {c.tiktok_link}</a>}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                        {[['Followers',fN(c.followers),'#0f0f1a'],['Score',sv,scC(sv)],['KOC',parseFloat(c.koc_score||0).toFixed(2),'#7c3aed']].map(([l,v,co])=>(
                          <div key={l} style={{background:'#fafafa',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
                            <div style={{fontSize:9,color:'#71717a',fontWeight:700,marginBottom:2,textTransform:'uppercase'}}>{l}</div>
                            <div style={{fontSize:13,fontWeight:800,color:co}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                        <Badge v={c.platform} c={pc.c} bg={pc.bg}/>
                        <Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5"/>
                      </div>
                      {c.address&&<div style={{fontSize:11,color:'#71717a',marginBottom:8}}>📍 {c.address}</div>}
                      {c.expected_monthly_gmv&&<div style={{fontSize:11,color:'#059669',marginBottom:8}}>💰 GMV kỳ vọng: {fVND(c.expected_monthly_gmv)}/tháng</div>}
                      <QA c={c}/>
                    </div>
                  );
                 })}
                <Pagination/>
              </div>

              {/* Desktop table */}
              <div className="desktop-table" style={{background:'#fff',border:'1px solid #f0f0f0',borderRadius:18,overflow:'hidden'}}>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:1100}}>
                    <thead>
                      <tr>
                        {[['Creator',''],['Link',''],['Nền tảng',''],['Niche',''],['Loại',''],
                          ['Followers','followers'],['Avg Views','avg_views'],
                          ['Score','koc_score'],['GMV kỳ vọng','expected_monthly_gmv'],
                          ['Revenue','revenue_generated'],['Địa chỉ',''],['Actions',''],['Status','']
                        ].map(([h,col])=>(
                          <th key={h} style={TH} onClick={col?()=>toggleSort(col):undefined}>
                            {h}{col&&<span style={{marginLeft:4,opacity:.6}}>{sortIcon(col)}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading?<tr><td colSpan={13} style={{...TD,textAlign:'center',padding:36,color:'#a1a1aa'}}>Đang tải…</td></tr>:
                       creators.length===0?<tr><td colSpan={13} style={{...TD,textAlign:'center',padding:36,color:'#a1a1aa'}}>Không có kết quả</td></tr>:
                       creators.map(c=>{
                        const sv=scV(c);
                        const lc=LIFECYCLE[c.status]||LIFECYCLE.applied;
                        const pc=PLAT[c.platform]||PLAT.TikTok;
                        const ct=CT[c.content_type]||CT.video;
                        const pt=c.potential==='high'?{l:'⚡ High',c:'#15803d',bg:'#dcfce7'}:c.potential==='medium'?{l:'◈ Med',c:'#c2410c',bg:'#fff7ed'}:null;
                        return(
                          <>
                          <tr key={c.id}>
                            <td style={TD}>
                              <div style={{display:'flex',alignItems:'center',gap:9}}>
                                <Av name={c.name} size={32}/>
                                <div>
                                  <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                                  <div style={{fontSize:10,color:'#a1a1aa'}}>{c.email}</div>
                                  <div style={{fontSize:10,color:'#a1a1aa'}}>{c.applied_at?new Date(c.applied_at).toLocaleDateString('vi-VN'):''}</div>
                                </div>
                              </div>
                            </td>
                            <td style={TD}>{c.tiktok_link?<a href={c.tiktok_link.startsWith('http')?c.tiktok_link:'https://'+c.tiktok_link} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#7c3aed',fontWeight:600,textDecoration:'none',display:'block',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.tiktok_link}</a>:<span style={{color:'#a1a1aa'}}>—</span>}</td>
                            <td style={TD}><Badge v={c.platform} c={pc.c} bg={pc.bg}/></td>
                            <td style={TD}><Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5"/></td>
                            <td style={TD}><Badge v={ct.l} c={ct.c} bg={ct.bg}/></td>
                            <td style={{...TD,fontWeight:800}}>{fN(c.followers)}</td>
                            <td style={TD}>{fN(c.avg_views)}</td>
                            <td style={TD}>
                              <div style={{fontSize:13,fontWeight:900,color:scC(sv)}}>{sv}</div>
                              <div style={{fontSize:10,color:'#7c3aed',fontWeight:700}}>KOC: {parseFloat(c.koc_score||0).toFixed(2)}</div>
                              {pt&&<Badge v={pt.l} c={pt.c} bg={pt.bg} style={{fontSize:9,marginTop:3}}/>}
                            </td>
                            <td style={TD}><span style={{fontSize:12,fontWeight:700,color:c.expected_monthly_gmv?'#059669':'#a1a1aa'}}>{fVND(c.expected_monthly_gmv)}</span></td>
                            <td style={TD}>
                              {editing[`rev_${c.id}`]?
                                <div style={{display:'flex',gap:3}}>
                                  <input type="number" id={`rv${c.id}`} defaultValue={c.revenue_generated||0} style={{...IN,width:80,padding:'4px 8px'}}/>
                                  <button style={{...BP,padding:'4px 8px',fontSize:11}} onClick={()=>{patch(c.id,{revenue_generated:parseInt(document.getElementById(`rv${c.id}`).value)||0});setEditing(p=>({...p,[`rev_${c.id}`]:false}));}}>✓</button>
                                  <button style={{...BG_SM}} onClick={()=>setEditing(p=>({...p,[`rev_${c.id}`]:false}))}>✕</button>
                                </div>:
                                <span onClick={()=>setEditing(p=>({...p,[`rev_${c.id}`]:true}))} style={{cursor:'pointer',fontSize:12,fontWeight:700,color:c.revenue_generated>0?'#059669':'#a1a1aa'}}>{c.revenue_generated>0?fVND(c.revenue_generated):'+ Rev'}</span>
                              }
                            </td>
                            <td style={TD}><span style={{fontSize:11,color:'#374151',maxWidth:110,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.address||'—'}</span></td>
                            <td style={TD}><QA c={c}/></td>
                            <td style={TD}>
                              <select style={{...IN,fontSize:11,padding:'4px 8px',borderRadius:8,width:'auto'}} value={c.status} onChange={e=>patch(c.id,{status:e.target.value})}>
                                {STATUSES.map(s=><option key={s} value={s}>{LIFECYCLE[s]?.l||s}</option>)}
                              </select>
                            </td>
                          </tr>
                          {showVideo===c.id&&(
                            <tr key={`v${c.id}`}>
                              <td colSpan={13} style={{...TD,background:'#faf5ff',padding:'12px 16px'}}>
                                <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
                                  <div><div style={{fontSize:11,fontWeight:700,color:'#7c3aed',marginBottom:4}}>Video Link</div>
                                  <input id={`vl${c.id}`} defaultValue={c.video_link||''} placeholder="https://..." style={{...IN,width:200}}/></div>
                                  <div><div style={{fontSize:11,fontWeight:700,color:'#7c3aed',marginBottom:4}}>Video Views</div>
                                  <input type="number" id={`vv${c.id}`} defaultValue={c.video_views||0} style={{...IN,width:100}}/></div>
                                  <div><div style={{fontSize:11,fontWeight:700,color:'#7c3aed',marginBottom:4}}>Orders</div>
                                  <input type="number" id={`or${c.id}`} defaultValue={c.orders_generated||0} style={{...IN,width:80}}/></div>
                                  <button style={BP} onClick={()=>{
                                    patch(c.id,{
                                      video_link:document.getElementById(`vl${c.id}`).value,
                                      video_views:parseInt(document.getElementById(`vv${c.id}`).value)||0,
                                      orders_generated:parseInt(document.getElementById(`or${c.id}`).value)||0,
                                    });
                                    setShowVideo(null);
                                  }}>Lưu</button>
                                  <button style={BG} onClick={()=>setShowVideo(null)}>Huỷ</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          </>
                        );
                       })}
                    </tbody>
                  </table>
                </div>
                <Pagination/>
              </div>
            </div>
          )}

          {/* ── CAMPAIGNS ── */}
          {tab==='campaigns'&&campStep===0&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
                <div><div style={{fontSize:20,fontWeight:800,color:'#0f0f1a',letterSpacing:'-.5px'}}>Chiến dịch</div><div style={{fontSize:12,color:'#a1a1aa',marginTop:2}}>{camps.length} chiến dịch</div></div>
                <button style={BP} onClick={()=>{setCampStep(1);initCf();}}>+ Tạo chiến dịch</button>
              </div>
              {camps.length===0?<div style={{...CARD,textAlign:'center',padding:52}}><div style={{fontSize:36,marginBottom:12}}>◇</div><div style={{color:'#a1a1aa',marginBottom:16}}>Chưa có chiến dịch</div><button style={BP} onClick={()=>{setCampStep(1);initCf();}}>Tạo ngay</button></div>:
               camps.map(c=>{
                const tot=(c.creators||[]).length*(c.posts_per||2);
                const dn=(c.creators||[]).reduce((s,cr)=>s+(cr.posts_done||0),0);
                const pct=tot>0?Math.round(dn/tot*100):0;
                const ct=CT[c.content_type]||CT.video;
                const stL={active:'Đang chạy',paused:'Tạm dừng',completed:'Hoàn thành'};
                const stC=c.status==='active'?{c:'#065f46',bg:'#dcfce7'}:c.status==='completed'?{c:'#1e40af',bg:'#dbeafe'}:{c:'#92400e',bg:'#fef3c7'};
                return(
                  <div key={c.id} style={CARD}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
                      <div><div style={{fontSize:15,fontWeight:800}}>{c.name}</div>
                      <div style={{fontSize:11,color:'#a1a1aa',marginTop:3,display:'flex',alignItems:'center',gap:7}}>{c.product} · {c.end_date} <Badge v={ct.l} c={ct.c} bg={ct.bg}/></div></div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <select style={{...IN,fontSize:12,padding:'6px 9px',borderRadius:9,width:'auto'}} value={c.status} onChange={e=>patchCamp(c.id,{status:e.target.value})}>
                          <option value="active">Đang chạy</option><option value="paused">Tạm dừng</option><option value="completed">Hoàn thành</option>
                        </select>
                        <Badge v={stL[c.status]} c={stC.c} bg={stC.bg}/>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
                      {[['Budget',fVND(c.budget),'#6d28d9','#faf5ff'],['Creators',(c.creators||[]).length,'#0f0f1a','#fafafa'],['Slots',`${c.filled}/${c.slots}`,'#0f0f1a','#fafafa'],['Tiến độ',pct+'%','#059669','#f0fdf4']].map(([l,v,co,bg])=>(
                        <div key={l} style={{background:bg,border:'1px solid #f0f0f0',borderRadius:12,padding:'10px 12px'}}>
                          <div style={{fontSize:10,color:'#71717a',fontWeight:700,marginBottom:3}}>{l}</div>
                          <div style={{fontSize:14,fontWeight:900,color:co}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{height:6,background:'#f4f4f5',borderRadius:100,overflow:'hidden',marginBottom:6}}>
                      <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#7c3aed,#c084fc)',borderRadius:100}}/>
                    </div>
                    {(c.creators||[]).length>0&&(
                      <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',minWidth:500}}>
                          <thead><tr>{['Creator','Loại','Promo','Đã đăng','Trạng thái'].map(h=><th key={h} style={{...TH,borderBottom:'1px solid #f4f4f5'}}>{h}</th>)}</tr></thead>
                          <tbody>{c.creators.map(cr=>(
                            <tr key={cr.creator_id}>
                              <td style={TD}><div style={{display:'flex',alignItems:'center',gap:8}}><Av name={cr.name} size={26}/><span style={{fontSize:13,fontWeight:600}}>{cr.name}</span></div></td>
                              <td style={TD}><Badge v={CT[cr.content_type]?.l||'Video'} c={CT[cr.content_type]?.c||'#1d4ed8'} bg={CT[cr.content_type]?.bg||'#dbeafe'}/></td>
                              <td style={TD}><span style={{fontSize:12,fontWeight:800,color:'#7c3aed'}}>{cr.promo_code||'—'}</span></td>
                              <td style={TD}>
                                <div style={{display:'flex',alignItems:'center',gap:7}}>
                                  <button onClick={()=>{if(cr.posts_done>0)patchCamp(c.id,{creator_id:cr.creator_id,posts_done:cr.posts_done-1});}} style={{width:28,height:28,borderRadius:8,border:'1.5px solid #e4e4e7',background:'#fff',fontSize:15,cursor:'pointer',fontFamily:'inherit'}}>−</button>
                                  <span style={{fontSize:14,fontWeight:900,minWidth:36,textAlign:'center'}}>{cr.posts_done}/{c.posts_per}</span>
                                  <button onClick={()=>{if(cr.posts_done<c.posts_per)patchCamp(c.id,{creator_id:cr.creator_id,posts_done:cr.posts_done+1});}} style={{width:28,height:28,borderRadius:8,border:'1.5px solid #e4e4e7',background:'#fff',fontSize:15,cursor:'pointer',fontFamily:'inherit'}}>+</button>
                                </div>
                              </td>
                              <td style={TD}><select style={{...IN,fontSize:11,padding:'5px 8px',borderRadius:8,width:'auto'}} value={cr.camp_status||''} onChange={e=>patchCamp(c.id,{creator_id:cr.creator_id,camp_status:e.target.value})}>{TRACK.map(s=><option key={s}>{s}</option>)}</select></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
               })
              }
            </div>
          )}

          {/* Campaign wizard */}
          {tab==='campaigns'&&campStep>0&&(
            <div style={{maxWidth:600}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
                <button style={BG} onClick={()=>setCampStep(0)}>← Huỷ</button>
                <div style={{fontSize:17,fontWeight:800,color:'#0f0f1a'}}>Tạo chiến dịch mới</div>
              </div>
              <div style={{display:'flex',background:'#f4f4f5',borderRadius:12,overflow:'hidden',border:'1px solid #e4e4e7',marginBottom:20}}>
                {['Thông tin','Brief & YC','Creator','Xác nhận'].map((s,i)=>(
                  <div key={s} style={{flex:1,padding:'10px 6px',textAlign:'center',fontSize:11,fontWeight:campStep===i+1?800:i+1<campStep?700:500,background:campStep===i+1?'#fff':i+1<campStep?'#f0fdf4':'transparent',color:campStep===i+1?'#6d28d9':i+1<campStep?'#15803d':'#a1a1aa',borderRight:i<3?'1px solid #e4e4e7':'none'}}>
                    <span style={{display:'inline-flex',width:17,height:17,borderRadius:'50%',fontSize:9,alignItems:'center',justifyContent:'center',marginRight:4,background:i+1<campStep?'#15803d':campStep===i+1?'#7c3aed':'#e4e4e7',color:i+1<=campStep?'#fff':'#a1a1aa',fontWeight:800}}>{i+1<campStep?'✓':i+1}</span>{s}
                  </div>
                ))}
              </div>
              <div style={{...CARD,padding:'20px 22px',marginBottom:14}}>
                {campStep===1&&(
                  <div style={{display:'flex',flexDirection:'column',gap:13}}>
                    <div style={{fontSize:14,fontWeight:800,marginBottom:4,paddingBottom:10,borderBottom:'1px solid #f4f4f5'}}>Thông tin chiến dịch</div>
                    <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>Tên *</label><input style={IN} value={cf.name||''} onChange={e=>setCf(p=>({...p,name:e.target.value}))} placeholder="VD: Ra mắt Son Velvet Mùa Thu 2026"/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>Bắt đầu</label><input type="date" style={IN} value={cf.start_date||''} onChange={e=>setCf(p=>({...p,start_date:e.target.value}))}/></div>
                      <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>Deadline</label><input type="date" style={IN} value={cf.end_date||''} onChange={e=>setCf(p=>({...p,end_date:e.target.value}))}/></div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                      <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>Budget</label><input type="number" style={IN} value={cf.budget||''} onChange={e=>setCf(p=>({...p,budget:e.target.value}))} placeholder="50,000,000"/></div>
                      <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>Slots</label><input type="number" style={IN} value={cf.slots||10} onChange={e=>setCf(p=>({...p,slots:parseInt(e.target.value)||10}))}/></div>
                      <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>Sản phẩm</label><input style={IN} value={cf.product||''} onChange={e=>setCf(p=>({...p,product:e.target.value}))} placeholder="Son Velvet No.12"/></div>
                    </div>
                  </div>
                )}
                {campStep===2&&(
                  <div style={{display:'flex',flexDirection:'column',gap:13}}>
                    <div style={{fontSize:14,fontWeight:800,marginBottom:4,paddingBottom:10,borderBottom:'1px solid #f4f4f5'}}>Brief & Yêu cầu</div>
                    <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:8}}>Loại nội dung *</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                      {CTYPES.map(ct=>(<div key={ct.v} style={selBtnS(cf.content_type===ct.v)} onClick={()=>setCf(p=>({...p,content_type:ct.v}))}><span style={{fontSize:20}}>{CT[ct.v]?.l==='Video'?'▶':CT[ct.v]?.l==='Livestream'?'◉':'◈'}</span><span style={{fontSize:12,fontWeight:700}}>{ct.l}</span></div>))}
                    </div></div>
                    {[['brief','Brief tổng quan','Mô tả sản phẩm, thông điệp…',3],['req','Yêu cầu nội dung','VD: 2 video TikTok 30-60s…',3],['note','Lưu ý','Điều cần tránh…',2]].map(([k,l,ph,r])=>(
                      <div key={k}><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>{l}</label><textarea style={{...IN,width:'100%',resize:'none',lineHeight:1.6}} rows={r} value={cf[k]||''} onChange={e=>setCf(p=>({...p,[k]:e.target.value}))} placeholder={ph}/></div>
                    ))}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>Định dạng</label>
                      <select style={{...IN,width:'100%'}} value={cf.format||''} onChange={e=>setCf(p=>({...p,format:e.target.value}))}>
                        {['TikTok video (15-60s)','TikTok video (60-180s)','TikTok Live','Facebook Reels','Facebook Live','Shopee Video','Shopee Live','Đa nền tảng'].map(f=><option key={f}>{f}</option>)}
                      </select></div>
                      <div><label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:'#71717a',marginBottom:6}}>Số bài/creator</label><input type="number" style={IN} value={cf.posts_per||2} onChange={e=>setCf(p=>({...p,posts_per:parseInt(e.target.value)||1}))}/></div>
                    </div>
                  </div>
                )}
                {campStep===3&&(
                  <div>
                    <div style={{fontSize:14,fontWeight:800,marginBottom:6}}>Chọn creators</div>
                    <div style={{fontSize:12,color:'#a1a1aa',marginBottom:14}}>Đã chọn: <strong style={{color:'#0f0f1a'}}>{sel.length}</strong> / {cf.slots||10} slots</div>
                    <div style={{display:'flex',flexWrap:'wrap'}}>
                      {creators.filter(c=>['approved','sample_sent'].includes(c.status)).map(c=>{
                        const on=sel.includes(c.id);
                        const pc=PLAT[c.platform]||PLAT.TikTok;
                        return(<div key={c.id} onClick={()=>setSel(p=>p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])} style={{display:'inline-flex',alignItems:'center',gap:8,border:`2px solid ${on?'#7c3aed':'#e4e4e7'}`,background:on?'#f5f3ff':'#fff',borderRadius:12,padding:'7px 12px',margin:4,cursor:'pointer',transition:'all .18s'}}>
                          <Av name={c.name} size={22}/>
                          <div><div style={{fontSize:12,fontWeight:700}}>{c.name}</div>
                          <div style={{fontSize:10,color:'#a1a1aa'}}><span style={{color:pc.c,fontWeight:600}}>{c.platform}</span> · KOC: <span style={{color:'#7c3aed',fontWeight:700}}>{parseFloat(c.koc_score||0).toFixed(2)}</span></div></div>
                        </div>);
                      })}
                      {creators.filter(c=>['approved','sample_sent'].includes(c.status)).length===0&&<div style={{color:'#a1a1aa',fontSize:13,padding:16}}>Chưa có creator được duyệt.</div>}
                    </div>
                  </div>
                )}
                {campStep===4&&(
                  <div>
                    <div style={{fontSize:14,fontWeight:800,marginBottom:14,paddingBottom:10,borderBottom:'1px solid #f4f4f5'}}>Xác nhận chiến dịch</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                      {[['Tên',cf.name],['Sản phẩm',cf.product],['Thời gian',`${cf.start_date} → ${cf.end_date}`],['Budget',fVND(cf.budget||0)]].map(([l,v])=>(
                        <div key={l} style={{background:'#faf5ff',border:'1px solid #ede9fe',borderRadius:12,padding:'11px 13px'}}><div style={{fontSize:10,color:'#7c3aed',fontWeight:700,marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:800}}>{v||'—'}</div></div>
                      ))}
                    </div>
                    <div style={{background:'#faf5ff',border:'1px solid #ede9fe',borderRadius:12,padding:'11px 13px'}}>
                      <div style={{fontSize:10,color:'#7c3aed',fontWeight:700,marginBottom:6}}>{sel.length} creators đã chọn</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                        {creators.filter(c=>sel.includes(c.id)).map(c=><Badge key={c.id} v={c.name} c="#6d28d9" bg="#ede9fe"/>)}
                        {sel.length===0&&<span style={{color:'#a1a1aa',fontSize:12}}>Chưa chọn creator nào</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                {campStep>1?<button style={BG} onClick={()=>setCampStep(s=>s-1)}>← Quay lại</button>:<div/>}
                {campStep<4?<button style={BP} onClick={()=>{if(campStep===1&&!cf.name){alert('Điền tên chiến dịch');return;}setCampStep(s=>s+1);}}>Tiếp theo →</button>:<button style={{...BP,padding:'11px 28px',fontSize:14,borderRadius:12}} onClick={createCamp}>Tạo chiến dịch ✓</button>}
              </div>
            </div>
          )}

          {/* ── CREATORS ── */}
          {tab==='creators'&&(
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div><div style={{fontSize:20,fontWeight:800,color:'#0f0f1a',letterSpacing:'-.5px'}}>Creators</div><div style={{fontSize:12,color:'#a1a1aa',marginTop:2}}>{total} đã đăng ký · {active} active</div></div>
                <button style={BG} onClick={()=>window.open('/','_blank')}>Trang đăng ký ↗</button>
              </div>
              <div style={{background:'#fff',border:'1px solid #f0f0f0',borderRadius:18,overflow:'hidden'}}>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                    <thead><tr>{['Creator','Nền tảng','Niche','Loại','Followers','KOC Score','Tiềm năng','Revenue','Lifecycle'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                    <tbody>
                      {loading?<tr><td colSpan={9} style={{...TD,textAlign:'center',padding:36,color:'#a1a1aa'}}>Đang tải…</td></tr>:
                       creators.map(c=>{
                        const sv=scV(c);
                        const pc=PLAT[c.platform]||PLAT.TikTok;
                        const ct=CT[c.content_type]||CT.video;
                        const lc=LIFECYCLE[c.status]||LIFECYCLE.applied;
                        const pt=c.potential==='high'?{l:'⚡ High',c:'#15803d',bg:'#dcfce7'}:c.potential==='medium'?{l:'◈ Med',c:'#c2410c',bg:'#fff7ed'}:null;
                        return(
                          <tr key={c.id}>
                            <td style={TD}><div style={{display:'flex',alignItems:'center',gap:9}}><Av name={c.name} size={32}/><div><div style={{fontWeight:700,fontSize:13}}>{c.name}</div><div style={{fontSize:10,color:'#a1a1aa'}}>{c.email}</div></div></div></td>
                            <td style={TD}><Badge v={c.platform} c={pc.c} bg={pc.bg}/></td>
                            <td style={TD}><Badge v={nL(c.niche)} c="#374151" bg="#f4f4f5"/></td>
                            <td style={TD}><Badge v={ct.l} c={ct.c} bg={ct.bg}/></td>
                            <td style={{...TD,fontWeight:800}}>{fN(c.followers)}</td>
                            <td style={TD}><div style={{fontSize:14,fontWeight:900,color:scC(sv)}}>{sv}</div><div style={{fontSize:10,color:'#7c3aed',fontWeight:700}}>KOC: {parseFloat(c.koc_score||0).toFixed(2)}</div></td>
                            <td style={TD}>{pt?<Badge v={pt.l} c={pt.c} bg={pt.bg}/>:<span style={{color:'#a1a1aa',fontSize:11}}>—</span>}</td>
                            <td style={TD}><span style={{fontSize:12,fontWeight:800,color:c.revenue_generated>0?'#059669':'#a1a1aa'}}>{fVND(c.revenue_generated)}</span></td>
                            <td style={TD}><Badge v={lc.l} c={lc.c} bg={lc.bg}/></td>
                          </tr>
                        );
                       })}
                    </tbody>
                  </table>
                </div>
                <Pagination/>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
