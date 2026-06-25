import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
const data = JSON.parse(readFileSync('/home/ubuntu/webdev-static-assets/rdb/TB_Client.json', 'utf-8'));

// 전화비고가 있는 항목만 필터링
const items = data.filter(item => item['인덱스'] && item['전화비고']);
console.log(`업데이트 대상: ${items.length}건`);

// CASE WHEN 방식으로 단일 쿼리로 처리 (배치 500개씩)
const BATCH_SIZE = 500;
let totalUpdated = 0;

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  
  // INSERT INTO ... ON DUPLICATE KEY UPDATE 방식 대신
  // CASE WHEN 방식으로 단일 UPDATE
  const cases = batch.map(() => 'WHEN rdbIndex = ? THEN ?').join(' ');
  const ids = batch.map(item => item['인덱스']);
  const params = [];
  batch.forEach(item => {
    params.push(item['인덱스'], item['전화비고']);
  });
  params.push(...ids);
  
  const sql = `UPDATE client SET buyerDetail = CASE ${cases} END WHERE rdbIndex IN (${ids.map(() => '?').join(',')})`;
  const [result] = await conn.query(sql, params);
  totalUpdated += result.affectedRows;
  
  if ((i / BATCH_SIZE) % 5 === 0) {
    console.log(`진행: ${i + batch.length}/${items.length}건 처리됨`);
  }
}

const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM client WHERE buyerDetail IS NOT NULL');
console.log(`완료: 총 ${totalUpdated}건 업데이트`);
console.log(`DB 확인: buyerDetail 있는 고객 ${rows[0].cnt}건`);
await conn.end();
