import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";
import KwonriListView from "@/components/KwonriListView";
import CustomerListView from "@/components/CustomerListView";
import PhoneSearchView from "@/components/PhoneSearchView";
import MapViewPage from "@/pages/MapView";
import { Building2, Users, Phone, Map, LogIn, LogOut, Shield } from "lucide-react";
import { useLocation } from "wouter";

type Tab = "kwonri" | "customer" | "phone" | "map";

export default function Home() {
  const { user, isAuthenticated, loading, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: '/login' });
  const [tab, setTab] = useState<Tab>("kwonri");
  const [, navigate] = useLocation();

  // 뒤로가기 버튼 지원: 탭 변경 시 브라우저 히스토리에 push
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.tab) {
        setTab(e.state.tab as Tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (newTab: Tab) => {
    if (newTab !== tab) {
      window.history.pushState({ tab: newTab }, '', '/');
      setTab(newTab);
    }
  };

  // 로딩 중에는 빈 화면
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "kwonri", label: "물건", icon: <Building2 size={20} /> },
    { id: "customer", label: "고객", icon: <Users size={20} /> },
    { id: "phone", label: "연락처", icon: <Phone size={20} /> },
    { id: "map", label: "지도", icon: <Map size={20} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ===== 데스크탑 사이드바 (md 이상에서만 표시) ===== */}
      <aside className="hidden md:flex w-[200px] shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {/* 로고 */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="font-bold text-[16px] text-white leading-tight">매물 관리</div>
          <div className="text-[11px] text-sidebar-foreground/50 mt-0.5">부동산 관리 시스템</div>
        </div>

        {/* 탭 메뉴 */}
        <nav className="flex-1 py-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors text-left ${
                tab === t.id
                  ? "bg-sidebar-primary text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* 로그인/로그아웃 */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          {isAuthenticated ? (
            <div className="space-y-1.5">
              <div className="text-[11px] text-sidebar-foreground/60 px-1 truncate">{user?.name || (user as any)?.username || user?.email}</div>
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin/users')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent rounded-sm transition-colors"
                >
                  <Shield size={13} />
                  사용자 관리
                </button>
              )}
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent rounded-sm transition-colors"
              >
                <LogOut size={13} />
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] bg-sidebar-primary text-white rounded-sm hover:bg-sidebar-primary/80 transition-colors"
            >
              <LogIn size={13} />
              로그인
            </button>
          )}
        </div>
      </aside>

      {/* ===== 메인 콘텐츠 ===== */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* 모바일 상단 헤더 */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-sidebar border-b border-sidebar-border shrink-0">
          <div>
            <div className="font-bold text-[15px] text-white leading-tight">매물 관리</div>
          </div>
          <div>
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-sidebar-foreground/80 hover:text-white border border-sidebar-border rounded-md transition-colors"
              >
                <LogOut size={13} />
                로그아웃
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-sidebar-primary text-white rounded-md"
              >
                <LogIn size={13} />
                로그인
              </button>
            )}
          </div>
        </div>

        {/* 콘텐츠 영역 (하단 탭바 높이만큼 패딩) */}
        <div className="flex-1 overflow-hidden md:pb-0 pb-[56px]">
          {tab === "kwonri" && <KwonriListView isAuthenticated={isAuthenticated} />}
          {tab === "customer" && <CustomerListView isAuthenticated={isAuthenticated} />}
          {tab === "phone" && <PhoneSearchView isAuthenticated={isAuthenticated} onSelectKwonri={() => setTab("kwonri")} onSelectCustomer={() => setTab("customer")} />}
          {tab === "map" && <MapViewPage isAuthenticated={isAuthenticated} />}
        </div>
      </main>

      {/* ===== 모바일 하단 탭바 (md 미만에서만 표시) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-sidebar border-t border-sidebar-border" style={{ height: 56 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              tab === t.id
                ? "text-white bg-sidebar-primary/20"
                : "text-sidebar-foreground/60 hover:text-white"
            }`}
          >
            <span className={tab === t.id ? "text-sidebar-primary" : ""}>{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
