import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Plus, SlidersHorizontal, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import KwonriDetailCard from "./KwonriDetailCard";
import KwonriFormModal from "./KwonriFormModal";

type StatusFilter = "active" | "hold" | "all";
type DealType = "all" | "monthly" | "sale";
type SortBy = "updatedAt" | "receivedAt" | "deposit" | "premium" | "total" | "monthlyRent" | "name";
type SortOrder = "asc" | "desc";

interface Props {
  isAuthenticated: boolean;
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  active: "관리",
  hold: "보류",
  all: "전체",
};

const SORT_OPTIONS: { value: SortBy; label: string; defaultOrder: "asc" | "desc" }[] = [
  { value: "updatedAt", label: "최근 업데이트", defaultOrder: "desc" },
  { value: "receivedAt", label: "접수일", defaultOrder: "desc" },
  { value: "deposit", label: "보증금", defaultOrder: "desc" },
  { value: "premium", label: "권리금", defaultOrder: "desc" },
  { value: "total", label: "합계", defaultOrder: "desc" },
  { value: "monthlyRent", label: "월세", defaultOrder: "desc" },
  { value: "name", label: "이름", defaultOrder: "asc" },
];

function formatAmt(val: string | number | null | undefined) {
  if (!val) return null;
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (!n || isNaN(n)) return null;
  if (n >= 10000) return `${n.toLocaleString()}만`;
  return `${n.toLocaleString()}만`;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export default function KwonriListView({ isAuthenticated }: Props) {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 기존 필터
  const [minDeposit, setMinDeposit] = useState("");
  const [maxDeposit, setMaxDeposit] = useState("");
  const [minPremium, setMinPremium] = useState("");
  const [maxPremium, setMaxPremium] = useState("");
  const [manager, setManager] = useState("");

  // 신규 필터
  const [areaSearch, setAreaSearch] = useState("");    // 지역 (동/구)
  const [floorSearch, setFloorSearch] = useState("");  // 층수
  const [minArea, setMinArea] = useState("");          // 면적 최소
  const [maxArea, setMaxArea] = useState("");          // 면적 최대
  const [minMonthly, setMinMonthly] = useState("");    // 월세 최소
  const [maxMonthly, setMaxMonthly] = useState("");    // 월세 최대
  const [minTotal, setMinTotal] = useState("");        // 합계 최소
  const [maxTotal, setMaxTotal] = useState("");        // 합계 최대
  const [dealType, setDealType] = useState<DealType>("all"); // 월세/매매
  const [typeFilter, setTypeFilter] = useState(""); // 종류 필터
  const [branchFilter, setBranchFilter] = useState(""); // 지점 필터

  const PAGE_SIZE = 50;

  // 활성 필터 개수 계산
  const activeFilterCount = [
    minDeposit, maxDeposit, minPremium, maxPremium, manager,
    areaSearch, floorSearch, minArea, maxArea, minMonthly, maxMonthly, minTotal, maxTotal,
    dealType !== "all" ? dealType : "",
    typeFilter,
    branchFilter,
  ].filter(Boolean).length;

  const { data, isLoading, refetch } = trpc.kwonri.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    status,
    search: debouncedSearch,
    sortBy,
    sortOrder,
    minDeposit: minDeposit ? parseFloat(minDeposit) : undefined,
    maxDeposit: maxDeposit ? parseFloat(maxDeposit) : undefined,
    minPremium: minPremium ? parseFloat(minPremium) : undefined,
    maxPremium: maxPremium ? parseFloat(maxPremium) : undefined,
    minMonthly: minMonthly ? parseFloat(minMonthly) : undefined,
    maxMonthly: maxMonthly ? parseFloat(maxMonthly) : undefined,
    minTotal: minTotal ? parseFloat(minTotal) : undefined,
    maxTotal: maxTotal ? parseFloat(maxTotal) : undefined,
    manager: manager || undefined,
    areaSearch: areaSearch || undefined,
    floorSearch: floorSearch || undefined,
    minArea: minArea ? parseFloat(minArea) : undefined,
    maxArea: maxArea ? parseFloat(maxArea) : undefined,
    dealType: dealType !== "all" ? dealType : undefined,
    typeFilter: typeFilter || undefined,
    branchFilter: branchFilter || undefined,
  });

  const { data: managers } = trpc.kwonri.managers.useQuery();
  const { data: types } = trpc.kwonri.types.useQuery();

  const updateMutation = trpc.kwonri.update.useMutation({
    onSuccess: () => { toast.success("저장됐습니다"); refetch(); setEditMode(false); },
    onError: (e) => toast.error(e.message),
  });
  const createMutation = trpc.kwonri.create.useMutation({
    onSuccess: () => { toast.success("등록됐습니다"); refetch(); setShowNewForm(false); },
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
    const timer = setTimeout(() => setDebouncedSearch(val), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleStatusChange = (s: StatusFilter) => {
    setStatus(s);
    setPage(1);
    setSelectedId(null);
  };

  const handleResetFilters = () => {
    setMinDeposit(""); setMaxDeposit("");
    setMinPremium(""); setMaxPremium("");
    setMinMonthly(""); setMaxMonthly("");
    setManager(""); setAreaSearch("");
    setFloorSearch(""); setMinArea(""); setMaxArea("");
    setDealType("all");
    setTypeFilter("");
    setPage(1);
  };

  const utils = trpc.useUtils();

  const handleExportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await utils.kwonri.exportAll.fetch({ status: 'all' });
      if (!result?.csv) throw new Error('데이터 없음');
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `매물데이터_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${result.count.toLocaleString()}건 내보내기 완료`);
    } catch (e) {
      toast.error('내보내기 실패: 로그인이 필요합니다');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const showDetail = selectedId !== null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── 좌측 목록 패널 ── */}
      <div className={`md:w-[340px] md:shrink-0 flex flex-col border-r border-border bg-card ${showDetail ? "hidden md:flex" : "flex w-full"}`}>
        {/* 헤더 */}
        <div className="px-3 py-2.5 border-b border-border bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[14px] text-foreground">
              권리물건 {data ? <span className="text-muted-foreground font-normal text-[12px]">({data.total.toLocaleString()}건)</span> : null}
            </span>
            <div className="flex items-center gap-1">
              {isAuthenticated && (
                <button
                  onClick={handleExportCsv}
                  disabled={exporting}
                  className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-[11px] rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  title="전체 데이터를 CSV로 백업"
                >
                  {exporting ? '내보내는 중...' : '📥 CSV 백업'}
                </button>
              )}
              {isAuthenticated && (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-primary text-white text-[11px] rounded-md hover:bg-primary/80 transition-colors"
                >
                  <Plus size={12} /> 신규 등록
                </button>
              )}
            </div>
          </div>

          {/* 상태 필터 버튼 */}
          <div className="flex gap-1 mb-2">
            {(["active", "hold", "all"] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => handleStatusChange(s)}
                className={`flex-1 py-1 text-[11px] rounded-md font-medium transition-colors ${
                  status === s
                    ? s === "active" ? "bg-green-500 text-white"
                      : s === "hold" ? "bg-gray-400 text-white"
                      : "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* 월세/매매 필터 */}
          <div className="flex gap-1 mb-2">
            {([
              { value: "all", label: "월세+매매" },
              { value: "monthly", label: "월세" },
              { value: "sale", label: "매매" },
            ] as { value: DealType; label: string }[]).map(d => (
              <button key={d.value} onClick={() => { setDealType(d.value); setPage(1); }}
                className={`flex-1 py-1 text-[11px] rounded-md font-medium transition-colors ${
                  dealType === d.value
                    ? d.value === "monthly" ? "bg-blue-500 text-white"
                      : d.value === "sale" ? "bg-orange-500 text-white"
                      : "bg-slate-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}>
                {d.label}
              </button>
            ))}
          </div>

          {/* 검색창 */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="물건명, 주소, 업종, 담당자..."
              value={search} onChange={e => handleSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-[12px] border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            {search && (
              <button onClick={() => handleSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>

          {/* 정렬 + 필터 토글 */}
          <div className="flex gap-1.5 items-center">
            <select value={sortBy} onChange={e => {
                const newSort = e.target.value as SortBy;
                const opt = SORT_OPTIONS.find(o => o.value === newSort);
                setSortBy(newSort);
                setSortOrder(opt?.defaultOrder ?? "desc");
                setPage(1);
              }}
              className="flex-1 text-[11px] border border-input rounded-md px-2 py-1 bg-background focus:outline-none">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={() => { setSortOrder(o => o === "desc" ? "asc" : "desc"); setPage(1); }}
              className="flex items-center justify-center w-7 h-7 border border-input rounded-md bg-background hover:bg-accent text-muted-foreground transition-colors"
              title={sortOrder === "desc" ? "내림차순 (클릭 시 오름차순)" : "오름차순 (클릭 시 내림차순)"}
            >
              {sortOrder === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            </button>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border transition-colors relative ${
                showFilters ? "bg-primary text-white border-primary" : "border-input bg-background text-muted-foreground hover:bg-accent"
              }`}>
              <SlidersHorizontal size={11} /> 필터
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* 상세 필터 패널 */}
          {showFilters && (
            <div className="mt-2 p-2.5 bg-muted/50 rounded-md space-y-2 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground">상세 필터</span>
                {activeFilterCount > 0 && (
                  <button onClick={handleResetFilters} className="text-[10px] text-red-500 hover:text-red-700 font-medium">
                    전체 초기화
                  </button>
                )}
              </div>

              {/* 지역 검색 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">지역 (쉼표로 다중 입력)</div>
                <input type="text" placeholder="예: 서교동, 동교동, 연남동" value={areaSearch}
                  onChange={e => { setAreaSearch(e.target.value); setPage(1); }}
                  className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>

              {/* 층수 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">층수 (쉼표로 다중 입력)</div>
                <input type="text" placeholder="예: 1, 2, 지하" value={floorSearch}
                  onChange={e => { setFloorSearch(e.target.value); setPage(1); }}
                  className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>

              {/* 면적 범위 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">면적 (평)</div>
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="최소 (평)" value={minArea}
                    onChange={e => { setMinArea(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대 (평)" value={maxArea}
                    onChange={e => { setMaxArea(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>

              {/* 보증금 범위 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">보증금 (만원)</div>
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="최소" value={minDeposit}
                    onChange={e => { setMinDeposit(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxDeposit}
                    onChange={e => { setMaxDeposit(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>

              {/* 월세 범위 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">월세 (만원)</div>
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="최소" value={minMonthly}
                    onChange={e => { setMinMonthly(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxMonthly}
                    onChange={e => { setMaxMonthly(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>

              {/* 합계금액 범위 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">합계금액 (만원)</div>
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="최소" value={minTotal}
                    onChange={e => { setMinTotal(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxTotal}
                    onChange={e => { setMaxTotal(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>

              {/* 권리금 범위 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">권리금 (만원)</div>
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="최소" value={minPremium}
                    onChange={e => { setMinPremium(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxPremium}
                    onChange={e => { setMaxPremium(e.target.value); setPage(1); }}
                    className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>

              {/* 담당자 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">담당자</div>
                <select value={manager} onChange={e => { setManager(e.target.value); setPage(1); }}
                  className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none">
                  <option value="">전체</option>
                  {managers?.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* 지점 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">지점</div>
                <select
                  value={branchFilter}
                  onChange={e => { setBranchFilter(e.target.value); setPage(1); }}
                  className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none"
                >
                  <option value="">전체</option>
                  <option value="ABC부동산">ABC부동산</option>
                  <option value="글로벌부동산">글로벌부동산</option>
                </select>
              </div>

              {/* 종류 */}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">종류</div>
                <input
                  type="text"
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                  placeholder="종류 검색..."
                  list="type-options"
                  className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none"
                />
                <datalist id="type-options">
                  {types?.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
            </div>
          )}
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-[12px]">로딩 중...</div>
          ) : data?.items.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-[12px]">검색 결과 없음</div>
          ) : (
            data?.items.map(item => (
              <div key={item.id} onClick={() => setSelectedId(item.id)}
                className={`px-3 py-2.5 border-b border-border/60 cursor-pointer transition-colors ${
                  selectedId === item.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-accent/40"
                }`}>
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${item.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                    <span className="text-[12px] font-semibold text-foreground truncate">{item.name || "(물건명 없음)"}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(item as any).dealType === "sale" && (
                      <span className="text-[9px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded-sm font-medium">매매</span>
                    )}
                    {(item as any).type && (
                      <span className="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-sm font-medium">{(item as any).type}</span>
                    )}
                    {(item as any).category === '글로벌부동산' && (
                      <span className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-700 border border-purple-300 rounded-sm font-bold">글</span>
                    )}
                    {(item as any).category === 'ABC부동산' && (
                      <span className="text-[9px] px-1 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 rounded-sm font-bold">에</span>
                    )}
                  </div>
                </div>
                {(item as any).subName && (
                  <div className="text-[10px] text-muted-foreground/80 ml-3 mb-0.5 truncate font-medium">
                    {(item as any).subName}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground ml-3 mb-0.5 truncate">
                  {item.address}{item.location ? ` · ${item.location}` : ""}
                  {item.industry ? ` · ${item.industry}` : ""}
                </div>
                {((item as any).floors || item.realArea || (item as any).rentArea) && (
                  <div className="flex items-center gap-2 ml-3 mb-0.5">
                    {(item as any).floors && (
                      <span className="text-[10px] text-muted-foreground">{(item as any).floors}층</span>
                    )}
                    {(item.realArea && item.realArea !== '0') && (
                      <span className="text-[10px] text-muted-foreground">실 {item.realArea}평</span>
                    )}
                    {((item as any).rentArea && (item as any).rentArea !== '0') && (
                      <span className="text-[10px] text-muted-foreground">임 {(item as any).rentArea}평</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 ml-3 flex-wrap">
                  {formatAmt(item.deposit) && <span className="text-[11px] amount-deposit">보 {formatAmt(item.deposit)}</span>}
                  {formatAmt(item.premium) && <span className="text-[11px] amount-premium">권 {formatAmt(item.premium)}</span>}
                  {formatAmt(item.total) && <span className="text-[11px] amount-total font-bold">합 {formatAmt(item.total)}</span>}
                  {formatAmt(item.monthlyRent) && <span className="text-[11px] amount-monthly">월 {formatAmt(item.monthlyRent)}</span>}
                  {(item as any).manageFee && (item as any).manageFee !== '0' && <span className="text-[11px] text-muted-foreground">관 {(item as any).manageFee}</span>}
                </div>
                <div className="flex items-center gap-2 ml-3 mt-0.5">
                  {item.receivedAt && <span className="text-[9px] text-muted-foreground/60">등록 {formatDate(item.receivedAt)}</span>}
                  {(item as any).lastActivityDate && (
                    <span className="text-[9px] text-muted-foreground/60">수정 {formatDate((item as any).lastActivityDate)}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-accent disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-muted-foreground">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-accent disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── 우측 상세 카드 ── */}
      <div className={`bg-background flex flex-col ${showDetail ? "flex w-full md:flex-1" : "hidden md:flex md:flex-1"}`}>
        {showNewForm ? (
          <>
            {/* 모바일 뒤로가기 헤더 */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card shrink-0">
              <button onClick={() => setShowNewForm(false)} className="flex items-center gap-1.5 text-[13px] text-primary font-medium">
                <ChevronLeft size={18} /> 목록으로
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <KwonriDetailCard
                isAuthenticated={isAuthenticated}
                onCreateSuccess={(newId) => {
                  setShowNewForm(false);
                  setSelectedId(newId);
                }}
                onCreateCancel={() => setShowNewForm(false)}
              />
            </div>
          </>
        ) : selectedId ? (
          <>
            {/* 모바일 뒤로가기 헤더 */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card shrink-0">
              <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-[13px] text-primary font-medium">
                <ChevronLeft size={18} /> 목록으로
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <KwonriDetailCard
                id={selectedId}
                isAuthenticated={isAuthenticated}
                onEdit={isAuthenticated ? () => setEditMode(true) : undefined}
                onDeleted={() => setSelectedId(null)}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="text-5xl opacity-10">🏢</div>
              <div className="text-muted-foreground text-[13px]">좌측 목록에서 물건을 선택하세요</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
