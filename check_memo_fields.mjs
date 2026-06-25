import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 30억대 건물매매 물건 조회
const [rows1] = await conn.execute(
  `SELECT name, memo0, memo1, memo2, memo3, memoEtc, otherNote, workMemo, salesHistory FROM kwonri WHERE name LIKE '%30억대%' LIMIT 3`
);
console.log('=== 30억대 건물매매 ===');
for (const row of rows1) {
  console.log('name:', row.name);
  console.log('memo0:', row.memo0);
  console.log('memo1:', row.memo1);
  console.log('memo2:', row.memo2);
  console.log('memo3:', row.memo3);
  console.log('memoEtc:', row.memoEtc);
  console.log('otherNote:', row.otherNote);
  console.log('workMemo:', row.workMemo);
  console.log('salesHistory:', row.salesHistory);
  console.log('---');
}

// 140억대 물근생건물 매매 물건 조회
const [rows2] = await conn.execute(
  `SELECT name, memo0, memo1, memo2, memo3, memoEtc, otherNote, workMemo, salesHistory FROM kwonri WHERE name LIKE '%140억%' LIMIT 3`
);
console.log('\n=== 140억대 물근생건물 ===');
for (const row of rows2) {
  console.log('name:', row.name);
  console.log('memo0:', row.memo0);
  console.log('memo1:', row.memo1);
  console.log('memo2:', row.memo2);
  console.log('memo3:', row.memo3);
  console.log('memoEtc:', row.memoEtc);
  console.log('otherNote:', row.otherNote);
  console.log('workMemo:', row.workMemo);
  console.log('salesHistory:', row.salesHistory);
  console.log('---');
}

await conn.end();
