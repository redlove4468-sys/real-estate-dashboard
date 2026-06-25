import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
const data = JSON.parse(readFileSync('/home/ubuntu/webdev-static-assets/rdb/TB_Client.json', 'utf-8'));

let updated = 0, skipped = 0;

for (const item of data) {
  const rdbIndex = item['인덱스'];
  const buyerDetail = item['전화비고'] || null;
  
  if (!rdbIndex || !buyerDetail) { skipped++; continue; }
  
  await conn.query(
    'UPDATE client SET buyerDetail = ? WHERE rdbIndex = ?',
    [buyerDetail, rdbIndex]
  );
  updated++;
}

const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM client WHERE buyerDetail IS NOT NULL');
console.log(`완료: 업데이트 ${updated}건, 스킵 ${skipped}건`);
console.log(`DB 확인: buyerDetail 있는 고객 ${rows[0].cnt}건`);
await conn.end();
