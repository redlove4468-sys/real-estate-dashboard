# ABC부동산 매물 뷰어 디자인 아이디어

## 목표
부동산 매물 관리 프로그램(RDB 파일)의 데이터를 웹에서 원본 프로그램과 유사한 카드 형태로 조회할 수 있는 뷰어.

---

<response>
<idea>
**Design Movement**: 한국 행정 문서 + 모던 데이터 대시보드 혼합 (Administrative Clarity)

**Core Principles**:
- 정보 밀도 우선: 원본 프로그램처럼 한 화면에 많은 정보를 담되, 가독성 유지
- 구역 분리: 물건개요 / 금액 / 메모 / 변동내역을 명확한 섹션으로 구분
- 기능 중심: 검색, 필터, 페이지네이션이 즉시 눈에 들어오는 레이아웃
- 한국어 폰트 최적화: Noto Sans KR 사용

**Color Philosophy**:
- 배경: 밝은 회색(#F5F6F8) - 눈의 피로 감소
- 헤더/사이드바: 짙은 네이비(#1B2A4A) - 신뢰감과 전문성
- 강조색: 파란색(#2563EB) - 추진물건, 관리물건 구분
- 보류: 회색 처리
- 금액(보증금/권리금): 색상 구분 (파랑/빨강)

**Layout Paradigm**:
- 좌측: 검색/필터 패널 (접이식)
- 우측 상단: 목록 테이블 (물건명, 주소, 금액, 담당자)
- 우측 하단: 선택된 물건의 상세 카드 (원본 프로그램 레이아웃 모방)

**Signature Elements**:
- 물건 상태 뱃지: 추진/관리/보류 색상 구분
- 금액 강조 표시: 보증금(파랑), 권리금(빨강), 합계(굵게)
- 변동내역 타임라인

**Interaction Philosophy**:
- 목록에서 클릭 → 카드 상세 슬라이드인
- 탭으로 권리물건/고객 전환
- 검색어 실시간 필터링

**Animation**:
- 카드 전환: 200ms ease-in-out
- 목록 로딩: 스켈레톤 shimmer
- 필터 패널: 슬라이드 토글

**Typography System**:
- 헤더: Noto Sans KR Bold 18px
- 물건명: Noto Sans KR SemiBold 16px
- 본문: Noto Sans KR Regular 13px
- 금액: 숫자 강조, 단위(만원) 작게
</idea>
<probability>0.08</probability>
</response>

<response>
<idea>
**Design Movement**: 클린 인트라넷 + 스프레드시트 하이브리드 (Spreadsheet Clarity)

**Core Principles**:
- 표 중심 레이아웃: 엑셀처럼 행/열로 데이터 표시
- 인라인 편집 느낌의 UI
- 고밀도 정보 표시
- 빠른 스캔 가능성

**Color Philosophy**:
- 흰 배경, 연한 회색 행 구분
- 파란 헤더
- 금액 컬럼 우측 정렬

**Layout Paradigm**:
- 전통적 테이블 뷰 + 사이드 패널 상세

**Signature Elements**:
- 엑셀 스타일 그리드
- 고정 헤더 스크롤

**Interaction Philosophy**:
- 행 클릭 → 우측 패널 상세

**Animation**:
- 최소한의 애니메이션

**Typography System**:
- Noto Sans KR, 단일 폰트
</idea>
<probability>0.05</probability>
</response>

<response>
<idea>
**Design Movement**: 카드 기반 모던 CRM (Card-First CRM)

**Core Principles**:
- 카드 중심: 원본 프로그램의 카드 UI를 웹으로 재해석
- 탭 구조: 권리물건 / 고객 탭 전환
- 검색 우선: 상단 검색바 + 빠른 필터
- 반응형 그리드

**Color Philosophy**:
- 흰 배경 + 카드 그림자
- 네이비 사이드바
- 상태별 컬러 코딩

**Layout Paradigm**:
- 좌: 사이드바 (탭 + 검색 + 필터)
- 우: 카드 그리드 or 상세 카드

**Signature Elements**:
- 물건 카드: 물건명, 주소, 금액 요약
- 상세 카드: 원본 프로그램 레이아웃 재현

**Interaction Philosophy**:
- 카드 클릭 → 모달 상세

**Animation**:
- 카드 hover 상승 효과
- 모달 fade-in

**Typography System**:
- Noto Sans KR
</idea>
<probability>0.09</probability>
</response>

## 선택: Response 1 (Administrative Clarity)
원본 프로그램의 정보 밀도를 유지하면서 모던 웹 UI로 재해석. 좌측 필터 패널 + 우측 목록/상세 카드 레이아웃.
