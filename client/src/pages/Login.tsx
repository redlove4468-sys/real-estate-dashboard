/**
 * 로컬 로그인 페이지
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", password: "", name: "", email: "" });

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      // replace로 이동해서 /login이 히스토리에 남지 않도록 처리
      window.history.replaceState({ tab: 'kwonri' }, '', '/');
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setTab("login");
      setRegisterForm({ username: "", password: "", name: "", email: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-foreground mb-1">매물 뷰어</div>
          <div className="text-sm text-muted-foreground">부동산 매물 관리 시스템</div>
        </div>

        {/* 탭 */}
        <div className="flex border border-border rounded-lg overflow-hidden mb-6">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "login"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "register"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent"
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 로그인 폼 */}
        {tab === "login" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate(loginForm);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">아이디</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(f => ({ ...f, username: e.target.value }))}
                placeholder="아이디를 입력하세요"
                required
                className="w-full px-3 py-2.5 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">비밀번호</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
                placeholder="비밀번호를 입력하세요"
                required
                className="w-full px-3 py-2.5 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
            </button>
          </form>
        )}

        {/* 회원가입 폼 */}
        {tab === "register" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              registerMutation.mutate(registerForm);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                아이디 <span className="text-muted-foreground font-normal">(영문, 숫자, _ 3~32자)</span>
              </label>
              <input
                type="text"
                value={registerForm.username}
                onChange={(e) => setRegisterForm(f => ({ ...f, username: e.target.value }))}
                placeholder="아이디를 입력하세요"
                required
                className="w-full px-3 py-2.5 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                비밀번호 <span className="text-muted-foreground font-normal">(최소 6자)</span>
              </label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                placeholder="비밀번호를 입력하세요"
                required
                className="w-full px-3 py-2.5 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">이름</label>
              <input
                type="text"
                value={registerForm.name}
                onChange={(e) => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                placeholder="이름을 입력하세요"
                className="w-full px-3 py-2.5 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">이메일 (선택)</label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                placeholder="이메일을 입력하세요"
                className="w-full px-3 py-2.5 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {registerMutation.isPending ? "처리 중..." : "회원가입 신청"}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              회원가입 후 관리자 승인이 필요합니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
