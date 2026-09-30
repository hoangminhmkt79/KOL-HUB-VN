import { useEffect, useState, useCallback } from 'react';
import { CREATOR_STATUS, SAMPLE_STATUS, VIDEO_STATUS } from '../lib/constants';

// ---------- API client ----------
export async function api(url, { method = 'GET', body } = {}) {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/portal')) {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/')) window.location.href = '/admin';
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Lỗi ${r.status}`);
  return d;
}

// ---------- Hooks ----------
export function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 3200); return () => clearTimeout(t); }, [msg]);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return [node, setMsg];
}

export function useLoad(fn, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fn()); setError(''); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}

// ---------- Primitives ----------
export const Badge = ({ tone = 'slate', children, dot }) => (
  <span className={`badge tone-${tone}`}>{dot && <span className="dot" />}{children}</span>
);

const statusBadge = map => ({ s }) => {
  const m = map[s] || { l: s, tone: 'slate' };
  return <Badge tone={m.tone} dot>{m.l}</Badge>;
};
export const CreatorStatus = statusBadge(CREATOR_STATUS);
export const SampleStatus = statusBadge(SAMPLE_STATUS);
export const VideoStatus = statusBadge(VIDEO_STATUS);

const AV = ['#0e9f6e', '#2463d6', '#ff7a59', '#7147d6', '#d4403a', '#0891b2', '#b86e00'];
export const Avatar = ({ name = '?', size = 32 }) => {
  const n = String(name || '?');
  return <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * .42), background: AV[n.charCodeAt(0) % AV.length] }}>{n[0].toUpperCase()}</span>;
};

export const Kpi = ({ label, value, sub, hero, tone }) => (
  <div className={`kpi${hero ? ' kpi-hero' : ''}`}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

export const Field = ({ label, hint, children }) => (
  <div>
    {label && <label className="label">{label}</label>}
    {children}
    {hint && <div className="hint">{hint}</div>}
  </div>
);

export function Drawer({ onClose, title, sub, actions, children }) {
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head row-between">
          <div className="grow"><div className="bold ellipsis">{title}</div>{sub && <div className="small muted ellipsis">{sub}</div>}</div>
          <div className="row">{actions}<button className="btn btn-sm" onClick={onClose} aria-label="Đóng">✕</button></div>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ onClose, title, children }) {
  return (
    <div className="overlay modal-wrap" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <div className="bold" style={{ fontSize: 16 }}>{title}</div>
          <button className="btn btn-sm" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Steps({ labels, current, late }) {
  return (
    <div className="steps">
      {labels.map((l, i) => <div key={l} className={i <= current ? (late && i === current ? 'late' : 'done') : ''}>{l}</div>)}
    </div>
  );
}

// ---------- CSV (chạy ở trình duyệt, hỗ trợ dấu ngoặc kép, BOM, ; hoặc ,) ----------
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : (firstLine.includes('\t') ? '\t' : ',');
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c !== '')) rows.push(row);
  if (rows.length < 2) return [];
  const head = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const copy = async text => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };

// ---------- v3: tiền, đếm ngược, số liệu nhỏ ----------
export const vnd = n => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`;

export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

// "còn 2 ngày 4 giờ" / "còn 3 giờ 12 phút" / "đã hết hạn"
export function timeLeft(to, now = Date.now()) {
  if (!to) return null;
  const ms = new Date(to).getTime() - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return { text: 'đã hết hạn', tone: 'red', ms };
  const m = Math.floor(ms / 6e4), h = Math.floor(m / 60), d = Math.floor(h / 24);
  const text = d >= 1 ? `còn ${d} ngày ${h % 24} giờ` : h >= 1 ? `còn ${h} giờ ${m % 60} phút` : `còn ${m} phút`;
  return { text, tone: h < 12 ? 'red' : h < 24 ? 'amber' : 'blue', ms };
}

export function Countdown({ to, prefix = '⏳ ' }) {
  const now = useNow(30000);
  const t = timeLeft(to, now);
  if (!t) return null;
  return <span className={`badge tone-${t.tone}`}>{prefix}{t.text}</span>;
}

export const Stat = ({ label, value, tone }) => (
  <div className="stat-box"><div className="xs muted bold">{label}</div><div className="bold tnum" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div></div>
);
