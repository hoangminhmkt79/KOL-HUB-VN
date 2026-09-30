import { useState } from 'react';
import { api, useLoad, Badge, Modal, Field, Kpi, copy, downloadCsv, CreatorStatus } from '../ui';
import { POST_ANGLES, fmtMoney, fmtNum, fmtDate, nicheLabel } from '../../lib/constants';

const pct = (a, b) => (Number(b) > 0 ? `${Math.round((Number(a) / Number(b)) * 100)}%` : '—');

// Danh sách người tuyển được từ 1 mã nguồn (link đa kênh hoặc bài group FB)
export function RecruitsModal({ code, onClose, openCreator, toast }) {
  const { data, error } = useLoad(() => api(`/api/links/${code}`), [code]);
  const s = data?.source;
  const rs = data?.recruits || [];
  const exportCsv = () => downloadCsv(`tuyen-${code}.csv`, ['Tên', 'Handle', 'Trạng thái', 'Followers', 'Avg views', 'Lĩnh vực', 'Giá mong muốn', 'Video/tháng', 'Đã chốt deal', 'Có video', 'GMV', 'Ngày ĐK', 'UTM source', 'UTM medium', 'UTM campaign'],
    rs.map(c => [c.name, c.handle, c.status, c.followers, c.avg_views, nicheLabel(c.niche), c.ask_fee ?? '', c.ask_videos ?? '', c.booked ? 'có' : '', c.activated ? 'có' : '', c.gmv, fmtDate(c.applied_at), c.utm?.utm_source || '', c.utm?.utm_medium || '', c.utm?.utm_campaign || '']));
  return (
    <Modal onClose={onClose} title={`Nguồn ${code}${s?.source_name ? ` · ${s.source_name}` : ''}`}>
      {error && <div className="alert alert-error">⚠ {error}</div>}
      {!data ? <div className="empty">Đang tải…</div> : (
        <div className="stack" style={{ gap: 12 }}>
          <div className="grid g3" style={{ gap: 8 }}>
            {[['Click', s.clicks], ['Đăng ký', `${s.signups} (${pct(s.signups, s.clicks)})`], ['Được duyệt', s.approved], ['Chốt deal', s.booked], ['Có video', s.activated], ['GMV', fmtMoney(s.gmv) + 'đ']].map(([l, v]) => (
              <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px' }}><div className="xs muted bold">{l}</div><div className="bold tnum">{v}</div></div>
            ))}
          </div>
          <div className="row-between"><b className="small">Tuyển được {rs.length} người</b>{rs.length > 0 && <button className="btn btn-sm" onClick={exportCsv}>⬇ CSV</button>}</div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {rs.map(c => (
              <div key={c.id} className="feed-item" style={{ cursor: openCreator ? 'pointer' : undefined, alignItems: 'center' }} onClick={() => { if (openCreator) { onClose(); openCreator(c.id); } }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="small bold ellipsis">{c.name} {c.handle && <span className="muted">@{c.handle}</span>}</div>
                  <div className="xs muted">{fmtNum(c.followers)} fl · {fmtDate(c.applied_at)}{c.ask_fee != null ? ` · muốn ${fmtMoney(c.ask_fee)}đ/video` : ''}</div>
                </div>
                {c.activated ? <Badge tone="green">Có video</Badge> : c.booked ? <Badge tone="blue">Đã chốt</Badge> : null}
                <CreatorStatus s={c.status} />
              </div>
            ))}
            {!rs.length && <div className="empty">Chưa ai đăng ký qua nguồn này.</div>}
          </div>
          {data.content && <ContentBox content={data.content} toast={toast} />}
        </div>
      )}
    </Modal>
  );
}

function ContentBox({ content, toast }) {
  const [k, setK] = useState(content.variants[0]?.key);
  const v = content.variants.find(x => x.key === k) || content.variants[0];
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="label" style={{ marginBottom: 0 }}>Content tuyển soạn sẵn</div>
      <div className="tabs">{content.variants.map(x => <button key={x.key} className={`tab${x.key === k ? ' on' : ''}`} onClick={() => setK(x.key)}>{x.l}</button>)}</div>
      <textarea className="textarea small" rows={9} readOnly value={v.text} />
      <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={async () => toast((await copy(v.text)) ? 'Đã copy content' : 'Không copy được')}>⧉ Copy content</button>
      {content.warnings?.map(w => <div key={w} className="xs muted">⚠ {w}</div>)}
    </div>
  );
}

function LinkBuilder({ camps, channels, toast, onCreated }) {
  const [f, setF] = useState({ channel: 'zalo', source_name: '', campaign_id: '', angle: 'fee', cost: '', target: 'creator' });
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const create = async () => {
    setBusy(true);
    try {
      const r = await api('/api/links', { method: 'POST', body: { ...f, campaign_id: f.campaign_id || null, cost: Number(f.cost) || 0 } });
      setOut(r); onCreated(); toast(`Đã tạo link ${r.link.code}`);
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const cp = async (t, m) => toast((await copy(t)) ? m : 'Không copy được');
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="card-title" style={{ marginBottom: 0 }}>🔗 Tạo link tracking + content tuyển</div>
      <div className="small muted" style={{ marginTop: -6 }}>Mỗi bài / mỗi nơi đăng dùng <b>1 link riêng</b> → biết chính xác bài nào tuyển được ai, bao nhiêu người. Link tự gắn UTM để đo thêm trên GA / Meta.</div>
      {!out ? (
        <>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Đích đến" hint={f.target === 'brand' ? 'Link dẫn về trang /brands — đo lead khách hàng' : 'Link dẫn về trang tuyển creator'}>
              <select className="select" value={f.target} onChange={set('target')}><option value="creator">Tuyển creator (KOC/KOL)</option><option value="brand">Tìm khách hàng (Brand)</option></select>
            </Field>
            <Field label="Kênh đăng"><select className="select" value={f.channel} onChange={set('channel')}>{(channels || []).map(c => <option key={c.v} value={c.v}>{c.l}</option>)}</select></Field>
            <Field label="Tên nguồn / bài *"><input className="input" value={f.source_name} onChange={set('source_name')} placeholder="VD: Zalo nhóm KOC Mẹ Bỉm – bài 01/10" /></Field>
            <Field label="Chiến dịch"><select className="select" value={f.campaign_id} onChange={set('campaign_id')}><option value="">Tuyển chung</option>{camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Góc tiếp cận"><select className="select" value={f.angle} onChange={set('angle')}>{POST_ANGLES.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}</select></Field>
            <Field label="Chi phí (VNĐ, nếu có)" hint="Phí đăng bài / boost — để tính CPA"><input className="input" type="number" min="0" value={f.cost} onChange={set('cost')} /></Field>
          </div>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy || !f.source_name.trim()} onClick={create}>{busy ? 'Đang tạo…' : 'Tạo link + content'}</button>
        </>
      ) : (
        <>
          <div className="stack" style={{ gap: 8 }}>
            <Field label="Link rút gọn (dán vào bài)">
              <div className="row"><input className="input input-sm grow" readOnly value={out.link.short} onFocus={e => e.target.select()} /><button className="btn btn-sm btn-primary" onClick={() => cp(out.link.short, 'Đã copy link rút gọn')}>Copy</button></div>
            </Field>
            <Field label="Link UTM đầy đủ" hint={`utm_source=${out.link.utm_source} · utm_medium=${out.link.utm_medium} · utm_campaign=${out.link.utm_campaign}`}>
              <div className="row"><input className="input input-sm grow" readOnly value={out.link.full} onFocus={e => e.target.select()} /><button className="btn btn-sm" onClick={() => cp(out.link.full, 'Đã copy link UTM')}>Copy</button></div>
            </Field>
          </div>
          <ContentBox content={out.content} toast={toast} />
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { setOut(null); setF(p => ({ ...p, source_name: '' })); }}>＋ Tạo link khác</button>
        </>
      )}
    </div>
  );
}

export default function Links({ toast, openCreator, camps }) {
  const { data, reload, error } = useLoad(() => api('/api/links'), []);
  const [view, setView] = useState(null);
  const links = data?.links || [];
  const t = data?.totals || { clicks: 0, signups: 0, activated: 0 };
  const chLabel = v => data?.channels?.find(c => c.v === v)?.l || v;
  const del = async l => { if (!window.confirm(`Xoá link ${l.code}? Creator đã đăng ký vẫn giữ mã nguồn.`)) return; try { await api(`/api/links/${l.code}`, { method: 'DELETE' }); reload(); } catch (e) { toast(e.message); } };
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <LinkBuilder camps={camps} channels={data?.channels} toast={toast} onCreated={reload} />
        <div className="stack" style={{ gap: 10 }}>
          <Kpi label="Click → Đăng ký (mọi link)" value={`${fmtNum(t.clicks)} → ${fmtNum(t.signups)}`} sub={`CR ${pct(t.signups, t.clicks)}`} />
          <Kpi hero label="Creator kích hoạt từ link" value={fmtNum(t.activated)} sub="Có ≥1 video được duyệt" />
        </div>
      </div>
      <div className="card-flat table-wrap">
        <table className="table">
          <thead><tr><th>Nguồn</th><th className="hide-sm">Kênh</th><th>Click</th><th>Đăng ký</th><th className="hide-sm">Duyệt</th><th className="hide-sm">Chốt</th><th>Kích hoạt</th><th className="hide-sm">CPA</th><th /></tr></thead>
          <tbody>
            {links.map(l => (
              <tr key={l.code} className="clickable" onClick={() => setView(l.code)}>
                <td><div className="bold ellipsis" style={{ maxWidth: 240 }}>{l.source_name}</div><div className="xs muted">{l.target === 'brand' ? '🎯 Brand · ' : ''}{l.code} · {l.campaign_name || 'Tuyển chung'} · {fmtDate(l.created_at)}</div></td>
                <td className="hide-sm small">{chLabel(l.channel)}</td>
                <td className="tnum">{fmtNum(l.clicks)}</td>
                <td className="tnum bold">{l.target === 'brand' ? <>{fmtNum(l.leads)} lead<div className="xs muted">{fmtNum(l.leads_won)} chốt</div></> : <>{fmtNum(l.signups)}<div className="xs muted">{pct(l.signups, l.clicks)}</div></>}</td>
                <td className="hide-sm tnum">{fmtNum(l.approved)}</td>
                <td className="hide-sm tnum">{fmtNum(l.booked)}</td>
                <td className="tnum bold" style={{ color: l.activated > 0 ? 'var(--brand-700)' : undefined }}>{fmtNum(l.activated)}</td>
                <td className="hide-sm tnum">{l.cpa != null ? fmtMoney(l.cpa) + 'đ' : '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn btn-sm" onClick={async () => toast((await copy(l.short)) ? 'Đã copy link' : l.short)}>Copy</button>
                    <button className="btn btn-sm btn-danger hide-sm" onClick={() => del(l)} aria-label="Xoá link">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <div className="alert alert-error" style={{ margin: 12 }}>⚠ {error}</div>}
        {data && !links.length && <div className="empty">Chưa có link. Tạo link đầu tiên ở khung trên — mỗi bài đăng 1 link.</div>}
      </div>
      {view && <RecruitsModal code={view} onClose={() => setView(null)} openCreator={openCreator} toast={toast} />}
    </div>
  );
}
