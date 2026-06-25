import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Search, Building2, Users, Lock } from "lucide-react";

interface Props {
  isAuthenticated: boolean;
  onSelectKwonri: () => void;
  onSelectCustomer: () => void;
}

export default function PhoneSearchView({ isAuthenticated, onSelectKwonri, onSelectCustomer }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data, isLoading } = trpc.search.phone.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 4 }
  );

  const handleChange = (val: string) => {
    setQuery(val);
    if (val.length >= 4) {
      setTimeout(() => setDebouncedQuery(val), 400);
    } else {
      setDebouncedQuery("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border bg-card">
        <h2 className="text-[18px] font-bold text-foreground mb-1">연락처 통합 검색</h2>
        <p className="text-[12px] text-muted-foreground mb-3">전화번호 4자리 이상 입력하면 물건·고객·명함에서 동시에 검색합니다</p>
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="전화번호 입력 (예: 010-1234 또는 1234)"
            className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
        {!isAuthenticated ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center space-y-2">
              <Lock size={32} className="mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground text-[13px]">로그인 후 연락처 검색을 사용할 수 있습니다</p>
            </div>
          </div>
        ) : debouncedQuery.length < 4 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground text-[13px]">전화번호 4자리 이상 입력하세요</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-muted-foreground text-[13px]">검색 중...</div>
          </div>
        ) : !data || (data.kwonri.length === 0 && data.customers.length === 0) ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground text-[13px]">"{debouncedQuery}" 검색 결과 없음</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl">
            {data.kwonri.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} className="text-primary" />
                  <span className="font-semibold text-[13px]">물건 ({data.kwonri.length}건)</span>
                </div>
                <div className="space-y-2">
                  {data.kwonri.map((item: any) => (
                    <div key={item.id} onClick={onSelectKwonri}
                      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${item.status === "active" ? "badge-active" : "badge-hold"}`}>
                          {item.status === "active" ? "관리" : "보류"}
                        </span>
                        <span className="font-semibold text-[13px]">{item.name || "(물건명 없음)"}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{item.address}</div>
                      <div className="flex gap-3 mt-1 text-[11px]">
                        {item.phone1 && <span className="text-primary">{item.phone1}</span>}
                        {item.phone2 && <span className="text-primary">{item.phone2}</span>}
                        {item.mobile && <span className="text-primary">{item.mobile}</span>}
                        {item.homePhone && <span className="text-primary">{item.homePhone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.customers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-green-600" />
                  <span className="font-semibold text-[13px]">고객 ({data.customers.length}건)</span>
                </div>
                <div className="space-y-2">
                  {data.customers.map((item: any) => (
                    <div key={item.id} onClick={onSelectCustomer}
                      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-green-500/50 hover:bg-green-50/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${item.status === "active" ? "badge-active" : "badge-hold"}`}>
                          {item.status === "active" ? "관리" : "보류"}
                        </span>
                        <span className="font-semibold text-[13px]">{item.name || "(이름 없음)"}</span>
                        {item.manager && <span className="text-[11px] text-muted-foreground">· {item.manager}</span>}
                      </div>
                      <div className="flex gap-3 mt-1 text-[11px]">
                        {item.mobile && <span className="text-green-600">{item.mobile}</span>}
                        {item.homePhone && <span className="text-green-600">{item.homePhone}</span>}
                        {item.companyPhone && <span className="text-green-600">{item.companyPhone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
