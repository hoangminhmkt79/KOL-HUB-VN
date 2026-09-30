// Bảng giá creator tự khai (form đăng ký bước "Mức cast" + portal). Dùng chung validate + lưu.
import { HttpError } from './http';

const bad = m => { throw new HttpError(400, m); };
export const RC_COLS = 'video_fee, live_hour_fee, commission_pct, spark_fee_pct, accepts_barter, videos_per_month, deal_types, note, updated_at';
const DEAL_TYPES = ['barter', 'hybrid', 'fee'];

export function parseRateCard(b) {
  const money = (k, label) => {
    if (b[k] === undefined || b[k] === null || b[k] === '') return null;
    const n = Number(b[k]);
    if (!Number.isInteger(n) || n < 0 || n > 1e10) bad(`${label} không hợp lệ (số nguyên ≥ 0).`);
    return n;
  };
  const pct = (k, label) => {
    if (b[k] === undefined || b[k] === null || b[k] === '') return null;
    const n = Number(b[k]);
    if (!Number.isFinite(n) || n < 0 || n > 100) bad(`${label} không hợp lệ (0–100).`);
    return Math.round(n * 100) / 100;
  };
  let vpm = null;
  if (b.videos_per_month !== undefined && b.videos_per_month !== null && b.videos_per_month !== '') {
    vpm = Number(b.videos_per_month);
    if (!Number.isInteger(vpm) || vpm < 1 || vpm > 60) bad('Số video / tháng không hợp lệ (1–60).');
  }
  const types = (Array.isArray(b.deal_types) ? b.deal_types : String(b.deal_types || '').split(','))
    .map(x => String(x).trim()).filter(x => DEAL_TYPES.includes(x));
  const dealTypes = types.length ? [...new Set(types)] : (b.accepts_barter === false ? ['hybrid', 'fee'] : DEAL_TYPES);
  const videoFee = money('video_fee', 'Giá / video');
  if (b.require_fee && dealTypes.some(t => t !== 'barter') && videoFee === null) bad('Nhập giá mong muốn / video cho hình thức có phí.');
  return {
    video_fee: videoFee, live_hour_fee: money('live_hour_fee', 'Giá / giờ live'),
    commission_pct: pct('commission_pct', '% hoa hồng'), spark_fee_pct: pct('spark_fee_pct', '% phí spark code'),
    accepts_barter: dealTypes.includes('barter'), videos_per_month: vpm, deal_types: dealTypes.join(','),
    note: String(b.note || '').trim().slice(0, 1000),
  };
}

export async function saveRateCard(db, creatorId, rc) {
  const r = await db.query(
    `INSERT INTO rate_cards (creator_id, video_fee, live_hour_fee, commission_pct, spark_fee_pct, accepts_barter, videos_per_month, deal_types, note, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     ON CONFLICT (creator_id) DO UPDATE SET video_fee=EXCLUDED.video_fee, live_hour_fee=EXCLUDED.live_hour_fee, commission_pct=EXCLUDED.commission_pct,
       spark_fee_pct=EXCLUDED.spark_fee_pct, accepts_barter=EXCLUDED.accepts_barter, videos_per_month=EXCLUDED.videos_per_month,
       deal_types=EXCLUDED.deal_types, note=EXCLUDED.note, updated_at=NOW()
     RETURNING ${RC_COLS}`,
    [creatorId, rc.video_fee, rc.live_hour_fee, rc.commission_pct, rc.spark_fee_pct, rc.accepts_barter, rc.videos_per_month, rc.deal_types, rc.note]
  );
  return normRateCard(r.rows[0]);
}

export function normRateCard(rc) {
  if (!rc) return null;
  const out = { ...rc };
  for (const k of ['video_fee', 'live_hour_fee', 'commission_pct', 'spark_fee_pct']) if (out[k] !== null && out[k] !== undefined) out[k] = Number(out[k]);
  out.deal_types = String(out.deal_types || '').split(',').filter(Boolean);
  return out;
}
