import mysql from 'mysql2/promise';
import 'dotenv/config';

const KAKAO_API_KEY = 'c93950920fe116fd102b8878f6afeb8c';

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

async function geocodeAddress(address) {
  const query = encodeURIComponent(address);
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${query}&size=1`;
  
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `KakaoAK ${KAKAO_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (json.documents && json.documents.length > 0) {
      const doc = json.documents[0];
      return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
    }
    return null;
  } catch (e) {
    console.error('API 오류:', e.message);
    return null;
  }
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute(
    'SELECT id, address FROM kwonri WHERE lat IS NULL AND address IS NOT NULL AND address != "" LIMIT 10'
  );
  
  for (const row of rows) {
    const normalized = normalizeAddress(row.address);
    const result = await geocodeAddress(normalized);
    console.log(`원본: "${row.address}" → 정규화: "${normalized}" → 결과: ${result ? `${result.lat},${result.lng}` : '실패'}`);
  }
  
  await conn.end();
}

main().catch(console.error);
