/**
 * 권리물건 카드 - 시안 v7 레이아웃 + 인라인 편집
 *
 * 헤더: 좌(종류/물건명/주소/위치/특징 451px) | 우(연락처+메모 1fr)
 * 본문: 좌(물건현황+임대차 170px) | 중(층별업종+매출내역+기타 280px) | 우(금액2열+변동내역+추천업종 1fr)
 * - 헤더 좌 너비 = 본문 좌(170) + 중(280) + border(1) = 451px → 경계선 정렬
 * - 우측 컬럼: 금액(2열) → 변동내역(빈행 채움) → 추천업종(얇게)
 */
import { trpc } from "@/lib/trpc";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

/* ─── 한글 IME 안전 Input (컴포넌트 외부 선언 필수) ─── */
interface EValProps {
  field: string;
  value: string;
  onChange: (field: string, value: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  inputStyle: React.CSSProperties;
  textareaStyle: React.CSSProperties;
}

function EVal({ field, value, onChange, style, multiline, rows: rowCount, placeholder, inputStyle, textareaStyle }: EValProps) {
  const composing = useRef(false);
  const localRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!composing.current) {
      onChange(field, e.target.value);
    }
  }, [field, onChange]);

  const handleCompositionStart = useCallback(() => { composing.current = true; }, []);
  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    composing.current = false;
    onChange(field, (e.target as HTMLInputElement | HTMLTextAreaElement).value);
  }, [field, onChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(field, e.target.value);
  }, [field, onChange]);

  if (multiline) {
    return (
      <textarea
        ref={localRef as React.RefObject<HTMLTextAreaElement>}
        defaultValue={value}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onChange={handleChange}
        onBlur={handleBlur}
        style={{ ...textareaStyle, ...style, minHeight: (rowCount || 3) * 22 }}
        rows={rowCount || 3}
        placeholder={placeholder}
      />
    );
  }
  return (
    <input
      ref={localRef as React.RefObject<HTMLInputElement>}
      type="text"
      defaultValue={value}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{ ...inputStyle, ...style }}
      placeholder={placeholder}
    />
  );
}

/* ─── 유틸 ─── */
function fmtAmt(val: string | number | null | undefined): string {
  if (!val) return '';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (!n || isNaN(n)) return '';
  if (n >= 10000) return `${n.toLocaleString()}만`;
  return `${Math.round(n).toLocaleString()}만`;
}
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function v(val: string | null | undefined): string {
  if (!val || val.trim() === '' || val.trim() === '0') return '';
  return val.trim();
}

/* ─── 색상 팔레트 ─── */
const C = {
  face: '#d8d8d8',
  white: '#ffffff',
  shadow: '#999999',
  shadowLight: 'rgba(128,128,128,0.3)',
  red: '#cc0000',
  green: '#006600',
  bigRed: '#cc0000',
  bigGreen: '#008000',
  orange: '#cc6600',
  hdrBg: '#6b8cba',
  hdrText: '#ffffff',
  rowAlt: '#f5f4f0',
  sumBg: '#fffde7',
  sumLblBg: '#e8e0a0',
  editBg: '#fffbe6',
};

interface Props {
  id?: number;
  isAuthenticated: boolean;
  onEdit?: (item: any) => void;
  onCreateSuccess?: (newId: number) => void;
  onCreateCancel?: () => void;
  onDeleted?: () => void;
}

type EditForm = {
  status: 'active' | 'hold';
  dealType: 'monthly' | 'sale';
  receivedAt: string;
  name: string;
  subName: string;
  address: string;
  location: string;
  type: string;
  industry: string;
  manager: string;
  grade: string;
  category: string;
  feature: string;
  ownerName: string;
  phone1: string;
  phone2: string;
  homePhone: string;
  mobile: string;
  rentArea: string;
  realArea: string;
  landArea: string;
  otherArea: string;
  floors: string;
  exclusiveParking: string;
  sharedParking: string;
  dailySales: string;
  operationPeriod: string;
  saleReason: string;
  ownerNotice: string;
  tableCount: string;
  leaseTerms: string;
  rentIncrease: string;
  mortgage: string;
  settlementNotary: string;
  deposit: string;
  premium: string;
  total: string;
  monthlyRent: string;
  manageFee: string;
  vat: string;
  memo1: string;
  memo2: string;
  memo3: string;
  memo0: string;
  memoEtc: string;
  recommendIndustry: string;
  specialFeature: string;
};

export default function KwonriDetailCard({ id, isAuthenticated, onEdit, onCreateSuccess, onCreateCancel, onDeleted }: Props) {
  const isCreateMode = !id;
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.kwonri.get.useQuery({ id: id! }, { enabled: !!id });
  const uploadMutation = trpc.kwonri.uploadPhoto.useMutation({
    onSuccess: () => utils.kwonri.get.invalidate({ id }),
  });
  const deleteMutation = trpc.kwonri.deletePhoto.useMutation({
    onSuccess: () => utils.kwonri.get.invalidate({ id }),
  });
  const updateMutation = trpc.kwonri.update.useMutation({
    onSuccess: () => {
      toast.success('저장됐습니다');
      utils.kwonri.get.invalidate({ id });
      utils.kwonri.list.invalidate();
      setIsEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const addHistoryMutation = trpc.kwonri.addHistory.useMutation({
    onSuccess: () => {
      toast.success('변동내역이 등록되었습니다');
      utils.kwonri.get.invalidate({ id });
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const addWorkMutation = trpc.kwonri.addWork.useMutation({
    onSuccess: () => {
      toast.success('작업 내역이 등록되었습니다');
      utils.kwonri.get.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });
  const updateHistoryMutation = trpc.kwonri.updateHistory.useMutation({
    onSuccess: () => { utils.kwonri.get.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteHistoryMutation = trpc.kwonri.deleteHistory.useMutation({
    onSuccess: () => { utils.kwonri.get.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });
  const updateWorkMutation = trpc.kwonri.updateWork.useMutation({
    onSuccess: () => { utils.kwonri.get.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteWorkMutation = trpc.kwonri.deleteWork.useMutation({
    onSuccess: () => { utils.kwonri.get.invalidate({ id }); },
    onError: (e) => toast.error(e.message),
  });
  const createMutation = trpc.kwonri.create.useMutation({
    onSuccess: (result) => {
      toast.success('등록됐습니다');
      utils.kwonri.list.invalidate();
      if (onCreateSuccess) onCreateSuccess(result.id);
    },
    onError: (e) => toast.error(e.message),
  });
  const kwonriDeleteMutation = trpc.kwonri.delete.useMutation({
    onSuccess: () => {
      toast.success('삭제되었습니다');
      utils.kwonri.list.invalidate();
      if (onDeleted) onDeleted();
    },
    onError: (e) => toast.error(e.message),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(
    isCreateMode ? {
      status: 'active', dealType: 'monthly',
      receivedAt: new Date().toISOString().slice(0, 10),
      name: '', subName: '', address: '', location: '', type: '', industry: '', manager: '', grade: '', category: '', feature: '',
      ownerName: '', phone1: '', phone2: '', homePhone: '', mobile: '',
      rentArea: '', realArea: '', landArea: '', otherArea: '', floors: '',
      exclusiveParking: '', sharedParking: '', dailySales: '', operationPeriod: '', saleReason: '', ownerNotice: '', tableCount: '',
      leaseTerms: '', rentIncrease: '', mortgage: '', settlementNotary: '',
      deposit: '', premium: '', total: '', monthlyRent: '', manageFee: '', vat: '',
      memo1: '', memo2: '', memo3: '', memo0: '', memoEtc: '', recommendIndustry: '', specialFeature: '',
    } : null
  );
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [workForm, setWorkForm] = useState({ date: '', content: '', manager: '' });
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [historyForm, setHistoryForm] = useState({ date: '', total: '', manager: '', note: '' });
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
  const [editingHistoryForm, setEditingHistoryForm] = useState({ date: '', total: '', manager: '', note: '' });
  const [editingWorkId, setEditingWorkId] = useState<number | null>(null);
  const [editingWorkForm, setEditingWorkForm] = useState({ date: '', content: '', manager: '' });
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // setF를 useCallback으로 안정화하여 EVal에 전달 (조건부 return 이전에 선언 필수)
  const setFCallback = useCallback((key: string, value: string) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }, []);

  if (!isCreateMode && isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, fontFamily: 'Malgun Gothic, dotum, sans-serif', fontSize: 12, color: '#666' }}>로딩 중...</div>
  );
  if (!isCreateMode && !data) return null;

  const photos: string[] = Array.isArray(data?.photos) ? data!.photos : [];
  const deposit = fmtAmt(data?.deposit);
  const premium = fmtAmt(data?.premium);
  const total = fmtAmt(data?.total);
  const monthly = fmtAmt(data?.monthlyRent);
  const statusLabel = (isCreateMode ? form?.status : data?.status) === 'active' ? '관리' : '보류';
  const statusColor = (isCreateMode ? form?.status : data?.status) === 'active' ? '#4a90d9' : C.red;

  function startEdit() {
    setForm({
      status: (data!.status as 'active' | 'hold') || 'active',
      dealType: (data!.dealType as 'monthly' | 'sale') || 'monthly',
      receivedAt: data!.receivedAt ? fmtDate(data!.receivedAt) : '',
      name: v(data!.name),
      subName: v((data as any).subName),
      address: v(data!.address),
      location: v(data!.location),
      type: v(data!.type),
      industry: v(data!.industry),
      manager: v(data!.manager),
      grade: v(data!.grade),
      category: v(data!.category),
      feature: v(data!.feature),
      ownerName: v(data!.ownerName),
      phone1: v(data!.phone1),
      phone2: v(data!.phone2),
      homePhone: v(data!.homePhone),
      mobile: v(data!.mobile),
      rentArea: v(data!.rentArea),
      realArea: v(data!.realArea),
      landArea: v(data!.landArea),
      otherArea: v((data as any).otherArea),
      floors: v(data!.floors),
      exclusiveParking: v((data as any).exclusiveParking),
      sharedParking: v((data as any).sharedParking),
      dailySales: v((data as any).dailySales),
      operationPeriod: v((data as any).operationPeriod),
      saleReason: v((data as any).saleReason),
      ownerNotice: v((data as any).ownerNotice),
      tableCount: v((data as any).tableCount),
      leaseTerms: v((data as any).leaseTerms),
      rentIncrease: v((data as any).rentIncrease),
      mortgage: v((data as any).mortgage),
      settlementNotary: v((data as any).settlementNotary),
      deposit: data!.deposit ? String(data!.deposit) : '',
      premium: data!.premium ? String(data!.premium) : '',
      total: data!.total ? String(data!.total) : '',
      monthlyRent: data!.monthlyRent ? String(data!.monthlyRent) : '',
      manageFee: v(data!.manageFee),
      vat: v(data!.vat),
      memo1: v(data!.memo1),
      memo2: v(data!.memo2),
      memo3: v(data!.memo3),
      memo0: v(data!.memo0),
      memoEtc: v(data!.memoEtc),
      recommendIndustry: v(data!.recommendIndustry),
      specialFeature: v(data!.specialFeature),
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setForm(null);
  }

  function handleCreate() {
    if (!form) return;
    const toNum = (s: string) => s.trim() === '' ? undefined : parseFloat(s);
    createMutation.mutate({
      status: form.status,
      receivedAt: form.receivedAt || undefined,
      name: form.name || undefined,
      address: form.address || undefined,
      location: form.location || undefined,
      type: form.type || undefined,
      industry: form.industry || undefined,
      manager: form.manager || undefined,
      grade: form.grade || undefined,
      category: form.category || undefined,
      specialFeature: form.feature || undefined,
      ownerName: form.ownerName || undefined,
      phone1: form.phone1 || undefined,
      phone2: form.phone2 || undefined,
      homePhone: form.homePhone || undefined,
      mobile: form.mobile || undefined,
      rentArea: form.rentArea || undefined,
      realArea: form.realArea || undefined,
      landArea: form.landArea || undefined,
      otherArea: form.otherArea || undefined,
      floors: form.floors || undefined,
      exclusiveParking: form.exclusiveParking || undefined,
      sharedParking: form.sharedParking || undefined,
      dailySales: form.dailySales || undefined,
      operationPeriod: form.operationPeriod || undefined,
      saleReason: form.saleReason || undefined,
      ownerNotice: form.ownerNotice || undefined,
      tableCount: form.tableCount || undefined,
      leaseTerms: form.leaseTerms || undefined,
      rentIncrease: form.rentIncrease || undefined,
      mortgage: form.mortgage || undefined,
      settlementNotary: form.settlementNotary || undefined,
      deposit: toNum(form.deposit),
      premium: toNum(form.premium),
      total: toNum(form.total),
      monthlyRent: toNum(form.monthlyRent),
      manageFee: form.manageFee || undefined,
      vat: form.vat || undefined,
      memo1: form.memo1 || undefined,
      memo2: form.memo2 || undefined,
      memo3: form.memo3 || undefined,
      memo0: form.memo0 || undefined,
      memoEtc: form.memoEtc || undefined,
      recommendIndustry: form.recommendIndustry || undefined,
    });
  }

  function handleSave() {
    if (!form) return;
    // 수정 시: 빈 문자열은 null로 보내서 DB에서 지울 수 있도록 함
    const toStr = (s: string) => s.trim() === '' ? null : s.trim();
    const toNum = (s: string) => s.trim() === '' ? null : parseFloat(s);
    updateMutation.mutate({
      id: id!,
      status: form.status,
      dealType: form.dealType,
      receivedAt: form.receivedAt || undefined,
      name: toStr(form.name) ?? undefined,
      address: toStr(form.address),
      location: toStr(form.location),
      type: toStr(form.type),
      industry: toStr(form.industry),
      manager: toStr(form.manager),
      grade: toStr(form.grade),
      category: toStr(form.category),
      specialFeature: toStr(form.feature),
      ownerName: toStr(form.ownerName),
      phone1: toStr(form.phone1),
      phone2: toStr(form.phone2),
      homePhone: toStr(form.homePhone),
      mobile: toStr(form.mobile),
      rentArea: toStr(form.rentArea),
      realArea: toStr(form.realArea),
      landArea: toStr(form.landArea),
      otherArea: toStr(form.otherArea),
      floors: toStr(form.floors),
      exclusiveParking: toStr(form.exclusiveParking),
      sharedParking: toStr(form.sharedParking),
      dailySales: toStr(form.dailySales),
      operationPeriod: toStr(form.operationPeriod),
      saleReason: toStr(form.saleReason),
      ownerNotice: toStr(form.ownerNotice),
      tableCount: toStr(form.tableCount),
      leaseTerms: toStr(form.leaseTerms),
      rentIncrease: toStr(form.rentIncrease),
      mortgage: toStr(form.mortgage),
      settlementNotary: toStr(form.settlementNotary),
      deposit: toNum(form.deposit),
      premium: toNum(form.premium),
      total: toNum(form.total),
      monthlyRent: toNum(form.monthlyRent),
      manageFee: toStr(form.manageFee),
      vat: toStr(form.vat),
      memo1: toStr(form.memo1),
      memo2: toStr(form.memo2),
      memo3: toStr(form.memo3),
      memo0: toStr(form.memo0),
      memoEtc: toStr(form.memoEtc),
      recommendIndustry: toStr(form.recommendIndustry),
    });
  }

  function setF(key: keyof EditForm, value: string) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const dataUrl = ev.target?.result as string;
          await uploadMutation.mutateAsync({ id: id!, dataUrl, fileName: file.name });
        } finally { setUploading(false); }
      };
      reader.onerror = () => setUploading(false);
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /* ── 공통 스타일 헬퍼 ── */
  const lbl = (w = 52): React.CSSProperties => ({
    width: w, minWidth: w, flexShrink: 0,
    padding: '1px 6px', background: C.face,
    borderRight: `1px solid ${C.shadow}`,
    fontSize: '11px', fontWeight: 'bold',
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    whiteSpace: 'nowrap',
  });
  const val = (opts: { flex?: boolean; bold?: boolean; color?: string; bg?: string; fontSize?: number } = {}): React.CSSProperties => ({
    ...(opts.flex ? { flex: 1 } : {}),
    padding: '1px 6px',
    background: opts.bg ?? C.white,
    fontSize: opts.fontSize ? `${opts.fontSize}px` : '12px',
    fontWeight: opts.bold ? 'bold' : 'normal',
    color: opts.color ?? '#000',
    display: 'flex', alignItems: 'center',
  });
  const hdr: React.CSSProperties = {
    background: C.face, fontWeight: 'bold', padding: '2px 6px',
    borderBottom: `1px solid ${C.shadow}`, fontSize: '11px', flexShrink: 0,
  };
  const row: React.CSSProperties = {
    display: 'flex', borderBottom: `1px solid ${C.shadowLight}`, minHeight: 22,
  };
  const fieldRow = (h = 22): React.CSSProperties => ({
    display: 'flex', borderBottom: `1px solid ${C.shadowLight}`, minHeight: h,
  });

  // 편집 모드용 input 스타일
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '1px 5px', background: C.editBg,
    border: 'none', outline: 'none', fontSize: '12px',
    fontFamily: 'Malgun Gothic, 맑은 고딕, dotum, sans-serif',
    width: '100%', minWidth: 0,
  };
  const textareaStyle: React.CSSProperties = {
    flex: 1, padding: '4px 6px', background: C.editBg,
    border: 'none', outline: 'none', fontSize: '11px',
    fontFamily: 'Malgun Gothic, 맑은 고딕, dotum, sans-serif',
    resize: 'vertical', lineHeight: 1.7, width: '100%', minWidth: 0,
  };

  /* ── 변동내역 행 수 계산: 최소 12행 보장 ── */
  const historyRows = data?.history ?? [];
  const fillerCount = Math.max(0, 12 - historyRows.length);

  // 편집 모드에서 값 셀 렌더링 헬퍼
  // isCreateMode일 때는 항상 form 편집 상태
  const isFormActive = isEditing || isCreateMode;
  // createMode일 때는 data가 없으므로 뷰 모드에서도 form 사용
  const safeData = data ?? {} as NonNullable<typeof data>;

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100vw', width: '100%' }}>
    <div style={{ fontFamily: 'Malgun Gothic, 맑은 고딕, dotum, sans-serif', fontSize: '12px', background: '#f0f0f0', border: `1px solid ${C.shadow}`, minWidth: 320 }}>

      {/* ══ 타이틀바 ══ */}
      <div style={{ background: isCreateMode ? '#2d6a2d' : (isFormActive ? '#8b6914' : C.hdrBg), padding: '3px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: C.hdrText, fontWeight: 'bold', fontSize: '12px' }}>
          {isCreateMode ? '➕ 권리물건 신규 등록' : (isFormActive ? '✏️ 권리물건 수정 중...' : '권리물건 카드')}
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {isCreateMode ? (
            <>
              <WBtn
                onClick={handleCreate}
                disabled={createMutation.isPending}
                style={{ background: '#4a7c3f', color: '#fff', border: '1px solid #2d5a27', fontWeight: 'bold' }}
              >
                {createMutation.isPending ? '등록 중...' : '✅ 등록'}
              </WBtn>
              <WBtn onClick={onCreateCancel} style={{ background: '#888', color: '#fff', border: '1px solid #666' }}>
                취소
              </WBtn>
            </>
          ) : isFormActive ? (
            <>
              <WBtn
                onClick={handleSave}
                disabled={updateMutation.isPending}
                style={{ background: '#4a7c3f', color: '#fff', border: '1px solid #2d5a27', fontWeight: 'bold' }}
              >
                {updateMutation.isPending ? '저장 중...' : '💾 저장'}
              </WBtn>
              <WBtn onClick={cancelEdit} style={{ background: '#888', color: '#fff', border: '1px solid #666' }}>
                취소
              </WBtn>
            </>
          ) : (
            <>
              {isAuthenticated && <WBtn onClick={startEdit}>수정</WBtn>}
              {isAuthenticated && (
                <>
                  <WBtn onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? '업로드중...' : '사진추가'}
                  </WBtn>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                </>
              )}
              {isAuthenticated && id && (
                <WBtn
                  onClick={() => {
                    if (window.confirm('이 물건을 삭제하시겠습니까?\n변동내역과 작업내역도 함께 삭제됩니다.'))
                      kwonriDeleteMutation.mutate({ id });
                  }}
                  disabled={kwonriDeleteMutation.isPending}
                  style={{ background: '#c0392b', color: '#fff', border: '1px solid #922b21' }}
                >
                  {kwonriDeleteMutation.isPending ? '삭제중...' : '물건삭제'}
                </WBtn>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══ 헤더 영역: 좌451px | 우1fr ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(min(280px, 100%), 451px) 1fr', borderBottom: `1px solid ${C.shadow}`, background: C.white }}>

        {/* 헤더 좌: 접수일행 + 종류행 + 물건명/주소/위치/특징 */}
        <div style={{ borderRight: `1px solid ${C.shadow}` }}>
          {/* 접수일 행 */}
          <div style={row}>
            <div style={lbl()}>접수일</div>
            <div style={{ ...val(), width: 90, borderRight: `1px solid ${C.shadowLight}`, background: '#ffffcc', padding: isFormActive ? 0 : undefined }}>
              {isFormActive && form ? (
                <input
                  type="date"
                  value={form.receivedAt}
                  onChange={e => setF('receivedAt', e.target.value)}
                  style={{ ...inputStyle, width: 90, background: '#ffffcc' }}
                />
              ) : fmtDate(safeData.receivedAt)}
            </div>
            <div style={lbl(30)}>등급</div>
            <div style={{ ...val(), width: 60, borderRight: `1px solid ${C.shadowLight}`, padding: isFormActive ? 0 : undefined }}>
              {isFormActive && form ? <EVal field="grade" value={form.grade} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} style={{ width: 60 }} /> : v(safeData.grade)}
            </div>
            <div style={lbl(30)}>분류</div>
            <div style={{ ...val(), flex: 1, borderRight: `1px solid ${C.shadowLight}`, padding: isFormActive ? 0 : undefined }}>
              {isFormActive && form ? <EVal field="category" value={form.category} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} /> : v(safeData.category)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 10px', background: C.face, flexShrink: 0 }}>
              {isFormActive && form ? (
                <>
                  <WRadioEdit label="추진" active={false} />
                  <WRadioEdit label="관리" active={form.status === 'active'} color="#0000cc" onClick={() => setF('status', 'active')} />
                  <WRadioEdit label="보류" active={form.status === 'hold'} color={C.red} onClick={() => setF('status', 'hold')} />
                </>
              ) : (
                <>
                  <WRadio label="추진" active={false} />
                  <WRadio label="관리" active={safeData.status === 'active'} color="#0000cc" />
                  <WRadio label="보류" active={safeData.status === 'hold'} color={C.red} />
                </>
              )}
            </div>
          </div>
          {/* 종류 행 */}
          <div style={row}>
            <div style={lbl()}>종류</div>
            <div style={{ ...val(), width: 90, borderRight: `1px solid ${C.shadowLight}`, padding: isFormActive ? 0 : undefined }}>
              {isFormActive && form ? <EVal field="type" value={form.type} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} style={{ width: 90 }} /> : v(safeData.type)}
            </div>
            <div style={lbl(30)}>업종</div>
            <div style={{ ...val(), flex: 1, borderRight: `1px solid ${C.shadowLight}`, padding: isFormActive ? 0 : undefined }}>
              {isFormActive && form ? <EVal field="industry" value={form.industry} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} /> : v(safeData.industry)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 10px', background: C.face, flexShrink: 0 }}>
              {isFormActive && form ? (
                <>
                  <WRadioEdit label="월세" active={form.dealType === 'monthly'} color="#0000cc" onClick={() => setF('dealType', 'monthly')} />
                  <WRadioEdit label="매매" active={form.dealType === 'sale'} color="#0000cc" onClick={() => setF('dealType', 'sale')} />
                </>
              ) : (
                <>
                  <WRadio label="월세" active={safeData.dealType === 'monthly'} color="#0000cc" />
                  <WRadio label="매매" active={safeData.dealType === 'sale'} color="#0000cc" />
                </>
              )}
            </div>
          </div>
          {/* 물건명 */}
          <div style={row}>
            <div style={lbl()}>물건명</div>
            <div style={{ ...val({ flex: true }), gap: 5, padding: isFormActive ? '1px 0' : undefined }}>
              {isFormActive && form ? (
                <EVal field="name" value={form.name} onChange={setFCallback} inputStyle={{ ...inputStyle, fontWeight: 'bold', fontSize: '13px' }} textareaStyle={textareaStyle} placeholder="물건명" />
              ) : (
                <>
                  <span style={{ display: 'inline-block', padding: '0 4px', background: statusColor, color: '#fff', fontSize: '10px', fontWeight: 'bold', borderRadius: 2, flexShrink: 0 }}>{statusLabel}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v(safeData.name) || '(이름 없음)'}</span>
                  {v(safeData.subName) && <span style={{ fontSize: '11px', color: '#444', flexShrink: 0 }}>{v(safeData.subName)}</span>}
                </>
              )}
            </div>
          </div>
          {/* 주소 */}
          <div style={row}>
            <div style={lbl()}>주소</div>
            <div style={{ ...val({ flex: true }), padding: isFormActive ? '1px 0' : undefined }}>
              {isFormActive && form ? <EVal field="address" value={form.address} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} /> : v(safeData.address)}
            </div>
          </div>
          {/* 위치 */}
          <div style={row}>
            <div style={lbl()}>위치</div>
            <div style={{ ...val({ flex: true }), padding: isFormActive ? '1px 0' : undefined }}>
              {isFormActive && form ? <EVal field="location" value={form.location} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} /> : v(safeData.location)}
            </div>
          </div>
          {/* 특징 */}
          <div style={{ ...row, borderBottom: 'none', alignItems: 'flex-start' }}>
            <div style={lbl()}>특징</div>
            <div style={{ ...val({ flex: true }), maxHeight: isFormActive ? undefined : 60, overflowY: isFormActive ? undefined : 'auto', alignItems: 'flex-start', whiteSpace: isFormActive ? undefined : 'pre-wrap', lineHeight: 1.5, padding: isFormActive ? '1px 0' : undefined }}>
              {isFormActive && form ? <EVal field="feature" value={form.feature} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} multiline rows={3} /> : v(safeData.feature)}
            </div>
          </div>
        </div>

        {/* 헤더 우: 연락처 | 메모 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* 연락처 */}
          <div style={{ borderRight: `1px solid ${C.shadow}` }}>
            <div style={hdr}>연락처</div>
            {[
              { l: '성  명', field: 'ownerName' as keyof EditForm, displayVal: isAuthenticated ? v(safeData.ownerName) : '' },
              { l: '업소전화', field: 'phone1' as keyof EditForm, displayVal: isAuthenticated ? v(safeData.phone1) : '****' },
              { l: '', field: 'phone2' as keyof EditForm, displayVal: isAuthenticated ? v(safeData.phone2) : '' },
              { l: '자택전화', field: 'homePhone' as keyof EditForm, displayVal: isAuthenticated ? v(safeData.homePhone) : '****' },
              { l: '핸드폰', field: 'mobile' as keyof EditForm, displayVal: isAuthenticated ? v(safeData.mobile) : '****' },
            ].map((r, i) => (
              <div key={i} style={fieldRow(20)}>
                <div style={{ width: 56, flexShrink: 0, padding: '1px 4px', background: '#efefef', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#555' }}>{r.l}</div>
                <div style={{ flex: 1, padding: isFormActive && isAuthenticated ? '1px 0' : '1px 5px', background: C.white, fontSize: '11px', display: 'flex', alignItems: 'center' }}>
                  {isFormActive && isAuthenticated && form ? (
                    <EVal field={r.field} value={form[r.field] as string} onChange={setFCallback} inputStyle={{ ...inputStyle, fontSize: '11px' }} textareaStyle={textareaStyle} />
                  ) : r.displayVal}
                </div>
              </div>
            ))}
          </div>
          {/* 메모 */}
          <div>
            <div style={hdr}>메모</div>
            <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '4px 6px', background: C.white, fontSize: '11px', whiteSpace: isFormActive ? undefined : 'pre-wrap', lineHeight: 1.7, minHeight: 80 }}>
              {isFormActive && form ? (
                <EVal field="memo0" value={form.memo0} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} multiline rows={4} placeholder="메모" style={{ minHeight: 80 }} />
              ) : (v(safeData.memo0) || v((safeData as any).workMemo))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 본문 3열: 좌170 | 중280 | 우1fr ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(120px, 170px) minmax(180px, 280px) 1fr', borderTop: `1px solid ${C.shadow}` }}>

        {/* ── 좌: 물건현황 + 임대차 ── */}
        <div style={{ borderRight: `1px solid ${C.shadow}`, display: 'flex', flexDirection: 'column' }}>
          <div style={hdr}>물건현황</div>
          {[
            { l: '임대평수', field: 'rentArea' as keyof EditForm, displayVal: v(safeData.rentArea) ? `${v(safeData.rentArea)} 평` : '' },
            { l: '실 평 수', field: 'realArea' as keyof EditForm, displayVal: v(safeData.realArea) ? `${v(safeData.realArea)} 평` : '' },
            { l: '대지평수', field: 'landArea' as keyof EditForm, displayVal: v(safeData.landArea) ? `${v(safeData.landArea)} 평` : '' },
            { l: '기타평수', field: 'otherArea' as keyof EditForm, displayVal: v((safeData as any).otherArea) ? `${v((safeData as any).otherArea)} 평` : '' },
            { l: '층   수', field: 'floors' as keyof EditForm, displayVal: v(safeData.floors) },
            { l: '전용주차', field: 'exclusiveParking' as keyof EditForm, displayVal: v((safeData as any).exclusiveParking) },
            { l: '공동주차', field: 'sharedParking' as keyof EditForm, displayVal: v((safeData as any).sharedParking) },
            { l: '일 매 출', field: 'dailySales' as keyof EditForm, displayVal: v((safeData as any).dailySales) },
            { l: '운영기간', field: 'operationPeriod' as keyof EditForm, displayVal: v((safeData as any).operationPeriod) },
            { l: '매매사유', field: 'saleReason' as keyof EditForm, displayVal: v((safeData as any).saleReason) },
            { l: '주인통보', field: 'ownerNotice' as keyof EditForm, displayVal: v((safeData as any).ownerNotice) },
            { l: '테이블수', field: 'tableCount' as keyof EditForm, displayVal: v((safeData as any).tableCount) },
          ].map(r => (
            <div key={r.l} style={fieldRow(22)}>
              <div style={{ width: 56, flexShrink: 0, padding: '1px 4px', background: '#efefef', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#555' }}>{r.l}</div>
              <div style={{ flex: 1, padding: isFormActive && r.field ? '1px 0' : '1px 5px', background: C.white, fontSize: '11px', display: 'flex', alignItems: 'center' }}>
                {isFormActive && r.field && form ? (
                  <EVal field={r.field} value={form[r.field] as string} onChange={setFCallback} inputStyle={{ ...inputStyle, fontSize: '11px' }} textareaStyle={textareaStyle} />
                ) : r.displayVal}
              </div>
            </div>
          ))}
          <div style={{ ...hdr, borderTop: `1px solid ${C.shadow}` }}>임대차</div>
          {[
            { l: '임대기간', field: 'leaseTerms' as keyof EditForm, displayVal: v((safeData as any).leaseTerms) },
            { l: '월세인상', field: 'rentIncrease' as keyof EditForm, displayVal: v((safeData as any).rentIncrease) },
            { l: '근 저 당', field: 'mortgage' as keyof EditForm, displayVal: v((safeData as any).mortgage) },
            { l: '화해공증', field: 'settlementNotary' as keyof EditForm, displayVal: v((safeData as any).settlementNotary) },
          ].map(r => (
            <div key={r.l} style={fieldRow(22)}>
              <div style={{ width: 56, flexShrink: 0, padding: '1px 4px', background: '#efefef', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#555' }}>{r.l}</div>
              <div style={{ flex: 1, padding: isFormActive && r.field ? '1px 0' : '1px 5px', background: C.white, fontSize: '11px', display: 'flex', alignItems: 'center' }}>
                {isFormActive && r.field && form ? (
                  <EVal field={r.field} value={form[r.field] as string} onChange={setFCallback} inputStyle={{ ...inputStyle, fontSize: '11px' }} textareaStyle={textareaStyle} />
                ) : r.displayVal}
              </div>
            </div>
          ))}
        </div>

        {/* ── 중: 층별업종 | 매출내역 | 기타 (균등 세로폭) ── */}
        <div style={{ borderRight: `1px solid ${C.shadow}`, display: 'flex', flexDirection: 'column' }}>
          {/* 층별업종 */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderBottom: `1px solid ${C.shadowLight}` }}>
            <div style={hdr}>▼ 층별업종</div>
            <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '4px 6px', background: C.white, fontSize: '11px', whiteSpace: isFormActive ? undefined : 'pre-wrap', lineHeight: 1.7, overflowY: 'auto', minHeight: 60 }}>
              {isFormActive && form ? (
                <EVal field="memo1" value={form.memo1} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} multiline rows={3} placeholder="층별업종" style={{ minHeight: 60 }} />
              ) : v(safeData.memo1)}
            </div>
          </div>
          {/* 매출내역 */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderBottom: `1px solid ${C.shadowLight}` }}>
            <div style={hdr}>▼ 매출내역</div>
            <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '4px 6px', background: C.white, fontSize: '11px', whiteSpace: isFormActive ? undefined : 'pre-wrap', lineHeight: 1.7, overflowY: 'auto', minHeight: 60 }}>
              {isFormActive && form ? (
                <EVal field="memo2" value={form.memo2} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} multiline rows={3} placeholder="매출내역" style={{ minHeight: 60 }} />
              ) : (v(safeData.salesHistory) || v(safeData.memo2))}
            </div>
          </div>
          {/* 기타 */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={hdr}>▼ 기타</div>
            <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '4px 6px', background: C.white, fontSize: '11px', whiteSpace: isFormActive ? undefined : 'pre-wrap', lineHeight: 1.7, overflowY: 'auto', minHeight: 60 }}>
              {isFormActive && form ? (
                <EVal field="memoEtc" value={form.memoEtc} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} multiline rows={3} placeholder="기타" style={{ minHeight: 60 }} />
              ) : (v(safeData.memoEtc) || v(safeData.otherNote))}
            </div>
          </div>
        </div>

        {/* ── 우: 금액(2열) + 변동내역(빈행 채움) + 추천업종(얇게) ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* 금액 헤더 */}
          <div style={hdr}>금액</div>
          {/* 금액 2열 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${C.shadow}`, flexShrink: 0 }}>
            {/* 좌: 보증금/권리금/합계 */}
            <div style={{ borderRight: `1px solid ${C.shadow}` }}>
              <div style={fieldRow(26)}>
                <div style={{ width: 46, flexShrink: 0, padding: '1px 6px', background: '#efefef', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#555' }}>보증금</div>
                <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '1px 8px', background: C.white, display: 'flex', alignItems: 'center', justifyContent: isFormActive ? 'flex-start' : 'flex-end', gap: 2 }}>
                  {isFormActive && form ? (
                    <input type="number" value={form.deposit} onChange={e => {
                      const dep = e.target.value;
                      setF('deposit', dep);
                      // 합계 자동계산: 보증금 + 권리금
                      const prem = form.premium || '0';
                      const sum = (parseFloat(dep) || 0) + (parseFloat(prem) || 0);
                      setF('total', sum > 0 ? String(sum) : '');
                    }} style={{ ...inputStyle, textAlign: 'right' }} placeholder="만원" />
                  ) : (
                    deposit && <><span style={{ fontWeight: 'bold', fontSize: '14px', color: C.bigRed }}>{deposit}</span><span style={{ fontSize: '11px' }}> 원</span></>
                  )}
                </div>
              </div>
              <div style={fieldRow(26)}>
                <div style={{ width: 46, flexShrink: 0, padding: '1px 6px', background: '#efefef', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#555' }}>권리금</div>
                <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '1px 8px', background: C.white, display: 'flex', alignItems: 'center', justifyContent: isFormActive ? 'flex-start' : 'flex-end', gap: 2 }}>
                  {isFormActive && form ? (
                    <input type="number" value={form.premium} onChange={e => {
                      const prem = e.target.value;
                      setF('premium', prem);
                      // 합계 자동계산: 보증금 + 권리금
                      const dep = form.deposit || '0';
                      const sum = (parseFloat(dep) || 0) + (parseFloat(prem) || 0);
                      setF('total', sum > 0 ? String(sum) : '');
                    }} style={{ ...inputStyle, textAlign: 'right' }} placeholder="만원" />
                  ) : (
                    premium && <><span style={{ fontWeight: 'bold', fontSize: '14px', color: C.bigRed }}>{premium}</span><span style={{ fontSize: '11px' }}> 원</span></>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.shadowLight}`, minHeight: 28, background: C.sumBg }}>
                <div style={{ width: 46, flexShrink: 0, padding: '1px 6px', background: C.sumLblBg, borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>합 계</div>
                <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '1px 8px', background: C.sumBg, display: 'flex', alignItems: 'center', justifyContent: isFormActive ? 'flex-start' : 'flex-end', gap: 2 }}>
                  {isFormActive && form ? (
                    <input type="number" value={form.total} onChange={e => setF('total', e.target.value)} style={{ ...inputStyle, textAlign: 'right', background: C.sumBg }} placeholder="만원" />
                  ) : (
                    total && <><span style={{ fontWeight: 'bold', fontSize: '15px', color: C.bigRed }}>{total}</span><span style={{ fontSize: '11px' }}> 원</span></>
                  )}
                </div>
              </div>
            </div>
            {/* 우: 월세/관리비/부가세 */}
            <div>
              <div style={fieldRow(26)}>
                <div style={{ width: 46, flexShrink: 0, padding: '1px 6px', background: '#efefef', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#555' }}>월  세</div>
                <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '1px 8px', background: C.white, display: 'flex', alignItems: 'center', justifyContent: isFormActive ? 'flex-start' : 'flex-end', gap: 2 }}>
                  {isFormActive && form ? (
                    <input type="number" value={form.monthlyRent} onChange={e => setF('monthlyRent', e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} placeholder="만원" />
                  ) : (
                    monthly && <><span style={{ fontWeight: 'bold', fontSize: '14px', color: C.bigGreen }}>{monthly}</span><span style={{ fontSize: '11px' }}> 원</span></>
                  )}
                </div>
              </div>
              <div style={fieldRow(26)}>
                <div style={{ width: 46, flexShrink: 0, padding: '1px 6px', background: '#efefef', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#555' }}>관리비</div>
                <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '1px 8px', background: C.white, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: isFormActive ? 'flex-start' : 'flex-end', color: C.orange }}>
                  {isFormActive && form ? (
                    <EVal field="manageFee" value={form.manageFee} onChange={setFCallback} inputStyle={{ ...inputStyle, fontSize: '11px' }} textareaStyle={textareaStyle} placeholder="관리비" />
                  ) : v(safeData.manageFee)}
                </div>
              </div>
              {/* 부가세 */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.shadowLight}`, minHeight: 28 }}>
                <div style={{ width: 46, flexShrink: 0, padding: '1px 6px', background: '#efefef', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#555' }}>부가세</div>
                <div style={{ flex: 1, padding: isFormActive ? '1px 0' : '1px 8px', background: C.white, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: isFormActive ? 'flex-start' : 'flex-end' }}>
                  {isFormActive && form ? (
                    <EVal field="vat" value={form.vat} onChange={setFCallback} inputStyle={{ ...inputStyle, fontSize: '11px' }} textareaStyle={textareaStyle} placeholder="부가세" />
                  ) : (v(safeData.vat) || '별도')}
                </div>
              </div>
            </div>
          </div>

          {/* 임대조건 텍스트: 부가세 바로 아래 */}
          {(v(safeData.leaseConditionNote) || v(safeData.memo3) || isFormActive) && (
            <div style={{ padding: isFormActive ? '1px 0' : '4px 6px', background: C.white, fontSize: '11px', whiteSpace: isFormActive ? undefined : 'pre-wrap', lineHeight: 1.5, borderBottom: `1px solid ${C.shadowLight}`, flexShrink: 0, minHeight: isFormActive ? 44 : undefined }}>
              {isFormActive && form ? (
                <EVal field="memo3" value={form.memo3} onChange={setFCallback} inputStyle={inputStyle} textareaStyle={textareaStyle} multiline rows={2} placeholder="임대조건" style={{ minHeight: 44 }} />
              ) : (v(safeData.leaseConditionNote) || v(safeData.memo3))}
            </div>
          )}

          {/* 변동내역 헤더 */}
          <div style={{ display: 'flex', background: C.face, borderBottom: `1px solid ${C.shadow}`, flexShrink: 0, alignItems: 'center' }}>
            <div style={{ width: 22, padding: '1px 4px', borderRight: `1px solid ${C.shadow}`, fontSize: '10px', textAlign: 'center', flexShrink: 0, fontWeight: 'bold' }}>v</div>
            <div style={{ width: 80, padding: '1px 6px', borderRight: `1px solid ${C.shadow}`, fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>날짜</div>
            <div style={{ width: 60, padding: '1px 6px', borderRight: `1px solid ${C.shadow}`, fontSize: '11px', fontWeight: 'bold', flexShrink: 0, textAlign: 'right' }}>에</div>
            <div style={{ flex: 1, padding: '1px 6px', fontSize: '11px', fontWeight: 'bold' }}>담당자, 변동내역</div>
            {isAuthenticated && !isCreateMode && !showHistoryForm && (
              <button
                onClick={() => {
                  setHistoryForm({ date: new Date().toISOString().slice(0, 10), total: '', manager: '', note: '' });
                  setShowHistoryForm(true);
                }}
                style={{ padding: '0 6px', background: '#4a7c3f', color: '#fff', border: 'none', fontSize: '10px', cursor: 'pointer', height: 16, borderRadius: 2, marginRight: 4, flexShrink: 0 }}
              >
                + 새 항목
              </button>
            )}
          </div>
          {/* 인라인 변동내역 등록 폼 */}
          {showHistoryForm && (
            <div style={{ display: 'flex', gap: 4, padding: '4px 6px', background: '#fffbe6', borderBottom: `1px solid ${C.shadowLight}`, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
              <input
                type="date"
                value={historyForm.date}
                onChange={e => setHistoryForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: 110, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
              />
              <input
                type="text"
                value={historyForm.total}
                onChange={e => setHistoryForm(p => ({ ...p, total: e.target.value }))}
                placeholder="에(만원)"
                style={{ width: 80, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
              />
              <input
                type="text"
                value={historyForm.manager}
                onChange={e => setHistoryForm(p => ({ ...p, manager: e.target.value }))}
                placeholder="담당자"
                style={{ width: 70, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
              />
              <input
                type="text"
                value={historyForm.note}
                onChange={e => setHistoryForm(p => ({ ...p, note: e.target.value }))}
                placeholder="변동내역"
                style={{ flex: 1, minWidth: 120, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
              />
              <button
                onClick={() => {
                  if (!historyForm.date || !id) return;
                  addHistoryMutation.mutate({ id, date: historyForm.date, total: historyForm.total || undefined, manager: historyForm.manager, note: historyForm.note }, {
                    onSuccess: () => { setShowHistoryForm(false); setHistoryForm({ date: '', total: '', manager: '', note: '' }); }
                  });
                }}
                disabled={addHistoryMutation.isPending}
                style={{ padding: '1px 8px', background: '#4a7c3f', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', borderRadius: 2, height: 20, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
              >
                {addHistoryMutation.isPending ? '저장 중...' : '등록'}
              </button>
              <button
                onClick={() => setShowHistoryForm(false)}
                style={{ padding: '1px 8px', background: '#888', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', borderRadius: 2, height: 20, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
              >
                취소
              </button>
            </div>
          )}

          {/* 변동내역 데이터 행 */}
          {historyRows.slice(0, 20).map((h: any, i: number) => (
            <div key={h.id ?? i} style={{ flexShrink: 0 }}>
              {editingHistoryId === h.id ? (
                <div style={{ display: 'flex', gap: 4, padding: '3px 6px', background: '#fffbe6', borderBottom: `1px solid ${C.shadowLight}`, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="date" value={editingHistoryForm.date} onChange={e => setEditingHistoryForm(p => ({ ...p, date: e.target.value }))} style={{ width: 110, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }} />
                  <input type="text" value={editingHistoryForm.total} onChange={e => setEditingHistoryForm(p => ({ ...p, total: e.target.value }))} placeholder="에(만원)" style={{ width: 80, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }} />
                  <input type="text" value={editingHistoryForm.manager} onChange={e => setEditingHistoryForm(p => ({ ...p, manager: e.target.value }))} placeholder="담당자" style={{ width: 70, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }} />
                  <input type="text" value={editingHistoryForm.note} onChange={e => setEditingHistoryForm(p => ({ ...p, note: e.target.value }))} placeholder="변동내역" style={{ flex: 1, minWidth: 120, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }} />
                  <button onClick={() => { updateHistoryMutation.mutate({ historyId: h.id, kwonriId: id!, date: editingHistoryForm.date, total: editingHistoryForm.total || undefined, manager: editingHistoryForm.manager, note: editingHistoryForm.note }, { onSuccess: () => setEditingHistoryId(null) }); }} disabled={updateHistoryMutation.isPending} style={{ padding: '1px 8px', background: '#4a7c3f', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', borderRadius: 2, height: 20, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}>저장</button>
                  <button onClick={() => setEditingHistoryId(null)} style={{ padding: '1px 8px', background: '#888', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', borderRadius: 2, height: 20, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}>취소</button>
                </div>
              ) : (
                <div style={{ display: 'flex', borderBottom: `1px solid ${C.shadowLight}`, minHeight: 20, background: i % 2 === 0 ? C.white : C.rowAlt, alignItems: 'center' }}>
                  <div style={{ width: 22, padding: '1px 4px', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', textAlign: 'center', flexShrink: 0 }}>□</div>
                  <div style={{ width: 80, padding: '1px 6px', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', flexShrink: 0 }}>{fmtDate(h.date)}</div>
                  <div style={{ width: 60, padding: '1px 6px', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', textAlign: 'right', flexShrink: 0, fontWeight: 'bold', color: C.bigGreen }}>{fmtAmt(h.total)}</div>
                  <div style={{ flex: 1, padding: '1px 6px', fontSize: '11px' }}>
                    {h.manager && <span style={{ fontWeight: 'bold', marginRight: 4 }}>{h.manager}</span>}
                    {h.note}
                  </div>
                  {isAuthenticated && h.id && (
                    <div style={{ display: 'flex', gap: 2, padding: '0 4px', flexShrink: 0 }}>
                      <button onClick={() => { setEditingHistoryId(h.id); setEditingHistoryForm({ date: h.date ? new Date(h.date).toISOString().slice(0,10) : '', total: h.total ?? '', manager: h.manager ?? '', note: h.note ?? '' }); }} style={{ padding: '0 5px', background: '#4a7c3f', color: '#fff', border: 'none', fontSize: '10px', cursor: 'pointer', borderRadius: 2, height: 16 }}>수정</button>
                      <button onClick={() => { if (window.confirm('삭제하시겠습니까?')) deleteHistoryMutation.mutate({ historyId: h.id, kwonriId: id! }); }} disabled={deleteHistoryMutation.isPending} style={{ padding: '0 5px', background: '#c0392b', color: '#fff', border: 'none', fontSize: '10px', cursor: 'pointer', borderRadius: 2, height: 16 }}>삭제</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 빈 행으로 나머지 공간 채우기 */}
          {Array.from({ length: fillerCount }).map((_, i) => (
            <div key={`filler-${i}`} style={{ display: 'flex', borderBottom: `1px solid ${C.shadowLight}`, height: 20, background: (historyRows.length + i) % 2 === 0 ? C.white : C.rowAlt, flexShrink: 0 }}>
              <div style={{ width: 22, borderRight: `1px solid ${C.shadowLight}`, flexShrink: 0 }} />
              <div style={{ width: 80, borderRight: `1px solid ${C.shadowLight}`, flexShrink: 0 }} />
              <div style={{ width: 60, borderRight: `1px solid ${C.shadowLight}`, flexShrink: 0 }} />
              <div style={{ flex: 1 }} />
            </div>
          ))}

          {/* 추천업종: 얇은 한 줄 */}
          <div style={{ display: 'flex', alignItems: 'center', borderTop: `1px solid ${C.shadow}`, minHeight: 22, flexShrink: 0, gap: 6, padding: '0 6px' }}>
            <div style={{ background: C.face, padding: '0 8px', fontSize: '11px', fontWeight: 'bold', border: `1px solid ${C.shadow}`, height: 18, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>추천업종</div>
            <div style={{ flex: 1, fontSize: '11px', padding: isFormActive ? '1px 0' : undefined }}>
              {isFormActive && form ? (
                <EVal field="recommendIndustry" value={form.recommendIndustry} onChange={setFCallback} inputStyle={{ ...inputStyle, fontSize: '11px' }} textareaStyle={textareaStyle} placeholder="추천업종" />
              ) : v(safeData.recommendIndustry)}
            </div>
            {!isFormActive && (
              <div style={{ display: 'flex', gap: 4 }}>
                <WBtn disabled>인쇄용</WBtn>
                <WBtn disabled>적용</WBtn>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ 작업입력 내역 ══ */}
      <div style={{ borderTop: `1px solid ${C.shadow}` }}>
        <div style={{ ...hdr, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>▼ 작업입력 내역</span>
          {isAuthenticated && !showWorkForm && (
            <button
              onClick={() => {
                setWorkForm({ date: new Date().toISOString().slice(0, 10), content: '', manager: '' });
                setShowWorkForm(true);
              }}
              style={{ padding: '0 6px', background: '#4a7c3f', color: '#fff', border: 'none', fontSize: '10px', cursor: 'pointer', height: 16, borderRadius: 2 }}
            >
              + 새 항목
            </button>
          )}
        </div>
        {/* 인라인 작업 등록 폼 */}
        {showWorkForm && (
          <div style={{ display: 'flex', gap: 4, padding: '4px 6px', background: '#fffbe6', borderBottom: `1px solid ${C.shadowLight}`, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="date"
              value={workForm.date}
              onChange={e => setWorkForm(p => ({ ...p, date: e.target.value }))}
              style={{ width: 110, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
            />
            <input
              type="text"
              value={workForm.manager}
              onChange={e => setWorkForm(p => ({ ...p, manager: e.target.value }))}
              placeholder="담당자"
              style={{ width: 70, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
            />
            <input
              type="text"
              value={workForm.content}
              onChange={e => setWorkForm(p => ({ ...p, content: e.target.value }))}
              placeholder="내용"
              style={{ flex: 1, minWidth: 120, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
            />
            <button
              onClick={() => {
                if (!workForm.date || !workForm.content || !id) return;
                addWorkMutation.mutate({ id, workDate: workForm.date, content: workForm.content, manager: workForm.manager }, {
                  onSuccess: () => { setShowWorkForm(false); setWorkForm({ date: '', content: '', manager: '' }); }
                });
              }}
              disabled={addWorkMutation.isPending || !workForm.content}
              style={{ padding: '1px 8px', background: '#4a7c3f', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', borderRadius: 2, height: 20, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
            >
              {addWorkMutation.isPending ? '저장 중...' : '등록'}
            </button>
            <button
              onClick={() => setShowWorkForm(false)}
              style={{ padding: '1px 8px', background: '#888', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', borderRadius: 2, height: 20, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}
            >
              취소
            </button>
          </div>
        )}
        {(data?.works ?? []).map((w: any, i: number) => (
          <div key={w.id ?? i}>
            {editingWorkId === w.id ? (
              <div style={{ display: 'flex', gap: 4, padding: '3px 6px', background: '#fffbe6', borderBottom: `1px solid ${C.shadowLight}`, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="date" value={editingWorkForm.date} onChange={e => setEditingWorkForm(p => ({ ...p, date: e.target.value }))} style={{ width: 110, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }} />
                <input type="text" value={editingWorkForm.manager} onChange={e => setEditingWorkForm(p => ({ ...p, manager: e.target.value }))} placeholder="담당자" style={{ width: 70, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }} />
                <input type="text" value={editingWorkForm.content} onChange={e => setEditingWorkForm(p => ({ ...p, content: e.target.value }))} placeholder="내용" style={{ flex: 1, minWidth: 120, fontSize: '11px', border: '1px solid #ccc', padding: '1px 4px', background: '#fff', fontFamily: 'Malgun Gothic, dotum, sans-serif' }} />
                <button onClick={() => { updateWorkMutation.mutate({ workId: w.id, kwonriId: id!, workDate: editingWorkForm.date, content: editingWorkForm.content, manager: editingWorkForm.manager }, { onSuccess: () => setEditingWorkId(null) }); }} disabled={updateWorkMutation.isPending} style={{ padding: '1px 8px', background: '#4a7c3f', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', borderRadius: 2, height: 20, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}>저장</button>
                <button onClick={() => setEditingWorkId(null)} style={{ padding: '1px 8px', background: '#888', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer', borderRadius: 2, height: 20, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}>취소</button>
              </div>
            ) : (
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.shadowLight}`, background: i % 2 === 0 ? C.white : C.rowAlt, minHeight: 20, alignItems: 'center' }}>
                <div style={{ width: 80, padding: '1px 6px', borderRight: `1px solid ${C.shadowLight}`, fontSize: '11px', color: '#555', flexShrink: 0 }}>{fmtDate(w.workDate)}</div>
                <div style={{ flex: 1, padding: '1px 6px', fontSize: '11px' }}>{w.content}</div>
                <div style={{ width: 60, padding: '1px 6px', borderLeft: `1px solid ${C.shadowLight}`, fontSize: '11px', color: '#555', flexShrink: 0 }}>{w.manager}</div>
                {isAuthenticated && w.id && (
                  <div style={{ display: 'flex', gap: 2, padding: '0 4px', flexShrink: 0 }}>
                    <button onClick={() => { setEditingWorkId(w.id); setEditingWorkForm({ date: w.workDate ? new Date(w.workDate).toISOString().slice(0,10) : '', content: w.content ?? '', manager: w.manager ?? '' }); }} style={{ padding: '0 5px', background: '#4a7c3f', color: '#fff', border: 'none', fontSize: '10px', cursor: 'pointer', borderRadius: 2, height: 16 }}>수정</button>
                    <button onClick={() => { if (window.confirm('삭제하시겠습니까?')) deleteWorkMutation.mutate({ workId: w.id, kwonriId: id! }); }} disabled={deleteWorkMutation.isPending} style={{ padding: '0 5px', background: '#c0392b', color: '#fff', border: 'none', fontSize: '10px', cursor: 'pointer', borderRadius: 2, height: 16 }}>삭제</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {(data?.works ?? []).length === 0 && !showWorkForm && (
          <div style={{ padding: '4px 8px', fontSize: '11px', color: '#999', background: C.white }}>
            {isCreateMode ? '등록 완료 후 작업입력을 추가할 수 있습니다' : '작업입력 내역 없음'}
          </div>
        )}
      </div>

      {/* ══ 사진 섹션 ══ */}
      {photos.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.shadow}` }}>
          <div style={hdr}>사진 ({photos.length}장)</div>
          <div style={{ padding: 6, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, background: C.white }}>
            {photos.map((url, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', cursor: 'pointer', border: `1px solid ${C.shadow}` }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => setLightboxUrl(url)} />
                {isAuthenticated && (
                  <button
                    onClick={() => deleteMutation.mutate({ id: id!, photoUrl: url })}
                    style={{ position: 'absolute', top: 1, right: 1, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 2, width: 16, height: 16, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxUrl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', border: `3px solid ${C.white}` }} />
        </div>
      )}
    </div>
    </div>
  );
}

/* ─── 헬퍼 컴포넌트 ─── */
function WBtn({ children, onClick, disabled, style }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '1px 8px', background: '#f5f5f5', border: '1px solid #888', fontSize: '11px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: 'Malgun Gothic, dotum, sans-serif', height: 18, ...style }}>
      {children}
    </button>
  );
}
function WRadio({ label, active, color = '#000' }: { label: string; active: boolean; color?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #999', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />}
      </span>
      <span style={{ color: active ? color : '#000', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
    </label>
  );
}
function WRadioEdit({ label, active, color = '#000', onClick }: { label: string; active: boolean; color?: string; onClick?: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }} onClick={onClick}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${active ? color : '#999'}`, background: active ? '#fff' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />}
      </span>
      <span style={{ color: active ? color : '#000', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
    </label>
  );
}
