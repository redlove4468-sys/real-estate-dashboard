import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;

// 날짜 파싱: MM/DD/YY 또는 MM/DD/YYYY 형식 처리
function parseRpmDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const s = dateStr.trim();
  
  // "MM/DD/YY HH:MM:SS" 형식
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    let [, mm, dd, yy] = match;
    let year = parseInt(yy);
    if (year < 100) {
      year = year >= 50 ? 1900 + year : 2000 + year;
    }
    const month = parseInt(mm);
    const day = parseInt(dd);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  }
  
  // "YYYY-MM-DD" 형식
  const match2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match2) {
    return new Date(parseInt(match2[1]), parseInt(match2[2]) - 1, parseInt(match2[3]));
  }
  
  return null;
}

async function main() {
  console.log('날짜 및 평수 필드 재마이그레이션 시작...');
  
  const data = JSON.parse(readFileSync('/home/ubuntu/rdb_data_full.json', 'utf-8'));
  const items = data['권리'] || [];
  
  const conn = await mysql.createConnection(DATABASE_URL);
  
  let updated = 0;
  let errors = 0;
  
  // 배치 처리
  const BATCH = 500;
  
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    
    for (const item of batch) {
      const rdbIndex = item['인덱스'];
      if (!rdbIndex) continue;
      
      // 접수일 파싱 (MM/DD/YY 형식)
      const receivedAt = parseRpmDate(item['접수일자']);
      
      // 실평수: 사용자항목1 (원본에서 실평수)
      // 임대평수: 사용자항목0 (원본에서 임대평수)
      const realArea = item['사용자항목1'] || '0';
      const rentArea = item['사용자항목0'] || '0';
      
      try {
        await conn.execute(
          `UPDATE kwonri SET receivedAt = ?, realArea = ?, rentArea = ? WHERE rdbIndex = ?`,
          [receivedAt, realArea, rentArea, rdbIndex]
        );
        updated++;
      } catch (e) {
        errors++;
        if (errors <= 3) console.error(`오류 (${rdbIndex}):`, e.message);
      }
    }
    
    if ((i / BATCH) % 10 === 0) {
      console.log(`진행: ${i + batch.length}/${items.length} (업데이트: ${updated}, 오류: ${errors})`);
    }
  }
  
  // 검증: 에뚜왈
  const [check] = await conn.execute(
    'SELECT name, receivedAt, rentArea, realArea FROM kwonri WHERE name LIKE "%에뚜왈%" LIMIT 5'
  );
  console.log('\n검증 - 에뚜왈:', JSON.stringify(check, null, 2));
  
  await conn.end();
  console.log(`\n완료! 업데이트: ${updated}, 오류: ${errors}`);
}

main().catch(console.error);
