import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { client, clientWork, clientRecommend, kwonri } from "../../drizzle/schema";
import { eq, and, or, like, desc, asc, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

const SortField = z.enum(["lastActivityDate", "updatedAt", "createdAt", "receivedAt", "name", "depositMin", "depositMax", "deposit"]);
const SortOrder = z.enum(["asc", "desc"]);
const StatusFilter = z.enum(["active", "hold", "all"]);

export const clientRouter = router({
  // 목록 조회
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      status: StatusFilter.default("active"),
      search: z.string().optional(),
      sortBy: SortField.default("lastActivityDate"),
      sortOrder: SortOrder.default("desc"),
      manager: z.string().optional(),
      grade: z.string().optional(),
      wantIndustry: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const conditions = [];

      if (input.status !== "all") {
        conditions.push(eq(client.status, input.status));
      }

      if (input.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        conditions.push(or(
          like(client.name, q),
          like(client.manager, q),
          like(client.wantIndustry, q),
          like(client.wantArea, q),
          like(client.mobile, q),
        ));
      }

      if (input.manager) conditions.push(eq(client.manager, input.manager));
      if (input.grade) conditions.push(like(client.grade, `%${input.grade}%`));
      if (input.wantIndustry) conditions.push(like(client.wantIndustry, `%${input.wantIndustry}%`));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const orderFn = input.sortOrder === "asc" ? asc : desc;
      const offset = (input.page - 1) * input.pageSize;
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // lastActivityDate 정렬: Drizzle sql 태그로 서브쿼리 포함 정렬
      const lastActSub = sql`COALESCE((SELECT MAX(workDate) FROM client_work WHERE clientId = ${client.id}), ${client.receivedAt})`;

      const sortColMap = {
        lastActivityDate: lastActSub,
        updatedAt: client.updatedAt,
        createdAt: client.createdAt,
        receivedAt: client.receivedAt,
        name: client.name,
        depositMin: client.depositMin,
        depositMax: client.depositMax,
        deposit: client.depositMax,
      };
      const sortCol = sortColMap[input.sortBy] ?? lastActSub;

      const [items, countResult] = await Promise.all([
        db.select({
          id: client.id,
          status: client.status,
          name: client.name,
          manager: client.manager,
          mobile: client.mobile,
          wantIndustry: client.wantIndustry,
          wantArea: client.wantArea,
          depositMin: client.depositMin,
          depositMax: client.depositMax,
          premiumMin: client.premiumMin,
          premiumMax: client.premiumMax,
          monthlyMin: client.monthlyMin,
          monthlyMax: client.monthlyMax,
          grade: client.grade,  // 담당자명 (등급 필드에 저장됨)
          receivedAt: client.receivedAt,
          updatedAt: client.updatedAt,
          createdAt: client.createdAt,
          lastActivityDate: lastActSub,
        })
          .from(client)
          .where(whereClause)
          .orderBy(orderFn(sortCol as any))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(client).where(whereClause),
      ]);

      const totalCount = Number(countResult[0]?.count ?? 0);

      // lastActivityDate 변환 (이미 쿼리에 포함됨)
      const toISOStr = (v: any): string | null => {
        if (!v) return null;
        if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
        const d = new Date(v as string);
        return isNaN(d.getTime()) ? null : d.toISOString();
      };

      const itemsWithActivity = items.map((item: any) => ({
        id: item.id,
        status: item.status,
        name: item.name,
        manager: item.manager,
        mobile: item.mobile,
        wantIndustry: item.wantIndustry,
        wantArea: item.wantArea,
        depositMin: item.depositMin,
        depositMax: item.depositMax,
        premiumMin: item.premiumMin,
        premiumMax: item.premiumMax,
        monthlyMin: item.monthlyMin,
        monthlyMax: item.monthlyMax,
        receivedAt: toISOStr(item.receivedAt),
        updatedAt: toISOStr(item.updatedAt),
        createdAt: toISOStr(item.createdAt),
        grade: item.grade,
        lastActivityDate: toISOStr(item.lastActivityDate),
      }));

      return {
        items: itemsWithActivity,
        total: totalCount,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // 단건 상세 (추진내역 + 추천물건 포함)
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const [item] = await db.select().from(client).where(eq(client.id, input.id)).limit(1);
      if (!item) throw new Error("Not found");

      // 추진내역 (작업입력)
      const works = await db.select()
        .from(clientWork)
        .where(eq(clientWork.clientId, input.id))
        .orderBy(desc(clientWork.workDate))
        .limit(50);

      // 추천물건 (고객 대상 물건 목록)
      const recommends = await db
        .select({
          id: clientRecommend.id,
          kwonriId: clientRecommend.kwonriId,
          rdbKwonriIndex: clientRecommend.rdbKwonriIndex,
          itemType: clientRecommend.itemType,
          memo: clientRecommend.memo,
          note: clientRecommend.note,
          kwonriName: kwonri.name,
          kwonriAddress: kwonri.address,
          kwonriIndustry: kwonri.industry,
          kwonriDeposit: kwonri.deposit,
          kwonriPremium: kwonri.premium,
          kwonriTotal: kwonri.total,
          kwonriStatus: kwonri.status,
        })
        .from(clientRecommend)
        .leftJoin(kwonri, eq(clientRecommend.kwonriId, kwonri.id))
        .where(eq(clientRecommend.clientId, input.id))
        .limit(50);

      return { ...item, works, recommends };
    }),

  // 생성
  create: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "hold"]).default("active"),
      name: z.string().optional(),
      manager: z.string().optional(),
      grade: z.string().optional(),
      category: z.string().optional(),
      mobile: z.string().optional(),
      homePhone: z.string().optional(),
      companyPhone: z.string().optional(),
      fax: z.string().optional(),
      otherPhone: z.string().optional(),
      budget: z.string().optional(),
      wantIndustry: z.string().optional(),
      wantArea: z.string().optional(),
      wantFeature: z.string().optional(),
      wantType: z.string().optional(),
      depositMin: z.number().optional(),
      depositMax: z.number().optional(),
      premiumMin: z.number().optional(),
      premiumMax: z.number().optional(),
      monthlyMin: z.number().optional(),
      monthlyMax: z.number().optional(),
      memo: z.string().optional(),
      note1: z.string().optional(),
      note2: z.string().optional(),
      buyerDetail: z.string().optional(),
      receivedAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const toStr = (v?: number) => v?.toString() as any;
      const [result] = await db.insert(client).values({
        ...input,
        depositMin: toStr(input.depositMin),
        depositMax: toStr(input.depositMax),
        premiumMin: toStr(input.premiumMin),
        premiumMax: toStr(input.premiumMax),
        monthlyMin: toStr(input.monthlyMin),
        monthlyMax: toStr(input.monthlyMax),
      });

      return { id: (result as any).insertId };
    }),

  // 수정
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "hold"]).optional(),
      name: z.string().nullable().optional(),
      manager: z.string().nullable().optional(),
      grade: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      mobile: z.string().nullable().optional(),
      homePhone: z.string().nullable().optional(),
      companyPhone: z.string().nullable().optional(),
      fax: z.string().nullable().optional(),
      otherPhone: z.string().nullable().optional(),
      budget: z.string().nullable().optional(),
      wantIndustry: z.string().nullable().optional(),
      wantArea: z.string().nullable().optional(),
      wantFeature: z.string().nullable().optional(),
      wantType: z.string().nullable().optional(),
      depositMin: z.number().nullable().optional(),
      depositMax: z.number().nullable().optional(),
      premiumMin: z.number().nullable().optional(),
      premiumMax: z.number().nullable().optional(),
      monthlyMin: z.number().nullable().optional(),
      monthlyMax: z.number().nullable().optional(),
      memo: z.string().nullable().optional(),
      note1: z.string().nullable().optional(),
      note2: z.string().nullable().optional(),
      buyerDetail: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const { id, depositMin, depositMax, premiumMin, premiumMax, monthlyMin, monthlyMax, ...rest } = input;
      const toStr = (v: number | null | undefined) => v !== undefined ? (v?.toString() ?? null) : undefined;
      const updateData: any = { ...rest };
      if (depositMin !== undefined) updateData.depositMin = toStr(depositMin);
      if (depositMax !== undefined) updateData.depositMax = toStr(depositMax);
      if (premiumMin !== undefined) updateData.premiumMin = toStr(premiumMin);
      if (premiumMax !== undefined) updateData.premiumMax = toStr(premiumMax);
      if (monthlyMin !== undefined) updateData.monthlyMin = toStr(monthlyMin);
      if (monthlyMax !== undefined) updateData.monthlyMax = toStr(monthlyMax);

      await db.update(client).set(updateData).where(eq(client.id, id));
      return { success: true };
    }),

  // 담당자 목록
  managers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.selectDistinct({ manager: client.manager })
      .from(client)
      .where(isNotNull(client.manager))
      .orderBy(asc(client.manager));
    return result.map(r => r.manager).filter(Boolean) as string[];
  }),

  // 등급 목록 (필터용)
  grades: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.selectDistinct({ grade: client.grade })
      .from(client)
      .where(isNotNull(client.grade))
      .orderBy(asc(client.grade));
    return result.map(r => r.grade).filter(Boolean) as string[];
  }),

   // 연락처 통합 검색
  phoneSearch: protectedProcedure
    .input(z.object({ phone: z.string().min(4) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = `%${input.phone}%`;
      const results = await db.select({
        id: client.id,
        name: client.name,
        mobile: client.mobile,
        homePhone: client.homePhone,
        companyPhone: client.companyPhone,
        manager: client.manager,
      })
        .from(client)
        .where(or(
          like(client.mobile, q),
          like(client.homePhone, q),
          like(client.companyPhone, q),
          like(client.otherPhone, q),
        ))
        .limit(20);
      return results.map(r => ({ ...r, sourceType: "client" as const }));
    }),

  // 전체 고객 데이터 CSV 내보내기 (백업용)
  exportAll: protectedProcedure
    .input(z.object({
      status: StatusFilter.default('all'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const conditions = [];
      if (input.status !== 'all') {
        conditions.push(eq(client.status, input.status));
      }

      const rows = await db.select().from(client)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(client.updatedAt));

      const headers = [
        'ID', '상태', '고객명', '담당자', '등급', '분류',
        '핸드폰', '자택전화', '회사전화', '팩스', '기타전화',
        '예산', '권리업종', '권리소재지', '권리특징', '권리종류',
        '보증금최소(만원)', '보증금최대(만원)',
        '권리금최소(만원)', '권리금최대(만원)',
        '월세최소(만원)', '월세최대(만원)',
        '메모', '참고사항1', '참고사항2',
        '접수일', '등록일', '수정일'
      ];

      function escapeCsv(val: any): string {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }

      function fmtDate(d: Date | null | undefined): string {
        if (!d) return '';
        return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
      }

      const csvRows = rows.map(r => [
        r.id, r.status, r.name, r.manager, r.grade, r.category,
        r.mobile, r.homePhone, r.companyPhone, r.fax, r.otherPhone,
        r.budget, r.wantIndustry, r.wantArea, r.wantFeature, r.wantType,
        r.depositMin, r.depositMax, r.premiumMin, r.premiumMax,
        r.monthlyMin, r.monthlyMax,
        r.memo, r.note1, r.note2,
        fmtDate(r.receivedAt), fmtDate(r.createdAt), fmtDate(r.updatedAt)
      ].map(escapeCsv).join(','));

      const bom = '\uFEFF';
      const csv = bom + [headers.join(','), ...csvRows].join('\r\n');
      return { csv, count: rows.length };
    }),

  // 추진내역 추가
  addProgress: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      workDate: z.string(),
      content: z.string().min(1),
      manager: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.insert(clientWork).values({
        clientId: input.clientId,
        workDate: new Date(input.workDate),
        content: input.content,
        manager: input.manager ?? '',
      });
      return { success: true };
    }),

  // 추진내역 삭제
  deleteProgress: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.delete(clientWork).where(eq(clientWork.id, input.id));
      return { success: true };
    }),

  // 대상물건 추가
  addTargetProperty: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      kwonriId: z.number(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      // 중복 체크
      const existing = await db.select({ id: clientRecommend.id })
        .from(clientRecommend)
        .where(and(eq(clientRecommend.clientId, input.clientId), eq(clientRecommend.kwonriId, input.kwonriId)))
        .limit(1);
      if (existing.length > 0) return { success: true, duplicate: true };
      await db.insert(clientRecommend).values({
        clientId: input.clientId,
        kwonriId: input.kwonriId,
        note: input.note ?? '',
      });
      return { success: true, duplicate: false };
    }),

  // 대상물건 삭제
  removeTargetProperty: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.delete(clientRecommend).where(eq(clientRecommend.id, input.id));
      return { success: true };
    }),

  // 고객 receivedAt + status 일괄 수정 (원본 JSON 기준)
  fixData: publicProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const { readFileSync } = await import('fs');
      const raw = readFileSync('/home/ubuntu/webdev-static-assets/rdb/TB_Client.json', 'utf-8');
      const data: any[] = JSON.parse(raw);

      function toDateStr(s: string): string | null {
        if (!s || !s.trim()) return null;
        const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s/);
        if (!m) return null;
        const mo = parseInt(m[1]);
        const d = parseInt(m[2]);
        const y = parseInt(m[3]);
        const year = y < 50 ? 2000 + y : 1900 + y;
        return `${year}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      }

      let ok = 0, err = 0;
      for (const item of data) {
        const idx = item['\uc778\ub371\uc2a4'];
        if (!idx) continue;
        const status = String(item['iClientStatus'] || '1') === '0' ? 'hold' : 'active';
        const dateStr = toDateStr(item['\uc811\uc218\uc77c\uc790'] || '');
        try {
          if (dateStr) {
            await db.execute(
              sql`UPDATE client SET status=${status}, receivedAt=${dateStr} WHERE rdbIndex=${idx}`
            );
          } else {
            await db.execute(
              sql`UPDATE client SET status=${status} WHERE rdbIndex=${idx}`
            );
          }
          ok++;
        } catch(e: any) {
          err++;
        }
      }
      return { ok, err, total: data.length };
    }),

  // 고객 삭제 (관련 work, recommend 포함 cascade)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.delete(clientWork).where(eq(clientWork.clientId, input.id));
      await db.delete(clientRecommend).where(eq(clientRecommend.clientId, input.id));
      await db.delete(client).where(eq(client.id, input.id));
      return { success: true };
    }),
});
