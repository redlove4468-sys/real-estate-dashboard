import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { kwonri, kwonriHistory, kwonriWork } from "../../drizzle/schema";
import { eq, and, or, like, desc, asc, isNull, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { storagePut } from "../storage";

const SortField = z.enum(["updatedAt", "createdAt", "receivedAt", "deposit", "premium", "total", "monthlyRent", "name"]);
const SortOrder = z.enum(["asc", "desc"]);
const StatusFilter = z.enum(["active", "hold", "all"]);

export const kwonriRouter = router({
  // 목록 조회 (페이지네이션 + 필터 + 정렬)
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      status: StatusFilter.default("active"),
      search: z.string().optional(),
      sortBy: SortField.default("updatedAt"),
      sortOrder: SortOrder.default("desc"),
      // 상세 필터
      minDeposit: z.number().optional(),
      maxDeposit: z.number().optional(),
      minPremium: z.number().optional(),
      maxPremium: z.number().optional(),
      minMonthly: z.number().optional(),
      maxMonthly: z.number().optional(),
      minTotal: z.number().optional(),      // 합계금액 최솟값
      maxTotal: z.number().optional(),      // 합계금액 최댓값
      minFloors: z.number().optional(),
      maxFloors: z.number().optional(),
      manager: z.string().optional(),
      industry: z.string().optional(),
      // 신규 필터
      areaSearch: z.string().optional(),   // 지역 검색 (동/구)
      floorSearch: z.string().optional(),  // 층수 검색 (텍스트)
      minArea: z.number().optional(),      // 면적 최솟값 (평)
      maxArea: z.number().optional(),      // 면적 최댓값 (평)
      dealType: z.enum(["monthly", "sale", "all"]).optional(), // 거래유형 필터
      typeFilter: z.string().optional(), // 종류(담당자) 필터
      branchFilter: z.string().optional(), // 지점 필터 (ABC부동산/글로벌부동산)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const conditions = [];

      // 상태 필터
      if (input.status !== "all") {
        conditions.push(eq(kwonri.status, input.status));
      }

      // 검색
      if (input.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        conditions.push(or(
          like(kwonri.name, q),
          like(kwonri.subName, q),  // 부제목(subName) 검색 포함
          like(kwonri.address, q),
          like(kwonri.industry, q),
          like(kwonri.manager, q),
          like(kwonri.location, q),
          like(kwonri.ownerName, q),
        ));
      }

      // 금액 필터
      if (input.minDeposit !== undefined) conditions.push(sql`${kwonri.deposit} >= ${input.minDeposit}`);
      if (input.maxDeposit !== undefined) conditions.push(sql`${kwonri.deposit} <= ${input.maxDeposit}`);
      if (input.minPremium !== undefined) conditions.push(sql`${kwonri.premium} >= ${input.minPremium}`);
      if (input.maxPremium !== undefined) conditions.push(sql`${kwonri.premium} <= ${input.maxPremium}`);
      if (input.minMonthly !== undefined) conditions.push(sql`${kwonri.monthlyRent} >= ${input.minMonthly}`);
      if (input.maxMonthly !== undefined) conditions.push(sql`${kwonri.monthlyRent} <= ${input.maxMonthly}`);
      if (input.minTotal !== undefined) conditions.push(sql`${kwonri.total} >= ${input.minTotal}`);
      if (input.maxTotal !== undefined) conditions.push(sql`${kwonri.total} <= ${input.maxTotal}`);

      // 담당자/업종 필터
      if (input.manager) conditions.push(eq(kwonri.manager, input.manager));
      if (input.industry) conditions.push(like(kwonri.industry, `%${input.industry}%`));

      // 거래유형 필터
      if (input.dealType && input.dealType !== 'all') {
        conditions.push(eq(kwonri.dealType, input.dealType as 'monthly' | 'sale'));
      }

      // 종류 필터
      if (input.typeFilter?.trim()) {
        conditions.push(eq(kwonri.type, input.typeFilter.trim()));
      }

      // 지점 필터
      if (input.branchFilter?.trim()) {
        conditions.push(eq(kwonri.category, input.branchFilter.trim()));
      }

      // 지역 필터 (주소 또는 위치에서 검색) - 콤마 구분 다중 검색 지원
      if (input.areaSearch?.trim()) {
        const areas = input.areaSearch.split(',').map(a => a.trim()).filter(Boolean);
        if (areas.length === 1) {
          const q = `%${areas[0]}%`;
          conditions.push(or(like(kwonri.address, q), like(kwonri.location, q)));
        } else if (areas.length > 1) {
          const areaConditions = areas.map(a => {
            const q = `%${a}%`;
            return or(like(kwonri.address, q), like(kwonri.location, q));
          });
          conditions.push(or(...areaConditions));
        }
      }

      // 층수 필터 (텍스트 포함 검색) - 콤마 구분 다중 검색 지원
      if (input.floorSearch?.trim()) {
        const floors = input.floorSearch.split(',').map(f => f.trim()).filter(Boolean);
        if (floors.length === 1) {
          conditions.push(like(kwonri.floors, `%${floors[0]}%`));
        } else if (floors.length > 1) {
          const floorConditions = floors.map(f => like(kwonri.floors, `%${f}%`));
          conditions.push(or(...floorConditions));
        }
      }

      // 면적 필터 (실평수 또는 임대평수 기준)
      if (input.minArea !== undefined) {
        conditions.push(or(
          sql`CAST(${kwonri.realArea} AS DECIMAL) >= ${input.minArea}`,
          sql`(${kwonri.realArea} IS NULL OR ${kwonri.realArea} = '' OR ${kwonri.realArea} = '0') AND CAST(${kwonri.rentArea} AS DECIMAL) >= ${input.minArea}`
        ));
      }
      if (input.maxArea !== undefined) {
        conditions.push(or(
          sql`CAST(${kwonri.realArea} AS DECIMAL) <= ${input.maxArea}`,
          sql`(${kwonri.realArea} IS NULL OR ${kwonri.realArea} = '' OR ${kwonri.realArea} = '0') AND CAST(${kwonri.rentArea} AS DECIMAL) <= ${input.maxArea}`
        ));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // 정렬
      // updatedAt/createdAt 정렬 시 → 변동내역/작업입력 최신 날짜(lastActivityDate) 기준으로 정렬
      const lastActivityExpr = sql`GREATEST(
        COALESCE((SELECT MAX(h.date) FROM kwonri_history h WHERE h.kwonriId = ${kwonri.id}), '1900-01-01'),
        COALESCE((SELECT MAX(w.workDate) FROM kwonri_work w WHERE w.kwonriId = ${kwonri.id}), '1900-01-01')
      )`;

      const sortExpr: any = {
        updatedAt: lastActivityExpr,
        createdAt: lastActivityExpr,
        receivedAt: kwonri.receivedAt,
        deposit: kwonri.deposit,
        premium: kwonri.premium,
        total: kwonri.total,
        monthlyRent: kwonri.monthlyRent,
        name: kwonri.name,
      }[input.sortBy] ?? lastActivityExpr;

      const orderFn = input.sortOrder === "asc" ? asc : desc;
      const offset = (input.page - 1) * input.pageSize;

      const [items, countResult] = await Promise.all([
        db.select({
          id: kwonri.id,
          status: kwonri.status,
          name: kwonri.name,
          subName: kwonri.subName,
          address: kwonri.address,
          location: kwonri.location,
          industry: kwonri.industry,
          manager: kwonri.manager,
          deposit: kwonri.deposit,
          premium: kwonri.premium,
          total: kwonri.total,
          monthlyRent: kwonri.monthlyRent,
          floors: kwonri.floors,
          realArea: kwonri.realArea,
          rentArea: kwonri.rentArea,
          manageFee: kwonri.manageFee,
          receivedAt: kwonri.receivedAt,
          updatedAt: kwonri.updatedAt,
          createdAt: kwonri.createdAt,
          dealType: kwonri.dealType,
          type: kwonri.type,  // 담당자명 (종류 필드에 저장됨)
          category: kwonri.category,
          // 변동내역 최신 날짜 (sql.raw로 컬럼 참조 - 파라미터 바인딩 방지)
          lastHistoryDate: sql<Date | null>`(SELECT MAX(h.date) FROM kwonri_history h WHERE h.kwonriId = kwonri.id)`,
          // 작업입력 최신 날짜
          lastWorkDate: sql<Date | null>`(SELECT MAX(w.workDate) FROM kwonri_work w WHERE w.kwonriId = kwonri.id)`,
        })
          .from(kwonri)
          .where(where)
          .orderBy(orderFn(sortExpr))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(kwonri).where(where),
      ]);

      // 변동내역/작업입력 중 최신 날짜를 lastActivityDate로 계산
      const itemsWithLastActivity = items.map(item => {
        const toDate = (v: any): Date | null => {
          if (!v) return null;
          if (v instanceof Date) return v;
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d;
        };
        const dates = [toDate(item.lastHistoryDate), toDate(item.lastWorkDate)].filter(Boolean) as Date[];
        const lastActivityDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
        return { ...item, lastActivityDate };
      });

      return {
        items: itemsWithLastActivity,
        total: Number(countResult[0]?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // 단건 상세 조회
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const [item] = await db.select().from(kwonri).where(eq(kwonri.id, input.id)).limit(1);
      if (!item) throw new Error("Not found");

      const history = await db.select().from(kwonriHistory)
        .where(eq(kwonriHistory.kwonriId, input.id))
        .orderBy(desc(kwonriHistory.date));

      const works = await db.select().from(kwonriWork)
        .where(eq(kwonriWork.kwonriId, input.id))
        .orderBy(desc(kwonriWork.workDate));

      return { ...item, history, works };
    }),

  // 생성
  create: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "hold"]).default("active"),
      receivedAt: z.string().optional(),
      name: z.string().optional(),
      address: z.string().optional(),
      location: z.string().optional(),
      type: z.string().optional(),
      industry: z.string().optional(),
      manager: z.string().optional(),
      grade: z.string().optional(),
      category: z.string().optional(),
      phone1: z.string().optional(),
      phone2: z.string().optional(),
      homePhone: z.string().optional(),
      mobile: z.string().optional(),
      ownerName: z.string().optional(),
      rentArea: z.string().optional(),
      realArea: z.string().optional(),
      landArea: z.string().optional(),
      floors: z.string().optional(),
      otherArea: z.string().optional(),
      exclusiveParking: z.string().optional(),
      sharedParking: z.string().optional(),
      dailySales: z.string().optional(),
      operationPeriod: z.string().optional(),
      saleReason: z.string().optional(),
      ownerNotice: z.string().optional(),
      tableCount: z.string().optional(),
      leaseTerms: z.string().optional(),
      rentIncrease: z.string().optional(),
      mortgage: z.string().optional(),
      settlementNotary: z.string().optional(),
      deposit: z.number().optional(),
      premium: z.number().optional(),
      total: z.number().optional(),
      monthlyRent: z.number().optional(),
      manageFee: z.string().optional(),
      vat: z.string().optional(),
      memo1: z.string().optional(),
      memo2: z.string().optional(),
      memo3: z.string().optional(),
      memo0: z.string().optional(),
      memoEtc: z.string().optional(),
      specialFeature: z.string().optional(),
      recommendIndustry: z.string().optional(),
      saleInfo: z.string().optional(),
      dealType: z.enum(["monthly", "sale"]).optional(),
      subName: z.string().optional(),
      feature: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const { receivedAt: receivedAtStr, ...restInput } = input;
      const [result] = await db.insert(kwonri).values({
        ...restInput,
        receivedAt: receivedAtStr ? new Date(receivedAtStr) : null,
        deposit: input.deposit?.toString() as any,
        premium: input.premium?.toString() as any,
        total: input.total?.toString() as any,
        monthlyRent: input.monthlyRent?.toString() as any,
      });

      return { id: (result as any).insertId };
    }),

  // 수정
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "hold"]).optional(),
      dealType: z.enum(["monthly", "sale"]).optional(),
      receivedAt: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      type: z.string().nullable().optional(),
      industry: z.string().nullable().optional(),
      manager: z.string().nullable().optional(),
      grade: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      phone1: z.string().nullable().optional(),
      phone2: z.string().nullable().optional(),
      homePhone: z.string().nullable().optional(),
      mobile: z.string().nullable().optional(),
      ownerName: z.string().nullable().optional(),
      rentArea: z.string().nullable().optional(),
      realArea: z.string().nullable().optional(),
      landArea: z.string().nullable().optional(),
      floors: z.string().nullable().optional(),
      otherArea: z.string().nullable().optional(),
      exclusiveParking: z.string().nullable().optional(),
      sharedParking: z.string().nullable().optional(),
      dailySales: z.string().nullable().optional(),
      operationPeriod: z.string().nullable().optional(),
      saleReason: z.string().nullable().optional(),
      ownerNotice: z.string().nullable().optional(),
      tableCount: z.string().nullable().optional(),
      leaseTerms: z.string().nullable().optional(),
      rentIncrease: z.string().nullable().optional(),
      mortgage: z.string().nullable().optional(),
      settlementNotary: z.string().nullable().optional(),
      deposit: z.number().nullable().optional(),
      premium: z.number().nullable().optional(),
      total: z.number().nullable().optional(),
      monthlyRent: z.number().nullable().optional(),
      manageFee: z.string().nullable().optional(),
      vat: z.string().nullable().optional(),
      memo1: z.string().nullable().optional(),
      memo2: z.string().nullable().optional(),
      memo3: z.string().nullable().optional(),
      memo0: z.string().nullable().optional(),
      memoEtc: z.string().nullable().optional(),
      specialFeature: z.string().nullable().optional(),
      recommendIndustry: z.string().nullable().optional(),
      saleInfo: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const { id, deposit, premium, total, monthlyRent, manageFee, receivedAt: receivedAtStr, ...rest } = input;
      const updateData: any = { ...rest };
      if (deposit !== undefined) updateData.deposit = deposit?.toString() ?? null;
      if (premium !== undefined) updateData.premium = premium?.toString() ?? null;
      if (total !== undefined) updateData.total = total?.toString() ?? null;
      if (monthlyRent !== undefined) updateData.monthlyRent = monthlyRent?.toString() ?? null;
      if (manageFee !== undefined) updateData.manageFee = manageFee ?? null;
      if (receivedAtStr !== undefined) updateData.receivedAt = receivedAtStr ? new Date(receivedAtStr) : null;

      await db.update(kwonri).set(updateData).where(eq(kwonri.id, id));
      return { success: true };
    }),

  // 사진 업로드
  uploadPhoto: protectedProcedure
    .input(z.object({
      id: z.number(),
      // base64 인코딩된 이미지 데이터
      dataUrl: z.string(), // "data:image/jpeg;base64,..."
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      // base64 → Buffer 변환
      const matches = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) throw new Error("Invalid data URL format");
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // 파일 확장자 추출
      const ext = contentType.split("/")[1] || "jpg";
      const fileName = input.fileName || `photo.${ext}`;
      const key = `kwonri/${input.id}/${fileName}`;

      // 스토리지에 업로드
      const { url } = await storagePut(key, buffer, contentType);

      // DB에서 현재 photos 배열 가져오기
      const [item] = await db.select({ photos: kwonri.photos }).from(kwonri).where(eq(kwonri.id, input.id)).limit(1);
      if (!item) throw new Error("Not found");

      const currentPhotos: string[] = Array.isArray(item.photos) ? item.photos : [];
      const newPhotos = [...currentPhotos, url];

      await db.update(kwonri).set({ photos: newPhotos }).where(eq(kwonri.id, input.id));

      return { url, photos: newPhotos };
    }),

  // 사진 삭제
  deletePhoto: protectedProcedure
    .input(z.object({
      id: z.number(),
      photoUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const [item] = await db.select({ photos: kwonri.photos }).from(kwonri).where(eq(kwonri.id, input.id)).limit(1);
      if (!item) throw new Error("Not found");

      const currentPhotos: string[] = Array.isArray(item.photos) ? item.photos : [];
      const newPhotos = currentPhotos.filter(p => p !== input.photoUrl);

      await db.update(kwonri).set({ photos: newPhotos }).where(eq(kwonri.id, input.id));

      return { photos: newPhotos };
    }),

  // 지도용 전체 주소 목록 (건수 제한 없음, 고급 필터 지원)
  allForMap: protectedProcedure
    .input(z.object({
      status: StatusFilter.default('active'),
      search: z.string().optional(),
      areaSearch: z.string().optional(),
      floorSearch: z.string().optional(),
      minArea: z.number().optional(),
      maxArea: z.number().optional(),
      minDeposit: z.number().optional(),
      maxDeposit: z.number().optional(),
      minPremium: z.number().optional(),
      maxPremium: z.number().optional(),
      minMonthly: z.number().optional(),
      maxMonthly: z.number().optional(),
      minTotal: z.number().optional(),
      maxTotal: z.number().optional(),
      manager: z.string().optional(),
      industry: z.string().optional(),
      dealType: z.enum(["monthly", "sale", "all"]).optional(),
      typeFilter: z.string().optional(),
      branchFilter: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.status !== 'all') conditions.push(eq(kwonri.status, input.status));
      if (input.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        conditions.push(or(like(kwonri.name, q), like(kwonri.subName, q), like(kwonri.address, q), like(kwonri.industry, q), like(kwonri.manager, q)));
      }
      if (input.typeFilter?.trim()) {
        conditions.push(eq(kwonri.type, input.typeFilter.trim()));
      }
      if (input.branchFilter?.trim()) {
        conditions.push(eq(kwonri.category, input.branchFilter.trim()));
      }
      // 지역 필터 - 콤마 구분 다중 검색
      if (input.areaSearch?.trim()) {
        const areas = input.areaSearch.split(',').map(a => a.trim()).filter(Boolean);
        if (areas.length === 1) {
          const q = `%${areas[0]}%`;
          conditions.push(or(like(kwonri.address, q), like(kwonri.location, q)));
        } else if (areas.length > 1) {
          const areaConditions = areas.map(a => {
            const q = `%${a}%`;
            return or(like(kwonri.address, q), like(kwonri.location, q));
          });
          conditions.push(or(...areaConditions));
        }
      }
      // 층수 필터 - 콤마 구분 다중 검색
      if (input.floorSearch?.trim()) {
        const floors = input.floorSearch.split(',').map(f => f.trim()).filter(Boolean);
        if (floors.length === 1) {
          conditions.push(like(kwonri.floors, `%${floors[0]}%`));
        } else if (floors.length > 1) {
          const floorConditions = floors.map(f => like(kwonri.floors, `%${f}%`));
          conditions.push(or(...floorConditions));
        }
      }
      if (input.minDeposit !== undefined) conditions.push(sql`${kwonri.deposit} >= ${input.minDeposit}`);
      if (input.maxDeposit !== undefined) conditions.push(sql`${kwonri.deposit} <= ${input.maxDeposit}`);
      if (input.minPremium !== undefined) conditions.push(sql`${kwonri.premium} >= ${input.minPremium}`);
      if (input.maxPremium !== undefined) conditions.push(sql`${kwonri.premium} <= ${input.maxPremium}`);
      if (input.minMonthly !== undefined) conditions.push(sql`${kwonri.monthlyRent} >= ${input.minMonthly}`);
      if (input.maxMonthly !== undefined) conditions.push(sql`${kwonri.monthlyRent} <= ${input.maxMonthly}`);
      if (input.minTotal !== undefined) conditions.push(sql`${kwonri.total} >= ${input.minTotal}`);
      if (input.maxTotal !== undefined) conditions.push(sql`${kwonri.total} <= ${input.maxTotal}`);
      if (input.minArea !== undefined) {
        conditions.push(or(
          sql`CAST(${kwonri.realArea} AS DECIMAL) >= ${input.minArea}`,
          sql`(${kwonri.realArea} IS NULL OR ${kwonri.realArea} = '' OR ${kwonri.realArea} = '0') AND CAST(${kwonri.rentArea} AS DECIMAL) >= ${input.minArea}`
        ));
      }
      if (input.maxArea !== undefined) {
        conditions.push(or(
          sql`CAST(${kwonri.realArea} AS DECIMAL) <= ${input.maxArea}`,
          sql`(${kwonri.realArea} IS NULL OR ${kwonri.realArea} = '' OR ${kwonri.realArea} = '0') AND CAST(${kwonri.rentArea} AS DECIMAL) <= ${input.maxArea}`
        ));
      }
      if (input.manager) conditions.push(eq(kwonri.manager, input.manager));
      if (input.industry) conditions.push(like(kwonri.industry, `%${input.industry}%`));
      if (input.dealType && input.dealType !== 'all') {
        conditions.push(eq(kwonri.dealType, input.dealType as 'monthly' | 'sale'));
      }
      const result = await db
        .select({
          id: kwonri.id,
          name: kwonri.name,
          address: kwonri.address,
          location: kwonri.location,
          deposit: kwonri.deposit,
          premium: kwonri.premium,
          total: kwonri.total,
          monthlyRent: kwonri.monthlyRent,
          industry: kwonri.industry,
          manager: kwonri.manager,
          status: kwonri.status,
          receivedAt: kwonri.receivedAt,
          updatedAt: kwonri.updatedAt,
          floors: kwonri.floors,
          realArea: kwonri.realArea,
          rentArea: kwonri.rentArea,
          dealType: kwonri.dealType,
          lat: kwonri.lat,
          lng: kwonri.lng,
          category: kwonri.category,
        })
        .from(kwonri)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(kwonri.updatedAt));
      return result.filter(r => r.address && r.address.trim() !== '');
    }),

  // 종류 목록 (필터용)
  types: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.selectDistinct({ type: kwonri.type })
      .from(kwonri)
      .where(isNotNull(kwonri.type))
      .orderBy(asc(kwonri.type));
    return result.map(r => r.type).filter(Boolean) as string[];
  }),

  // 담당자 목록 (필터용)
  managers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db.selectDistinct({ manager: kwonri.manager })
      .from(kwonri)
      .where(isNotNull(kwonri.manager))
      .orderBy(asc(kwonri.manager));
    return result.map(r => r.manager).filter(Boolean) as string[];
  }),

  // 전체 데이터 CSV 내보내기 (백업용)
  exportAll: protectedProcedure
    .input(z.object({
      status: StatusFilter.default('all'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');

      const conditions = [];
      if (input.status !== 'all') {
        conditions.push(eq(kwonri.status, input.status));
      }

      const rows = await db.select().from(kwonri)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(kwonri.updatedAt));

      // CSV 헤더
      const headers = [
        'ID', '상태', '거래유형', '물건명', '부제목', '주소', '위치', '종류', '업종', '담당자',
        '등급', '분류', '소유자', '업소전화1', '업소전화2', '자택전화', '핸드폰',
        '임대평수', '실평수', '대지평수', '층수', '전용주차', '공동주차',
        '보증금(만원)', '권리금(만원)', '합계(만원)', '월세(만원)', '관리비', '부가세',
        '특징', '층별업종', '매출내역', '임대조건', '기타메모', '추천업종',
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
        r.id, r.status, r.dealType, r.name, r.subName, r.address, r.location,
        r.type, r.industry, r.manager, r.grade, r.category,
        r.ownerName, r.phone1, r.phone2, r.homePhone, r.mobile,
        r.rentArea, r.realArea, r.landArea, r.floors, r.exclusiveParking, r.sharedParking,
        r.deposit, r.premium, r.total, r.monthlyRent, r.manageFee, r.vat,
        r.feature, r.memo1 || r.floorBusiness, r.salesHistory || r.memo2,
        r.leaseConditionNote || r.memo3, r.otherNote || r.memoEtc, r.recommendIndustry,
        fmtDate(r.receivedAt), fmtDate(r.createdAt), fmtDate(r.updatedAt)
      ].map(escapeCsv).join(','));

      const bom = '\uFEFF'; // UTF-8 BOM (Excel 한글 호환)
      const csv = bom + [headers.join(','), ...csvRows].join('\r\n');
      return { csv, count: rows.length };
    }),

  addHistory: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string(),
      total: z.string().optional(),
      manager: z.string().optional().default(''),
      note: z.string().optional().default(''),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.insert(kwonriHistory).values({
        kwonriId: input.id,
        date: new Date(input.date),
        total: input.total ? input.total : null,
        manager: input.manager,
        note: input.note,
      });
      await db.update(kwonri).set({ updatedAt: new Date() }).where(eq(kwonri.id, input.id));
      return { success: true };
    }),

  addWork: protectedProcedure
    .input(z.object({
      id: z.number(),
      workDate: z.string(),
      content: z.string(),
      manager: z.string().optional().default(''),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.insert(kwonriWork).values({
        kwonriId: input.id,
        workDate: new Date(input.workDate),
        content: input.content,
        manager: input.manager,
      });
      await db.update(kwonri).set({ updatedAt: new Date() }).where(eq(kwonri.id, input.id));
      return { success: true };
    }),

  updateHistory: protectedProcedure
    .input(z.object({
      historyId: z.number(),
      kwonriId: z.number(),
      date: z.string().optional(),
      total: z.string().optional(),
      manager: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      const updateData: any = {};
      if (input.date !== undefined) updateData.date = input.date ? new Date(input.date) : null;
      if (input.total !== undefined) updateData.total = input.total || null;
      if (input.manager !== undefined) updateData.manager = input.manager;
      if (input.note !== undefined) updateData.note = input.note;
      await db.update(kwonriHistory).set(updateData).where(eq(kwonriHistory.id, input.historyId));
      await db.update(kwonri).set({ updatedAt: new Date() }).where(eq(kwonri.id, input.kwonriId));
      return { success: true };
    }),

  deleteHistory: protectedProcedure
    .input(z.object({
      historyId: z.number(),
      kwonriId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.delete(kwonriHistory).where(eq(kwonriHistory.id, input.historyId));
      await db.update(kwonri).set({ updatedAt: new Date() }).where(eq(kwonri.id, input.kwonriId));
      return { success: true };
    }),

  updateWork: protectedProcedure
    .input(z.object({
      workId: z.number(),
      kwonriId: z.number(),
      workDate: z.string().optional(),
      content: z.string().optional(),
      manager: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      const updateData: any = {};
      if (input.workDate !== undefined) updateData.workDate = input.workDate ? new Date(input.workDate) : null;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.manager !== undefined) updateData.manager = input.manager;
      await db.update(kwonriWork).set(updateData).where(eq(kwonriWork.id, input.workId));
      await db.update(kwonri).set({ updatedAt: new Date() }).where(eq(kwonri.id, input.kwonriId));
      return { success: true };
    }),

  deleteWork: protectedProcedure
    .input(z.object({
      workId: z.number(),
      kwonriId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.delete(kwonriWork).where(eq(kwonriWork.id, input.workId));
      await db.update(kwonri).set({ updatedAt: new Date() }).where(eq(kwonri.id, input.kwonriId));
      return { success: true };
    }),

  // 물건 삭제 (관련 history, work 포함 cascade)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB not available');
      await db.delete(kwonriHistory).where(eq(kwonriHistory.kwonriId, input.id));
      await db.delete(kwonriWork).where(eq(kwonriWork.kwonriId, input.id));
      await db.delete(kwonri).where(eq(kwonri.id, input.id));
      return { success: true };
    }),
});
