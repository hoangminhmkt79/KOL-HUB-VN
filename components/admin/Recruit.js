import { useState } from 'react';
import { api, useLoad, Badge, Modal, Field, Kpi, copy } from '../ui';
import { FB_GROUP_STATUS, FB_POST_POLICY, POST_ANGLES, NICHES, nicheLabel, fmtMoney, fmtNum, fmtDate, fmtDateTime } from '../../lib/constants';

const POST_STATUS = {
  draft:   { l: 'Nháp',     tone: 'slate' },
  posted:  { l: 'Đã đăng',  tone: 'green' },
  removed: { l: 'Bị gỡ',    tone: 'red' },
};
const policyLabel = v => FB_POST_POLICY.find(p => p.v === v)?.l || v || '—';
const angleLabel = v => POST_ANGLES.find(p => p.v === v)?.l || v || '—';
const pct = (a, b) => (Number(b) > 0 ? `${Math.round((Number(a) / Number(b)) * 100)}%` : '—');

function NoBotBanner() {
  return (
    <div className="alert alert-warn" role="note" style={{ border: '1px solid #f3d9a4' }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>✋</span>
      <div className="small">
        <b>Người thật tự đăng bài — không dùng bot, tool auto-post, auto-comment hay tài khoản clone.</b> Làm vậy vi phạm Điều khoản Facebook: bài bị gỡ, group chặn, tài khoản bị khoá.
        Hệ thống chỉ <b>soạn bài, cấp link tracking, gợi ý lịch đăng và đo phễu</b>. Mỗi bài cần tên người liên hệ thật và con số cụ thể.
      </div>
    </div>
  );
}

function GroupModal({ onClose, onSaved, toast, cooldown }) {
  const [f, setF] = useState({ name: '', url: '', niche: '', members: '', post_policy: 'free', cost: '', cooldown_days: cooldown || 7, note: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => { setF(p => ({ ...p, [k]: e.target.value })); setErr(''); };
  const save = async () => {
    if (!f.name.trim()) return setErr('Nhập tên group.');
    if (f.url && !/^https?:\/\//i.test(f.url.trim())) return setErr('Link group cần bắt đầu bằng https://');
    setBusy(true);
    try { await api('/api/fb/groups', { method: 'POST', body: { ...f, members: Number(f.members) || 0, cost: Number(f.cost) || 0, cooldown_days: Number(f.cooldown_days) || 0 } }); toast('Đã thêm group'); onSaved(); onClose(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} title="Thêm group Facebook">
      <div className="stack">
        <Field label="Tên group *"><input className="input" value={f.name} onChange={set('name')} placeholder="VD: Hội Reviewer Mỹ Phẩm Việt" /></Field>
        <Field label="Link group"><input className="input" value={f.url} onChange={set('url')} placeholder="https://www.facebook.com/groups/…" /></Field>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Lĩnh vực"><select className="select" value={f.niche} onChange={set('niche')}><option value="">Nhiều lĩnh vực</option>{NICHES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}</select></Field>
          <Field label="Thành viên"><input className="input" type="number" min="0" value={f.members} onChange={set('members')} /></Field>
          <Field label="Quy định đăng"><select className="select" value={f.post_policy} onChange={set('post_policy')}>{FB_POST_POLICY.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}</select></Field>
          <Field label="Chi phí / bài (VNĐ)"><input className="input" type="number" min="0" value={f.cost} onChange={set('cost')} /></Field>
          <Field label="Nghỉ giữa 2 bài (ngày)" hint="Tránh spam group"><input className="input" type="number" min="0" value={f.cooldown_days} onChange={set('cooldown_days')} /></Field>
        </div>
        <Field label="Ghi chú"><textarea className="textarea" rows={2} value={f.note} onChange={set('note')} placeholder="Admin tên gì, ngày được đăng, luật riêng…" /></Field>
        {err && <div className="alert alert-error small">⚠ {err}</div>}
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : 'Thêm group'}</button>
      </div>
    </Modal>
  );
}

function Composer({ groups, camps, toast, onChanged, draft, setDraft }) {
  const [g, setG] = useState('');
  const [c, setC] = useState('');
  const [angle, setAngle] = useState(POST_ANGLES[0].v);
  const [busy, setBusy] = useState('');
  const [body, setBody] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [poster, setPoster] = useState('');
  const [err, setErr] = useState('');
  const [warn, setWarn] = useState([]);
  const post = draft;
  const group = groups.find(x => String(x.id) === String(post ? post.group_id : g));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = post?.code ? `${origin}/j/${post.code}` : '';
  const usable = groups.filter(x => !['banned', 'paused'].includes(x.status));

  const compose = async () => {
    if (!g) return setErr('Chọn group.');
    setBusy('compose'); setErr('');
    try {
      const r = await api('/api/fb/posts', { method: 'POST', body: { group_id: Number(g), campaign_id: c ? Number(c) : null, angle } });
      const p = r.post || r;
      setDraft(p); setBody(p.body || ''); setPostUrl(''); setWarn(r.warnings || []); onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const markPosted = async () => {
    if (!poster.trim()) return setErr('Ghi tên người đã đăng bài (người thật).');
    if (!/^https?:\/\/(www\.|m\.|web\.)?facebook\.com\//i.test(postUrl.trim()) && !/^https?:\/\/fb\.(com|me)\//i.test(postUrl.trim())) return setErr('Dán link bài viết Facebook (https://facebook.com/…).');
    setBusy('posted'); setErr('');
    try {
      await api(`/api/fb/posts/${post.id}`, { method: 'PATCH', body: { status: 'posted', post_url: postUrl.trim(), poster: poster.trim() } });
      toast('Đã ghi nhận bài đăng — link tracking bắt đầu đếm'); setDraft(null); setBody(''); setPostUrl(''); onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const text = body || post?.body || '';
  const isPage = group?.post_policy === 'page';
  const publishPage = async () => {
    setBusy('page'); setErr('');
    try {
      const r = await api(`/api/fb/posts/${post.id}`, { method: 'PATCH', body: { action: 'publish_page', message: text } });
      toast('Đã đăng lên Fanpage'); setDraft(null); setBody(''); onChanged();
      if (r.post?.post_url) window.open(r.post.post_url, '_blank', 'noopener');
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  return (
    <div id="composer" className="card stack" style={{ gap: 12 }}>
      <div className="card-title" style={{ marginBottom: 0 }}>✍ Soạn bài đăng</div>
      {!post ? (
        <>
          <div className="grid g3" style={{ gap: 10 }}>
            <Field label="Group">
              <select className="select" value={g} onChange={e => { setG(e.target.value); setErr(''); }}>
                <option value="">Chọn group…</option>
                {usable.map(x => <option key={x.id} value={x.id}>{x.ready === false ? '⏸ ' : '✓ '}{x.name}</option>)}
              </select>
            </Field>
            <Field label="Chiến dịch"><select className="select" value={c} onChange={e => setC(e.target.value)}><option value="">Tuyển chung</option>{camps.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            <Field label="Góc tiếp cận"><select className="select" value={angle} onChange={e => setAngle(e.target.value)}>{POST_ANGLES.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}</select></Field>
          </div>
          {group && group.ready === false && <div className="alert alert-warn small">⏸ Group đang trong thời gian nghỉ — nên đăng sau {fmtDate(group.next_post_at)}.</div>}
          {group && group.post_policy && group.post_policy !== 'free' && <div className="xs muted">Quy định group: {policyLabel(group.post_policy)}{group.note ? ` · ${group.note}` : ''}</div>}
          {err && <div className="alert alert-error small">⚠ {err}</div>}
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy === 'compose' || !g} onClick={compose}>{busy === 'compose' ? 'Đang soạn…' : 'Soạn bài + tạo link tracking'}</button>
        </>
      ) : (
        <>
          <div className="row wrap" style={{ gap: 6 }}>
            <Badge tone="blue">{group?.name || `Group #${post.group_id}`}</Badge>
            <Badge tone="violet">{angleLabel(post.angle)}</Badge>
            {post.code && <Badge tone="slate">Mã {post.code}</Badge>}
          </div>
          <Field label="Nội dung (có thể sửa trước khi copy)"><textarea className="textarea small" rows={10} value={text} onChange={e => setBody(e.target.value)} /></Field>
          {warn.map(w => <div key={w} className="alert alert-warn small">⚠ {w}</div>)}
          {link && <div className="xs muted" style={{ overflowWrap: 'anywhere' }}>Link tracking: <code>{link}</code></div>}
          <div className="row wrap">
            <button className="btn btn-primary" onClick={async () => toast((await copy(text)) ? 'Đã copy nội dung' : 'Không copy được — chọn và copy thủ công')}>⧉ Copy nội dung</button>
            {group?.url && <a className="btn" href={group.url} target="_blank" rel="noreferrer">↗ Mở group</a>}
            <button className="btn btn-sm" onClick={() => { setDraft(null); setBody(''); setErr(''); setWarn([]); }}>Soạn bài khác</button>
          </div>
          {isPage && (
            <div className="stack" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 12, gap: 8 }}>
              <div className="small muted">Đây là <b>Fanpage của brand</b> — có thể đăng tự động qua Facebook API (được phép). Sau khi đăng, share bài từ Fanpage vào group bằng tay.</div>
              {err && <div className="alert alert-error small">⚠ {err}</div>}
              <button className="btn btn-accent" style={{ alignSelf: 'flex-start' }} disabled={busy === 'page'} onClick={publishPage}>{busy === 'page' ? 'Đang đăng…' : '🚀 Đăng lên Fanpage ngay'}</button>
            </div>
          )}
          {!isPage && <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 12 }} className="stack">
            <div className="small muted">Sau khi <b>tự tay</b> đăng bài trong group, dán link bài viết để đo phễu:</div>
            <div className="grid g2" style={{ gap: 10 }}>
              <Field label="Người đăng *"><input className="input input-sm" value={poster} onChange={e => { setPoster(e.target.value); setErr(''); }} placeholder="Tên người thật đã đăng" /></Field>
              <Field label="Link bài viết *"><input className="input input-sm" value={postUrl} onChange={e => { setPostUrl(e.target.value); setErr(''); }} placeholder="https://www.facebook.com/groups/…/posts/…" /></Field>
            </div>
            {err && <div className="alert alert-error small">⚠ {err}</div>}
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy === 'posted' || !postUrl.trim()} onClick={markPosted}>{busy === 'posted' ? 'Đang lưu…' : '✓ Đã đăng'}</button>
          </div>}
        </>
      )}
    </div>
  );
}

function Posts({ posts, groups, toast, onChanged, onResume, error }) {
  const byId = Object.fromEntries(groups.map(g => [g.id, g]));
  const removed = async p => {
    if (!window.confirm('Đánh dấu bài này bị admin group gỡ? Bị gỡ 2 lần trong cùng group → group chuyển "Bị chặn".')) return;
    try { await api(`/api/fb/posts/${p.id}`, { method: 'PATCH', body: { status: 'removed' } }); toast('Đã ghi nhận bài bị gỡ'); onChanged(); }
    catch (e) { toast(e.message); }
  };
  return (
    <div className="card">
      <div className="card-title">Bài gần đây</div>
      {error && <div className="alert alert-error small">⚠ {error}</div>}
      {posts.slice(0, 20).map(p => {
        const st = POST_STATUS[p.status] || { l: p.status, tone: 'slate' };
        return (
          <div key={p.id} className="feed-item" style={{ alignItems: 'center' }}>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="small bold ellipsis">{byId[p.group_id]?.name || p.group_name || `Group #${p.group_id}`}</div>
              <div className="xs muted ellipsis">{angleLabel(p.angle)} · {p.code} · {p.posted_at ? fmtDateTime(p.posted_at) : `tạo ${fmtDateTime(p.created_at)}`}{p.poster ? ` · ${p.poster}` : ''}</div>
            </div>
            <span className="tnum small bold" title="Lượt click link tracking">{fmtNum(p.clicks)} click</span>
            <Badge tone={st.tone} dot>{st.l}</Badge>
            {p.status === 'draft' && <button className="btn btn-sm" onClick={() => onResume(p)}>Tiếp tục</button>}
            {p.status === 'posted' && (
              <>
                {p.post_url && <a className="btn btn-sm hide-sm" href={p.post_url} target="_blank" rel="noreferrer">↗</a>}
                <button className="btn btn-sm btn-danger" onClick={() => removed(p)}>Bị gỡ</button>
              </>
            )}
          </div>
        );
      })}
      {!posts.length && !error && <div className="empty">Chưa có bài nào. Soạn bài đầu tiên ở khung bên cạnh.</div>}
    </div>
  );
}

export default function Recruit({ toast }) {
  const groupsL = useLoad(() => api('/api/fb/groups'), []);
  const postsL = useLoad(() => api('/api/fb/posts'), []);
  const campsL = useLoad(() => api('/api/campaigns'), []);
  const settings = useLoad(() => api('/api/admin/settings'), []);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(null);
  const groups = groupsL.data?.groups || [];
  const posts = postsL.data?.posts || [];
  const camps = (campsL.data?.campaigns || []).filter(c => c.status !== 'completed');
  const reloadAll = () => { groupsL.reload(); postsL.reload(); };

  const patchGroup = async (id, body) => { try { await api(`/api/fb/groups/${id}`, { method: 'PATCH', body }); groupsL.reload(); } catch (e) { toast(e.message); } };
  const delGroup = async g => { if (!window.confirm(`Xoá group “${g.name}” và toàn bộ bài đăng của group?`)) return; try { await api(`/api/fb/groups/${g.id}`, { method: 'DELETE' }); toast('Đã xoá group'); reloadAll(); } catch (e) { toast(e.message); } };

  const sum = groups.reduce((a, g) => ({ clicks: a.clicks + (Number(g.clicks) || 0), signups: a.signups + (Number(g.signups) || 0), activated: a.activated + (Number(g.activated) || 0), gmv: a.gmv + (Number(g.gmv) || 0), cost: a.cost + (Number(g.cost_total) || 0) }), { clicks: 0, signups: 0, activated: 0, gmv: 0, cost: 0 });
  const ready = groups.filter(g => g.ready && g.status === 'active').length;
  const sorted = [...groups].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Tuyển qua group Facebook</h1><div className="small muted">Đo mỗi group bằng creator kích hoạt (có video được duyệt) và GMV — không bằng số signup</div></div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>＋ Thêm group</button>
      </div>

      <NoBotBanner />

      <div className="grid g4">
        <Kpi label="Group sẵn sàng đăng" value={`${ready}/${groups.length}`} />
        <Kpi label="Click → Signup" value={`${fmtNum(sum.clicks)} → ${fmtNum(sum.signups)}`} sub={`CR ${pct(sum.signups, sum.clicks)}`} />
        <Kpi hero label="Creator kích hoạt" value={fmtNum(sum.activated)} sub={`GMV ${fmtMoney(sum.gmv)}đ`} />
        <Kpi label="CPA kích hoạt" value={sum.activated ? fmtMoney(sum.cost / sum.activated) + 'đ' : '—'} sub={`Chi phí ${fmtMoney(sum.cost)}đ`} />
      </div>

      <div className="card-flat table-wrap">
        <table className="table">
          <thead><tr>
            <th>Group</th><th>Trạng thái</th><th className="hide-sm">Bài</th><th>Click</th><th>Signup</th><th className="hide-sm">Duyệt</th><th className="hide-sm">Chốt deal</th><th>Kích hoạt</th><th className="hide-sm">GMV</th><th className="hide-sm">CPA</th><th className="hide-sm">Score</th><th className="hide-sm" />
          </tr></thead>
          <tbody>
            {sorted.map(g => {
              const st = FB_GROUP_STATUS[g.status] || { l: g.status, tone: 'slate' };
              return (
                <tr key={g.id}>
                  <td>
                    <div className="bold ellipsis" style={{ maxWidth: 220 }}>{g.url ? <a className="link" href={g.url} target="_blank" rel="noreferrer">{g.name}</a> : g.name}</div>
                    <div className="xs muted">{fmtNum(g.members)} TV · {g.niche ? nicheLabel(g.niche) : 'Nhiều LV'} · {policyLabel(g.post_policy)}</div>
                  </td>
                  <td>
                    <div className="stack" style={{ gap: 4, alignItems: 'flex-start' }}>
                      <select className="select input-sm" style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }} value={g.status} onChange={e => patchGroup(g.id, { status: e.target.value })} aria-label="Trạng thái group">
                        {Object.entries(FB_GROUP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                      </select>
                      {g.status === 'active' && (g.ready ? <Badge tone="green" dot>Sẵn sàng đăng</Badge> : <Badge tone={st.tone === 'green' ? 'amber' : st.tone}>Nghỉ đến {fmtDate(g.next_post_at)}</Badge>)}
                    </div>
                  </td>
                  <td className="hide-sm tnum">{fmtNum(g.posts)}</td>
                  <td className="tnum">{fmtNum(g.clicks)}</td>
                  <td className="tnum">{fmtNum(g.signups)}<div className="xs muted">{pct(g.signups, g.clicks)}</div></td>
                  <td className="hide-sm tnum">{fmtNum(g.approved)}</td>
                  <td className="hide-sm tnum">{fmtNum(g.booked)}</td>
                  <td className="tnum bold" style={{ color: Number(g.activated) > 0 ? 'var(--brand-700)' : undefined }}>{fmtNum(g.activated)}</td>
                  <td className="hide-sm tnum">{fmtMoney(g.gmv)}đ</td>
                  <td className="hide-sm tnum">{g.cpa !== null && g.cpa !== undefined && Number(g.activated) > 0 ? fmtMoney(g.cpa) + 'đ' : '—'}</td>
                  <td className="hide-sm tnum bold">{g.score !== undefined && g.score !== null ? Number(g.score).toFixed(1) : '—'}</td>
                  <td className="hide-sm"><button className="btn btn-sm btn-danger" onClick={() => delGroup(g)} aria-label="Xoá group">✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {groupsL.loading && !groupsL.data && <div className="empty">Đang tải…</div>}
        {groupsL.error && <div className="alert alert-error" style={{ margin: 12 }}>⚠ {groupsL.error} <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={groupsL.reload}>Thử lại</button></div>}
        {groupsL.data?.score_formula && groups.length > 0 && <div className="xs muted" style={{ padding: '8px 12px' }}>Score = {String(groupsL.data.score_formula).replace(/^\s*score\s*=\s*/i, "")}</div>}
        {groupsL.data && !groups.length && <div className="empty">Chưa có group. Thêm group creator (review mỹ phẩm, mẹ bỉm, KOC…) để bắt đầu đo phễu.</div>}
      </div>

      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <Composer groups={groups} camps={camps} toast={toast} onChanged={reloadAll} draft={draft} setDraft={setDraft} />
        <Posts posts={posts} groups={groups} toast={toast} onChanged={reloadAll} error={postsL.error} onResume={p => { setDraft(p); document.getElementById('composer')?.scrollIntoView({ behavior: 'smooth' }); }} />
      </div>

      {adding && <GroupModal onClose={() => setAdding(false)} onSaved={groupsL.reload} toast={toast} cooldown={settings.data?.rules?.fb_default_cooldown_days} />}
    </div>
  );
}
