import { useState, useEffect, useRef } from 'react';
import { api, useLoad, Avatar, SampleStatus, Modal, Field, parseCsv, downloadCsv } from '../ui';
import { SAMPLE_STATUS, SAMPLE_STATUS_KEYS, SAMPLE_PIPELINE, trackingUrl, fmtDate, fmtNum, fmtMoney, daysUntil } from '../../lib/constants';

export function CreatorPicker({ onPick, placeholder = 'Tìm creator theo tên / @handle / SĐT…' }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  useEffect(() => {
    if (q.length < 2) { setList([]); return; }
    const t = setTimeout(() => api('/api/creators?search=' + encodeURIComponent(q)).then(d => setList(d.creators.slice(0, 6))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div>
      <input className="input input-sm" placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)} />
      {list.map(c => (
        <div key={c.id} className="feed-item" style={{ cursor: 'pointer' }} onClick={() => { onPick(c); setQ(''); setList([]); }}>
          <Avatar name={c.name} size={24} /><div className="grow"><b>{c.name}</b> <span className="xs muted">{c.handle ? '@' + c.handle : ''} {c.phone}</span></div>
        </div>
      ))}
    </div>
  );
}

function SampleModal({ sample, campaigns, onClose, onSaved, toast }) {
  const [f, setF] = useState({
    status: sample.status, carrier: sample.carrier, tracking_no: sample.tracking_no, cost: sample.cost,
    product: sample.product, campaign_id: sample.campaign_id || '', tiktok_order_id: sample.tiktok_order_id || '',
    content_due_at: sample.content_due_at ? sample.content_due_at.slice(0, 10) : '',
  });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/samples/${sample.id}`, { method: 'PATCH', body: { ...f, content_due_at: f.content_due_at || null } });
      toast('Đã cập nhật đơn mẫu'); onSaved(); onClose();
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!confirm('Xoá đơn mẫu này?')) return;
    await api(`/api/samples/${sample.id}`, { method: 'DELETE' }); toast('Đã xoá'); onSaved(); onClose();
  };
  return (
    <Modal onClose={onClose} title={`Đơn mẫu · ${sample.creator_name}`}>
      <div className="stack">
        <Field label="Trạng thái">
          <select className="select" value={f.status} onChange={set('status')}>{SAMPLE_STATUS_KEYS.map(s => <option key={s} value={s}>{SAMPLE_STATUS[s].l}</option>)}</select>
        </Field>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Sản phẩm"><input className="input" value={f.product} onChange={set('product')} /></Field>
          <Field label="Mã đơn TikTok"><input className="input" value={f.tiktok_order_id} onChange={set('tiktok_order_id')} /></Field>
          <Field label="Hãng vận chuyển"><input className="input" value={f.carrier} onChange={set('carrier')} placeholder="GHN, J&T, SPX…" /></Field>
          <Field label="Mã vận đơn"><input className="input" value={f.tracking_no} onChange={set('tracking_no')} /></Field>
          <Field label="Chi phí mẫu (VNĐ)" hint="Giá vốn + ship — để tính ROI"><input className="input" type="number" value={f.cost} onChange={set('cost')} /></Field>
          <Field label="Hạn đăng video"><input className="input" type="date" value={f.content_due_at} onChange={set('content_due_at')} /></Field>
        </div>
        <Field label="Chiến dịch">
          <select className="select" value={f.campaign_id} onChange={set('campaign_id')}><option value="">— Không —</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        {sample.video_url && <div className="alert alert-ok">🎬 <a className="link" href={sample.video_url} target="_blank" rel="noreferrer">Xem video</a></div>}
        <div className="row-between">
          <button className="btn btn-danger btn-sm" onClick={del}>Xoá</button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>Lưu</button>
        </div>
      </div>
    </Modal>
  );
}

function NewSampleModal({ campaigns, onClose, onSaved, toast }) {
  const [creator, setCreator] = useState(null);
  const [f, setF] = useState({ product: '', cost: '', carrier: '', tracking_no: '', tiktok_order_id: '', campaign_id: '', status: 'approved' });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    try { await api('/api/samples', { method: 'POST', body: { ...f, creator_id: creator.id } }); toast('Đã tạo đơn mẫu'); onSaved(); onClose(); }
    catch (e) { toast(e.message); }
  };
  return (
    <Modal onClose={onClose} title="Tạo đơn mẫu thủ công">
      <div className="stack">
        {creator ? <div className="row-between"><div className="row"><Avatar name={creator.name} size={28} /><b>{creator.name}</b></div><button className="btn btn-sm" onClick={() => setCreator(null)}>Đổi</button></div>
          : <Field label="Creator"><CreatorPicker onPick={setCreator} /></Field>}
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Sản phẩm"><input className="input" value={f.product} onChange={set('product')} /></Field>
          <Field label="Chi phí (VNĐ)"><input className="input" type="number" value={f.cost} onChange={set('cost')} /></Field>
          <Field label="Hãng vận chuyển"><input className="input" value={f.carrier} onChange={set('carrier')} /></Field>
          <Field label="Mã vận đơn"><input className="input" value={f.tracking_no} onChange={set('tracking_no')} /></Field>
          <Field label="Mã đơn TikTok (nếu có)"><input className="input" value={f.tiktok_order_id} onChange={set('tiktok_order_id')} /></Field>
          <Field label="Trạng thái"><select className="select" value={f.status} onChange={set('status')}>{['approved', 'shipped', 'delivered'].map(s => <option key={s} value={s}>{SAMPLE_STATUS[s].l}</option>)}</select></Field>
        </div>
        <Field label="Chiến dịch"><select className="select" value={f.campaign_id} onChange={set('campaign_id')}><option value="">— Không —</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <button className="btn btn-primary" disabled={!creator} onClick={save}>Tạo đơn</button>
      </div>
    </Modal>
  );
}

function UnmatchedModal({ onClose, onSaved, toast }) {
  const { data, reload } = useLoad(() => api('/api/samples/unmatched'), []);
  const [pick, setPick] = useState(null);
  const act = async body => {
    try { await api('/api/samples/unmatched', { method: 'POST', body }); toast(body.dismiss ? 'Đã bỏ qua' : 'Đã gán đơn'); setPick(null); reload(); onSaved(); }
    catch (e) { toast(e.message); }
  };
  return (
    <Modal onClose={onClose} title="Đơn TikTok chưa map được creator">
      <div className="small muted" style={{ marginBottom: 10 }}>Hệ thống map theo SĐT (khi không bị che) hoặc tên người nhận trùng khớp duy nhất. Đơn còn lại gán tay ở đây — hoặc creator tự khai mã đơn trong portal.</div>
      {!data ? <div className="empty">Đang tải…</div> : !data.orders.length ? <div className="empty">Không còn đơn nào 🎉</div> :
        data.orders.map(o => (
          <div key={o.order_id} className="card" style={{ padding: 12, marginBottom: 8 }}>
            <div className="row-between"><b className="small">#{o.order_id}</b><span className="xs muted">{o.payload.raw_status}</span></div>
            <div className="small">{o.payload.recipient || '—'} · {o.payload.phone || '—'}</div>
            <div className="xs muted">{o.payload.product}</div>
            {pick === o.order_id
              ? <div style={{ marginTop: 8 }}><CreatorPicker onPick={c => act({ order_id: o.order_id, creator_id: c.id })} /></div>
              : <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => setPick(o.order_id)}>Gán creator</button>
                  <button className="btn btn-sm" onClick={() => act({ order_id: o.order_id, dismiss: true })}>Không phải đơn mẫu</button>
                </div>}
          </div>
        ))}
    </Modal>
  );
}

export default function Samples({ toast, openCreator, initial = {} }) {
  const [view, setView] = useState('board');
  const [search, setSearch] = useState('');
  const [campaign, setCampaign] = useState('all');
  const [modal, setModal] = useState(initial.unmatched ? { type: 'unmatched' } : null);
  const [busy, setBusy] = useState('');
  const [includePaid, setIncludePaid] = useState(false);
  const fileRef = useRef();
  const qs = new URLSearchParams({ ...(search && { search }), ...(campaign !== 'all' && { campaign }) }).toString();
  const { data, reload } = useLoad(() => api('/api/samples?' + qs), [qs]);
  const camps = useLoad(() => api('/api/campaigns'), []);
  const campaigns = camps.data?.campaigns || [];
  const samples = data?.samples || [];

  const onFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) { toast('Hãy xuất file dạng CSV (Excel → Lưu thành CSV UTF-8).'); return; }
    setBusy('import');
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error('Không đọc được dòng nào trong file.');
      const r = await api('/api/samples/import', { method: 'POST', body: { rows, include_paid: includePaid } });
      toast(`Import ${r.total} đơn: +${r.created} mới · ${r.updated} cập nhật · ${r.unmatched} chưa map · ${r.skipped} bỏ qua`);
      reload();
    } catch (err) { toast(err.message); } finally { setBusy(''); }
  };

  const sync = async () => {
    setBusy('sync');
    try { const r = await api('/api/samples/sync', { method: 'POST' }); toast(`Sync ${r.fetched} đơn: +${r.created} mới · ${r.updated} cập nhật · ${r.unmatched} chưa map`); reload(); }
    catch (e) { toast(e.message); } finally { setBusy(''); }
  };

  const exportCsv = () => downloadCsv(`don-mau-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Creator', 'Handle', 'SĐT', 'Sản phẩm', 'Mã đơn TikTok', 'Hãng VC', 'Mã vận đơn', 'Trạng thái', 'Chi phí', 'Gửi', 'Nhận', 'Hạn video', 'Đăng', 'Chiến dịch', 'Video'],
    samples.map(s => [s.creator_name, s.handle, s.phone, s.product, s.tiktok_order_id, s.carrier, s.tracking_no, SAMPLE_STATUS[s.status]?.l, s.cost, fmtDate(s.shipped_at), fmtDate(s.delivered_at), fmtDate(s.content_due_at), fmtDate(s.posted_at), s.campaign_name, s.video_url]));

  const spend = samples.filter(s => s.status !== 'cancelled').reduce((a, s) => a + Number(s.cost || 0), 0);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Đơn mẫu & vận chuyển</h1><div className="small muted">{samples.length} đơn · chi phí mẫu {fmtMoney(spend)}đ</div></div>
        <div className="row wrap">
          <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={onFile} />
          <button className="btn btn-primary" disabled={!!busy} onClick={() => fileRef.current.click()}>{busy === 'import' ? 'Đang import…' : '⬆ Import CSV đơn TikTok'}</button>
          <button className="btn" disabled={!!busy} onClick={sync}>{busy === 'sync' ? 'Đang sync…' : '⟳ Sync TikTok API'}</button>
          <button className="btn" onClick={() => setModal({ type: 'new' })}>＋ Tạo tay</button>
          {data?.unmatched > 0 && <button className="btn btn-accent" onClick={() => setModal({ type: 'unmatched' })}>{data.unmatched} đơn chưa map</button>}
        </div>
      </div>

      <div className="alert alert-info small">
        <span>💡</span>
        <span>Seller Center → <b>Đơn hàng → Xuất đơn</b> → lưu CSV → Import. Hệ thống chỉ lấy <b>đơn 0đ (đơn mẫu)</b>, tự map creator qua SĐT / tên, cập nhật trạng thái giao và đặt hạn đăng video.
          {' '}<label style={{ whiteSpace: 'nowrap' }}><input type="checkbox" checked={includePaid} onChange={e => setIncludePaid(e.target.checked)} /> Lấy cả đơn có giá trị</label></span>
      </div>

      <div className="row-between">
        <div className="row wrap" style={{ gap: 8 }}>
          <input className="input input-sm" style={{ width: 220 }} placeholder="Tìm creator, mã đơn, vận đơn…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="select input-sm" style={{ width: 'auto' }} value={campaign} onChange={e => setCampaign(e.target.value)}>
            <option value="all">Mọi chiến dịch</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="row">
          <div className="tabs"><button className={`tab${view === 'board' ? ' on' : ''}`} onClick={() => setView('board')}>Bảng tiến độ</button><button className={`tab${view === 'table' ? ' on' : ''}`} onClick={() => setView('table')}>Danh sách</button></div>
          <button className="btn btn-sm" onClick={exportCsv}>⬇ CSV</button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="kanban">
          {SAMPLE_PIPELINE.map(st => {
            const items = samples.filter(s => s.status === st);
            return (
              <div key={st} className="kcol">
                <div className="kcol-head"><SampleStatus s={st} /><span className="muted tnum">{items.length}</span></div>
                {items.slice(0, 60).map(s => {
                  const d = daysUntil(s.content_due_at);
                  return (
                    <div key={s.id} className="kcard" onClick={() => setModal({ type: 'edit', sample: s })}>
                      <div className="row" style={{ gap: 7 }}>
                        <Avatar name={s.creator_name} size={22} />
                        <b className="small ellipsis grow" onClick={e => { e.stopPropagation(); openCreator(s.creator_id); }}>{s.creator_name}</b>
                      </div>
                      <div className="xs muted ellipsis" style={{ marginTop: 4 }}>{s.product || 'Sản phẩm'}{s.campaign_name ? ` · ${s.campaign_name}` : ''}</div>
                      {s.tracking_no && <a className="xs link" href={trackingUrl(s.carrier, s.tracking_no)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>🚚 {s.carrier} {s.tracking_no}</a>}
                      {['delivered', 'overdue'].includes(st) && d !== null && (
                        <div style={{ marginTop: 5 }}><span className={`badge tone-${d < 0 ? 'red' : d <= 2 ? 'amber' : 'slate'}`}>{d < 0 ? `Trễ ${-d} ngày` : `Còn ${d} ngày`}</span></div>
                      )}
                      {st === 'posted' && s.video_url && <a className="xs link" href={s.video_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>🎬 Xem video</a>}
                    </div>
                  );
                })}
                {!items.length && <div className="xs muted" style={{ textAlign: 'center', padding: 14 }}>Trống</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-flat"><div className="table-wrap">
          <table className="table" style={{ minWidth: 860 }}>
            <thead><tr><th>Creator</th><th>Sản phẩm</th><th>Mã đơn</th><th>Vận chuyển</th><th>Trạng thái</th><th>Hạn video</th><th>Chi phí</th></tr></thead>
            <tbody>
              {samples.map(s => (
                <tr key={s.id} className="clickable" onClick={() => setModal({ type: 'edit', sample: s })}>
                  <td><b>{s.creator_name}</b><div className="xs muted">{s.handle ? '@' + s.handle : s.phone}</div></td>
                  <td className="small">{s.product || '—'}<div className="xs muted">{s.campaign_name}</div></td>
                  <td className="xs tnum">{s.tiktok_order_id || '—'}<div className="muted">{s.source}{s.match_method ? ` · ${s.match_method}` : ''}</div></td>
                  <td className="small">{s.tracking_no ? <a className="link" href={trackingUrl(s.carrier, s.tracking_no)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{s.carrier} {s.tracking_no}</a> : '—'}</td>
                  <td><SampleStatus s={s.status} /></td>
                  <td className="small">{fmtDate(s.content_due_at)}</td>
                  <td className="tnum small">{Number(s.cost) ? fmtNum(s.cost) : '—'}</td>
                </tr>
              ))}
              {!samples.length && <tr><td colSpan={7} className="empty">Chưa có đơn mẫu</td></tr>}
            </tbody>
          </table>
        </div></div>
      )}

      {modal?.type === 'edit' && <SampleModal sample={modal.sample} campaigns={campaigns} onClose={() => setModal(null)} onSaved={reload} toast={toast} />}
      {modal?.type === 'new' && <NewSampleModal campaigns={campaigns} onClose={() => setModal(null)} onSaved={reload} toast={toast} />}
      {modal?.type === 'unmatched' && <UnmatchedModal onClose={() => setModal(null)} onSaved={reload} toast={toast} />}
    </div>
  );
}
