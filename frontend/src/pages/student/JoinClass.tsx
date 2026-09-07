import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useClass } from '../../context/ClassContext';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Loader2 } from 'lucide-react';

/**
 * Xử lý link mời: /join/INT1009
 * - Sinh viên: tự động ghi danh rồi chuyển về /student/class (kèm banner).
 * - Chưa đăng nhập / giảng viên: chuyển về trang phù hợp kèm thông báo.
 */
export default function JoinClass() {
  const { code } = useParams();
  const { isAuthenticated, user } = useAuth();
  const { joinByCode, allClasses } = useClass();
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setRedirect('/login');
      return;
    }
    if (user?.role === 'instructor') {
      sessionStorage.setItem('jh-joined-error', 'Giảng viên không thể tham gia lớp qua link mời.');
      setRedirect('/instructor/classes');
      return;
    }
    void (async () => {
      const res = await joinByCode(code ?? '');
      if (res.ok && res.classId) {
        sessionStorage.setItem('jh-joined', res.classId);
      } else if (res.classId) {
        // đã là thành viên
        sessionStorage.setItem('jh-joined', res.classId);
      } else {
        sessionStorage.setItem('jh-joined-error', res.message);
      }
      setRedirect('/student/class');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isAuthenticated]);

  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <div className="min-h-screen bg-[var(--ws-bg)] flex items-center justify-center text-[var(--ws-text)]">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-[#193a2b] to-[#2d5a3f] rounded-2xl flex items-center justify-center shadow-lg">
          <GraduationCap size={30} className="text-white" />
        </div>
        <p className="font-semibold font-serif text-lg">Đang tham gia lớp {code?.toUpperCase()}…</p>
        <p className="text-sm text-[var(--ws-muted)] mt-2 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Kiểm tra mã mời và ghi danh
        </p>
        <p className="text-[11px] text-[var(--ws-faint)] mt-4 font-mono">{allClasses.length} lớp trên hệ thống</p>
      </div>
    </div>
  );
}
