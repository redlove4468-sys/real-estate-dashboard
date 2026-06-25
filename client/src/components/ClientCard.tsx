/**
 * 고객 카드 - 원본 RDB 프로그램 Windows 클래식 UI 정밀 재현
 */
import { trpc } from "@/lib/trpc";

/* ─── 유틸 ─── */
function fmtAmt(val: string | number | null | undefined): string {
  if (!val) return '';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (!n || isNaN(n)) return '';
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}억`;
  return `${Math.round(n).toLocaleString()}만`;
}
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}-${m}-${day}(${days[dt.getDay()]})`;
}
function v(val: string | null | undefined): string {
  if (!val || val.trim() === '' || val.trim() === '0') return '';
  return val.trim();
}

const W = {
  face: '#d4d0c8', bg: '#ece9d8', white: '#ffffff',
  shadow: '#808080', hilight: '#ffffff', darkShadow: '#404040',
  blue: '#0000cc', red: '#cc0000', green: '#006600',
  bigGreen: '#008000', hdrBg: '#6b8cba', hdrText: '#ffffff', rowAlt: '#f5f4f0',
};

interface Props {
  id: number;
  isAuthenticated: boolean;
  onEdit?: (item: any) => void;
}

export default function ClientCard({ id, isAuthenticated, onEdit }: Props) {
  const { data, isLoading } = trpc.customer.get.useQuery({ id });

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, fontFamily: 'Malgun Gothic, dotum, sans-serif', fontSize: 12, color: '#666' }}>로딩 중...</div>
  );
  if (!data) return null;

  const statusLabel = data.status === 'active' ? '관리' : '보류';
  const statusColor = data.status === 'active' ? W.blue : W.red;

  return (
    <div style={{ fontFamily: 'Malgun Gothic, 맑은 고딕, dotum, sans-serif', fontSize: '12px', background: W.bg }}>

      {/* 파란 타이틀바 */}
      <div style={{ background: W.hdrBg, padding: '3px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: W.hdrText, fontWeight: 'bold', fontSize: '12px' }}>고객카드</span>
        {onEdit && isAuthenticated && <WBtn onClick={() => onEdit(data)}>수정</WBtn>}
      </div>

      <div style={{ border: `2px inset ${W.shadow}` }}>

        {/* 행1: 고객명 + 상태 */}
        <div style={rowS()}>
          <Lbl w={46}>고객명</Lbl>
          <div style={{ flex: 1, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 6, background: W.white }}>
            <span style={{ display: 'inline-block', padding: '0 5px', background: statusColor, color: '#fff', fontSize: '11px', fontWeight: 'bold', borderRadius: 2 }}>{statusLabel}</span>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{v(data.name) || '(이름 없음)'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1px 10px', background: W.face, borderLeft: `1px solid ${W.shadow}`, flexShrink: 0 }}>
            <WRadio label="추진" active={false} />
            <WRadio label="관리" active={data.status === 'active'} color={W.blue} />
            <WRadio label="보류" active={data.status === 'hold'} color={W.red} />
          </div>
        </div>

        {/* 체크박스 행 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 8px', borderBottom: `1px solid ${W.shadow}`, background: W.bg }}>
          {['계약상황', '답사추진', '상담중', '물건검색', '방문예정', '미팅예정'].map(lbl => (
            <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '11px', cursor: 'pointer' }}>
              <WCheck />{lbl}
            </label>
          ))}
        </div>

        {/* 3단: 고객내역 | 연락처 | 추천내역+조건 */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 220px', borderBottom: `1px solid ${W.shadow}` }}>

          {/* 좌: 고객내역 */}
          <div style={{ borderRight: `1px solid ${W.shadow}` }}>
            <SHdr>고객내역</SHdr>
            {[
              { lbl: '접수', val: data.receivedAt ? fmtDate(data.receivedAt).split('(')[0] : '' },
              { lbl: '등급', val: v(data.grade) },
              { lbl: '분류', val: v(data.category) },
              { lbl: '예산', val: v(data.budget) ? `${v(data.budget)} 만원` : '' },
            ].map(r => (
              <div key={r.lbl} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.3)`, minHeight: 20 }}>
                <div style={lblS(46)}>{r.lbl}</div>
                <div style={valS()}>{r.val}</div>
              </div>
            ))}
            <div style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.3)`, minHeight: 20 }}>
              <div style={lblS(46)}>구입조건</div>
              <div style={{ flex: 1, padding: '2px 5px', background: W.white, fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: 1.4, minHeight: 60 }}>{v(data.wantFeature)}</div>
            </div>
            {[
              { lbl: '업종', val: v(data.wantIndustry) },
              { lbl: '소재지', val: v(data.wantArea) },
              { lbl: '종류', val: v(data.wantType) },
            ].map(r => (
              <div key={r.lbl} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.3)`, minHeight: 20 }}>
                <div style={lblS(46)}>{r.lbl}</div>
                <div style={valS()}>{r.val}</div>
              </div>
            ))}
          </div>

          {/* 중: 연락처 */}
          <div style={{ borderRight: `1px solid ${W.shadow}` }}>
            <SHdr>연락처</SHdr>
            {[
              { lbl: '자택', val: isAuthenticated ? v(data.homePhone) : '****' },
              { lbl: '회사', val: isAuthenticated ? v(data.companyPhone) : '****' },
              { lbl: '팩스', val: isAuthenticated ? v(data.fax) : '****' },
              { lbl: '핸드폰', val: isAuthenticated ? v(data.mobile) : '****' },
              { lbl: '기타1', val: isAuthenticated ? v(data.otherPhone) : '' },
              { lbl: '기타2', val: '' },
              { lbl: '구입자', val: '' },
              { lbl: '상선내역', val: '' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.3)`, minHeight: 20 }}>
                <div style={lblS(46)}>{r.lbl}</div>
                <div style={valS()}>{r.val}</div>
              </div>
            ))}
            <div style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.3)`, minHeight: 20 }}>
              <div style={lblS(46)}>담당자</div>
              <div style={{ flex: 1, padding: '1px 5px', background: W.white, fontSize: '12px', fontWeight: 'bold', color: W.blue, display: 'flex', alignItems: 'center' }}>{v(data.manager)}</div>
            </div>
          </div>

          {/* 우: 추천내역 + 조건 */}
          <div>
            <SHdr>추천내역</SHdr>
            <div style={{ padding: '3px 5px', minHeight: 80, background: W.white, fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{v(data.note1)}</div>
            <SHdr>조건</SHdr>
            {['임대평수', '실 평 수', '대지평수', '기타평수', '층   수'].map(lbl => (
              <div key={lbl} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.2)`, minHeight: 18 }}>
                <div style={{ width: 52, flexShrink: 0, padding: '1px 4px', background: W.face, borderRight: `1px solid rgba(128,128,128,0.4)`, fontSize: '10px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{lbl}</div>
                <div style={{ flex: 1, padding: '1px 4px', background: W.white, fontSize: '10px', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ flex: 1 }}></span><span style={{ fontSize: '9px', color: '#888' }}>이상</span>
                  <span style={{ flex: 1 }}></span><span style={{ fontSize: '9px', color: '#888' }}>이하</span>
                </div>
              </div>
            ))}
            {[
              { lbl: '금액', min: fmtAmt(data.depositMin), max: fmtAmt(data.depositMax) },
              { lbl: '분류', min: '', max: '' },
            ].map(r => (
              <div key={r.lbl} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.2)`, minHeight: 18 }}>
                <div style={{ width: 52, flexShrink: 0, padding: '1px 4px', background: W.face, borderRight: `1px solid rgba(128,128,128,0.4)`, fontSize: '10px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{r.lbl}</div>
                <div style={{ flex: 1, padding: '1px 4px', background: W.white, fontSize: '10px', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span>{r.min}</span><span style={{ fontSize: '9px', color: '#888' }}>이상</span>
                  <span>{r.max}</span><span style={{ fontSize: '9px', color: '#888' }}>이하</span>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', borderTop: `1px solid ${W.shadow}`, minHeight: 20 }}>
              <div style={{ width: 52, flexShrink: 0, padding: '1px 4px', background: W.face, borderRight: `1px solid ${W.shadow}`, fontSize: '10px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>추천업종</div>
              <div style={{ flex: 1, padding: '1px 5px', background: W.white, fontSize: '11px', display: 'flex', alignItems: 'center' }}></div>
            </div>
            <div style={{ padding: '3px 5px', background: W.bg, display: 'flex', justifyContent: 'center' }}>
              <WBtn disabled>권리물건에서 검색</WBtn>
            </div>
          </div>
        </div>

        {/* 상담내역 */}
        <div style={{ borderBottom: `1px solid ${W.shadow}` }}>
          <div style={{ display: 'flex', background: W.face, borderBottom: `1px solid ${W.shadow}` }}>
            <div style={{ flex: 1, padding: '1px 6px', fontSize: '11px', fontWeight: 'bold' }}>상담내역</div>
          </div>
          {data.works && data.works.length > 0 ? (
            data.works.slice(0, 6).map((w: any, i: number) => (
              <div key={i} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.2)`, minHeight: 20, background: i % 2 === 0 ? W.white : W.rowAlt }}>
                <div style={{ width: 130, padding: '1px 6px', borderRight: `1px solid rgba(128,128,128,0.4)`, fontSize: '11px', color: '#555', flexShrink: 0 }}>{fmtDate(w.workDate)}</div>
                <div style={{ flex: 1, padding: '1px 6px', fontSize: '11px' }}>{w.content}</div>
                <div style={{ width: 16, flexShrink: 0, background: '#ffcc00', borderLeft: `1px solid rgba(128,128,128,0.4)` }} />
              </div>
            ))
          ) : (
            [0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.15)`, height: 20, background: i % 2 === 0 ? W.white : W.rowAlt }}>
                <div style={{ width: 130, borderRight: `1px solid rgba(128,128,128,0.3)`, flexShrink: 0 }} />
                <div style={{ flex: 1 }} />
                <div style={{ width: 16, flexShrink: 0, background: '#ffcc00', borderLeft: `1px solid rgba(128,128,128,0.3)` }} />
              </div>
            ))
          )}
        </div>

        {/* 고객 대상물건 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px', background: W.face, borderBottom: `1px solid ${W.shadow}` }}>
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>고객 대상물건</span>
            <span style={{ fontSize: '10px', color: '#666' }}>({data.recommends?.length ?? 0} 건)</span>
            <WRadio label="주소" active={true} color={W.blue} />
            <WRadio label="위치" active={false} />
            <div style={{ flex: 1 }} />
            <WBtn disabled>선택 대상물건 삭제</WBtn>
          </div>
          <div style={{ display: 'flex', background: W.face, borderBottom: `1px solid ${W.shadow}` }}>
            {[{l:'목록',w:22},{l:'물건명',w:100},{l:'종류',w:60},{l:'업종',w:80},{l:'주소',flex:true},{l:'보증금',w:70},{l:'월세',w:60},{l:'권리금',w:70},{l:'합계',w:70},{l:'비고',w:60},{l:'특수',w:30}].map((col, i) => (
              <div key={i} style={{ ...(col.flex ? {flex:1} : {width:col.w,minWidth:col.w}), padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.5)`, fontSize: '10px', fontWeight: 'bold', textAlign: 'center', flexShrink: 0 }}>{col.l}</div>
            ))}
          </div>
          {data.recommends && data.recommends.length > 0 ? (
            data.recommends.slice(0, 8).map((r: any, i: number) => (
              <div key={i} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.2)`, minHeight: 20, background: i % 2 === 0 ? W.white : W.rowAlt }}>
                <div style={{ width: 22, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '10px', textAlign: 'center', flexShrink: 0 }}>□</div>
                <div style={{ width: 100, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kwonriName}</div>
                <div style={{ width: 60, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', flexShrink: 0 }}>{r.itemType}</div>
                <div style={{ width: 80, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kwonriIndustry}</div>
                <div style={{ flex: 1, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kwonriAddress}</div>
                <div style={{ width: 70, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', textAlign: 'right', flexShrink: 0, color: W.bigGreen }}>{fmtAmt(r.kwonriDeposit)}</div>
                <div style={{ width: 60, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', textAlign: 'right', flexShrink: 0 }}></div>
                <div style={{ width: 70, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', textAlign: 'right', flexShrink: 0, color: W.bigGreen }}>{fmtAmt(r.kwonriPremium)}</div>
                <div style={{ width: 70, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', textAlign: 'right', flexShrink: 0, fontWeight: 'bold', color: W.red }}>{fmtAmt(r.kwonriTotal)}</div>
                <div style={{ width: 60, padding: '1px 4px', borderRight: `1px solid rgba(128,128,128,0.3)`, fontSize: '11px', flexShrink: 0 }}>{r.note}</div>
                <div style={{ width: 30, padding: '1px 4px', fontSize: '11px', flexShrink: 0 }}></div>
              </div>
            ))
          ) : (
            [0,1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', borderBottom: `1px solid rgba(128,128,128,0.15)`, height: 20, background: i % 2 === 0 ? W.white : W.rowAlt }}>
                {[22,100,60,80,0,70,60,70,70,60,30].map((w, j) => (
                  <div key={j} style={{ ...(w===0?{flex:1}:{width:w,minWidth:w}), borderRight: `1px solid rgba(128,128,128,0.2)`, flexShrink: 0 }} />
                ))}
              </div>
            ))
          )}
        </div>

        {/* 메모 */}
        {(v(data.memo) || v(data.note2)) && (
          <div style={{ borderTop: `1px solid ${W.shadow}`, display: 'flex' }}>
            <div style={{ width: 18, borderRight: `1px solid ${W.shadow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: W.face, flexShrink: 0 }}>
              <span style={{ fontSize: '9px', color: '#555', writingMode: 'vertical-rl' }}>메모</span>
            </div>
            <div style={{ flex: 1, padding: '4px 6px', minHeight: 40, background: W.white, fontSize: '11px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {v(data.memo)}{v(data.note2) ? '\n' + v(data.note2) : ''}
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼바 */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 6px', background: W.face, borderTop: `1px solid ${W.shadow}` }}>
        <WBtn disabled>추진고객</WBtn>
        <WBtn disabled>관리고객</WBtn>
        <WBtn disabled>보류고객</WBtn>
        <div style={{ flex: 1 }} />
        <WBtn disabled>추진물건</WBtn>
        <WBtn disabled>관리물건</WBtn>
        <WBtn disabled>보류물건</WBtn>
        <WBtn disabled>닫기</WBtn>
      </div>
    </div>
  );
}

function rowS(): React.CSSProperties {
  return { display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${W.shadow}`, minHeight: 20 };
}
function lblS(w: number): React.CSSProperties {
  return { width: w, minWidth: w, flexShrink: 0, padding: '1px 4px', background: W.face, borderRight: `1px solid rgba(128,128,128,0.5)`, fontSize: '11px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' };
}
function valS(): React.CSSProperties {
  return { flex: 1, padding: '1px 5px', background: W.white, fontSize: '12px', display: 'flex', alignItems: 'center' };
}
function Lbl({ w, children }: { w: number; children?: React.ReactNode }) {
  return <div style={{ width: w, minWidth: w, flexShrink: 0, padding: '1px 4px', background: W.face, borderRight: `1px solid ${W.shadow}`, fontSize: '11px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>{children}</div>;
}
function SHdr({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '1px 5px', background: W.face, borderBottom: `1px solid ${W.shadow}`, fontSize: '11px', fontWeight: 'bold' }}>{children}</div>;
}
function WBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ padding: '2px 8px', background: W.face, border: `1px solid`, borderTopColor: W.hilight, borderLeftColor: W.hilight, borderBottomColor: W.darkShadow, borderRightColor: W.darkShadow, fontSize: '11px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: 'Malgun Gothic, dotum, sans-serif' }}>{children}</button>;
}
function WRadio({ label, active, color = '#000' }: { label: string; active: boolean; color?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid`, borderTopColor: W.shadow, borderLeftColor: W.shadow, borderBottomColor: W.hilight, borderRightColor: W.hilight, background: W.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />}
      </span>
      <span style={{ color: active ? color : '#000', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
    </label>
  );
}
function WCheck() {
  return <span style={{ width: 12, height: 12, border: `2px solid`, borderTopColor: W.shadow, borderLeftColor: W.shadow, borderBottomColor: W.hilight, borderRightColor: W.hilight, background: W.white, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} />;
}
