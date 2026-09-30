import { api, useLoad, Kpi, Avatar } from '../ui';
import { fmtMoney, fmtNum, fmtDateTime, daysUntil } from '../../lib/constants';

const EVENT_TONE = {
  screen_approve: 'green', creator_scaling: 'green', video_submitted: 'violet', video_approved: 'green',
  sample_overdue: 'red', creator_inactive: 'red', screen_reject: 'red', sample_reminder: 'amber',
  sample_shipped: 'blue', sample_delivered: 'blue', creator_applied: 'amber', orders_imported: 'slate', orders_synced: 'slate',
};

export default function Overview({ go, openCreator }) {
  const { data, error, loading, reload } = useLoad(() => api('/api/admin/overview'), []);
  if (loading && !data) return <div className="empty">Đang tải…</div>;
  if (error) return <div className="alert alert-error">⚠ {error}</div>;
  const { funnel, kpi, perf, overdue, due_soon, top, events, trend, pending } = data;

  const postRate = perf.delivered ? Math.round((perf.posted / perf.delivered) * 100) : 0;
  const roi = Number(kpi.sample_spend) > 0 ? (Number(kpi.gmv) / Number(kpi.sample_spend)).toFixed(1) : null;
  const steps = [
    ['Đăng ký', funnel.applied],
    ['Được duyệt', funnel.approved],
    ['Đã nhận mẫu', funnel.sampled],
    ['Có video', funnel.posted],
    ['Ra GMV', funnel.converted],
  ];
  const maxF = Math.max(1, funnel.applied);
  const maxT = Math.max(1, ...trend.map(t => t.applied + t.videos));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <h1 className="section-title">Tổng quan</h1>
          <div className="small muted">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <div className="row">
          <button className="btn" onClick={reload}>↻ Làm mới</button>
          <button className="btn btn-primary" onClick={() => go('samples')}>＋ Import đơn mẫu</button>
        </div>
      </div>

      {/* Việc cần làm hôm nay */}
      {(kpi.to_review + kpi.to_ship + kpi.overdue + kpi.videos_to_review + kpi.unmatched) > 0 && (
        <div className="card" style={{ padding: '12px 16px', background: 'var(--accent-50)', borderColor: '#ffd9cc' }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="bold small" style={{ color: 'var(--accent)' }}>Cần xử lý:</span>
            {kpi.to_review > 0 && <button className="btn btn-sm" onClick={() => go('creators', { status: 'pending' })}>{kpi.to_review} hồ sơ chờ duyệt</button>}
            {kpi.to_ship > 0 && <button className="btn btn-sm" onClick={() => go('samples')}>{kpi.to_ship} đơn mẫu chờ gửi</button>}
            {kpi.overdue > 0 && <button className="btn btn-sm" onClick={() => go('samples')}>{kpi.overdue} creator trễ video</button>}
            {kpi.videos_to_review > 0 && <button className="btn btn-sm" onClick={() => go('videos')}>{kpi.videos_to_review} video chờ duyệt</button>}
            {kpi.unmatched > 0 && <button className="btn btn-sm" onClick={() => go('samples', { unmatched: 1 })}>{kpi.unmatched} đơn TikTok chưa map</button>}
          </div>
        </div>
      )}

      <div className="grid g4">
        <Kpi hero label="GMV từ creator" value={fmtMoney(kpi.gmv) + 'đ'} sub={roi ? `ROI mẫu ${roi}x (GMV / chi phí mẫu)` : 'Nhập chi phí mẫu để tính ROI'} />
        <Kpi label="Tỷ lệ ra video" value={`${postRate}%`} sub={`${perf.posted}/${perf.delivered} mẫu đã nhận`} tone={postRate >= 60 ? 'green' : postRate >= 30 ? 'amber' : 'red'} />
        <Kpi label="Đơn mẫu đang giao" value={fmtNum(kpi.in_transit)} sub={perf.avg_days_ship ? `TB ${Number(perf.avg_days_ship).toFixed(1)} ngày giao` : 'Chưa có dữ liệu giao'} />
        <Kpi label="Video 7 ngày" value={fmtNum(kpi.videos_7d)} sub={`${fmtNum(kpi.views)} views tổng`} />
      </div>

      {(data.deals || data.fb) && (
        <div className="grid g4">
          <Kpi label="Deal đang thương lượng" value={fmtNum(data.deals?.open)} sub={data.deals?.accept_rate !== undefined && data.deals?.accept_rate !== null ? `Tỷ lệ chốt ${Number(data.deals.accept_rate)}% · ${fmtNum(data.deals?.booked)} đã chốt` : `${fmtNum(data.deals?.booked)} deal đã chốt`} />
          <Kpi label="Phí đã cam kết" value={fmtMoney(data.deals?.committed) + 'đ'} sub={`Đã trả ${fmtMoney(data.deals?.paid)}đ`} />
          <Kpi label="Đến hạn trả creator" value={fmtMoney(data.deals?.due_payouts) + 'đ'} tone={Number(data.deals?.due_payouts) > 0 ? 'red' : undefined} sub={<span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => go('deals', { status: 'booked' })}>Mở tab Deals</span>} />
          <Kpi label="Tuyển group FB" value={`${fmtNum(data.fb?.activated)} kích hoạt`} sub={<span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => go('recruit')}>{fmtNum(data.fb?.clicks)} click · {fmtNum(data.fb?.signups)} signup · {fmtNum(data.fb?.groups)} group</span>} />
        </div>
      )}

      <div className="grid g-main">
        <div className="card">
          <div className="card-title">Funnel creator <span className="xs muted">conversion từ bước trước</span></div>
          {steps.map(([l, v], i) => {
            const prev = i ? steps[i - 1][1] : null;
            return (
              <div key={l} className="funnel-row">
                <div className="small bold">{l}</div>
                <div><div className="funnel-bar" style={{ width: `${Math.max(1, (v / maxF) * 100)}%`, opacity: 1 - i * 0.12 }} /></div>
                <div className="tnum small" style={{ textAlign: 'right' }}>
                  <b>{fmtNum(v)}</b>{prev ? <span className="muted"> · {prev ? Math.round((v / prev) * 100) : 0}%</span> : null}
                </div>
              </div>
            );
          })}
          {funnel.prospects > 0 && <div className="xs muted" style={{ marginTop: 6 }}>+ {funnel.prospects} creator được mời chưa điền form</div>}
        </div>

        <div className="card">
          <div className="card-title">14 ngày qua <span className="row xs muted" style={{ gap: 10 }}><span className="row" style={{ gap: 4 }}><span className="dot" style={{ color: 'var(--brand)' }} />Đăng ký</span><span className="row" style={{ gap: 4 }}><span className="dot" style={{ color: 'var(--accent)' }} />Video</span></span></div>
          <div className="bars">
            {trend.map(t => (
              <div key={t.day} title={`${t.day}: ${t.applied} đăng ký, ${t.videos} video`}>
                <span style={{ height: `${(t.videos / maxT) * 100}%`, background: 'var(--accent)' }} />
                <span style={{ height: `${(t.applied / maxT) * 100}%`, background: 'var(--brand)' }} />
              </div>
            ))}
          </div>
          <div className="row-between xs muted" style={{ marginTop: 6 }}><span>{trend[0]?.day}</span><span>{trend[trend.length - 1]?.day}</span></div>
        </div>
      </div>

      <div className="grid g3">
        <div className="card">
          <div className="card-title">⏰ Trễ / sắp tới hạn video</div>
          {[...overdue.map(s => ({ ...s, late: true })), ...due_soon].slice(0, 8).map(s => {
            const d = daysUntil(s.content_due_at);
            return (
              <div key={s.id} className="feed-item" style={{ cursor: 'pointer' }} onClick={() => openCreator(s.creator_id)}>
                <Avatar name={s.name} size={26} />
                <div className="grow"><div className="bold ellipsis">{s.name}</div><div className="xs muted ellipsis">{s.product || '—'}</div></div>
                <span className={`badge tone-${s.late ? 'red' : 'amber'}`}>{s.late ? `Trễ ${Math.abs(d)}n` : `Còn ${d}n`}</span>
              </div>
            );
          })}
          {!overdue.length && !due_soon.length && <div className="empty">Không có ai trễ hạn 🎉</div>}
        </div>

        <div className="card">
          <div className="card-title">Chờ duyệt (điểm cao trước)</div>
          {pending.map(c => (
            <div key={c.id} className="feed-item" style={{ cursor: 'pointer' }} onClick={() => openCreator(c.id)}>
              <Avatar name={c.name} size={26} />
              <div className="grow"><div className="bold ellipsis">{c.name}</div><div className="xs muted ellipsis">{c.screen_reason || `${fmtNum(c.followers)} followers`}</div></div>
              <span className="tnum bold small">{Number(c.score).toFixed(2)}</span>
            </div>
          ))}
          {!pending.length && <div className="empty">Hết hồ sơ chờ duyệt</div>}
        </div>

        <div className="card">
          <div className="card-title">🏆 Top creator GMV</div>
          {top.map(c => (
            <div key={c.id} className="feed-item" style={{ cursor: 'pointer' }} onClick={() => openCreator(c.id)}>
              <Avatar name={c.name} size={26} />
              <div className="grow"><div className="bold ellipsis">{c.name}</div><div className="xs muted">{fmtNum(c.views)} views{Number(c.spend) > 0 ? ` · ROI ${(c.gmv / c.spend).toFixed(1)}x` : ''}</div></div>
              <span className="bold small" style={{ color: 'var(--brand-700)' }}>{fmtMoney(c.gmv)}</span>
            </div>
          ))}
          {!top.length && <div className="empty">Chưa có GMV — import số liệu video ở tab Video</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Hoạt động gần đây <button className="btn btn-sm" onClick={() => go('automation')}>Xem tất cả</button></div>
        {events.map(e => (
          <div key={e.id} className="feed-item">
            <span className="feed-dot" style={{ background: `var(--${EVENT_TONE[e.type] || 'slate'})` }} />
            <div className="grow">
              {e.creator_name && <b style={{ cursor: 'pointer' }} onClick={() => openCreator(e.creator_id)}>{e.creator_name} · </b>}
              <span>{e.message}</span>
            </div>
            <span className="xs muted" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.created_at)}</span>
          </div>
        ))}
        {!events.length && <div className="empty">Chưa có hoạt động</div>}
      </div>
    </div>
  );
}

