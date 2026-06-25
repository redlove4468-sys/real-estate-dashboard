/**
 * 전체 물건 주소 일괄 Geocoding 스크립트 (카카오 주소 검색 API)
 * - 마포구 동 이름만 있는 주소는 "서울 마포구 " 자동 접두어 추가
 * - 초당 10건 처리 (카카오 API 제한 고려)
 * - 이미 좌표 있는 물건은 건너뜀
 * - fetch 사용, 재시도 로직 포함
 */
import mysql from 'mysql2/promise';
import 'dotenv/config';

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY || 'c93950920fe116fd102b8878f6afeb8c';

// 마포구 동 목록
const MAPO_DONGS = [
  '서교동', '동교동', '합정동', '망원동', '연남동', '성산동', '상암동',
  '마포동', '아현동', '공덕동', '도화동', '용강동', '토정동', '신수동',
  '창전동', '구수동', '염리동', '노고산동', '대흥동', '신정동', '현석동',
  '당인동', '중동', '하중동', '상수동', '신공덕동',
];

function normalizeAddress(addr) {
  if (!addr || !addr.trim()) return null;
  const trimmed = addr.trim();
  
  if (trimmed.match(/^(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)/)) {
    return trimmed;
  }
  if (trimmed.includes('마포구')) {
    return '서울 ' + trimmed;
  }
  for (const dong of MAPO_DONGS) {
    if (trimmed.startsWith(dong)) {
      return '서울 마포구 ' + trimmed;
    }
  }
  if (trimmed.match(/^[가-힣]+구[\s]/)) {
    return '서울 ' + trimmed;
  }
  return trimmed;
}

async function geocodeAddress(address, retry = 2) {
  const query = encodeURIComponent(address);
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${query}&size=1`;
  
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `KakaoAK ${KAKAO_API_KEY}` },
        signal: AbortSignal.timeout(10000),
      });
      const json = await res.json();
      if (json.documents && json.documents.length > 0) {
        const doc = json.documents[0];
        return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
      }
      return null;
    } catch (e) {
      if (attempt < retry) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  return null;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [rows] = await conn.execute(
    'SELECT id, address FROM kwonri WHERE lat IS NULL AND address IS NOT NULL AND address != "" ORDER BY id'
  );
  
  console.log(`총 ${rows.length}건 Geocoding 시작...`);
  console.log(`예상 소요 시간: 약 ${Math.ceil(rows.length / 10 / 60)}분`);
  
  let success = 0;
  let fail = 0;
  let skip = 0;
  const startTime = Date.now();
  
  // 배치 처리 (100건씩 묶어서 DB 업데이트)
  const batchUpdates = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const normalized = normalizeAddress(row.address);
    
    if (!normalized) {
      skip++;
      continue;
    }
    
    const result = await geocodeAddress(normalized);
    
    if (result) {
      batchUpdates.push([result.lat, result.lng, row.id]);
      success++;
      
      // 100건마다 배치 업데이트
      if (batchUpdates.length >= 100) {
        for (const [lat, lng, id] of batchUpdates) {
          await conn.execute('UPDATE kwonri SET lat = ?, lng = ? WHERE id = ?', [lat, lng, id]);
        }
        batchUpdates.length = 0;
      }
    } else {
      fail++;
    }
    
    // 진행 상황 출력 (500건마다)
    if ((i + 1) % 500 === 0) {
      // 남은 배치 업데이트
      for (const [lat, lng, id] of batchUpdates) {
        await conn.execute('UPDATE kwonri SET lat = ?, lng = ? WHERE id = ?', [lat, lng, id]);
      }
      batchUpdates.length = 0;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const remaining = Math.round((rows.length - i - 1) * (elapsed / (i + 1)));
      console.log(`[${i + 1}/${rows.length}] 성공: ${success} | 실패: ${fail} | 경과: ${elapsed}초 | 남은시간: 약 ${Math.ceil(remaining/60)}분`);
    }
    
    // API 호출 간격 (초당 10건 = 100ms)
    await sleep(100);
  }
  
  // 남은 배치 업데이트
  for (const [lat, lng, id] of batchUpdates) {
    await conn.execute('UPDATE kwonri SET lat = ?, lng = ? WHERE id = ?', [lat, lng, id]);
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n완료! 성공: ${success} | 실패: ${fail} | 건너뜀: ${skip} | 총 소요: ${Math.ceil(totalTime/60)}분`);
  await conn.end();
}

main().catch(console.error);
