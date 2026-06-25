// 권리(매물) 데이터 타입
export interface KwonriItem {
  인덱스: string;
  is보류: string;
  체크0: string; // 추진
  체크1: string; // 관리
  체크2: string;
  체크3: string;
  체크4: string;
  접수일자: string;
  물건등급: string;
  물건분류: string;
  담당자: string;
  물건번호: string;
  물건종류: string;
  업종: string;
  물건명: string;
  주소: string;
  위치: string;
  상권: string;
  소유자: string;
  업소전화1: string;
  업소전화2: string;
  자택전화: string;
  핸드폰: string;
  전화번호합: string;
  사용자항목0: string;
  사용자항목1: string; // 임대평수
  사용자항목2: string; // 실평수
  사용자항목3: string;
  사용자항목4: string; // 층수
  사용자항목5: string;
  사용자항목6: string;
  사용자항목7: string;
  사용자항목8: string;
  사용자항목9: string;
  사용자항목10: string;
  사용자항목11: string;
  사용자항목12: string;
  사용자항목13: string;
  사용자항목14: string;
  사용자항목15: string;
  보증금: string;
  권리금: string;
  합계: string;
  월세: string;
  관리비: string;
  부가세: string;
  메모1: string;
  메모2: string;
  메모3: string;
  메모0: string;
  임시: string;
  사용자: string;
  메모기타: string;
  추천업종: string;
  체크5: string;
  체크6: string;
  체크7: string;
  체크8: string;
  체크9: string;
  담당자2: string;
  물건명2: string;
  iSaleStatus: string;
}

// 고객 데이터 타입
export interface ClientItem {
  인덱스: string;
  체크0: string;
  체크1: string;
  체크2: string;
  고객명: string;
  고객비고1: string;
  접수일자: string;
  예산: string;
  고객분류: string;
  고객등급: string;
  고객비고2: string;
  자택전화: string;
  회사전화: string;
  팩스: string;
  핸드폰: string;
  호출기: string;
  기타전화: string;
  전화번호합: string;
  전화비고: string;
  사용자: string;
  메모: string;
  임시: string;
  is보류: string;
  권리종류: string;
  권리업종: string;
  권리소재지: string;
  권리특징: string;
  권리정의0이상: string;
  권리정의0이하: string;
  권리정의1이상: string;
  권리정의1이하: string;
  권리정의2이상: string;
  권리정의2이하: string;
  권리정의3이상: string;
  권리정의3이하: string;
  권리정의4: string;
  권리정의5: string;
  권리매물금액이상: string;
  권리매물금액이하: string;
  담당자: string;
  [key: string]: string;
}

// 권리변동내역 타입
export interface HistoryItem {
  ID: string;
  인덱스: string;
  줄: string;
  날짜: string;
  보증금: string;
  권리금: string;
  총액: string;
  변동내역: string;
  사용자: string;
  중요체크: string;
}

// 고객추천물건 타입
export interface ClientRecommendItem {
  ID: string;
  고객인덱스: string;
  물건인덱스: string;
  물건종류: string;
  DB명: string;
  메모: string;
  비고: string;
}

// 고객작업 타입
export type ClientWork = WorkItem;

// 추천물건 타입
export type RecommendItem = ClientRecommendItem;

// 명함 타입
export interface NameCard {
  ID: string;
  이름: string;
  직책: string;
  분류: string;
  자택전화: string;
  회사전화1: string;
  핸드폰: string;
  회사: string;
  [key: string]: string;
}

// 작업 타입
export interface WorkItem {
  ID: string;
  인덱스: string;
  날짜: string;
  작업내용: string;
  사용자: string;
  해제: string;
}

export interface RdbData {
  권리: KwonriItem[];
  권리변동내역: HistoryItem[];
  TB_Client: ClientItem[];
  고객추천물건: ClientRecommendItem[];
  고객작업: WorkItem[];
  매물작업: WorkItem[];
  고객담당자: Array<{ [key: string]: string }>;
  권리업종: Array<{ [key: string]: string }>;
  권리종류: Array<{ [key: string]: string }>;
}

// 금액 포맷 (만원 단위)
export function formatAmount(val: string | undefined): string {
  if (!val || val === '0' || val === '0.0000') return '-';
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return '-';
  return Math.round(num).toLocaleString('ko-KR');
}

// 날짜 포맷
export function formatDate(val: string | undefined): string {
  if (!val) return '';
  // "08/10/10 00:00:00" 또는 "2010-03-09" 형식
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{2})/);
  if (m) {
    const year = parseInt(m[1]) >= 90 ? `19${m[1]}` : `20${m[1]}`;
    return `${year}-${m[2]}-${m[3]}`;
  }
  return val.split(' ')[0];
}

// 물건 상태 판별
export function getItemStatus(item: KwonriItem): 'chujin' | 'gwanri' | 'boru' {
  if (item.is보류 === '1') return 'boru';
  if (item.체크0 === '1') return 'chujin';
  return 'gwanri';
}

// 고객 상태 판별
export function getClientStatus(item: ClientItem): 'chujin' | 'gwanri' | 'boru' {
  if (item.is보류 === '1') return 'boru';
  if (item.체크0 === '1') return 'chujin';
  return 'gwanri';
}

export const STATUS_LABELS = {
  chujin: '추진',
  gwanri: '관리',
  boru: '보류',
};
