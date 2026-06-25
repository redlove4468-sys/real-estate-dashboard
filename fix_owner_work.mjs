import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: '/home/ubuntu/rdb-viewer/.env' });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL not set');

const conn = await mysql.createConnection(DB_URL);
console.log('DB 연결 완료');

// ===== 1. ownerName 업데이트 =====
console.log('\n=== 1. ownerName 업데이트 시작 ===');

const kwonriData = JSON.parse(readFileSync('/home/ubuntu/webdev-static-assets/rdb/권리.json', 'utf-8'));

// rdbIndex → 소유자 맵
const ownerMap = new Map();
for (const item of kwonriData) {
  const idx = item['인덱스'];
  const owner = (item['소유자'] || '').trim();
  if (idx && owner) ownerMap.set(idx, owner);
}
console.log(`소유자 있는 항목: ${ownerMap.size}개`);

// 배치 업데이트
const BATCH = 2000;
const entries = [...ownerMap.entries()];
let totalUpdated = 0;

for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH);
  const caseClause = batch.map(() => 'WHEN rdbIndex = ? THEN ?').join(' ');
  const inClause = batch.map(() => '?').join(',');
  const params = [];
  for (const [idx, owner] of batch) params.push(idx, owner);
  for (const [idx] of batch) params.push(idx);
  
  const [result] = await conn.execute(
    `UPDATE kwonri SET ownerName = CASE ${caseClause} ELSE ownerName END WHERE rdbIndex IN (${inClause})`,
    params
  );
  totalUpdated += result.affectedRows;
  console.log(`  ${i + batch.length}/${entries.length} 처리 (업데이트: ${result.affectedRows}건)`);
}
console.log(`ownerName 업데이트 완료: ${totalUpdated}건`);

// ===== 2. kwonri_work 테이블 생성 =====
console.log('\n=== 2. kwonri_work 테이블 생성 ===');

await conn.execute(`
  CREATE TABLE IF NOT EXISTS kwonri_work (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kwonriId INT NOT NULL,
    rdbIndex VARCHAR(20),
    workDate DATETIME,
    content TEXT,
    manager VARCHAR(100),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_kwonriId (kwonriId),
    INDEX idx_rdbIndex (rdbIndex)
  )
`);
console.log('kwonri_work 테이블 생성 완료');

// ===== 3. 매물작업 마이그레이션 =====
console.log('\n=== 3. 매물작업 데이터 마이그레이션 ===');

const workData = JSON.parse(readFileSync('/home/ubuntu/webdev-static-assets/rdb/매물작업.json', 'utf-8'));
console.log(`매물작업 총 건수: ${workData.length}`);

await conn.execute('DELETE FROM kwonri_work');

// rdbIndex → kwonriId 맵
const [kwonriRows] = await conn.execute('SELECT id, rdbIndex FROM kwonri');
const rdbToId = new Map(kwonriRows.map(r => [r.rdbIndex, r.id]));
console.log(`kwonri 테이블 항목 수: ${rdbToId.size}`);

function parseDate(s) {
  if (!s) return null;
  s = String(s).trim();
  // MM/DD/YY HH:MM:SS
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    const year = parseInt(m[3]) + (parseInt(m[3]) >= 70 ? 1900 : 2000);
    return new Date(year, parseInt(m[1])-1, parseInt(m[2]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6]));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const INSERT_SQL = 'INSERT INTO kwonri_work (kwonriId, rdbIndex, workDate, content, manager, createdAt) VALUES (?, ?, ?, ?, ?, ?)';
let batch = [];
let skipped = 0;
const WORK_BATCH = 1000;

for (const item of workData) {
  const rdbIdx = item['인덱스'] || '';
  const kwonriId = rdbToId.get(rdbIdx);
  if (!kwonriId) { skipped++; continue; }
  
  const workDate = parseDate(item['날짜']);
  const content = item['작업내용'] || null;
  const manager = item['사용자'] || null;
  
  batch.push([kwonriId, rdbIdx, workDate, content, manager, workDate || new Date()]);
  
  if (batch.length >= WORK_BATCH) {
    await conn.query('INSERT INTO kwonri_work (kwonriId, rdbIndex, workDate, content, manager, createdAt) VALUES ?', [batch]);
    console.log(`  ${batch.length}건 삽입`);
    batch = [];
  }
}
if (batch.length > 0) {
  await conn.query('INSERT INTO kwonri_work (kwonriId, rdbIndex, workDate, content, manager, createdAt) VALUES ?', [batch]);
  console.log(`  ${batch.length}건 삽입 (마지막 배치)`);
}

const [[{ cnt }]] = await conn.execute('SELECT COUNT(*) as cnt FROM kwonri_work');
console.log(`\n매물작업 마이그레이션 완료: ${cnt}건 (스킵: ${skipped}건)`);

await conn.end();
console.log('\n=== 모든 작업 완료 ===');
