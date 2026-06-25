/**
 * 연락처 통합 검색 페이지
 * 전화번호로 고객, 권리물건, 명함 통합 검색
 */
import { useState, useMemo } from 'react';
import type { RdbDataFull } from '@/hooks/useRdbData';
import { formatDate } from '@/lib/types';

interface PhoneSearchProps {
  data: RdbDataFull;
  onSelectKwonri: (idx: string) => void;
  onSelectClient: (idx: string) => void;
}

interface SearchResult {
  type: '권리물건' | '고객' | '명함';
  name: string;
  phone: string;
  phoneType: string;
  detail: string;
  idx: string;
}

function normalizePhone(p: string): string {
  return p.replace(/[^0-9]/g, '');
}

export default function PhoneSearch({ data, onSelectKwonri, onSelectClient }: PhoneSearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo((): SearchResult[] => {
    const q = normalizePhone(query);
    if (q.length < 4) return [];

    const found: SearchResult[] = [];

    // 권리물건 검색
    for (const item of data.권리) {
      const phones = [
        { val: item.업소전화1, type: '업소전화' },
        { val: item.업소전화2, type: '업소전화2' },
        { val: item.자택전화, type: '자택전화' },
        { val: item.핸드폰, type: '핸드폰' },
        { val: item.전화번호합, type: '전화번호' },
      ];
      for (const { val, type } of phones) {
        if (val && normalizePhone(val).includes(q)) {
          found.push({
            type: '권리물건',
            name: item.물건명 || '(물건명 없음)',
            phone: val,
            phoneType: type,
            detail: `${item.주소}${item.담당자 ? ` · ${item.담당자}` : ''}`,
            idx: item.인덱스,
          });
          break;
        }
      }
    }

    // 고객 검색
    for (const item of data.TB_Client) {
      const phones = [
        { val: item.핸드폰, type: '핸드폰' },
        { val: item.자택전화, type: '자택전화' },
        { val: item.회사전화, type: '회사전화' },
        { val: item.기타전화, type: '기타전화' },
        { val: item.전화번호합, type: '전화번호' },
      ];
      for (const { val, type } of phones) {
        if (val && normalizePhone(val).includes(q)) {
          found.push({
            type: '고객',
            name: item.고객명 || '(이름 없음)',
            phone: val,
            phoneType: type,
            detail: `${formatDate(item.접수일자)}${item.담당자 ? ` · ${item.담당자}` : ''}${item.권리업종 ? ` · ${item.권리업종}` : ''}`,
            idx: item.인덱스,
          });
          break;
        }
      }
    }

    // 명함 검색
    for (const item of data.TB_NameCard) {
      const phones = [
        { val: item.핸드폰, type: '핸드폰' },
        { val: item.자택전화, type: '자택전화' },
        { val: item.회사전화1, type: '회사전화' },
      ];
      for (const { val, type } of phones) {
        if (val && normalizePhone(val).includes(q)) {
          found.push({
            type: '명함',
            name: item.이름 || '(이름 없음)',
            phone: val,
            phoneType: type,
            detail: `${item.직책 || ''}${item.회사 ? ` · ${item.회사}` : ''}${item.분류 ? ` · ${item.분류}` : ''}`,
            idx: item.ID,
          });
          break;
        }
      }
    }

    return found.slice(0, 100);
  }, [query, data]);

  const typeColor = (type: SearchResult['type']) => {
    if (type === '권리물건') return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    if (type === '고객') return 'bg-green-500/20 text-green-300 border border-green-500/30';
    return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="font-semibold text-[13px] text-foreground mb-2">연락처 통합 검색</div>
        <input
          type="tel"
          placeholder="전화번호 4자리 이상 입력 (예: 010-1234 또는 1234)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-background border border-border rounded px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        {query.length > 0 && query.length < 4 && (
          <div className="text-[11px] text-muted-foreground mt-1">4자리 이상 입력해주세요</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && query.length >= 4 && (
          <div className="text-center text-muted-foreground text-[12px] py-10">
            일치하는 연락처가 없습니다
          </div>
        )}
        {results.length > 0 && (
          <div className="px-2 py-1 text-[10px] text-muted-foreground border-b border-border">
            {results.length}건 검색됨 (최대 100건)
          </div>
        )}
        {results.map((r, i) => (
          <div
            key={i}
            onClick={() => {
              if (r.type === '권리물건') onSelectKwonri(r.idx);
              else if (r.type === '고객') onSelectClient(r.idx);
            }}
            className={`px-3 py-2.5 border-b border-border/50 ${r.type !== '명함' ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${typeColor(r.type)}`}>
                {r.type}
              </span>
              <span className="text-[13px] font-medium text-foreground truncate flex-1">{r.name}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] ml-0">
              <span className="text-primary font-medium">{r.phone}</span>
              <span className="text-muted-foreground">({r.phoneType})</span>
            </div>
            {r.detail && (
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.detail}</div>
            )}
            {r.type !== '명함' && (
              <div className="text-[10px] text-primary/60 mt-0.5">클릭하여 카드 보기 →</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
