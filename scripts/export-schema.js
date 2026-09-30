// Xuất lib/schema.js → database.sql (để dán vào Neon / Supabase SQL Editor)
const fs = require('fs');
const path = require('path');
const { SCHEMA_SQL } = require('../lib/schema');
const out = `-- KOL Hub — tự sinh từ lib/schema.js (npm run schema). Chạy lại an toàn.\n${SCHEMA_SQL.trim()}\n`;
fs.writeFileSync(path.join(__dirname, '..', 'database.sql'), out);
console.log('database.sql updated');
