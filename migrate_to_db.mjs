import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { kwonri, client, kwonriHistory } from './drizzle/schema.ts';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseAmount(val) {
  if (!val || val === '0' || val === '0.0000') return null;
  const n = parseFloat(val);
  return isNaN(n) || n === 0 ? null : n;
}

function parseDate(val) {
  if (!val) return null;
  // "08/10/10 00:00:00" 형식
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{2})/);
  if (m) {
    const year = parseInt(m[1]) >= 90 ? `19${m[1]}` : `20${m[1]}`;
    const d = new Date(`${year}-${m[2]}-${m[3]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  // "2010-03-09" 형식
  const d = new Date(val.split(' ')[0]);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  // 권리 데이터 로드
  console.log('Loading kwonri data...');
  const kwonriData = JSON.parse(await readFile(join(__dirname, '../webdev-static-assets/rdb/kwonri.json'), 'utf-8'));
  const historyData = JSON.parse(await readFile(join(__dirname, '../webdev-static-assets/rdb/kwonri_history.json'), 'utf-8'));
  const clientData = JSON.parse(await readFile(join(__dirname, '../webdev-static-assets/rdb/client.json'), 'utf-8'));
  const kwonriLastUpdate = JSON.parse(await readFile(join(__dirname, '../webdev-static-assets/rdb/kwonri_last_update.json'), 'utf-8'));
  const clientLastUpdate = JSON.parse(await readFile(join(__dirname, '../webdev-static-assets/rdb/client_last_update.json'), 'utf-8'));

  console.log(`Kwonri: ${kwonriData.length}, Client: ${clientData.length}, History: ${historyData.length}`);

  // 권리 데이터 삽입 (배치 처리)
  console.log('Inserting kwonri...');
  const BATCH = 500;
  const kwonriRows = kwonriData.map(item => {
    const lastUpdate = kwonriLastUpdate[item.인덱스];
    const updatedAt = lastUpdate ? parseDate(lastUpdate) : parseDate(item.접수일자);
    return {
      rdbIndex: item.인덱스,
      status: item.is보류 === '1' ? 'hold' : 'active',
      name: item.물건명 || null,
      address: item.주소 || null,
      location: item.위치 || null,
      type: item.물건종류 || null,
      industry: item.업종 || null,
      manager: item.담당자 || null,
      grade: item.물건등급 || null,
      category: item.물건분류 || null,
      phone1: item.업소전화1 || null,
      phone2: item.업소전화2 || null,
      homePhone: item.자택전화 || null,
      mobile: item.핸드폰 || null,
      ownerName: item.소유자 || null,
      rentArea: item.사용자항목1 || null,
      realArea: item.사용자항목2 || null,
      landArea: item.사용자항목3 || null,
      floors: item.사용자항목4 || null,
      deposit: parseAmount(item.보증금),
      premium: parseAmount(item.권리금),
      total: parseAmount(item.합계),
      monthlyRent: parseAmount(item.월세),
      manageFee: parseAmount(item.관리비),
      vat: item.부가세 || null,
      memo1: item.메모1 || null,
      memo2: item.메모2 || null,
      memo3: item.메모3 || null,
      memo0: item.메모0 || null,
      memoEtc: item.메모기타 || null,
      specialFeature: item.임시 || null,
      recommendIndustry: item.추천업종 || null,
      saleInfo: null,
      receivedAt: parseDate(item.접수일자),
      createdAt: parseDate(item.접수일자) || new Date(),
      updatedAt: updatedAt || new Date(),
    };
  });

  for (let i = 0; i < kwonriRows.length; i += BATCH) {
    const batch = kwonriRows.slice(i, i + BATCH);
    await db.insert(kwonri).values(batch);
    if (i % 5000 === 0) console.log(`  kwonri: ${i}/${kwonriRows.length}`);
  }
  console.log(`Kwonri inserted: ${kwonriRows.length}`);

  // 고객 데이터 삽입
  console.log('Inserting clients...');
  const clientRows = clientData.map(item => {
    const lastUpdate = clientLastUpdate[item.인덱스];
    const updatedAt = lastUpdate ? parseDate(lastUpdate) : parseDate(item.접수일자);
    return {
      rdbIndex: item.인덱스,
      status: item.is보류 === '1' ? 'hold' : 'active',
      name: item.고객명 || null,
      manager: item.담당자 || null,
      grade: item.고객등급 || null,
      category: item.고객분류 || null,
      mobile: item.핸드폰 || null,
      homePhone: item.자택전화 || null,
      companyPhone: item.회사전화 || null,
      fax: item.팩스 || null,
      otherPhone: item.기타전화 || null,
      budget: item.예산 || null,
      wantIndustry: item.권리업종 || null,
      wantArea: item.권리소재지 || null,
      wantFeature: item.권리특징 || null,
      wantType: item.권리종류 || null,
      depositMin: parseAmount(item.권리정의0이상),
      depositMax: parseAmount(item.권리정의0이하),
      premiumMin: parseAmount(item.권리정의1이상),
      premiumMax: parseAmount(item.권리정의1이하),
      monthlyMin: parseAmount(item.권리정의2이상),
      monthlyMax: parseAmount(item.권리정의2이하),
      memo: item.메모 || null,
      note1: item.고객비고1 || null,
      note2: item.고객비고2 || null,
      receivedAt: parseDate(item.접수일자),
      createdAt: parseDate(item.접수일자) || new Date(),
      updatedAt: updatedAt || new Date(),
    };
  });

  for (let i = 0; i < clientRows.length; i += BATCH) {
    const batch = clientRows.slice(i, i + BATCH);
    await db.insert(client).values(batch);
    if (i % 2000 === 0) console.log(`  client: ${i}/${clientRows.length}`);
  }
  console.log(`Client inserted: ${clientRows.length}`);

  // 변동내역 삽입 (kwonriId 매핑 필요 - rdbIndex 기반)
  console.log('Building rdbIndex -> id map...');
  const allKwonri = await db.select({ id: kwonri.id, rdbIndex: kwonri.rdbIndex }).from(kwonri);
  const idxMap = new Map(allKwonri.map(k => [k.rdbIndex, k.id]));

  console.log('Inserting history...');
  const historyRows = historyData
    .map(item => {
      const kwonriId = idxMap.get(item.인덱스);
      if (!kwonriId) return null;
      return {
        kwonriId,
        date: parseDate(item.날짜),
        deposit: parseAmount(item.보증금),
        premium: parseAmount(item.권리금),
        total: parseAmount(item.총액),
        note: item.변동내역 || null,
        manager: item.사용자 || null,
        createdAt: parseDate(item.날짜) || new Date(),
      };
    })
    .filter(Boolean);

  for (let i = 0; i < historyRows.length; i += BATCH) {
    const batch = historyRows.slice(i, i + BATCH);
    await db.insert(kwonriHistory).values(batch);
    if (i % 5000 === 0) console.log(`  history: ${i}/${historyRows.length}`);
  }
  console.log(`History inserted: ${historyRows.length}`);

  await connection.end();
  console.log('Migration complete!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
