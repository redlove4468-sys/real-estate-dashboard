/**
 * 관리자 사용자 승인 페이지
 */
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Check, X, Clock, Shield, User } from "lucide-react";

export default function AdminUsers() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      navigate('/');
    }
  }, [loading, isAuthenticated, user, navigate]);

  const { data: users, refetch } = trpc.auth.listUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const approveMutation = trpc.auth.approveUser.useMutation({
    onSuccess: () => { toast.success("처리되었습니다."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-muted-foreground text-sm">로딩 중...</div>
    </div>
  );

  const pending = users?.filter(u => u.approvalStatus === 'pending') ?? [];
  const approved = users?.filter(u => u.approvalStatus === 'approved') ?? [];
  const rejected = users?.filter(u => u.approvalStatus === 'rejected') ?? [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 홈으로
          </button>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-lg font-semibold text-foreground">사용자 관리</h1>
        </div>

        {/* 승인 대기 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">승인 대기 ({pending.length}명)</h2>
          </div>
          {pending.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              승인 대기 중인 사용자가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 border border-amber-200 bg-amber-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{u.name || u.username}</div>
                    <div className="text-xs text-muted-foreground">
                      @{u.username} {u.email ? `· ${u.email}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      가입일: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate({ userId: u.id, action: 'approved' })}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Check size={12} /> 승인
                    </button>
                    <button
                      onClick={() => approveMutation.mutate({ userId: u.id, action: 'rejected' })}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <X size={12} /> 거부
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 승인된 사용자 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Check size={15} className="text-green-500" />
            <h2 className="text-sm font-semibold text-foreground">승인된 사용자 ({approved.length}명)</h2>
          </div>
          <div className="space-y-2">
            {approved.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 border border-border bg-card rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{u.name || u.username}</span>
                    {u.role === 'admin' && (
                      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-sm font-medium">
                        <Shield size={9} /> 관리자
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{u.username} {u.email ? `· ${u.email}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    마지막 로그인: {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </div>
                {u.role !== 'admin' && (
                  <button
                    onClick={() => approveMutation.mutate({ userId: u.id, action: 'rejected' })}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground rounded-md text-xs hover:bg-destructive hover:text-destructive-foreground hover:border-destructive disabled:opacity-50 transition-colors"
                  >
                    <X size={11} /> 차단
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 거부된 사용자 */}
        {rejected.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <X size={15} className="text-red-500" />
              <h2 className="text-sm font-semibold text-foreground">거부/차단된 사용자 ({rejected.length}명)</h2>
            </div>
            <div className="space-y-2">
              {rejected.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 border border-border bg-muted/30 rounded-lg opacity-60">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{u.name || u.username}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                  <button
                    onClick={() => approveMutation.mutate({ userId: u.id, action: 'approved' })}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 border border-green-300 text-green-700 rounded-md text-xs hover:bg-green-50 disabled:opacity-50 transition-colors"
                  >
                    <Check size={11} /> 복구
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
