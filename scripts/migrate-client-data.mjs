import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;

function parseDate(s) {
  if (!s || !s.trim()) return null;
  // "04/26/10 00:00:00" → 2010-04-26
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})/);
  if (m) {
    const year = parseInt(m[3]) + 2000;
    return new Date(`${year}-${m[1]}-${m[2]}`);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const conn = await createConnection(DB_URL);
  console.log("DB 연결 완료");

  // ── 1. 고객 인덱스 → DB ID 매핑 ──
  const [clientRows] = await conn.execute("SELECT id, rdbIndex FROM client WHERE rdbIndex IS NOT NULL");
  const clientMap = new Map(clientRows.map(r => [r.rdbIndex, r.id]));
  console.log(`고객 매핑: ${clientMap.size}건`);

  // ── 2. 권리 인덱스 → DB ID 매핑 ──
  const [kwonriRows] = await conn.execute("SELECT id, rdbIndex FROM kwonri WHERE rdbIndex IS NOT NULL");
  const kwonriMap = new Map(kwonriRows.map(r => [r.rdbIndex, r.id]));
  console.log(`권리 매핑: ${kwonriMap.size}건`);

  // ── 3. 고객작업 마이그레이션 ──
  const works = JSON.parse(readFileSync("/home/ubuntu/webdev-static-assets/rdb/고객작업.json", "utf-8"));
  console.log(`고객작업 총 ${works.length}건 처리 시작...`);

  // 기존 데이터 삭제
  await conn.execute("DELETE FROM client_work");

  let workInserted = 0;
  const BATCH = 500;
  for (let i = 0; i < works.length; i += BATCH) {
    const batch = works.slice(i, i + BATCH);
    const rows = [];
    for (const w of batch) {
      const clientId = clientMap.get(w["인덱스"]);
      if (!clientId) continue;
      const workDate = parseDate(w["날짜"]);
      const content = (w["작업내용"] || "").trim();
      if (!content) continue;
      rows.push([
        clientId,
        w["인덱스"] || null,
        workDate,
        content,
        (w["사용자"] || "").trim() || null,
      ]);
    }
    if (rows.length > 0) {
      await conn.query(
        "INSERT INTO client_work (clientId, rdbIndex, workDate, content, manager) VALUES ?",
        [rows]
      );
      workInserted += rows.length;
    }
    if ((i / BATCH) % 10 === 0) process.stdout.write(`  ${workInserted}건 완료...\r`);
  }
  console.log(`\n고객작업 ${workInserted}건 삽입 완료`);

  // ── 4. 고객추천물건 마이그레이션 ──
  const recommends = JSON.parse(readFileSync("/home/ubuntu/webdev-static-assets/rdb/고객추천물건.json", "utf-8"));
  console.log(`고객추천물건 총 ${recommends.length}건 처리 시작...`);

  await conn.execute("DELETE FROM client_recommend");

  let recInserted = 0;
  for (let i = 0; i < recommends.length; i += BATCH) {
    const batch = recommends.slice(i, i + BATCH);
    const rows = [];
    for (const r of batch) {
      const clientId = clientMap.get(r["고객인덱스"]);
      if (!clientId) continue;
      const kwonriId = kwonriMap.get(r["물건인덱스"]) || null;
      rows.push([
        clientId,
        kwonriId,
        r["고객인덱스"] || null,
        r["물건인덱스"] || null,
        (r["물건종류"] || "").trim() || null,
        (r["메모"] || "").trim() || null,
        (r["비고"] || "").trim() || null,
      ]);
    }
    if (rows.length > 0) {
      await conn.query(
        "INSERT INTO client_recommend (clientId, kwonriId, rdbClientIndex, rdbKwonriIndex, itemType, memo, note) VALUES ?",
        [rows]
      );
      recInserted += rows.length;
    }
  }
  console.log(`고객추천물건 ${recInserted}건 삽입 완료`);

  await conn.end();
  console.log("완료!");
}

main().catch(e => { console.error(e); process.exit(1); });
