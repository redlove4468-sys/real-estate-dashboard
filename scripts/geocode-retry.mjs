/**
 * 지오코딩 미완료 물건 재시도 스크립트
 * 네이버 지오코딩 API 사용
 */
import mysql from 'mysql2/promise';
import https from 'https';

const NAVER_CLIENT_ID = process.env.NAVER_MAP_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

const BATCH_SIZE = 10;   // 동시 요청 수
const DELAY_MS = 120;    // 요청 간 딜레이 (ms) - API 제한 방지
const MAX_RETRIES = 2;

async function geocode(address) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(address);
    const options = {
      hostname: 'naveropenapi.apigw.ntruss.com',
      path: `/map-geocode/v2/geocode?query=${query}`,
      method: 'GET',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.addresses && json.addresses.length > 0) {
            const { x, y } = json.addresses[0]; // x=lng, y=lat
            resolve({ lat: parseFloat(y), lng: parseFloat(x) });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // 주소가 있는데 지오코딩 안 된 건 조회
  const [rows] = await conn.query(`
    SELECT id, address, location 
    FROM kwonri 
    WHERE (lat IS NULL OR lng IS NULL)
      AND ((address IS NOT NULL AND address != '') OR (location IS NOT NULL AND location != ''))
    ORDER BY id
  `);

  console.log(`총 ${rows.length}건 처리 시작`);

  let success = 0;
  let fail = 0;
  let processed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (row) => {
      // address 우선, 없으면 location 사용
      const addrToTry = [row.address, row.location].filter(Boolean);
      let result = null;

      for (const addr of addrToTry) {
        if (!addr || addr.trim() === '') continue;
        for (let retry = 0; retry < MAX_RETRIES; retry++) {
          result = await geocode(addr.trim());
          if (result) break;
          await sleep(200);
        }
        if (result) break;
      }

      if (result) {
        await conn.query('UPDATE kwonri SET lat = ?, lng = ? WHERE id = ?', [result.lat, result.lng, row.id]);
        success++;
      } else {
        fail++;
      }
      processed++;
    }));

    await sleep(DELAY_MS);

    // 진행 상황 출력 (100건마다)
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= rows.length) {
      console.log(`진행: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} | 성공: ${success} | 실패: ${fail}`);
    }
  }

  await conn.end();
  console.log(`\n완료! 성공: ${success}건, 실패: ${fail}건`);
}

main().catch(console.error);
