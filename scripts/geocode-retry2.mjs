/**
 * 지오코딩 미완료 물건 재시도 스크립트 (Google Maps API 사용)
 */
import mysql from 'mysql2/promise';
import https from 'https';

const FORGE_API_URL = (process.env.BUILT_IN_FORGE_API_URL || 'https://forge.manus.ai').replace(/\/+$/, '');
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const BATCH_SIZE = 8;   // 동시 요청 수
const DELAY_MS = 150;   // 배치 간 딜레이 (ms)

async function geocodeGoogle(address) {
  return new Promise((resolve) => {
    const url = new URL(`${FORGE_API_URL}/v1/maps/proxy/maps/api/geocode/json`);
    url.searchParams.set('key', FORGE_API_KEY);
    url.searchParams.set('address', address);
    url.searchParams.set('language', 'ko');

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const loc = json.results[0].geometry.location;
            resolve({ lat: loc.lat, lng: loc.lng });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
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

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (row) => {
      // address 우선, 없으면 location 사용
      const addrToTry = [row.address, row.location].filter(a => a && a.trim() !== '');
      let result = null;

      for (const addr of addrToTry) {
        result = await geocodeGoogle(addr.trim());
        if (result) break;
        await sleep(100);
      }

      if (result) {
        await conn.query('UPDATE kwonri SET lat = ?, lng = ? WHERE id = ?', [result.lat, result.lng, row.id]);
        success++;
      } else {
        fail++;
      }
    }));

    await sleep(DELAY_MS);

    // 진행 상황 출력 (100건마다)
    if (Math.floor((i + BATCH_SIZE) / 100) > Math.floor(i / 100) || i + BATCH_SIZE >= rows.length) {
      console.log(`진행: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} | 성공: ${success} | 실패: ${fail}`);
    }
  }

  await conn.end();
  console.log(`\n완료! 성공: ${success}건, 실패: ${fail}건`);
}

main().catch(console.error);
