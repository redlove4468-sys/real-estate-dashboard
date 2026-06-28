/**
 * 지도 뷰 - 카카오 지도 기반
 * - DB에 저장된 lat/lng 좌표가 있으면 즉시 마커 표시
 * - 좌표 없는 물건은 카카오 Geocoding API로 변환
 * - 비로그인: 동/구 단위 대략적 표시 (권리금 숨김)
 * - 로그인: 정확한 주소 핀 표시 + 권리금 표시
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { KakaoMapView } from '@/components/KakaoMap';
import { trpc } from '@/lib/trpc';
import { Lock, SlidersHorizontal, X } from 'lucide-react';
import KwonriDetailCard from '@/components/KwonriDetailCard';

declare global {
  interface Window {
    kakao: any;
  }
}

interface Props {
  isAuthenticated: boolean;
}

type StatusFilter = 'active' | 'hold' | 'all';
type DealType = 'all' | 'monthly' | 'sale';

function formatAmt(val: string | number | null | undefined) {
  if (!val) return null;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (!n || isNaN(n)) return null;
  if (n >= 10000) return `${n.toLocaleString()}만`;
  return `${n.toLocaleString()}만`;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
}

function extractDistrictAddress(address: string): string {
  if (!address) return '';
  const match = address.match(/([가-힣]+[동구읍면리])/);
  return match ? match[1] : address.split(' ')[0];
}

// 마포구 동 목록 (주소 정규화용)
const MAPO_DONGS = [
  '서교동','동교동','합정동','망원동','연남동','성산동','상암동',
  '마포동','아현동','공덕동','도화동','용강동','토정동','신수동',
  '창전동','구수동','염리동','노고산동','대흥동','신정동','현석동',
  '당인동','중동','하중동','상수동','신공덕동',
];

function normalizeAddress(addr: string): string {
  const trimmed = addr.trim();
  if (trimmed.match(/^(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)/)) return trimmed;
  if (trimmed.includes('마포구')) return '서울 ' + trimmed;
  for (const dong of MAPO_DONGS) {
    if (trimmed.startsWith(dong)) return '서울 마포구 ' + trimmed;
  }
  if (trimmed.match(/^[가-힣]+구[\s]/)) return '서울 ' + trimmed;
  return trimmed;
}

interface MarkerData {
  id: number;
  name: string | null;
  address: string | null;
  deposit: string | null;
  premium: string | null;
  total: string | null;
  monthlyRent: string | null;
  industry: string | null;
  manager: string | null;
  status: string;
  dealType?: string | null;
  receivedAt: Date | null;
  updatedAt: Date | null;
  floors?: string | null;
  realArea?: string | null;
  rentArea?: string | null;
  lat?: number;
  lng?: number;
  category?: string | null;
}

export default function MapView({ isAuthenticated }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [dealType, setDealType] = useState<DealType>('all');
  const [selectedItem, setSelectedItem] = useState<MarkerData | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<{ address: string; items: MarkerData[] } | null>(null);
  const [detailCardId, setDetailCardId] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<any[]>([]);
  const geocodingAbortRef = useRef(false);

  // 고급 필터 상태
  const [areaSearch, setAreaSearch] = useState('');
  const [floorSearch, setFloorSearch] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [minDeposit, setMinDeposit] = useState('');
  const [maxDeposit, setMaxDeposit] = useState('');
  const [minMonthly, setMinMonthly] = useState('');
  const [maxMonthly, setMaxMonthly] = useState('');
  const [minPremium, setMinPremium] = useState('');
  const [maxPremium, setMaxPremium] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const { data: typeList } = trpc.kwonri.types.useQuery();

  const activeFilterCount = [
    areaSearch, floorSearch, minArea, maxArea,
    minDeposit, maxDeposit, minMonthly, maxMonthly, minPremium, maxPremium,
    minTotal, maxTotal,
    dealType !== 'all' ? dealType : '',
    typeFilter, branchFilter,
  ].filter(Boolean).length;

  const { data } = trpc.kwonri.allForMap.useQuery({
    status: statusFilter,
    areaSearch: areaSearch || undefined,
    floorSearch: floorSearch || undefined,
    minArea: minArea ? parseFloat(minArea) : undefined,
    maxArea: maxArea ? parseFloat(maxArea) : undefined,
    minDeposit: minDeposit ? parseFloat(minDeposit) : undefined,
    maxDeposit: maxDeposit ? parseFloat(maxDeposit) : undefined,
    minMonthly: minMonthly ? parseFloat(minMonthly) : undefined,
    maxMonthly: maxMonthly ? parseFloat(maxMonthly) : undefined,
    minPremium: minPremium ? parseFloat(minPremium) : undefined,
    maxPremium: maxPremium ? parseFloat(maxPremium) : undefined,
    minTotal: minTotal ? parseFloat(minTotal) : undefined,
    maxTotal: maxTotal ? parseFloat(maxTotal) : undefined,
    dealType: dealType !== 'all' ? dealType : undefined,
    typeFilter: typeFilter || undefined,
    branchFilter: branchFilter || undefined,
  });

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
  }, []);

  // 마커 색상 결정
  function getMarkerColor(item: MarkerData): string {
    if (item.dealType === 'sale') return '#f97316';
    if (item.status !== 'active') return '#9ca3af';
    if (item.category === '글로벌부동산') return '#a855f7';
    return '#22c55e';
  }

  // 클러스터 마커 생성 (동일 주소 여러 매물)
  const placeClusterMarker = useCallback((map: any, items: MarkerData[], lat: number, lng: number) => {
    const count = items.length;

    // 클러스터 대표 색상: 혼합=남색, 단일지점 따라감
    let color: string;
    if (count === 1) {
      color = getMarkerColor(items[0]);
    } else {
      const hasGlobal = items.some(i => i.category === '글로벌부동산');
      const hasABC = items.some(i => i.category === 'ABC부동산');
      if (hasGlobal && hasABC) color = '#6366f1';
      else if (hasGlobal) color = '#a855f7';
      else color = '#22c55e';
    }

    const markerEl = document.createElement('div');
    if (count === 1) {
      markerEl.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer;`;
    } else {
      markerEl.style.cssText = `min-width:22px;height:22px;border-radius:11px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0 4px;`;
      markerEl.innerHTML = `<span style="color:white;font-size:11px;font-weight:700;line-height:1;">${count}</span>`;
    }

    const overlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(lat, lng),
      content: markerEl,
      map,
    });

    markerEl.addEventListener('click', () => {
      setDetailCardId(null);
      if (count === 1) {
        setSelectedItem({ ...items[0], lat, lng });
        setSelectedCluster(null);
      } else {
        setSelectedCluster({ address: items[0].address || '', items });
        setSelectedItem(null);
      }
    });

    markersRef.current.push(overlay);
  }, []);

  const geocodeAndPlace = useCallback(async (items: MarkerData[], map: any) => {
    geocodingAbortRef.current = false;
    clearMarkers();
    setIsGeocoding(true);
    setGeocodedCount(0);
    setTotalCount(items.length);

    // 주소별로 그룹핑 (동일 주소 = 클러스터)
    const addrGroups = new Map<string, MarkerData[]>();
    for (const item of items) {
      const key = (item.address || '').trim();
      if (!addrGroups.has(key)) addrGroups.set(key, []);
      addrGroups.get(key)!.push(item);
    }

    let placedCount = 0;

    // 1단계: DB에 좌표 있는 그룹은 즉시 마커
    const needGeocode: [string, MarkerData[]][] = [];
    for (const [addr, group] of addrGroups) {
      const first = group.find(i => i.lat && i.lng);
      if (first?.lat && first?.lng) {
        placeClusterMarker(map, group, first.lat, first.lng);
        placedCount += group.length;
        setGeocodedCount(placedCount);
      } else {
        needGeocode.push([addr, group]);
      }
    }

    // 2단계: 좌표 없는 그룹은 Geocoding (주소별 1회만)
    if (needGeocode.length > 0 && window.kakao?.maps?.services) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      for (const [addr, group] of needGeocode) {
        if (geocodingAbortRef.current) break;
        if (!addr) continue;
        const queryAddr = isAuthenticated
          ? normalizeAddress(addr)
          : extractDistrictAddress(addr);
        if (!queryAddr) continue;

        await new Promise<void>((resolve) => {
          geocoder.addressSearch(queryAddr, (result: any[], status: string) => {
            if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
              const lat = parseFloat(result[0].y);
              const lng = parseFloat(result[0].x);
              placeClusterMarker(map, group, lat, lng);
              placedCount += group.length;
              setGeocodedCount(placedCount);
            }
            resolve();
          });
        });
        await new Promise(r => setTimeout(r, 60));
      }
    }

    setIsGeocoding(false);
  }, [isAuthenticated, clearMarkers, placeClusterMarker]);

  const handleMapReady = useCallback((map: any) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!data || !mapReady || !mapRef.current) return;
    geocodingAbortRef.current = true;
    const items: MarkerData[] = data.map(i => ({
      id: i.id,
      name: i.name,
      address: i.address,
      deposit: i.deposit,
      premium: i.premium,
      total: i.total,
      monthlyRent: i.monthlyRent,
      industry: i.industry,
      manager: i.manager,
      status: i.status,
      dealType: i.dealType,
      receivedAt: i.receivedAt,
      updatedAt: i.updatedAt,
      floors: i.floors,
      realArea: i.realArea,
      rentArea: i.rentArea,
      lat: i.lat != null ? parseFloat(String(i.lat)) : undefined,
      lng: i.lng != null ? parseFloat(String(i.lng)) : undefined,
      category: i.category,
    }));
    setTimeout(() => geocodeAndPlace(items, mapRef.current!), 50);
  }, [data, mapReady, geocodeAndPlace]);

  const handleResetFilters = () => {
    setAreaSearch(''); setFloorSearch('');
    setMinArea(''); setMaxArea('');
    setMinDeposit(''); setMaxDeposit('');
    setMinMonthly(''); setMaxMonthly('');
    setMinPremium(''); setMaxPremium('');
    setMinTotal(''); setMaxTotal('');
    setDealType('all');
    setTypeFilter('');
    setBranchFilter('');
    setSelectedItem(null);
    setSelectedCluster(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 상단 필터 바 */}
      <div className="px-4 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-foreground">지도 뷰</span>

          {/* 상태 필터 */}
          <div className="flex gap-1">
            {(['active', 'hold', 'all'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setSelectedItem(null); }}
                className={`px-3 py-1 text-[11px] rounded-full font-medium transition-colors ${
                  statusFilter === s
                    ? s === 'active' ? 'bg-green-500 text-white'
                      : s === 'hold' ? 'bg-gray-400 text-white'
                      : 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}>
                {s === 'active' ? '관리' : s === 'hold' ? '보류' : '전체'}
              </button>
            ))}
          </div>

          {/* 월세/매매 필터 */}
          <div className="flex gap-1">
            {([
              { value: 'all', label: '월세+매매' },
              { value: 'monthly', label: '월세' },
              { value: 'sale', label: '매매' },
            ] as { value: DealType; label: string }[]).map(d => (
              <button key={d.value} onClick={() => { setDealType(d.value); setSelectedItem(null); }}
                className={`px-3 py-1 text-[11px] rounded-full font-medium transition-colors ${
                  dealType === d.value
                    ? d.value === 'monthly' ? 'bg-blue-500 text-white'
                      : d.value === 'sale' ? 'bg-orange-500 text-white'
                      : 'bg-slate-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}>
                {d.label}
              </button>
            ))}
          </div>

          {/* 지점 필터 */}
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none"
          >
            <option value="">전체 지점</option>
            <option value="ABC부동산">ABC부동산</option>
            <option value="글로벌부동산">글로벌부동산</option>
          </select>

          {/* 범례 */}
          <div className="hidden md:flex items-center gap-2 ml-1">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> ABC
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> 글로벌
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> 매매
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" /> 보류
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> 혼합
            </span>
          </div>

          {/* 고급 필터 토글 */}
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border transition-colors relative ${
              showFilters ? 'bg-primary text-white border-primary' : 'border-input bg-background text-muted-foreground hover:bg-accent'
            }`}>
            <SlidersHorizontal size={11} /> 필터
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* 상태 표시 */}
          <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            {isGeocoding ? (
              <>
                <span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin inline-block" />
                {geocodedCount}/{totalCount} 변환 중...
              </>
            ) : data ? (
              <span>{geocodedCount}건 표시</span>
            ) : null}
          </div>
        </div>

        {/* 고급 필터 패널 */}
        {showFilters && (
          <div className="mt-2 p-3 bg-muted/50 rounded-md border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground">상세 필터</span>
              {activeFilterCount > 0 && (
                <button onClick={handleResetFilters} className="text-[10px] text-red-500 hover:text-red-700 font-medium">
                  전체 초기화
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">종류</div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none">
                  <option value="">전체</option>
                  {(typeList || []).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">지역 (동/구, 쉼표로 다중 입력)</div>
                <input type="text" placeholder="예: 서교동, 동교동, 연남동" value={areaSearch}
                  onChange={e => setAreaSearch(e.target.value)}
                  className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">층수 (쉼표로 다중 입력)</div>
                <input type="text" placeholder="예: 1, 2, 지하" value={floorSearch}
                  onChange={e => setFloorSearch(e.target.value)}
                  className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">면적 (평)</div>
                <div className="flex gap-1">
                  <input type="number" placeholder="최소" value={minArea} onChange={e => setMinArea(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxArea} onChange={e => setMaxArea(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">보증금 (만원)</div>
                <div className="flex gap-1">
                  <input type="number" placeholder="최소" value={minDeposit} onChange={e => setMinDeposit(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxDeposit} onChange={e => setMaxDeposit(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">월세 (만원)</div>
                <div className="flex gap-1">
                  <input type="number" placeholder="최소" value={minMonthly} onChange={e => setMinMonthly(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxMonthly} onChange={e => setMaxMonthly(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">권리금 (만원)</div>
                <div className="flex gap-1">
                  <input type="number" placeholder="최소" value={minPremium} onChange={e => setMinPremium(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxPremium} onChange={e => setMaxPremium(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">합계금액 (만원)</div>
                <div className="flex gap-1">
                  <input type="number" placeholder="최소" value={minTotal} onChange={e => setMinTotal(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                  <input type="number" placeholder="최대" value={maxTotal} onChange={e => setMaxTotal(e.target.value)}
                    className="w-full text-[11px] border border-input rounded px-2 py-1 bg-background focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 지도 */}
      <div className="flex-1 relative">
        <KakaoMapView
          onMapReady={handleMapReady}
          className="w-full h-full"
        />

        {/* 클러스터 리스트 패널 (동일 주소 여러 매물) */}
        {selectedCluster && !detailCardId && (
          <div className="absolute top-4 right-4 left-4 md:left-auto bg-white rounded-xl shadow-xl border border-border md:w-[300px] z-10 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <div className="font-semibold text-[13px] text-gray-900 truncate">{selectedCluster.address}</div>
                <div className="text-[11px] text-muted-foreground">{selectedCluster.items.length}개 물건</div>
              </div>
              <button onClick={() => setSelectedCluster(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-2">×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {selectedCluster.items.map((item, idx) => (
                <div key={item.id} onClick={() => { setSelectedItem({ ...item }); setSelectedCluster(null); }}
                  className={`px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-[12px] font-semibold text-gray-900 truncate flex-1">{item.name || '(물건명 없음)'}</span>
                    {item.dealType === 'sale' && (
                      <span className="text-[9px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded-sm font-medium">매매</span>
                    )}
                    {item.category === '글로벌부동산' && (
                      <span className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-700 border border-purple-300 rounded-sm font-bold">글</span>
                    )}
                    {item.category === 'ABC부동산' && (
                      <span className="text-[9px] px-1 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 rounded-sm font-bold">에</span>
                    )}
                  </div>
                  {(item.realArea || item.rentArea || item.floors) && (
                    <div className="text-[10px] text-gray-500 ml-3 mb-0.5">
                      {item.realArea || item.rentArea ? `${item.realArea || item.rentArea}평` : ''}{item.floors ? ` · ${item.floors}` : ''}
                    </div>
                  )}
                  <div className="ml-3 text-[10px] text-gray-500 space-y-0.5">
                    {formatAmt(item.deposit) && <span>보 {formatAmt(item.deposit)}</span>}
                    {formatAmt(item.premium) && <span className="ml-1">권 {formatAmt(item.premium)}</span>}
                    {formatAmt(item.total) && <span className="ml-1">합 {formatAmt(item.total)}</span>}
                    {formatAmt(item.monthlyRent) && <span className="ml-1">월 {formatAmt(item.monthlyRent)}</span>}
                  </div>
                  {item.manager && <div className="ml-3 text-[10px] text-gray-400 mt-0.5">{item.manager}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 선택된 물건 팝업 */}
        {selectedItem && !detailCardId && (
          <div className="absolute top-4 right-4 left-4 md:left-auto bg-white rounded-xl shadow-xl border border-border p-4 md:w-[280px] z-10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-semibold text-[14px] truncate text-gray-900">
                    {selectedItem.name || '(물건명 없음)'}
                  </span>
                  {selectedItem.dealType === 'sale' && (
                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-sm font-medium">매매</span>
                  )}
                  {selectedItem.category === '글로벌부동산' && (
                    <span className="shrink-0 text-[9px] px-1 py-0.5 bg-purple-100 text-purple-700 border border-purple-300 rounded-sm font-bold">글</span>
                  )}
                  {selectedItem.category === 'ABC부동산' && (
                    <span className="shrink-0 text-[9px] px-1 py-0.5 bg-rose-100 text-rose-700 border border-rose-300 rounded-sm font-bold">에</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">
                  {isAuthenticated
                    ? selectedItem.address
                    : extractDistrictAddress(selectedItem.address || '')}
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-700 ml-2 shrink-0 text-xl leading-none">×</button>
            </div>

            {selectedItem.industry && (
              <div className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full inline-block mb-2">
                {selectedItem.industry}
              </div>
            )}

            {(selectedItem.realArea || selectedItem.rentArea || selectedItem.floors) && (
              <div className="flex gap-3 mb-2 text-[11px] text-gray-500">
                {(selectedItem.realArea || selectedItem.rentArea) && (
                  <span>📐 {selectedItem.realArea || selectedItem.rentArea}평</span>
                )}
                {selectedItem.floors && <span>🏢 {selectedItem.floors}</span>}
              </div>
            )}

            <div className="space-y-1 mb-3">
              {formatAmt(selectedItem.deposit) && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">보증금</span>
                  <span className="text-blue-600 font-medium">{formatAmt(selectedItem.deposit)}</span>
                </div>
              )}
              {isAuthenticated ? (
                formatAmt(selectedItem.premium) && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">권리금</span>
                    <span className="text-orange-500 font-medium">{formatAmt(selectedItem.premium)}</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Lock size={10} /> 권리금 (로그인 필요)
                </div>
              )}
              {formatAmt(selectedItem.total) && (
                <div className="flex justify-between text-[12px] font-semibold border-t border-gray-100 pt-1">
                  <span className="text-gray-700">합계</span>
                  <span className="text-green-600">{formatAmt(selectedItem.total)}</span>
                </div>
              )}
              {formatAmt(selectedItem.monthlyRent) && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">월세</span>
                  <span className="text-purple-600 font-medium">{formatAmt(selectedItem.monthlyRent)}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setDetailCardId(selectedItem.id)}
              className="w-full py-1.5 text-[11px] bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              상세 물건카드 보기
            </button>

            <div className="border-t border-gray-100 pt-2 mt-2 space-y-0.5">
              {selectedItem.receivedAt && (
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>등록일</span><span>{formatDate(selectedItem.receivedAt)}</span>
                </div>
              )}
              {selectedItem.updatedAt && (
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>수정일</span><span>{formatDate(selectedItem.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 상세 물건카드 모달 */}
      {detailCardId && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setDetailCardId(null); } }}
        >
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setDetailCardId(null)}
              className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-gray-100 rounded-full p-1 shadow"
            >
              <X size={16} className="text-gray-600" />
            </button>
            <KwonriDetailCard
              id={detailCardId}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      )}
    </div>
  );
}
