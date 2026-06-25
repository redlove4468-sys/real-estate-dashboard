import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL!;
const db = drizzle(dbUrl);

// MM/DD/YY HH:MM:SS -> YYYY-MM-DD string
function toDateStr(s: string): string | null {
  if (!s || !s.trim()) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s/);
  if (!m) return null;
  const mo = parseInt(m[1]);
  const d = parseInt(m[2]);
  const y = parseInt(m[3]);
  const year = y < 50 ? 2000 + y : 1900 + y;
  return `${year}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

const raw = readFileSync('/home/ubuntu/webdev-static-assets/rdb/TB_Client.json', 'utf-8');
const data: any[] = JSON.parse(raw);
console.log('Total:', data.length);

let ok = 0, err = 0;
for (let i = 0; i < data.length; i++) {
  const item = data[i];
  const idx = item['인덱스'];
  if (!idx) continue;
  const status = String(item['iClientStatus'] || '1') === '0' ? 'hold' : 'active';
  const dateStr = toDateStr(item['접수일자'] || '');
  try {
    if (dateStr) {
      await db.execute(sql.raw(`UPDATE client SET status='${status}', receivedAt='${dateStr}' WHERE rdbIndex='${idx}'`));
    } else {
      await db.execute(sql.raw(`UPDATE client SET status='${status}' WHERE rdbIndex='${idx}'`));
    }
    ok++;
  } catch(e: any) {
    err++;
    if (err <= 3) console.error('ERR', idx, e.message?.slice(0,80));
  }
  if (i > 0 && i % 500 === 0) {
    console.log(`Progress: ${i}/${data.length}`);
    await new Promise(r => setTimeout(r, 100));
  }
}
console.log('Done! ok:', ok, 'err:', err);
const [res] = await db.execute(sql.raw('SELECT status, COUNT(*) as cnt FROM client GROUP BY status'));
console.log('Distribution:', res);
process.exit(0);
