import { useState, useEffect } from 'react';
import { api, useLoad, Field, Badge, copy } from '../ui';
import { NICHES, fmtDateTime } from '../../lib/constants';

const RULE_FIELDS = [
  ['Sàng lọc đơn đăng ký', [
    ['auto_screen', 'Tự động duyệt / phân loại đơn mới', 'bool'],
    ['auto_reject', 'Tự từ chối đơn dưới ngưỡng (tắt = để "Chờ duyệt")', 'bool'],
    ['approve_min_score', 'Duyệt khi engagement ≥', 'num'],
    ['approve_min_followers', 'và followers ≥', 'num'],
    ['reject_max_score', 'Loại khi engagement <', 'num'],
    ['reject_min_followers', 'Loại khi followers <', 'num'],
    ['suspicious_score', 'Nghi khai khống khi views/followers >', 'num'],
  ]],
  ['SLA content & vòng đời', [
    ['content_sla_days', 'Hạn đăng video sau khi nhận mẫu (ngày)', 'num'],
    ['remind_before_days', 'Nhắc trước hạn (ngày)', 'num'],
    ['inactive_after_overdue_days', 'Chuyển Inactive sau khi trễ (ngày)', 'num'],
    ['auto_approve_verified_video', 'Tự duyệt video đúng kênh đã đăng ký', 'bool'],
    ['scale_min_gmv', 'Chuyển Scaling khi GMV ≥ (VNĐ)', 'num'],
    ['scale_min_views', 'hoặc tổng views ≥', 'num'],
  ]],
  ['Map đơn TikTok', [
    ['only_zero_value_orders', 'Chỉ lấy đơn 0đ (đơn mẫu) khi import / sync', 'bool'],
  ]],
];

function Rules({ toast }) {
  const { data, reload } = useLoad(() => api('/api/admin/settings'), []);
  const [rules, setRules] = useState(null);
  useEffect(() => { if (data) setRules(data.rules); }, [data]);
  if (!rules) return <div className="card empty">Đang tải…</div>;
  const it = data.integrations;
  const save = async () => { try { await api('/api/admin/settings', { method: 'PUT', body: { rules } }); toast('Đã lưu rule'); reload(); } catch (e) { toast(e.message); } };

  return (
    <>
      <div className="card">
        <div className="card-title">Kết nối</div>
        <div className="grid g2" style={{ gap: 8 }}>
          {[
            ['TikTok Shop API', it.tiktok, it.tiktok_sync?.last_synced_at ? `Sync lần cuối ${fmtDateTime(it.tiktok_sync.last_synced_at)}` : 'Env: TTS_APP_KEY, TTS_APP_SECRET, TTS_ACCESS_TOKEN, TTS_SHOP_CIPHER'],
            ['Cron hằng ngày', it.cron, it.cron ? 'Chạy 8:00 sáng mỗi ngày (vercel.json)' : 'Env: CRON_SECRET'],
            ['Telegram', it.telegram, 'Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID'],
            ['Webhook (Slack/Lark/n8n…)', it.webhook, 'Env: NOTIFY_WEBHOOK_URL'],
          ].map(([l, on, hint]) => (
            <div key={l} className="row" style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px', alignItems: 'flex-start' }}>
              <Badge tone={on ? 'green' : 'slate'} dot>{on ? 'Bật' : 'Tắt'}</Badge>
              <div className="grow"><b className="small">{l}</b><div className="xs muted">{hint}</div></div>
            </div>
          ))}
        </div>
      </div>
      {RULE_FIELDS.map(([title, fields]) => (
        <div key={title} className="card">
          <div className="card-title">{title}</div>
          <div className="grid g2" style={{ gap: 10 }}>
            {fields.map(([k, l, t]) => t === 'bool' ? (
              <label key={k} className="row small" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={!!rules[k]} onChange={e => setRules(p => ({ ...p, [k]: e.target.checked }))} /> {l}
              </label>
            ) : (
              <Field key={k} label={l}><input className="input input-sm" type="number" step="any" value={rules[k]} onChange={e => setRules(p => ({ ...p, [k]: e.target.value }))} /></Field>
            ))}
          </div>
        </div>
      ))}
      <div className="row"><button className="btn btn-primary" onClick={save}>Lưu rule</button><button className="btn" onClick={() => setRules(data.defaults)}>Về mặc định</button></div>
    </>
  );
}

function Recruit({ toast }) {
  const [handles, setHandles] = useState('');
  const [niche, setNiche] = useState('');
  const [out, setOut] = useState(null);
  const run = async () => {
    try { const r = await api('/api/creators/invite', { method: 'POST', body: { handles, niche } }); setOut(r); toast(`Đã tạo ${r.created} lời mời`); }
    catch (e) { toast(e.message); }
  };
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <div className="card">
      <div className="card-title">🎯 Tuyển chủ động</div>
      <div className="small muted" style={{ marginBottom: 10 }}>
        Dán danh sách @handle (lấy từ TikTok Creator Marketplace, đối thủ, hashtag…). Hệ thống tạo hồ sơ “Được mời” + link cá nhân hoá.
        Khi creator mở link và điền form, hồ sơ tự nâng cấp và đi qua sàng lọc tự động.
      </div>
      <div className="stack">
        <textarea className="textarea" rows={4} value={handles} onChange={e => setHandles(e.target.value)} placeholder={'@creator1\n@creator2, tiktok.com/@creator3'} />
        <div className="row">
          <select className="select input-sm" style={{ width: 'auto' }} value={niche} onChange={e => setNiche(e.target.value)}><option value="">Lĩnh vực…</option>{NICHES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}</select>
          <button className="btn btn-primary btn-sm" disabled={!handles.trim()} onClick={run}>Tạo lời mời</button>
        </div>
        {out && (
          <div>
            {out.existed.length > 0 && <div className="xs muted">Đã có trong hệ thống: {out.existed.map(h => '@' + h).join(', ')}</div>}
            {out.links.length > 0 && (
              <>
                <textarea className="textarea small" rows={Math.min(8, out.links.length + 1)} readOnly value={out.links.map(l => `@${l.handle}: ${l.url}`).join('\n')} />
                <button className="btn btn-sm" onClick={async () => toast((await copy(out.links.map(l => `@${l.handle}: ${l.url}`).join('\n'))) ? 'Đã copy' : 'Không copy được')}>Copy tất cả link</button>
              </>
            )}
          </div>
        )}
        <div className="alert alert-info small">🔁 <span>Vòng lặp giới thiệu: mỗi creator có mã ref riêng trong portal (<code>{origin}/?ref=MÃ</code>). Người được giới thiệu được ghi nhận nguồn “referral”.</span></div>
      </div>
    </div>
  );
}

function Log() {
  const { data, reload } = useLoad(() => api('/api/admin/events?limit=120'), []);
  return (
    <div className="card">
      <div className="card-title">Nhật ký hệ thống <button className="btn btn-sm" onClick={reload}>↻</button></div>
      <div style={{ maxHeight: 520, overflowY: 'auto' }}>
        {(data?.events || []).map(e => (
          <div key={e.id} className="feed-item">
            <span className="xs muted tnum" style={{ width: 88, flexShrink: 0 }}>{fmtDateTime(e.created_at)}</span>
            <div className="grow small">{e.creator_name && <b>{e.creator_name} · </b>}{e.message}</div>
            <span className="xs muted">{e.actor === 'system' ? '🤖' : e.actor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Automation({ toast }) {
  const [busy, setBusy] = useState('');
  const act = async (key, url, fmt) => {
    setBusy(key);
    try { toast(fmt(await api(url, { method: 'POST' }))); } catch (e) { toast(e.message); } finally { setBusy(''); }
  };
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head">
        <div><h1 className="section-title">Automation</h1><div className="small muted">Rule tự động, tuyển chủ động, nhật ký</div></div>
        <div className="row">
          <button className="btn" disabled={!!busy} onClick={() => act('setup', '/api/admin/setup', () => 'Database đã được khởi tạo / nâng cấp')}>🛠 Khởi tạo / nâng cấp DB</button>
          <button className="btn btn-primary" disabled={!!busy} onClick={() => act('tick', '/api/automation/run', r => `Đã chạy: ${r.screened} sàng lọc · ${r.reminders} nhắc · ${r.overdue} trễ · ${r.inactive} inactive · ${r.scaled} scale`)}>{busy === 'tick' ? 'Đang chạy…' : '▶ Chạy automation ngay'}</button>
        </div>
      </div>
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ gap: 14 }}><Rules toast={toast} /></div>
        <div className="stack" style={{ gap: 14 }}><Recruit toast={toast} /><Log /></div>
      </div>
    </div>
  );
}
