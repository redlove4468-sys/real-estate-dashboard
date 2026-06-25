/**
 * Design: Administrative Clarity
 * 권리물건 카드 - 원본 프로그램 레이아웃 재현
 * 섹션: 물건개요 / 금액 / 메모 / 변동내역
 * isAuthenticated: false이면 권리금/연락처 숨김
 */
import type { KwonriItem, HistoryItem } from '@/lib/types';
import { formatAmount, formatDate, getItemStatus, STATUS_LABELS } from '@/lib/types';

interface Props {
  item: KwonriItem;
  history: HistoryItem[];
  isAuthenticated?: boolean;
  lastUpdate?: string;
}

export default function KwonriCard({ item, history, isAuthenticated = true, lastUpdate }: Props) {
  const status = getItemStatus(item);
  const statusLabel = STATUS_LABELS[status];

  const statusClass =
    status === 'chujin' ? 'badge-chujin' :
    status === 'gwanri' ? 'badge-gwanri' : 'badge-boru';

  const phone = item.전화번호합 || '';

  // 변동내역 - 해당 물건만
  const itemHistory = history
    .filter(h => h.인덱스 === item.인덱스)
    .sort((a, b) => b.날짜.localeCompare(a.날짜));

  return (
    <div className="bg-card border border-border rounded-sm text-[12px] h-full overflow-auto">
      {/* 상단 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[oklch(0.96_0.01_255)]">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${statusClass}`}>
          {statusLabel}
        </span>
        <span className="font-bold text-[14px] text-foreground flex-1 truncate">{item.물건명 || '(물건명 없음)'}</span>
        {item.물건명2 && item.물건명2 !== item.물건명 && (
          <span className="text-muted-foreground text-[11px] truncate max-w-[120px]">{item.물건명2}</span>
        )}
        {lastUpdate && (
          <span className="text-[10px] text-muted-foreground shrink-0">최근: {lastUpdate}</span>
        )}
        <span className="text-muted-foreground text-[10px] ml-auto">{item.인덱스}</span>
      </div>

      <div className="grid grid-cols-2 gap-0 divide-x divide-border">
        {/* 좌측: 물건 개요 */}
        <div>
          {/* 물건 기본 정보 */}
          <div className="section-header">▼ 물건 개요</div>
          <div className="p-2 space-y-1">
            <Row label="접수일자" value={formatDate(item.접수일자)} />
            <Row label="담당자" value={[item.담당자, item.담당자2].filter(Boolean).join(' / ')} />
            <Row label="물건종류" value={item.물건종류} />
            <Row label="업종" value={item.업종} />
            <Row label="주소" value={item.주소} />
            <Row label="위치" value={item.위치} />
            <Row label="상권" value={item.상권} />
            <Row label="소유자" value={isAuthenticated ? item.소유자 : '***'} />
            <Row label="물건번호" value={item.물건번호} />
            <Row label="등급" value={item.물건등급} />
            <Row label="분류" value={item.물건분류} />
          </div>

          {/* 연락처 */}
          <div className="section-header">▼ 연락처</div>
          <div className="p-2 space-y-1">
            {isAuthenticated ? (
              <>
                <Row label="업소전화1" value={item.업소전화1} />
                <Row label="업소전화2" value={item.업소전화2} />
                <Row label="자택전화" value={item.자택전화} />
                <Row label="핸드폰" value={item.핸드폰} />
                <Row label="전화번호" value={phone.length > 40 ? '(암호화됨)' : phone} />
              </>
            ) : (
              <div className="flex items-center gap-2 py-1">
                <span className="text-amber-500 text-[11px]">🔒 로그인 후 연락처 확인 가능</span>
              </div>
            )}
          </div>

          {/* 물건 현황 */}
          <div className="section-header">▼ 물건 현황</div>
          <div className="p-2 space-y-1">
            <Row label="임대평수" value={item.사용자항목0 && item.사용자항목0 !== '0' ? `${item.사용자항목0}평` : ''} />
            <Row label="실평수" value={item.사용자항목1 && item.사용자항목1 !== '0' ? `${item.사용자항목1}평` : ''} />
            <Row label="대지평수" value={item.사용자항목2 && item.사용자항목2 !== '0' ? `${item.사용자항목2}평` : ''} />
            <Row label="기타평수" value={item.사용자항목3 && item.사용자항목3 !== '0' ? `${item.사용자항목3}평` : ''} />
            <Row label="층수" value={item.사용자항목4} />
            <Row label="추천업종" value={item.추천업종} />
          </div>
        </div>

        {/* 우측: 금액 + 메모 */}
        <div>
          {/* 금액 */}
          <div className="section-header">▼ 금액</div>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="field-label">보증금</span>
              <span className="amount-deposit text-[15px]">
                {isAuthenticated
                  ? (formatAmount(item.보증금) !== '-' ? `${formatAmount(item.보증금)} 만원` : '-')
                  : <span className="text-amber-500 text-[12px]">🔒 로그인 필요</span>
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="field-label">권리금</span>
              <span className="amount-premium text-[15px]">
                {isAuthenticated
                  ? (formatAmount(item.권리금) !== '-' ? `${formatAmount(item.권리금)} 만원` : '-')
                  : <span className="text-amber-500 text-[12px]">🔒 로그인 필요</span>
                }
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="field-label font-semibold">합 계</span>
              <span className="amount-total text-[16px]">
                {isAuthenticated
                  ? (formatAmount(item.합계) !== '-' ? `${formatAmount(item.합계)} 만원` : '-')
                  : <span className="text-amber-500 text-[12px]">🔒 로그인 필요</span>
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="field-label">월세</span>
              <span className="amount-rent text-[14px]">
                {isAuthenticated
                  ? (formatAmount(item.월세) !== '-' ? `${formatAmount(item.월세)} 만원` : '-')
                  : '***'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="field-label">관리비</span>
              <span className="text-foreground">{item.관리비 || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="field-label">부가세</span>
              <span className="text-foreground">{item.부가세 || '-'}</span>
            </div>
          </div>

          {/* 메모 */}
          <div className="section-header">▼ 메모</div>
          <div className="p-2 space-y-2">
            {item.메모1 && (
              <div>
                <div className="field-label mb-0.5">메모1 (추천업종)</div>
                <div className="bg-[oklch(0.97_0.005_255)] rounded-sm p-1.5 text-[11px] whitespace-pre-wrap leading-relaxed">{item.메모1}</div>
              </div>
            )}
            {item.메모2 && (
              <div>
                <div className="field-label mb-0.5">메모2 (매출내역)</div>
                <div className="bg-[oklch(0.97_0.005_255)] rounded-sm p-1.5 text-[11px] whitespace-pre-wrap leading-relaxed">{item.메모2}</div>
              </div>
            )}
            {item.메모3 && (
              <div>
                <div className="field-label mb-0.5">메모3</div>
                <div className="bg-[oklch(0.97_0.005_255)] rounded-sm p-1.5 text-[11px] whitespace-pre-wrap leading-relaxed">{item.메모3}</div>
              </div>
            )}
            {item.메모0 && (
              <div>
                <div className="field-label mb-0.5">매물번호/기타</div>
                <div className="bg-[oklch(0.97_0.005_255)] rounded-sm p-1.5 text-[11px] whitespace-pre-wrap leading-relaxed">{item.메모0}</div>
              </div>
            )}
            {item.메모기타 && (
              <div>
                <div className="field-label mb-0.5">기타메모</div>
                <div className="bg-[oklch(0.97_0.005_255)] rounded-sm p-1.5 text-[11px] whitespace-pre-wrap leading-relaxed">{item.메모기타}</div>
              </div>
            )}
            {!item.메모1 && !item.메모2 && !item.메모3 && !item.메모0 && !item.메모기타 && (
              <div className="text-muted-foreground text-[11px] py-1">메모 없음</div>
            )}
          </div>
        </div>
      </div>

      {/* 변동내역 */}
      <div className="border-t border-border">
        <div className="section-header">▼ 변동내역 ({itemHistory.length}건)</div>
        {itemHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[oklch(0.95_0.005_240)]">
                  <th className="text-left px-2 py-1 font-medium text-muted-foreground">날짜</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">보증금</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">권리금</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">총액</th>
                  <th className="text-left px-2 py-1 font-medium text-muted-foreground">변동내역</th>
                  <th className="text-left px-2 py-1 font-medium text-muted-foreground">담당자</th>
                </tr>
              </thead>
              <tbody>
                {itemHistory.slice(0, 20).map((h) => (
                  <tr key={h.ID} className="border-t border-border/50 hover:bg-accent/50">
                    <td className="px-2 py-1">{h.날짜}</td>
                    <td className="px-2 py-1 text-right">{formatAmount(h.보증금) !== '-' ? formatAmount(h.보증금) : ''}</td>
                    <td className="px-2 py-1 text-right">{formatAmount(h.권리금) !== '-' ? formatAmount(h.권리금) : ''}</td>
                    <td className="px-2 py-1 text-right font-medium">{formatAmount(h.총액) !== '-' ? formatAmount(h.총액) : ''}</td>
                    <td className="px-2 py-1">{h.변동내역}</td>
                    <td className="px-2 py-1 text-muted-foreground">{h.사용자}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground text-[11px] px-3 py-2">변동내역 없음</div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 items-start">
      <span className="field-label w-[52px] shrink-0 text-right">{label}</span>
      <span className="text-foreground leading-relaxed">{value}</span>
    </div>
  );
}
