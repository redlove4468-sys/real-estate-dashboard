import { createConnection } from 'mysql2/promise';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

const rdbPath = '/home/ubuntu/upload/ABC부동산(23.10.30).RDB';

console.log('원본 RDB에서 주차 데이터 추출 중...');
const csvData = execSync(`mdb-export "${rdbPath}" 권리`, { maxBuffer: 200 * 1024 * 1024 }).toString();

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const lines = csvData.split('\n');
const headers = parseCSVLine(lines[0]);
const idxMap = {};
headers.forEach((h, i) => { idxMap[h.trim()] = i; });

console.log('사용자항목5 인덱스:', idxMap['사용자항목5'], '(전용주차)');
console.log('사용자항목6 인덱스:', idxMap['사용자항목6'], '(공동주차)');

const conn = await createConnection(process.env.DATABASE_URL);

let updated = 0;
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const cols = parseCSVLine(line);
  const rdbIndex = (cols[idxMap['인덱스']] || '').trim();
  const exclusiveParking = (cols[idxMap['사용자항목5']] || '').trim();
  const sharedParking = (cols[idxMap['사용자항목6']] || '').trim();
  
  if (!rdbIndex) continue;
  
  const ep = exclusiveParking && exclusiveParking !== '0' ? exclusiveParking : null;
  const sp = sharedParking && sharedParking !== '0' ? sharedParking : null;
  
  if (!ep && !sp) { skipped++; continue; }
  
  await conn.query(
    'UPDATE kwonri SET exclusiveParking = ?, sharedParking = ? WHERE rdbIndex = ?',
    [ep, sp, rdbIndex]
  );
  updated++;
  
  if (updated % 500 === 0) console.log(`업데이트: ${updated}건`);
}

await conn.end();
console.log(`완료: 업데이트 ${updated}건, 스킵 ${skipped}건`);
