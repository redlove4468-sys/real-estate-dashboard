import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/rdb-viewer/.env' });

const conn = await createConnection(process.env.DATABASE_URL);

// 구 기아자동차 물건의 변동내역 확인
console.log('=== 구 기아자동차 변동내역 ===');
const [hist] = await conn.execute(`
  SELECT h.date, h.dealAmount, h.manager 
  FROM kwonri_history h 
  JOIN kwonri k ON k.id = h.kwonriId 
  WHERE k.name LIKE '%기아자동차%'
  ORDER BY h.date DESC
  LIMIT 5
`);
hist.forEach(r => console.log(JSON.stringify(r)));

// 구 기아자동차 작업입력 확인
console.log('\n=== 구 기아자동차 작업입력 ===');
const [works] = await conn.execute(`
  SELECT w.workDate, w.content 
  FROM kwonri_work w 
  JOIN kwonri k ON k.id = w.kwonriId 
  WHERE k.name LIKE '%기아자동차%'
  ORDER BY w.workDate DESC
  LIMIT 5
`);
works.forEach(r => console.log(JSON.stringify(r)));

// 목록 상위 10개 lastActivityDate 확인 (현재 정렬 기준)
console.log('\n=== 현재 정렬 상위 10개 ===');
const [top10] = await conn.execute(`
  SELECT 
    k.id, k.name,
    (SELECT MAX(h.date) FROM kwonri_history h WHERE h.kwonriId = k.id) as lastHistoryDate,
    (SELECT MAX(w.workDate) FROM kwonri_work w WHERE w.kwonriId = k.id) as lastWorkDate,
    GREATEST(
      COALESCE((SELECT MAX(h.date) FROM kwonri_history h WHERE h.kwonriId = k.id), '1900-01-01'),
      COALESCE((SELECT MAX(w.workDate) FROM kwonri_work w WHERE w.kwonriId = k.id), '1900-01-01')
    ) as lastActivityDate
  FROM kwonri k
  WHERE k.status = 'active'
  ORDER BY lastActivityDate DESC
  LIMIT 10
`);
top10.forEach(r => console.log(JSON.stringify(r)));

await conn.end();
