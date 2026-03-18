import { useState } from 'react';
import Head from 'next/head';

const PLATFORMS=[{v:'TikTok',icon:'TK',c:'#1d4ed8',bg:'#dbeafe',desc:'Video · TikTok Live'},{v:'Facebook',icon:'FB',c:'#1e40af',bg:'#eff6ff',desc:'Reels · FB Live'},{v:'Shopee',icon:'SP',c:'#c2410c',bg:'#fff7ed',desc:'Video · Shopee Live'}];
const NICHES=[{v:'lam_dep',l:'Làm đẹp',sub:'Skincare · Makeup',i:'✦'},{v:'nha_cua',l:'Nhà cửa',sub:'Đời sống · Bếp',i:'⌂'},{v:'cong_nghe',l:'Đồ công nghệ',sub:'Review · Unbox',i:'◈'},{v:'thoi_trang',l:'Thời trang',sub:'OOTD · Styling',i:'◇'}];
const CTYPES=[{v:'video',l:'Video',i:'▶',sub:'Short video'},{v:'livestream',l:'Livestream',i:'◉',sub:'Live stream'},{v:'both',l:'Cả hai',i:'◈',sub:'Video + Live'}];
const SLOTS_LEFT=23;

const fmtNum = v => v ? parseInt(v).toLocaleString('vi-VN') : '';
const parseNum = v => v.replace(/[^0-9]/g,'');
const calcScore = (views, fol) => (fol && parseInt(fol)>0) ? (parseInt(views||0)/parseInt(fol)).toFixed(2) : '0.00';
const scColor = s => parseFloat(s)>=0.3?'#059669':parseFloat(s)>=0.15?'#d97706':'#ef4444';

const S={
  page:{minHeight:'100vh',background:'#fafafa'},
  btnMain:{background:'#7c3aed',color:'#fff',border:'none',borderRadius:14,padding:'15px 32px',fontSize:15,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,fontFamily:'inherit'},
  btnBack:{background:'transparent',color:'#6b7280',border:'1.5px solid #e4e4e7',borderRadius:10,padding:'7px 14px',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'},
  input:{background:'#fff',border:'1.5px solid #e4e4e7',borderRadius:12,padding:'12px 14px',width:'100%',outline:'none',fontSize:14,color:'#0f0f1a',fontFamily:'inherit',transition:'border .18s'},
  card:{background:'#fff',border:'1px solid #f0f0f0',borderRadius:20,padding:'22px 24px',marginBottom:14},
  lbl:{display:'block',fontSize:11,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:'#71717a',marginBottom:6},
  err:{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:14,padding:'12px 16px',color:'#dc2626',fontSize:13,marginBottom:16,display:'flex',gap:8,alignItems:'center'},
  body:{maxWidth:560,margin:'0 auto',padding:'12px 20px 60px'},
  selBtn:(on)=>({border:`2px solid ${on?'#7c3aed':'#e4e4e7'}`,background:on?'#f5f3ff':'#fff',borderRadius:14,padding:'12px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:5,cursor:'pointer',textAlign:'center',transition:'all .18s'}),
};

export default function HomePage(){
  const [view,setView]=useState('landing');
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({name:'',email:'',tiktok_link:'',followers:'',avg_views:'',avg_viewers:'',platform:'',content_type:'',niche:'',expected_monthly_gmv:''});
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const [score,setScore]=useState('0.00');

  const set=k=>e=>{
    const v=e.target.value;
    setForm(p=>{
      const n={...p,[k]:v};
      if(k==='followers'||k==='avg_views') setScore(calcScore(k==='avg_views'?v:n.avg_views, k==='followers'?v:n.followers));
      return n;
    });
    setErr('');
  };
  const setNum=k=>e=>{
    const raw=parseNum(e.target.value);
    setForm(p=>{
      const n={...p,[k]:raw};
      if(k==='followers'||k==='avg_views') setScore(calcScore(k==='avg_views'?raw:n.avg_views, k==='followers'?raw:n.followers));
      return n;
    });
    setErr('');
  };
  const pick=(k,v)=>{setForm(p=>({...p,[k]:v}));setErr('');};
  const reset=()=>{setForm({name:'',email:'',tiktok_link:'',followers:'',avg_views:'',avg_viewers:'',platform:'',content_type:'',niche:'',expected_monthly_gmv:''});setStep(1);setScore('0.00');setErr('');};

  const showLive=form.content_type==='livestream'||form.content_type==='both';
  const pct=step===1?33:step===2?66:100;

  const doStep1=()=>{
    if(!form.name.trim()||!form.email.trim()||!form.tiktok_link.trim()){setErr('Điền đầy đủ tất cả các trường.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)){setErr('Email không hợp lệ.');return;}
    setErr('');setStep(2);
  };
  const doStep2=()=>{
    if(!form.followers||!form.avg_views){setErr('Điền số followers và avg views.');return;}
    if(!form.platform||!form.content_type||!form.niche){setErr('Chọn nền tảng, loại nội dung và lĩnh vực.');return;}
    if(showLive&&!form.avg_viewers){setErr('Điền avg viewers cho livestream.');return;}
    setErr('');setStep(3);
  };
  const doSubmit=async()=>{
    setLoading(true);
    try{
      const r=await fetch('/api/creators',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        ...form,
        followers:parseInt(parseNum(form.followers))||0,
        avg_views:parseInt(parseNum(form.avg_views))||0,
        avg_viewers:parseInt(parseNum(form.avg_viewers))||0,
        expected_monthly_gmv:form.expected_monthly_gmv?parseInt(parseNum(form.expected_monthly_gmv)):null,
      })});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||'Lỗi khi gửi đơn.');
      setView('success');
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  if(view==='success') return(
    <>
      <Head><title>Đăng ký thành công — KOL Hub</title></Head>
      <div style={S.page}>
        <div style={S.body}>
          <div style={{textAlign:'center',padding:'60px 20px',animation:'fadeUp .5s ease'}}>
            <div style={{fontSize:52,marginBottom:16}}>🎉</div>
            <h2 style={{fontSize:24,fontWeight:800,marginBottom:10,letterSpacing:'-.5px'}}>Đơn đã được gửi!</h2>
            <p style={{fontSize:14,color:'#71717a',lineHeight:1.8,marginBottom:12}}>Chúng tôi sẽ phản hồi trong <strong style={{color:'#7c3aed'}}>24–48 giờ</strong> qua email.</p>
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:14,padding:14,margin:'16px 0',textAlign:'left'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#15803d',marginBottom:6}}>⚡ Engagement score của bạn</div>
              <div style={{fontSize:28,fontWeight:900,color:'#059669',letterSpacing:'-.5px'}}>{score}</div>
              <div style={{fontSize:11,color:'#71717a',marginTop:3}}>{parseFloat(score)>=0.3?'Rất tốt! Tỉ lệ tương tác cao':parseFloat(score)>=0.15?'Tốt. Có tiềm năng phát triển':'Còn thấp — hãy focus vào content chất lượng'}</div>
            </div>
            <button style={S.btnBack} onClick={()=>{reset();setView('apply');}}>Đăng ký lần khác</button>
          </div>
        </div>
      </div>
    </>
  );

  if(view==='apply') return(
    <>
      <Head><title>Đăng ký Creator — KOL Hub</title></Head>
      <div style={S.page}>
        <div style={S.body}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <button style={S.btnBack} onClick={()=>{if(step===1)setView('landing');else{setStep(s=>s-1);setErr('');}}}>← {step===1?'Trang chủ':'Quay lại'}</button>
            <div style={{fontSize:12,color:'#71717a',fontWeight:600}}>Bước {step} / 3</div>
          </div>
          <div style={{marginBottom:24}}>
            <div style={{height:4,background:'#f4f4f5',borderRadius:100,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#7c3aed,#c084fc)',borderRadius:100,transition:'width .4s ease'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
              {['Thông tin','Kênh & Niche','Doanh thu'].map((l,i)=>(
                <div key={l} style={{fontSize:11,fontWeight:step===i+1?700:400,color:step===i+1?'#7c3aed':step>i+1?'#059669':'#a1a1aa'}}>{step>i+1?'✓ ':''}{l}</div>
              ))}
            </div>
          </div>
          {err&&<div style={S.err}><span>⚠</span>{err}</div>}

          {step===1&&(
            <>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:22,fontWeight:800,letterSpacing:'-.5px',marginBottom:4}}>Cho chúng tôi biết về bạn</div>
                <div style={{fontSize:13,color:'#71717a'}}>Chỉ mất 60 giây — không cần follower khủng</div>
              </div>
              <div style={S.card}>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div><label style={S.lbl}>Họ tên *</label><input style={S.input} value={form.name} onChange={set('name')} placeholder="Nguyễn Văn A"/></div>
                    <div><label style={S.lbl}>Email *</label><input style={S.input} type="email" value={form.email} onChange={set('email')} placeholder="you@email.com"/></div>
                  </div>
                  <div><label style={S.lbl}>Link profile *</label><input style={S.input} value={form.tiktok_link} onChange={set('tiktok_link')} placeholder="tiktok.com/@handle · fb.com/... · shopee.vn/..."/></div>
                </div>
              </div>
              <button style={{...S.btnMain,width:'100%',justifyContent:'center',padding:15,borderRadius:14}} onClick={doStep1}>Tiếp theo →</button>
              <div style={{textAlign:'center',marginTop:10,fontSize:12,color:'#a1a1aa'}}>Địa chỉ giao hàng sẽ được hỏi sau khi được duyệt</div>
            </>
          )}

          {step===2&&(
            <>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:22,fontWeight:800,letterSpacing:'-.5px',marginBottom:4}}>Thông tin kênh của bạn</div>
                <div style={{fontSize:13,color:'#71717a'}}>Giúp chúng tôi đánh giá và ghép chiến dịch phù hợp</div>
              </div>
              <div style={S.card}>
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <label style={S.lbl}>Số followers *</label>
                      <input style={S.input} inputMode="numeric" value={fmtNum(form.followers)} onChange={setNum('followers')} placeholder="50,000"/>
                    </div>
                    <div>
                      <label style={S.lbl}>Avg views / video *</label>
                      <input style={S.input} inputMode="numeric" value={fmtNum(form.avg_views)} onChange={setNum('avg_views')} placeholder="15,000"/>
                    </div>
                  </div>
                  {form.followers&&form.avg_views&&parseInt(form.followers)>0&&(
                    <div style={{background:'#f5f3ff',border:'1.5px solid #ddd6fe',borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'#7c3aed',marginBottom:2}}>⚡ Engagement score</div>
                        <div style={{fontSize:11,color:'#71717a'}}>{parseFloat(score)>=0.3?'Rất tốt!':parseFloat(score)>=0.15?'Tốt, có tiềm năng':'Còn thấp — cải thiện content'}</div>
                      </div>
                      <div style={{fontSize:26,fontWeight:900,color:scColor(score)}}>{score}</div>
                    </div>
                  )}
                  <div>
                    <label style={S.lbl}>Nền tảng chính *</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:7}}>
                      {PLATFORMS.map(p=>(
                        <div key={p.v} style={S.selBtn(form.platform===p.v)} onClick={()=>pick('platform',p.v)}>
                          <div style={{width:32,height:32,borderRadius:9,background:p.bg,color:p.c,fontWeight:800,fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 5px'}}>{p.icon}</div>
                          <div style={{fontSize:12,fontWeight:700}}>{p.v}</div>
                          <div style={{fontSize:10,color:'#a1a1aa',lineHeight:1.4,marginTop:2}}>{p.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={S.lbl}>Loại nội dung *</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:7}}>
                      {CTYPES.map(ct=>(
                        <div key={ct.v} style={S.selBtn(form.content_type===ct.v)} onClick={()=>{pick('content_type',ct.v);setForm(p=>({...p,avg_viewers:''}));}}>
                          <span style={{fontSize:22,marginBottom:4}}>{ct.i}</span>
                          <span style={{fontSize:12,fontWeight:700}}>{ct.l}</span>
                          <span style={{fontSize:10,color:'#a1a1aa',marginTop:2}}>{ct.sub}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {showLive&&<div><label style={S.lbl}>Avg viewers / livestream *</label><input style={S.input} inputMode="numeric" value={fmtNum(form.avg_viewers)} onChange={setNum('avg_viewers')} placeholder="Trung bình bao nhiêu người xem mỗi live?"/></div>}
                  <div>
                    <label style={S.lbl}>Lĩnh vực chính *</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginTop:7}}>
                      {NICHES.map(n=>(
                        <div key={n.v} style={{...S.selBtn(form.niche===n.v),flexDirection:'row',justifyContent:'flex-start',gap:11,padding:'12px 14px',textAlign:'left'}} onClick={()=>pick('niche',n.v)}>
                          <span style={{fontSize:22,flexShrink:0}}>{n.i}</span>
                          <div><div style={{fontSize:12,fontWeight:700}}>{n.l}</div><div style={{fontSize:10,color:'#a1a1aa',marginTop:2}}>{n.sub}</div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button style={{...S.btnMain,width:'100%',justifyContent:'center',padding:15,borderRadius:14}} onClick={doStep2}>Tiếp theo →</button>
            </>
          )}

          {step===3&&(
            <>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:22,fontWeight:800,letterSpacing:'-.5px',marginBottom:4}}>Gần xong rồi!</div>
                <div style={{fontSize:13,color:'#71717a'}}>Thông tin doanh thu giúp chúng tôi chọn chiến dịch phù hợp nhất cho bạn</div>
              </div>
              <div style={S.card}>
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div>
                    <label style={S.lbl}>Kênh bạn đang tạo ra khoảng bao nhiêu mỗi tháng?</label>
                    <input style={S.input} inputMode="numeric" value={fmtNum(form.expected_monthly_gmv)} onChange={setNum('expected_monthly_gmv')} placeholder="VD: 50,000,000 (không bắt buộc)"/>
                    <div style={{fontSize:11,color:'#a1a1aa',marginTop:5}}>Không bắt buộc – giúp chúng tôi đánh giá cơ hội hợp tác</div>
                  </div>
                  <div style={{background:'#f5f3ff',border:'1px solid #ede9fe',borderRadius:14,padding:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#7c3aed',marginBottom:8}}>Tóm tắt hồ sơ của bạn</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[['Họ tên',form.name],['Nền tảng',form.platform],['Followers',fmtNum(form.followers)],['Score',score]].map(([l,v])=>(
                        <div key={l} style={{background:'#fff',borderRadius:10,padding:'8px 10px'}}>
                          <div style={{fontSize:10,color:'#71717a',fontWeight:600,marginBottom:2}}>{l}</div>
                          <div style={{fontSize:13,fontWeight:700,color:l==='Score'?scColor(score):'#0f0f1a'}}>{v||'—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button style={{...S.btnMain,width:'100%',justifyContent:'center',padding:15,borderRadius:14}} onClick={doSubmit} disabled={loading}>
                {loading?'Đang gửi…':'Gửi đơn đăng ký 🎉'}
              </button>
              <div style={{textAlign:'center',marginTop:10,fontSize:11,color:'#a1a1aa'}}>Thông tin chỉ dùng để giao sample · Không chia sẻ với bên thứ 3</div>
            </>
          )}
        </div>
      </div>
    </>
  );

  // ── LANDING ────────────────────────────────────────────────
  return(
    <>
      <Head>
        <title>KOL Hub — Creator Partnership 2026</title>
        <meta name="description" content="Hợp tác creator — nhận sample miễn phí, được đẩy ads, hoa hồng rõ ràng"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>
      <div style={S.page}>
        <div style={{background:'#0f0f1a',padding:'10px 20px',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',display:'inline-block',animation:'pulse 2s infinite'}}/>
          <span style={{fontSize:12,fontWeight:600,color:'#fff'}}>Chiến dịch Tháng 3 đang tuyển creator —</span>
          <span style={{fontSize:12,fontWeight:700,color:'#fbbf24'}}>còn {SLOTS_LEFT} slot trống</span>
        </div>
        <div style={{padding:'48px 28px 44px',background:'linear-gradient(160deg,#0f0f1a 0%,#1e1040 60%,#2d1b69 100%)',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'relative',zIndex:1,maxWidth:580,margin:'0 auto'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(124,58,237,.25)',border:'1px solid rgba(124,58,237,.4)',borderRadius:100,padding:'6px 16px',fontSize:12,fontWeight:700,color:'#c4b5fd',letterSpacing:'.05em',marginBottom:22}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block',animation:'pulse 2s infinite'}}/>
              ĐANG TUYỂN CREATOR · Q2 / 2026
            </div>
            <h1 style={{fontSize:'clamp(26px,5.5vw,46px)',fontWeight:900,color:'#fff',lineHeight:1.1,marginBottom:12,letterSpacing:-1}}>
              Đăng content.<br/>
              <span style={{background:'linear-gradient(135deg,#a78bfa,#f472b6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Nhận sample + được đẩy ads.</span>
            </h1>
            <p style={{fontSize:16,color:'rgba(255,255,255,.65)',maxWidth:420,margin:'0 auto 28px',lineHeight:1.75}}>
              Hợp tác với thương hiệu — không cần số lượng follower lớn. Chúng tôi ưu tiên creator có <strong style={{color:'#fff'}}>tỉ lệ tương tác cao.</strong>
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:10,maxWidth:380,margin:'0 auto 32px',textAlign:'left'}}>
              {[['🎁','Nhận sample miễn phí','Giao tận nhà — không cần đặt cọc'],['🚀','Được đẩy ads không giới hạn','Thương hiệu boost bài đăng của bạn'],['💸','Hoa hồng & cơ hội scale','Càng tốt → càng nhiều chiến dịch']].map(([ic,t,sub])=>(
                <div key={t} style={{display:'flex',alignItems:'flex-start',gap:12,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,padding:'12px 16px'}}>
                  <span style={{fontSize:20,flexShrink:0}}>{ic}</span>
                  <div><div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:2}}>{t}</div><div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{sub}</div></div>
                </div>
              ))}
            </div>
            <button style={S.btnMain} onClick={()=>{reset();setView('apply');}}>Đăng ký ngay — miễn phí ✦</button>
            <div style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:10}}>Duyệt trong 24–48h</div>
          </div>
        </div>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #f4f4f5',background:'#fff'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',maxWidth:640,margin:'0 auto'}}>
            {[['1,200+','Creators hợp tác'],['50+','Chiến dịch/năm'],['8.2%','Avg engagement'],['24h','Thời gian duyệt']].map(([v,l],i)=>(
              <div key={l} style={{textAlign:'center',padding:12,borderRight:i<3?'1px solid #f4f4f5':'none'}}>
                <div style={{fontSize:22,fontWeight:900,color:'#7c3aed',letterSpacing:'-.5px'}}>{v}</div>
                <div style={{fontSize:11,color:'#71717a',marginTop:3,fontWeight:500}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{maxWidth:640,margin:'0 auto',padding:'28px 20px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:20}}>
            {NICHES.map(n=>(
              <div key={n.v} style={{border:'1.5px solid #f0f0f0',borderRadius:16,padding:14,display:'flex',alignItems:'center',gap:12,background:'#fff'}}>
                <div style={{fontSize:24,width:40,textAlign:'center'}}>{n.i}</div>
                <div><div style={{fontSize:13,fontWeight:700}}>{n.l}</div><div style={{fontSize:11,color:'#a1a1aa',marginTop:1}}>{n.sub}</div></div>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',background:'#fff',border:'1px solid #f0f0f0',borderRadius:20,padding:'28px 24px'}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#7c3aed',marginBottom:8}}>🔥 Còn {SLOTS_LEFT} slot</div>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:'-.4px',marginBottom:6}}>Bắt đầu ngay hôm nay</div>
            <div style={{fontSize:13,color:'#71717a',marginBottom:20}}>Miễn phí · Không ràng buộc · Duyệt trong 24h</div>
            <button style={S.btnMain} onClick={()=>{reset();setView('apply');}}>Đăng ký ngay →</button>
          </div>
        </div>
      </div>
    </>
  );
}
