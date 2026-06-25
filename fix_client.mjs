import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl.replace('mysql2://', 'mysql://'));
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1).split('?')[0],
  ssl: { rejectUnauthorized: false }
});

console.log('Connected!');

const data = JSON.parse(readFileSync('/home/ubuntu/webdev-static-assets/rdb/TB_Client.json', 'utf-8'));
console.log(`Total: ${data.length}`);

function parseDate(s) {
  if (!s || !s.trim()) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    let [,mo,d,y,h,mi,sec] = m;
    let year = parseInt(y) < 50 ? 2000+parseInt(y) : 1900+parseInt(y);
    return new Date(year, parseInt(mo)-1, parseInt(d), parseInt(h), parseInt(mi), parseInt(sec));
  }
  return null;
}

let updated = 0, errors = 0;
for (const item of data) {
  const rdbIdx = item['인덱스'];
  if (!rdbIdx) continue;
  const iStatus = String(item['iClientStatus'] || '1');
  const newStatus = iStatus === '0' ? 'hold' : 'active';
  const receivedDate = parseDate(item['접수일자']);
  try {
    if (receivedDate) {
      await conn.execute('UPDATE client SET status=?, receivedAt=? WHERE rdbIndex=?', [newStatus, receivedDate, rdbIdx]);
    } else {
      await conn.execute('UPDATE client SET status=? WHERE rdbIndex=?', [newStatus, rdbIdx]);
    }
    updated++;
  } catch(e) {
    errors++;
    if (errors <= 3) console.error('Error:', rdbIdx, e.message);
  }
}

console.log(`Done! Updated: ${updated}, Errors: ${errors}`);

const [rows] = await conn.execute('SELECT status, COUNT(*) as cnt FROM client GROUP BY status');
console.log('Status distribution:', rows);

await conn.end();
