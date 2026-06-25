import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 파일에서 DATABASE_URL 읽기
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) dbUrl = match[1].trim();
  } catch {}
}
if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

// 원본 JSON 읽기
const rawData = JSON.parse(readFileSync('/home/ubuntu/webdev-static-assets/rdb/권리.json', 'utf-8'));

// iSaleStatus=0 → 보류(boru), iSaleStatus=1 → 관리(active)
const statusMap = {};
for (const item of rawData) {
  const idx = item['인덱스'];
  const iSaleStatus = item['iSaleStatus'];
  // 0 = 보류, 1 = 관리(active)
  // iSaleStatus=0 → 보류(hold), iSaleStatus=1 → 관리(active)
  statusMap[idx] = iSaleStatus === '1' ? 'active' : 'hold';
}

const conn = await mysql.createConnection(dbUrl);

// 배치 업데이트
const entries = Object.entries(statusMap);
const BATCH = 2000;
let updated = 0;

for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH);
  
  // CASE WHEN 방식으로 한 번에 업데이트
  const cases = batch.map(([idx]) => `WHEN rdbIndex = ? THEN ?`).join(' ');
  const ids = batch.map(([idx]) => idx);
  const params = batch.flatMap(([idx, status]) => [idx, status]);
  const inPlaceholders = ids.map(() => '?').join(',');
  
  const sql = `UPDATE kwonri SET status = CASE ${cases} END WHERE rdbIndex IN (${inPlaceholders})`;
  await conn.execute(sql, [...params, ...ids]);
  
  updated += batch.length;
  console.log(`진행: ${updated}/${entries.length}`);
}

await conn.end();
console.log('완료! 보류/관리 재분류 완료');

// 통계
const boruCount = Object.values(statusMap).filter(s => s === 'boru').length;
const activeCount = Object.values(statusMap).filter(s => s === 'active').length;
console.log(`보류: ${boruCount}건, 관리: ${activeCount}건`);
