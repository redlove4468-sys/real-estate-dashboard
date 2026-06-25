import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const raw = readFileSync('/home/ubuntu/webdev-static-assets/rdb/TB_Client.json', 'utf-8');
const data = JSON.parse(raw);

function toDateStr(s) {
  if (!s || !s.trim()) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s/);
  if (!m) return null;
  const mo = parseInt(m[1]);
  const d = parseInt(m[2]);
  const y = parseInt(m[3]);
  const year = y < 50 ? 2000 + y : 1900 + y;
  return `${year}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

const conn = await mysql.createConnection(DATABASE_URL);
console.log('Connected to DB');

let ok = 0, err = 0, noDate = 0;
for (const item of data) {
  const idx = item['\uc778\ub371\uc2a4'];
  if (!idx) continue;
  const status = String(item['iClientStatus'] || '1') === '0' ? 'hold' : 'active';
  const dateStr = toDateStr(item['\uc811\uc218\uc77c\uc790'] || '');
  try {
    if (dateStr) {
      await conn.execute(
        'UPDATE client SET status=?, receivedAt=? WHERE rdbIndex=?',
        [status, dateStr, idx]
      );
    } else {
      noDate++;
      await conn.execute(
        'UPDATE client SET status=? WHERE rdbIndex=?',
        [status, idx]
      );
    }
    ok++;
  } catch(e) {
    err++;
    console.error('Error for idx', idx, e.message);
  }
}

await conn.end();
console.log(`Done: ok=${ok}, err=${err}, noDate=${noDate}, total=${data.length}`);

// 결과 확인
const conn2 = await mysql.createConnection(DATABASE_URL);
const [rows] = await conn2.execute('SELECT status, COUNT(*) as cnt FROM client GROUP BY status');
console.log('Status counts:', JSON.stringify(rows));
await conn2.end();
