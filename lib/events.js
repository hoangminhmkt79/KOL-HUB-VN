import { query } from './db';

// db: pool hoặc client trong transaction
export async function logEvent(db, { type, creator_id = null, sample_id = null, video_id = null, actor = 'system', message = '' }) {
  await (db || { query }).query(
    'INSERT INTO events (type, creator_id, sample_id, video_id, actor, message) VALUES ($1,$2,$3,$4,$5,$6)',
    [type, creator_id, sample_id, video_id, actor, message]
  );
}
