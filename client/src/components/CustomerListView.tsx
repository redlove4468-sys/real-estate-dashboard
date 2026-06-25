import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Plus, SlidersHorizontal, X, ChevronLeft, ChevronRight, Lock, Pencil, ClipboardList, Package, ArrowUp, ArrowDown } from "lucide-react";
import CustomerFormModal from "./CustomerFormModal";
import KwonriDetailCard from "./KwonriDetailCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type StatusFilter = "active" | "hold" | "all";
type SortBy = "lastActivityDate" | "receivedAt" | "name" | "deposit";

interface Props { isAuthenticated: boolean; }

const STATUS_LABELS: Record<StatusFilter, string> = { active: "관리", hold: "보류", all: "전체" };
const SORT_OPTIONS: { value: SortBy; label: string; defaultOrder: "asc" | "desc" }[] = [
  { value: "lastActivityDate", label: "최근 업데이트", defaultOrder: "desc" },
  { value: "receivedAt", label: "접수일", defaultOrder: "desc" },
  { value: "name", label: "이름", defaultOrder: "asc" },
  { value: "deposit", label: "예산", defaultOrder: "desc" },
];

function formatAmt(val: string | number | null | undefined) {
  if (!val) return null;
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (!n || isNaN(n)) return null;
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}억`;
  return `${n.toLocaleString()}만`;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

function hasValue(v: string | null | undefined) {
  return v && v.trim() !== '' && v.trim() !== '0';
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0 w-16">{label}</span>
      <span className={`text-[12px] ${highlight ? 'font-semibold text-foreground' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

export default function CustomerListView({ isAuthenticated }: Props) {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("lastActivityDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<any>(null);
  const setNF = (k: string, v: any) => setNewForm((f: any) => ({ ...f, [k]: v }));
  const [editItem, setEditItem] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const setEF = (k: string, v: any) => setEditForm((f: any) => ({ ...f, [k]: v }));
  const [showFilters, setShowFilters] = useState(false);
  const [manager, setManager] = useState("");
  const [grade, setGrade] = useState("");
  const [kwonriPopupId, setKwonriPopupId] = useState<number | null>(null);
  // 추진내역 인라인 폼
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState({ workDate: new Date().toISOString().slice(0,10), content: '', manager: '' });
  // 대상물건 검색 모달
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const [debouncedPropertySearch, setDebouncedPropertySearch] = useState('');
  const PAGE_SIZE = 50;

  const { data, isLoading, refetch } = trpc.customer.list.useQuery({
    page, pageSize: PAGE_SIZE, status, search: debouncedSearch,
    sortBy, sortOrder,
    manager: manager || undefined,
    grade: grade || undefined,
  });

  const { data: managers } = trpc.customer.managers.useQuery();
  const { data: grades } = trpc.customer.grades.useQuery();

  const updateMutation = trpc.customer.update.useMutation({
    onSuccess: () => { toast.success("저장됐습니다"); refetch(); setShowForm(false); setEditItem(null); setEditMode(false); setEditForm(null); },
    onError: (e) => toast.error(e.message),
  });
  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => { toast.success("등록됐습니다"); refetch(); setShowForm(false); setShowNewForm(false); setNewForm(null); },
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
    setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const utils = trpc.useUtils();

  // 추진내역 추가
  const addProgressMutation = trpc.customer.addProgress.useMutation({
    onSuccess: () => { toast.success('추진내역 추가됐습니다'); utils.customer.get.invalidate({ id: selectedId! }); setShowProgressForm(false); setProgressForm({ workDate: new Date().toISOString().slice(0,10), content: '', manager: '' }); },
    onError: (e) => toast.error(e.message),
  });
  // 추진내역 삭제
  const deleteProgressMutation = trpc.customer.deleteProgress.useMutation({
    onSuccess: () => { toast.success('삭제됐습니다'); utils.customer.get.invalidate({ id: selectedId! }); },
    onError: (e) => toast.error(e.message),
  });
  // 대상물건 추가
  const addTargetMutation = trpc.customer.addTargetProperty.useMutation({
    onSuccess: (r) => { if (r.duplicate) { toast.warning('이미 추가된 물건입니다'); } else { toast.success('대상물건 추가됐습니다'); utils.customer.get.invalidate({ id: selectedId! }); } setShowPropertySearch(false); setPropertySearch(''); setDebouncedPropertySearch(''); },
    onError: (e) => toast.error(e.message),
  });
  // 대상물건 삭제
  const removeTargetMutation = trpc.customer.removeTargetProperty.useMutation({
    onSuccess: () => { toast.success('삭제됐습니다'); utils.customer.get.invalidate({ id: selectedId! }); },
    onError: (e) => toast.error(e.message),
  });
  // 고객 삭제
  const clientDeleteMutation = trpc.customer.delete.useMutation({
    onSuccess: () => { toast.success('고객이 삭제되었습니다'); refetch(); setSelectedId(null); },
    onError: (e) => toast.error(e.message),
  });

  // 물건 검색 (대상물건 추가용)
  const { data: propertySearchResults } = trpc.kwonri.list.useQuery(
    { page: 1, pageSize: 10, search: debouncedPropertySearch, status: 'all' },
    { enabled: debouncedPropertySearch.length >= 1 }
  );

  const handleExportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await utils.customer.exportAll.fetch({ status: 'all' });
      if (!result?.csv) throw new Error('데이터 없음');
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `고객데이터_${today}.csv`;
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
  const showDetail = selectedId !== null || showNewForm;

  // 선택된 고객 상세 (추진내역 + 추천물건 포함)
  const { data: detail, isLoading: detailLoading, isError: detailError } = trpc.customer.get.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null }
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── 좌측 목록 ── */}
      <div className={`md:w-[340px] md:shrink-0 flex flex-col border-r border-border bg-card ${showDetail ? "hidden md:flex" : "flex w-full"}`}>
        <div className="px-3 py-2.5 border-b border-border bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[14px] text-foreground">
              고객 {data ? <span className="text-muted-foreground font-normal text-[12px]">({data.total.toLocaleString()}건)</span> : null}
            </span>
            <div className="flex items-center gap-1">
              {isAuthenticated && (
                <button
                  onClick={handleExportCsv}
                  disabled={exporting}
                  className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-[11px] rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  title="전체 고객 데이터를 CSV로 백업"
                >
                  {exporting ? '내보내는 중...' : '📥 CSV 백업'}
                </button>
              )}
              {isAuthenticated && (
                <button onClick={() => {
                  setNewForm({
                    status: 'active', name: '', manager: '', grade: '', category: '',
                    receivedAt: new Date().toISOString().slice(0, 10),
                    mobile: '', homePhone: '', companyPhone: '', fax: '', budget: '',
                    wantIndustry: '', wantArea: '', wantType: '', wantFeature: '',
                    depositMin: '', depositMax: '', premiumMin: '', premiumMax: '',
                    monthlyMin: '', monthlyMax: '', memo: '', note1: '', note2: '', buyerDetail: '',
                  });
                  setShowNewForm(true);
                  setSelectedId(null);
                }}
                  className="flex items-center gap-1 px-2 py-1 bg-primary text-white text-[11px] rounded-md hover:bg-primary/80 transition-colors">
                  <Plus size={12} /> 신규 등록
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1 mb-2">
            {(["active", "hold", "all"] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); setSelectedId(null); }}
                className={`flex-1 py-1 text-[11px] rounded-md font-medium transition-colors ${
                  status === s
                    ? s === "active" ? "bg-green-500 text-white" : s === "hold" ? "bg-gray-400 text-white" : "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="고객명, 담당자, 업종, 연락처..." value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-[12px] border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            {search && <button onClick={() => handleSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
          </div>
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
              title={sortOrder === "desc" ? "내림차순" : "오름차순"}
            >
              {sortOrder === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            </button>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border transition-colors ${
                showFilters ? "bg-primary text-white border-primary" : "border-input bg-background text-muted-foreground hover:bg-accent"
              }`}>
              <SlidersHorizontal size={11} /> 필터
            </button>
          </div>
          {showFilters && (
            <div className="mt-2 p-2 bg-muted/50 rounded-md space-y-1.5 border border-border">
              <div className="text-[10px] font-medium text-muted-foreground mb-1">상세 필터</div>
              <select value={manager} onChange={e => { setManager(e.target.value); setPage(1); }}
                className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none">
                <option value="">담당자 전체</option>
                {managers?.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                type="text"
                value={grade}
                onChange={e => { setGrade(e.target.value); setPage(1); }}
                placeholder="등급 검색 (예: 이하영, 신경민)"
                className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          )}
        </div>
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
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${item.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-[12px] font-semibold text-foreground truncate flex-1">{item.name || "(이름 없음)"}</span>
                  {(item as any).grade && (
                    <span className="text-[10px] px-1 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-sm font-medium shrink-0">{(item as any).grade}</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground ml-3 mb-0.5 truncate">
                  {item.wantIndustry}{item.wantArea ? ` · ${item.wantArea}` : ""}
                </div>
                <div className="flex items-center gap-2 ml-3 flex-wrap">
                  {formatAmt(item.depositMin) && <span className="text-[10px] amount-deposit">보 {formatAmt(item.depositMin)}{item.depositMax ? `~${formatAmt(item.depositMax)}` : ""}</span>}
                  {formatAmt(item.premiumMin) && <span className="text-[10px] amount-premium">권 {formatAmt(item.premiumMin)}{item.premiumMax ? `~${formatAmt(item.premiumMax)}` : ""}</span>}
                </div>
                <div className="flex items-center gap-2 ml-3 mt-0.5">
                  {item.receivedAt && <span className="text-[9px] text-muted-foreground/60">접수 {formatDate(item.receivedAt)}</span>}
                  {(item as any).lastActivityDate && (
                    <span className="text-[9px] text-muted-foreground/60">최근작업 {formatDate((item as any).lastActivityDate)}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-accent disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="text-[11px] text-muted-foreground">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-accent disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>

      {/* ── 우측 상세 카드 ── */}
      <div className={`bg-background flex flex-col ${showDetail ? "flex w-full md:flex-1" : "hidden md:flex md:flex-1"}`}>
        {/* 모바일 뒤로가기 */}
        {showDetail && (
          <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card shrink-0">
            <button onClick={() => { setSelectedId(null); setShowNewForm(false); }} className="flex items-center gap-1.5 text-[13px] text-primary font-medium">
              <ChevronLeft size={18} /> 목록으로
            </button>
          </div>
        )}

        {/* 신규 등록 인라인 폼 */}
        {showNewForm && newForm ? (
          <div className="overflow-auto p-3 text-[13px]">
            {/* 상단 헤더 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-green-700 rounded-t-lg border border-green-800 border-b-0 flex-wrap mb-0">
              <span className="font-semibold text-[13px] text-white">➕ 고객 신규 등록</span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    const toNum = (v: string) => v ? parseFloat(v) : undefined;
                    createMutation.mutate({
                      status: newForm.status,
                      name: newForm.name || undefined,
                      manager: newForm.manager || undefined,
                      grade: newForm.grade || undefined,
                      category: newForm.category || undefined,
                      mobile: newForm.mobile || undefined,
                      homePhone: newForm.homePhone || undefined,
                      companyPhone: newForm.companyPhone || undefined,
                      fax: newForm.fax || undefined,
                      budget: newForm.budget || undefined,
                      wantIndustry: newForm.wantIndustry || undefined,
                      wantArea: newForm.wantArea || undefined,
                      wantType: newForm.wantType || undefined,
                      wantFeature: newForm.wantFeature || undefined,
                      depositMin: toNum(newForm.depositMin),
                      depositMax: toNum(newForm.depositMax),
                      premiumMin: toNum(newForm.premiumMin),
                      premiumMax: toNum(newForm.premiumMax),
                      monthlyMin: toNum(newForm.monthlyMin),
                      monthlyMax: toNum(newForm.monthlyMax),
                      memo: newForm.memo || undefined,
                      note1: newForm.note1 || undefined,
                      note2: newForm.note2 || undefined,
                      buyerDetail: newForm.buyerDetail || undefined,
                      receivedAt: newForm.receivedAt ? new Date(newForm.receivedAt) : undefined,
                    });
                  }}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-sm bg-white text-green-800 font-bold hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? '등록 중...' : '✅ 등록'}
                </button>
                <button
                  onClick={() => { setShowNewForm(false); setNewForm(null); }}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm bg-green-900 text-white border border-green-700 hover:bg-green-800 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>

            {/* 메인 카드 */}
            <div className="border border-border rounded-b-lg bg-card overflow-hidden mb-3">
              {/* 2단 레이아웃: 고객정보 + 연락정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* 좌측: 고객 기본정보 */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">고객정보</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground shrink-0 w-16">상태</span>
                    <select value={newForm.status} onChange={e => setNF('status', e.target.value)} className="text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none">
                      <option value="active">관리</option>
                      <option value="hold">보류</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground shrink-0 w-16">접수일</span>
                    <input type="date" value={newForm.receivedAt} onChange={e => setNF('receivedAt', e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                  </div>
                  {[['name','고객명'],['manager','담당자'],['grade','등급'],['category','분류']].map(([k,l]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 w-16">{l}</span>
                      <input type="text" value={newForm[k]} onChange={e => setNF(k, e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" placeholder={l} />
                    </div>
                  ))}
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1">희망조건</div>
                  {[['budget','예산'],['wantIndustry','희망업종'],['wantArea','희망지역'],['wantType','희망종류'],['wantFeature','희망특징']].map(([k,l]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 w-16">{l}</span>
                      <input type="text" value={newForm[k]} onChange={e => setNF(k, e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" placeholder={l} />
                    </div>
                  ))}
                </div>
                {/* 우측: 연락정보 */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">연락정보</div>
                  {[['mobile','핸드폰'],['homePhone','집전화'],['companyPhone','회사전화'],['fax','팩스']].map(([k,l]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 w-16">{l}</span>
                      <input type="text" value={newForm[k]} onChange={e => setNF(k, e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" placeholder={l} />
                    </div>
                  ))}
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1">예산 범위</div>
                  {[['depositMin','보증금 최소'],['depositMax','보증금 최대'],['premiumMin','권리금 최소'],['premiumMax','권리금 최대'],['monthlyMin','월세 최소'],['monthlyMax','월세 최대']].map(([k,l]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 w-16">{l}</span>
                      <input type="number" value={newForm[k]} onChange={e => setNF(k, e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" placeholder="만원" />
                    </div>
                  ))}
                </div>
              </div>
              {/* 메모 영역 */}
              <div className="border-t border-border p-3 space-y-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">메모 / 추진내역</div>
                {[['note2','구입조건'],['buyerDetail','구입자상세내역'],['memo','추진내역'],['note1','추체내역']].map(([k,l]) => (
                  <div key={k}>
                    <div className="text-[11px] text-muted-foreground mb-0.5">{l}</div>
                    <textarea value={newForm[k]} onChange={e => setNF(k, e.target.value)} rows={3} className="w-full text-[12px] border border-input rounded px-2 py-1 bg-yellow-50 focus:outline-none resize-y" placeholder={l} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : detailLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-muted-foreground text-[12px]">불러오는 중...</div>
            </div>
          </div>
        ) : detailError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="text-destructive text-[13px] font-medium">데이터 로드 실패</div>
              <div className="text-muted-foreground text-[12px]">잠시 후 다시 시도해주세요</div>
            </div>
          </div>
        ) : detail ? (
          <div className="overflow-auto p-3 text-[13px]">
            {/* ── 상단 헤더 바 ── */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border border-border rounded-t-lg border-b-0 flex-wrap mb-0">
              <span className="font-mono text-[11px] text-muted-foreground">#{detail.id}</span>
              {(detail.receivedAt || detail.createdAt) && (
                <span className="text-[11px] text-muted-foreground">등록 {formatDate(detail.receivedAt || detail.createdAt)}</span>
              )}
              {detail.grade && (
                <span className="text-[11px] px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-sm font-medium">{detail.grade}</span>
              )}
              {detail.category && (
                <span className="text-[11px] px-1.5 py-0.5 bg-green-100 text-green-800 border border-green-200 rounded-sm">{detail.category}</span>
              )}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-sm font-semibold ${
                detail.status === "active"
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}>
                {detail.status === "active" ? "관리" : "보류"}
              </span>
              {!editMode && detail.manager && (
                <span className="ml-auto text-[11px] text-muted-foreground">담당: {detail.manager}</span>
              )}
              {isAuthenticated && !editMode && (
                <button
                  onClick={() => {
                    setEditForm({
                      status: detail.status ?? 'active',
                      name: detail.name ?? '',
                      manager: detail.manager ?? '',
                      grade: detail.grade ?? '',
                      category: detail.category ?? '',
                      mobile: detail.mobile ?? '',
                      homePhone: detail.homePhone ?? '',
                      companyPhone: detail.companyPhone ?? '',
                      fax: detail.fax ?? '',
                      budget: detail.budget ?? '',
                      wantIndustry: detail.wantIndustry ?? '',
                      wantArea: detail.wantArea ?? '',
                      wantType: detail.wantType ?? '',
                      wantFeature: detail.wantFeature ?? '',
                      depositMin: detail.depositMin ? String(parseFloat(String(detail.depositMin))) : '',
                      depositMax: detail.depositMax ? String(parseFloat(String(detail.depositMax))) : '',
                      premiumMin: detail.premiumMin ? String(parseFloat(String(detail.premiumMin))) : '',
                      premiumMax: detail.premiumMax ? String(parseFloat(String(detail.premiumMax))) : '',
                      monthlyMin: detail.monthlyMin ? String(parseFloat(String(detail.monthlyMin))) : '',
                      monthlyMax: detail.monthlyMax ? String(parseFloat(String(detail.monthlyMax))) : '',
                      memo: detail.memo ?? '',
                      note1: detail.note1 ?? '',
                      note2: detail.note2 ?? '',
                      buyerDetail: (detail as any).buyerDetail ?? '',
                    });
                    setEditMode(true);
                  }}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm bg-background border border-border hover:bg-accent transition-colors"
                >
                  <Pencil size={11} /> 수정
                </button>
              )}
              {isAuthenticated && !editMode && selectedId && (
                <button
                  onClick={() => {
                    if (window.confirm('이 고객을 삭제하시겠습니까?\n추진내역과 대상물건 정보도 함께 삭제됩니다.'))
                      clientDeleteMutation.mutate({ id: selectedId });
                  }}
                  disabled={clientDeleteMutation?.isPending}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {clientDeleteMutation?.isPending ? '삭제중...' : '고객삭제'}
                </button>
              )}
              {isAuthenticated && editMode && (
                <>
                  <button
                    onClick={() => {
                      if (!editForm) return;
                      // 수정 시: 빈 문자열은 null로 보내서 DB에서 지울 수 있도록 함
                      const toStr = (v: string) => v.trim() === '' ? null : v.trim();
                      const toNum = (v: string) => v.trim() === '' ? null : parseFloat(v);
                      updateMutation.mutate({
                        id: detail.id,
                        status: editForm.status,
                        name: editForm.name.trim() || undefined,
                        manager: toStr(editForm.manager),
                        grade: toStr(editForm.grade),
                        category: toStr(editForm.category),
                        mobile: toStr(editForm.mobile),
                        homePhone: toStr(editForm.homePhone),
                        companyPhone: toStr(editForm.companyPhone),
                        fax: toStr(editForm.fax),
                        budget: toStr(editForm.budget),
                        wantIndustry: toStr(editForm.wantIndustry),
                        wantArea: toStr(editForm.wantArea),
                        wantType: toStr(editForm.wantType),
                        wantFeature: toStr(editForm.wantFeature),
                        depositMin: toNum(editForm.depositMin),
                        depositMax: toNum(editForm.depositMax),
                        premiumMin: toNum(editForm.premiumMin),
                        premiumMax: toNum(editForm.premiumMax),
                        monthlyMin: toNum(editForm.monthlyMin),
                        monthlyMax: toNum(editForm.monthlyMax),
                        memo: toStr(editForm.memo),
                        note1: toStr(editForm.note1),
                        note2: toStr(editForm.note2),
                        buyerDetail: toStr(editForm.buyerDetail),
                      });
                    }}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-sm bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? '저장 중...' : '💾 저장'}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm bg-muted border border-border hover:bg-accent transition-colors"
                  >
                    취소
                  </button>
                </>
              )}
            </div>

            {/* ── 메인 카드 ── */}
            <div className="border border-border rounded-b-lg bg-card overflow-hidden mb-3">

              {/* ── 2단 레이아웃: 고객정보 + 연락처 ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">

                {/* 좌측: 고객 기본정보 */}
                <div className="p-3 space-y-2">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">고객정보</div>

                  {/* 고객명 */}
                  <div className="font-semibold text-[14px] text-foreground leading-tight">
                    {editMode && editForm ? (
                      <input type="text" value={editForm.name} onChange={e => setEF('name', e.target.value)} className="w-full text-[14px] font-semibold border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" placeholder="고객명" />
                    ) : (detail.name || "(이름 없음)")}
                  </div>

                  {/* 담당자/등급/상태 */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {editMode && editForm ? (
                      <>
                        <select value={editForm.status} onChange={e => setEF('status', e.target.value)} className="text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none">
                          <option value="active">관리</option>
                          <option value="hold">보류</option>
                        </select>
                        <input type="text" value={editForm.manager} onChange={e => setEF('manager', e.target.value)} className="w-20 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" placeholder="담당자" />
                        <input type="text" value={editForm.grade} onChange={e => setEF('grade', e.target.value)} className="w-16 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" placeholder="등급" />
                        <input type="text" value={editForm.category} onChange={e => setEF('category', e.target.value)} className="w-16 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" placeholder="분류" />
                      </>
                    ) : (
                      <>
                        {detail.manager && <span className="text-[11px] text-muted-foreground">{detail.manager}</span>}
                        {detail.grade && <span className="text-[11px] px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-sm font-medium">{detail.grade}</span>}
                        {detail.category && <span className="text-[11px] px-1.5 py-0.5 bg-green-100 text-green-800 border border-green-200 rounded-sm">{detail.category}</span>}
                      </>
                    )}
                  </div>

                  {/* 구입 조건 */}
                  <div className="space-y-1">
                    {editMode && editForm ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground shrink-0 w-16">희망업종</span>
                          <input type="text" value={editForm.wantIndustry} onChange={e => setEF('wantIndustry', e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground shrink-0 w-16">희망지역</span>
                          <input type="text" value={editForm.wantArea} onChange={e => setEF('wantArea', e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground shrink-0 w-16">희망종류</span>
                          <input type="text" value={editForm.wantType} onChange={e => setEF('wantType', e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                        </div>
                      </>
                    ) : (
                      <>
                        {detail.wantIndustry && <InfoRow label="희망업종" value={detail.wantIndustry} />}
                        {detail.wantArea && <InfoRow label="희망지역" value={detail.wantArea} />}
                        {detail.wantType && <InfoRow label="희망종류" value={detail.wantType} />}
                      </>
                    )}
                  </div>

                  {/* 예산 */}
                  <div className="pt-1.5 border-t border-border/50">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">예산 (만원)</div>
                    {editMode && editForm ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground shrink-0 w-16">보증금</span>
                          <input type="number" value={editForm.depositMin} onChange={e => setEF('depositMin', e.target.value)} placeholder="최소" className="w-20 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                          <span className="text-[11px] text-muted-foreground">~</span>
                          <input type="number" value={editForm.depositMax} onChange={e => setEF('depositMax', e.target.value)} placeholder="최대" className="w-20 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground shrink-0 w-16">권리금</span>
                          <input type="number" value={editForm.premiumMin} onChange={e => setEF('premiumMin', e.target.value)} placeholder="최소" className="w-20 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                          <span className="text-[11px] text-muted-foreground">~</span>
                          <input type="number" value={editForm.premiumMax} onChange={e => setEF('premiumMax', e.target.value)} placeholder="최대" className="w-20 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground shrink-0 w-16">월세</span>
                          <input type="number" value={editForm.monthlyMin} onChange={e => setEF('monthlyMin', e.target.value)} placeholder="최소" className="w-20 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                          <span className="text-[11px] text-muted-foreground">~</span>
                          <input type="number" value={editForm.monthlyMax} onChange={e => setEF('monthlyMax', e.target.value)} placeholder="최대" className="w-20 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground shrink-0 w-16">예산메모</span>
                          <input type="text" value={editForm.budget} onChange={e => setEF('budget', e.target.value)} className="flex-1 text-[11px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {formatAmt(detail.depositMin) && (
                          <InfoRow label="보증금" value={`${formatAmt(detail.depositMin) || ""}${detail.depositMax && formatAmt(detail.depositMax) ? ` ~ ${formatAmt(detail.depositMax)}` : ""}`} highlight />
                        )}
                        {formatAmt(detail.premiumMin) && (
                          <InfoRow label="권리금" value={`${formatAmt(detail.premiumMin) || ""}${detail.premiumMax && formatAmt(detail.premiumMax) ? ` ~ ${formatAmt(detail.premiumMax)}` : ""}`} highlight />
                        )}
                        {formatAmt(detail.monthlyMin) && (
                          <InfoRow label="월세" value={`${formatAmt(detail.monthlyMin) || ""}${detail.monthlyMax && formatAmt(detail.monthlyMax) ? ` ~ ${formatAmt(detail.monthlyMax)}` : ""}`} />
                        )}
                        {hasValue(detail.budget) && <InfoRow label="예산메모" value={detail.budget!} />}
                        {!formatAmt(detail.depositMin) && !formatAmt(detail.premiumMin) && !formatAmt(detail.monthlyMin) && (
                          <span className="text-[11px] text-muted-foreground">예산 정보 없음</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 희망특징 */}
                  <div className="pt-1 border-t border-border/50">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">희망특징</div>
                    {editMode && editForm ? (
                      <textarea value={editForm.wantFeature} onChange={e => setEF('wantFeature', e.target.value)} rows={3} className="w-full text-[12px] border border-input rounded px-2 py-1 bg-yellow-50 focus:outline-none resize-y" />
                    ) : hasValue(detail.wantFeature) ? (
                      <p className="text-[12px] text-foreground whitespace-pre-wrap">{detail.wantFeature}</p>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">희망특징 없음</span>
                    )}
                  </div>
                </div>

                {/* 우측: 연락처 + 메모 */}
                <div className="p-3 space-y-3">
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">연락처</div>
                    {isAuthenticated ? (
                      editMode && editForm ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0 w-16">핸드폰</span>
                            <input type="text" value={editForm.mobile} onChange={e => setEF('mobile', e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0 w-16">자택</span>
                            <input type="text" value={editForm.homePhone} onChange={e => setEF('homePhone', e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0 w-16">회사</span>
                            <input type="text" value={editForm.companyPhone} onChange={e => setEF('companyPhone', e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground shrink-0 w-16">팩스</span>
                            <input type="text" value={editForm.fax} onChange={e => setEF('fax', e.target.value)} className="flex-1 text-[12px] border border-input rounded px-2 py-0.5 bg-yellow-50 focus:outline-none" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {detail.mobile && <InfoRow label="핸드폰" value={detail.mobile} />}
                          {detail.homePhone && <InfoRow label="자택" value={detail.homePhone} />}
                          {detail.companyPhone && <InfoRow label="회사" value={detail.companyPhone} />}
                          {detail.fax && <InfoRow label="팩스" value={detail.fax} />}
                          {detail.otherPhone && <InfoRow label="기타" value={detail.otherPhone} />}
                          {!detail.mobile && !detail.homePhone && !detail.companyPhone && !detail.fax && (
                            <span className="text-[11px] text-muted-foreground">연락처 없음</span>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-[12px]">
                        <Lock size={13} /> 로그인 후 연락처를 확인할 수 있습니다
                      </div>
                    )}
                  </div>

                  {/* 구입조건 (note2) */}
                  <div className="border-t border-border/50 pt-2">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">구입조건</div>
                    {(editMode && editForm) ? (
                      <textarea value={editForm.note2} onChange={e => setEF('note2', e.target.value)} rows={3} className="w-full text-[12px] border border-input rounded px-2 py-1 bg-yellow-50 focus:outline-none resize-y" />
                    ) : hasValue(detail.note2) ? (
                      <p className="text-[12px] whitespace-pre-wrap">{detail.note2}</p>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">-</span>
                    )}
                  </div>

                  {/* 구입자상세내역 */}
                  <div className="border-t border-border/50 pt-2">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">구입자상세내역</div>
                    {(editMode && editForm) ? (
                      <textarea value={editForm.buyerDetail} onChange={e => setEF('buyerDetail', e.target.value)} rows={3} className="w-full text-[12px] border border-input rounded px-2 py-1 bg-yellow-50 focus:outline-none resize-y" />
                    ) : hasValue((detail as any).buyerDetail) ? (
                      <p className="text-[12px] whitespace-pre-wrap">{(detail as any).buyerDetail}</p>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">-</span>
                    )}
                  </div>

                  {/* 추진내역 (memo) */}
                  <div className="border-t border-border/50 pt-2">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">추진내역</div>
                    {(editMode && editForm) ? (
                      <textarea value={editForm.memo} onChange={e => setEF('memo', e.target.value)} rows={4} className="w-full text-[12px] border border-input rounded px-2 py-1 bg-yellow-50 focus:outline-none resize-y" />
                    ) : hasValue(detail.memo) ? (
                      <p className="text-[12px] whitespace-pre-wrap">{detail.memo}</p>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">-</span>
                    )}
                  </div>

                  {/* 추체내역 (note1) */}
                  <div className="border-t border-border/50 pt-2">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">추체내역</div>
                    {(editMode && editForm) ? (
                      <textarea value={editForm.note1} onChange={e => setEF('note1', e.target.value)} rows={3} className="w-full text-[12px] border border-input rounded px-2 py-1 bg-yellow-50 focus:outline-none resize-y" />
                    ) : hasValue(detail.note1) ? (
                      <p className="text-[12px] whitespace-pre-wrap text-muted-foreground">{detail.note1}</p>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 추진내역 (작업입력) ── */}
              <div className="px-3 py-2.5 border-t border-border">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <ClipboardList size={11} /> 추진내역
                  {(detail as any).works?.length > 0 && <span className="text-muted-foreground/60">({(detail as any).works.length}건)</span>}
                  {isAuthenticated && (
                    <button
                      onClick={() => setShowProgressForm(v => !v)}
                      className="ml-auto text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                    >+ 새 항목</button>
                  )}
                </div>
                {showProgressForm && (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-sm space-y-1.5">
                    <div className="flex gap-1.5">
                      <input type="date" value={progressForm.workDate} onChange={e => setProgressForm(f => ({...f, workDate: e.target.value}))} className="text-[11px] border border-border rounded px-1.5 py-1 bg-white w-28" />
                      <input type="text" placeholder="담당자" value={progressForm.manager} onChange={e => setProgressForm(f => ({...f, manager: e.target.value}))} className="text-[11px] border border-border rounded px-1.5 py-1 bg-white w-20" />
                    </div>
                    <textarea placeholder="내용" value={progressForm.content} onChange={e => setProgressForm(f => ({...f, content: e.target.value}))} rows={2} className="w-full text-[11px] border border-border rounded px-1.5 py-1 bg-white resize-none" />
                    <div className="flex gap-1">
                      <button onClick={() => { if (!progressForm.content.trim()) { toast.error('내용을 입력하세요'); return; } addProgressMutation.mutate({ clientId: selectedId!, workDate: progressForm.workDate, content: progressForm.content, manager: progressForm.manager }); }} disabled={addProgressMutation.isPending} className="text-[10px] px-2 py-1 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">저장</button>
                      <button onClick={() => setShowProgressForm(false)} className="text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80">취소</button>
                    </div>
                  </div>
                )}
                {(detail as any).works?.length > 0 ? (
                  <div className="space-y-0">
                    {(detail as any).works.map((w: any, i: number) => (
                      <div key={w.id ?? i} className="flex items-start gap-2 text-[11px] py-1.5 border-b border-border/30 last:border-0 group">
                        <span className="text-muted-foreground shrink-0 w-20">{formatDate(w.workDate)}</span>
                        <span className="text-muted-foreground shrink-0 w-14">{w.manager}</span>
                        <span className="text-foreground flex-1 leading-relaxed">{w.content}</span>
                        {isAuthenticated && w.id && (
                          <button onClick={() => { if (confirm('삭제하시겠습니까?')) deleteProgressMutation.mutate({ id: w.id }); }} className="text-[10px] text-red-400 hover:text-red-700 shrink-0 transition-colors px-1">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground/50">추진내역 없음</div>
                )}
              </div>

              {/* ── 대상물건 ── */}
              <div className="px-3 py-2.5 border-t border-border">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <Package size={11} /> 대상물건
                  {(detail as any).recommends?.length > 0 && <span className="text-muted-foreground/60">({(detail as any).recommends.length}건)</span>}
                  <span className="text-[9px] text-muted-foreground/50 ml-1">(클릭 시 물건카드 팝업)</span>
                  {isAuthenticated && (
                    <button
                      onClick={() => setShowPropertySearch(v => !v)}
                      className="ml-auto text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                    >+ 물건 추가</button>
                  )}
                </div>
                {showPropertySearch && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-sm space-y-1.5">
                    <input
                      type="text"
                      placeholder="물건명, 주소, 업종 검색..."
                      value={propertySearch}
                      onChange={e => { setPropertySearch(e.target.value); setTimeout(() => setDebouncedPropertySearch(e.target.value), 300); }}
                      className="w-full text-[11px] border border-border rounded px-2 py-1 bg-white"
                      autoFocus
                    />
                    {debouncedPropertySearch && propertySearchResults?.items && (
                      <div className="max-h-48 overflow-y-auto border border-border rounded bg-white">
                        {propertySearchResults.items.length === 0 ? (
                          <div className="text-[11px] text-muted-foreground p-2">검색 결과 없음</div>
                        ) : propertySearchResults.items.map((k: any) => (
                          <div
                            key={k.id}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/40 cursor-pointer border-b border-border/30 last:border-0"
                            onClick={() => addTargetMutation.mutate({ clientId: selectedId!, kwonriId: k.id })}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium text-foreground truncate">{k.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{k.address} {k.industry && `· ${k.industry}`}</div>
                            </div>
                            <span className={`text-[10px] px-1 py-0.5 rounded-sm shrink-0 ${
                              k.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}>{k.status === 'active' ? '관리' : '보류'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => { setShowPropertySearch(false); setPropertySearch(''); setDebouncedPropertySearch(''); }} className="text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80">닫기</button>
                  </div>
                )}
                {(detail as any).recommends?.length > 0 ? (
                  <div className="space-y-0">
                    {(detail as any).recommends.map((r: any, i: number) => (
                      <div
                        key={r.id ?? i}
                        className={`flex items-start gap-2 text-[11px] py-1.5 border-b border-border/30 last:border-0 group ${
                          r.kwonriId ? 'cursor-pointer hover:bg-accent/40 rounded px-1 -mx-1 transition-colors' : ''
                        }`}
                        onClick={() => r.kwonriId && setKwonriPopupId(r.kwonriId)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {r.kwonriName ? (
                              <span className={`font-medium ${r.kwonriId ? 'text-primary underline-offset-2 hover:underline' : 'text-foreground'}`}>{r.kwonriName}</span>
                            ) : (
                              <span className="text-muted-foreground font-mono text-[10px]">{r.rdbKwonriIndex}</span>
                            )}
                            {r.kwonriStatus && (
                              <span className={`text-[10px] px-1 py-0.5 rounded-sm ${
                                r.kwonriStatus === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                              }`}>{r.kwonriStatus === 'active' ? '관리' : '보류'}</span>
                            )}
                            {r.kwonriIndustry && <span className="text-muted-foreground">{r.kwonriIndustry}</span>}
                          </div>
                          {r.kwonriAddress && <div className="text-[10px] text-muted-foreground mt-0.5">{r.kwonriAddress}</div>}
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {formatAmt(r.kwonriDeposit) && <span className="text-[10px] amount-deposit">보 {formatAmt(r.kwonriDeposit)}</span>}
                            {formatAmt(r.kwonriPremium) && <span className="text-[10px] amount-premium">권 {formatAmt(r.kwonriPremium)}</span>}
                            {formatAmt(r.kwonriTotal) && <span className="text-[10px] amount-total">합 {formatAmt(r.kwonriTotal)}</span>}
                            {r.note && <span className="text-[10px] text-muted-foreground">({r.note})</span>}
                          </div>
                        </div>
                        {isAuthenticated && r.id && (
                          <button
                            onClick={e => { e.stopPropagation(); if (confirm('대상물건을 삭제하시겠습니까?')) removeTargetMutation.mutate({ id: r.id }); }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:text-red-700 shrink-0 transition-opacity self-center"
                          >✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground/50">대상물건 없음</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="text-5xl opacity-10">👥</div>
              <div className="text-muted-foreground text-[13px]">좌측 목록에서 고객을 선택하세요</div>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerFormModal
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={(d: any) => {
            if (editItem) updateMutation.mutate({ id: editItem.id, ...d });
            else createMutation.mutate(d);
          }}
          isLoading={updateMutation.isPending || createMutation.isPending}
        />
      )}

      {/* 대상물건 클릭 시 물건카드 팝업 */}
      <Dialog open={kwonriPopupId !== null} onOpenChange={open => !open && setKwonriPopupId(null)}>
        <DialogContent className="max-w-[95vw] w-[1100px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-4 py-2 border-b border-border">
            <DialogTitle className="text-[13px] font-semibold">물건카드</DialogTitle>
          </DialogHeader>
          {kwonriPopupId !== null && (
            <KwonriDetailCard id={kwonriPopupId} isAuthenticated={isAuthenticated} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
