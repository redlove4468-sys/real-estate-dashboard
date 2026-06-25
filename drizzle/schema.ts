import { int, json, mysqlEnum, mysqlTable, text, mediumtext, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),  // Manus OAuth (optional)
  username: varchar("username", { length: 64 }).unique(),  // 로컬 로그인 아이디
  password: varchar("password", { length: 255 }),  // bcrypt 해시
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 물건(권리) 테이블
export const kwonri = mysqlTable("kwonri", {
  id: int("id").autoincrement().primaryKey(),
  // 원본 RDB 인덱스 (마이그레이션용)
  rdbIndex: varchar("rdbIndex", { length: 64 }),
  // 상태: active=관리/추진, hold=보류
  status: mysqlEnum("status", ["active", "hold"]).default("active").notNull(),
  // 거래 유형: monthly=월세, sale=매매
  dealType: mysqlEnum("dealType", ["monthly", "sale"]).default("monthly").notNull(),
  // 기본 정보
  name: varchar("name", { length: 255 }),           // 물건명
  address: varchar("address", { length: 500 }),      // 주소
  location: varchar("location", { length: 255 }),    // 위치
  type: varchar("type", { length: 100 }),            // 물건종류
  industry: varchar("industry", { length: 255 }),    // 업종
  manager: varchar("manager", { length: 100 }),      // 담당자
  grade: varchar("grade", { length: 50 }),           // 등급
  category: varchar("category", { length: 100 }),    // 분류
  // 연락처
  phone1: varchar("phone1", { length: 200 }),         // 업소전화1
  phone2: varchar("phone2", { length: 200 }),         // 업소전화2
  homePhone: varchar("homePhone", { length: 200 }),   // 자택전화
  mobile: varchar("mobile", { length: 200 }),         // 핸드폰
  ownerName: varchar("ownerName", { length: 200 }),  // 소유자
  // 면적
  rentArea: varchar("rentArea", { length: 50 }),     // 임대평수
  realArea: varchar("realArea", { length: 50 }),     // 실평수
  landArea: varchar("landArea", { length: 50 }),     // 대지평수
  floors: varchar("floors", { length: 50 }),         // 층수
  // 금액 (만원 단위)
  deposit: decimal("deposit", { precision: 15, scale: 4 }),    // 보증금
  premium: decimal("premium", { precision: 15, scale: 4 }),    // 권리금
  total: decimal("total", { precision: 15, scale: 4 }),        // 합계
  monthlyRent: decimal("monthlyRent", { precision: 15, scale: 4 }), // 월세
  manageFee: varchar("manageFee", { length: 100 }), // 관리비 (텍스트: 13만, 실비, 포함 등)
  vat: varchar("vat", { length: 50 }),               // 부가세
  // 메모 (원본 raw 필드)
  memo0: text("memo0"),                              // 원본 메모0
  memo1: text("memo1"),                              // 원본 메모1
  memo2: text("memo2"),                              // 원본 메모2
  memo3: text("memo3"),                              // 원본 메모3
  memoEtc: text("memoEtc"),                          // 원본 메모기타
  // 섹션별 매핑된 메모
  floorBusiness: mediumtext("floorBusiness"),        // 층별업종 (메모1)
  salesHistory: mediumtext("salesHistory"),          // 매출내역 (메모2)
  leaseConditionNote: text("leaseConditionNote"),    // 임대조건 하단 문구 (메모3)
  workMemo: mediumtext("workMemo"),                  // 기타/작업일지 (메모0)
  otherNote: text("otherNote"),                      // 기타 특이사항 (메모기타)
  // 추가 항목
  subName: varchar("subName", { length: 255 }),      // 물건명2 (부제목)
  feature: text("feature"),                          // 특징 (원본 상권 필드)
  specialFeature: text("specialFeature"),            // 특징 (기존)
  recommendIndustry: varchar("recommendIndustry", { length: 255 }), // 추천업종
  saleInfo: text("saleInfo"),                        // 매출내역 (기존)
  // 주차
  exclusiveParking: varchar("exclusiveParking", { length: 50 }),  // 전용주차
  sharedParking: varchar("sharedParking", { length: 50 }),        // 공동주차
  // 물건현황 추가 필드
  otherArea: varchar("otherArea", { length: 50 }),                // 기타평수
  dailySales: varchar("dailySales", { length: 100 }),             // 일매출
  operationPeriod: varchar("operationPeriod", { length: 100 }),   // 운영기간
  saleReason: varchar("saleReason", { length: 255 }),             // 매매사유
  ownerNotice: varchar("ownerNotice", { length: 255 }),           // 주인통보
  tableCount: varchar("tableCount", { length: 50 }),              // 테이블수
  // 임대차 필드
  leaseTerms: varchar("leaseTerms", { length: 255 }),             // 임대기간
  rentIncrease: varchar("rentIncrease", { length: 100 }),         // 월세인상
  mortgage: varchar("mortgage", { length: 255 }),                 // 근저당
  settlementNotary: varchar("settlementNotary", { length: 255 }), // 화해공증
  // 사진 (storage key 배열)
  photos: json("photos").$type<string[]>(),
  // 날짜
  receivedAt: timestamp("receivedAt"),               // 접수일자
  lat: decimal("lat", { precision: 10, scale: 7 }),   // 위도 (Geocoding)
  lng: decimal("lng", { precision: 10, scale: 7 }),   // 경도 (Geocoding)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Kwonri = typeof kwonri.$inferSelect;
export type InsertKwonri = typeof kwonri.$inferInsert;

// 고객 테이블
export const client = mysqlTable("client", {
  id: int("id").autoincrement().primaryKey(),
  rdbIndex: varchar("rdbIndex", { length: 64 }),
  status: mysqlEnum("status", ["active", "hold"]).default("active").notNull(),
  // 기본 정보
  name: varchar("name", { length: 255 }),            // 고객명
  manager: varchar("manager", { length: 100 }),      // 담당자
  grade: varchar("grade", { length: 50 }),           // 등급
  category: varchar("category", { length: 100 }),    // 분류
  // 연락처
  mobile: varchar("mobile", { length: 200 }),         // 핸드폰
  homePhone: varchar("homePhone", { length: 200 }),   // 자택전화
  companyPhone: varchar("companyPhone", { length: 200 }), // 회사전화
  fax: varchar("fax", { length: 200 }),               // 팩스
  otherPhone: varchar("otherPhone", { length: 200 }), // 기타전화
  // 구입조건
  budget: varchar("budget", { length: 100 }),        // 예산
  wantIndustry: varchar("wantIndustry", { length: 255 }), // 권리업종
  wantArea: varchar("wantArea", { length: 255 }),    // 권리소재지
  wantFeature: text("wantFeature"),                  // 권리특징
  wantType: varchar("wantType", { length: 100 }),    // 권리종류
  // 금액 조건
  depositMin: decimal("depositMin", { precision: 15, scale: 4 }),
  depositMax: decimal("depositMax", { precision: 15, scale: 4 }),
  premiumMin: decimal("premiumMin", { precision: 15, scale: 4 }),
  premiumMax: decimal("premiumMax", { precision: 15, scale: 4 }),
  monthlyMin: decimal("monthlyMin", { precision: 15, scale: 4 }),
  monthlyMax: decimal("monthlyMax", { precision: 15, scale: 4 }),
  // 메모
  memo: text("memo"),
  note1: text("note1"),
  note2: text("note2"),
  buyerDetail: text("buyerDetail"),  // 구입자상세내역 (원본 전화비고 필드)
  // 날짜
  receivedAt: timestamp("receivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof client.$inferSelect;
export type InsertClient = typeof client.$inferInsert;

// 변동내역 테이블
export const kwonriHistory = mysqlTable("kwonri_history", {
  id: int("id").autoincrement().primaryKey(),
  kwonriId: int("kwonriId").notNull(),
  date: timestamp("date"),
  deposit: decimal("deposit", { precision: 15, scale: 4 }),
  premium: decimal("premium", { precision: 15, scale: 4 }),
  total: decimal("total", { precision: 15, scale: 4 }),
  note: text("note"),
  manager: varchar("manager", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KwonriHistory = typeof kwonriHistory.$inferSelect;
export type InsertKwonriHistory = typeof kwonriHistory.$inferInsert;

// 매물 작업입력 테이블
export const kwonriWork = mysqlTable("kwonri_work", {
  id: int("id").autoincrement().primaryKey(),
  kwonriId: int("kwonriId").notNull(),
  rdbIndex: varchar("rdbIndex", { length: 20 }),
  workDate: timestamp("workDate"),
  content: text("content"),
  manager: varchar("manager", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type KwonriWork = typeof kwonriWork.$inferSelect;
export type InsertKwonriWork = typeof kwonriWork.$inferInsert;

// 고객 작업입력 테이블
export const clientWork = mysqlTable("client_work", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  rdbIndex: varchar("rdbIndex", { length: 20 }),
  workDate: timestamp("workDate"),
  content: text("content"),
  manager: varchar("manager", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ClientWork = typeof clientWork.$inferSelect;
export type InsertClientWork = typeof clientWork.$inferInsert;

// 고객 추천물건 테이블
export const clientRecommend = mysqlTable("client_recommend", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  kwonriId: int("kwonriId"),
  rdbClientIndex: varchar("rdbClientIndex", { length: 20 }),
  rdbKwonriIndex: varchar("rdbKwonriIndex", { length: 20 }),
  itemType: varchar("itemType", { length: 50 }),
  memo: text("memo"),
  note: varchar("note", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ClientRecommend = typeof clientRecommend.$inferSelect;
export type InsertClientRecommend = typeof clientRecommend.$inferInsert;
