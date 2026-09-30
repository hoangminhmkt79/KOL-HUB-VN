import { useState, useRef } from 'react';
import { api, useLoad, VideoStatus, Modal, Field, parseCsv } from '../ui';
import { fmtNum, fmtMoney, fmtDate } from '../../lib/constants';

function StatsModal({ video, onClose, onSaved, toast }) {
  const [f, setF] = useState({ views: video.views, likes: video.likes, orders: video.orders, gmv: video.gmv });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    try { await api(`/api/videos/${video.id}`, { method: 'PATCH', body: f }); toast('Đã cập nhật số liệu'); onSaved(); onClose(); }
    catch (e) { toast(e.message); }
  };
  return (
    <Modal onClose={onClose} title={`Số liệu video · ${video.creator_name}`}>
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Views"><input className="input" type="number" value={f.views} onChange={set('views')} /></Field>
        <Field label="Likes"><input className="input" type="number" value={f.likes} onChange={set('likes')} /></Field>
        <Field label="Đơn hàng"><input className="input" type="number" value={f.orders} onChange={set('orders')} /></Field>
        <Field label="GMV (VNĐ)"><input className="input" type="number" value={f.gmv} onChange={set('gmv')} /></Field>
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={save}>Lưu</button>
    </Modal>
  );
}

export default function Videos({ toast, openCreator }) {
  const [status, setStatus] = useState('all');
  const [edit, setEdit] = useState(null);
  const fileRef = useRef();
  const { data, reload } = useLoad(() => api('/api/videos' + (status !== 'all' ? `?status=${status}` : '')), [status]);
  const vs = data?.videos || [];

  const setSt = async (id, st) => {
    try { await api(`/api/videos/${id}`, { method: 'PATCH', body: { status: st } }); reload(); } catch (e) { toast(e.message); }
  };

  const onFile = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      const r = await api('/api/videos/import', { method: 'POST', body: { rows } });
      toast(`Đã cập nhật ${r.matched}/${r.rows} video`); reload();
    } catch (err) { toast(err.message); }
  };

  const totals = vs.filter(v => v.status !== 'rejected').reduce((a, v) => ({ views: a.views + v.views, gmv: a.gmv + Number(v.gmv), orders: a.orders + v.orders }), { views: 0, gmv: 0, orders: 0 });

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Video creator</h1><div className="small muted">{vs.length} video · {fmtNum(totals.views)} views · {fmtNum(totals.orders)} đơn · {fmtMoney(totals.gmv)}đ GMV</div></div>
        <div className="row">
          <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={onFile} />
          <button className="btn btn-primary" onClick={() => fileRef.current.click()}>⬆ Import số liệu video (CSV)</button>
        </div>
      </div>
      <div className="alert alert-info small"><span>💡</span><span>Creator tự nộp link trong portal → hệ thống kiểm tra video đúng kênh đã đăng ký (TikTok oEmbed), gắn vào đơn mẫu, đóng SLA. File số liệu cần cột <b>Video ID</b> (hoặc link) + Views / GMV / Orders.</span></div>

      <div className="tabs">
        {[['all', 'Tất cả'], ['submitted', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['rejected', 'Từ chối']].map(([v, l]) => (
          <button key={v} className={`tab${status === v ? ' on' : ''}`} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>

      <div className="grid g3">
        {vs.map(v => (
          <div key={v.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <a href={v.url} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '16/10', background: v.thumbnail ? `center/cover url("${v.thumbnail}")` : 'linear-gradient(135deg,var(--brand-50),var(--accent-50))', position: 'relative' }}>
              {!v.thumbnail && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>▶</span>}
              <span style={{ position: 'absolute', top: 8, left: 8 }}><VideoStatus s={v.status} /></span>
              {v.verified && <span className="badge tone-green" style={{ position: 'absolute', top: 8, right: 8 }}>✓ đúng kênh</span>}
            </a>
            <div style={{ padding: 12 }}>
              <div className="row-between">
                <b className="small ellipsis grow" style={{ cursor: 'pointer' }} onClick={() => openCreator(v.creator_id)}>{v.creator_name}</b>
                <span className="xs muted">{fmtDate(v.created_at)}</span>
              </div>
              <div className="xs muted ellipsis" style={{ marginTop: 2 }}>{v.title || v.url}</div>
              <div className="row tnum small" style={{ gap: 12, marginTop: 8 }}>
                <span>👁 {fmtNum(v.views)}</span><span>🛒 {fmtNum(v.orders)}</span><b style={{ color: 'var(--brand-700)' }}>{fmtMoney(v.gmv)}đ</b>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 10 }}>
                {v.status !== 'approved' && <button className="btn btn-sm btn-primary" onClick={() => setSt(v.id, 'approved')}>Duyệt</button>}
                {v.status !== 'rejected' && <button className="btn btn-sm btn-danger" onClick={() => setSt(v.id, 'rejected')}>Từ chối</button>}
                <button className="btn btn-sm" onClick={() => setEdit(v)}>Số liệu</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!vs.length && <div className="card empty">Chưa có video. Gửi link portal cho creator để họ tự nộp.</div>}
      {edit && <StatsModal video={edit} onClose={() => setEdit(null)} onSaved={reload} toast={toast} />}
    </div>
  );
}
