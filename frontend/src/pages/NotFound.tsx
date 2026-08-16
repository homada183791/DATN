import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f7f4eb] flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded-3xl border border-[#e5dac9] bg-white p-8 shadow-sm text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#8a8073]">404</p>
        <h1 className="mt-3 text-3xl font-bold font-serif text-[#191919]">Không tìm thấy trang</h1>
        <p className="mt-3 text-sm text-[#5c5446]">
          Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link
          to="/student/dashboard"
          className="inline-flex mt-6 items-center justify-center rounded-xl bg-[#193a2b] px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-[#143022]"
        >
          Về Dashboard
        </Link>
      </div>
    </div>
  );
}
