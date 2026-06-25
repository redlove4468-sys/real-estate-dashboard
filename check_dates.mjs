import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/rdb-viewer/.env' });

const conn = await createConnection(process.env.DATABASE_URL);

// 변동내역이 있는 물건 5개 확인
const [rows] = await conn.execute(`
  SELECT 
    k.id, k.name, k.updatedAt,
    (SELECT MAX(h.date) FROM kwonri_history h WHERE h.kwonriId = k.id) as lastHistoryDate,
    (SELECT MAX(w.workDate) FROM kwonri_work w WHERE w.kwonriId = k.id) as lastWorkDate
  FROM kwonri k
  WHERE EXISTS (SELECT 1 FROM kwonri_history h WHERE h.kwonriId = k.id)
  LIMIT 5
`);

console.log('샘플 데이터:');
rows.forEach(r => console.log(JSON.stringify(r)));

// 정렬 테스트 - updatedAt 기준 상위 5개
const [sorted] = await conn.execute(`
  SELECT 
    k.id, k.name, k.updatedAt,
    GREATEST(
      COALESCE((SELECT MAX(h.date) FROM kwonri_history h WHERE h.kwonriId = k.id), '1900-01-01'),
      COALESCE((SELECT MAX(w.workDate) FROM kwonri_work w WHERE w.kwonriId = k.id), '1900-01-01')
    ) as lastActivityDate
  FROM kwonri k
  WHERE k.status = 'active'
  ORDER BY lastActivityDate DESC
  LIMIT 5
`);

console.log('\n최근 활동 순 상위 5개:');
sorted.forEach(r => console.log(JSON.stringify(r)));

await conn.end();
