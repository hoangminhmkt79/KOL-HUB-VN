const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL || '';
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: process.env.NODE_ENV === 'production' && !local ? { rejectUnauthorized: false } : false,
      max: 5,
    });
  }
  return pool;
}

// Tự tạo / nâng cấp bảng 1 lần mỗi lần server khởi động → deploy xong là chạy, không cần bấm "Khởi tạo DB".
// Tắt bằng AUTO_MIGRATE=0.
let migrated = null;
function ensureSchema() {
  if (process.env.AUTO_MIGRATE === '0') return Promise.resolve();
  if (!migrated) {
    const { SCHEMA_SQL } = require('./schema');
    migrated = getPool().query(SCHEMA_SQL).catch(e => {
      migrated = null; // lần sau thử lại (vd: 2 instance cùng tạo index)
      console.error('auto-migrate failed:', e.message);
    });
  }
  return migrated;
}

const query = async (text, params) => { await ensureSchema(); return getPool().query(text, params); };

async function tx(fn) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { getPool, query, tx, ensureSchema };
