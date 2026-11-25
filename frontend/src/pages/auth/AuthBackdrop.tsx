import { useTheme } from '../../context/ThemeContext';

/**
 * Nền phía sau các hộp đăng nhập / đăng ký / quên mật khẩu: ảnh trường ĐH KHTN.
 * - Toàn màn hình: một bản ảnh làm mờ phủ kín.
 * - Màn hình rộng: hiện trọn ảnh rõ ở 64% bên trái (logo trường không bị hộp thoại che),
 *   các mép hoà dần vào bản mờ; hộp thoại nằm bên phải (xem .overlay trong *.module.css).
 * - Giao diện tối: phủ thêm lớp tối để ảnh sáng không làm chói.
 */
export default function AuthBackdrop() {
  const { dark } = useTheme();
  const tint = dark ? 'color-mix(in srgb, var(--ws-bg) 55%, transparent)' : 'transparent';

  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden bg-(--ws-bg)">
      {/* Bản mờ phủ kín toàn màn hình */}
      <img
        src="/login-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-70"
      />
      {/* Màn hình rộng: hiện trọn ảnh rõ ở 64% bên trái, các mép hoà vào bản mờ. Điện thoại chỉ dùng bản mờ để logo không lộ lởm chởm quanh hộp thoại. */}
      <div className="hidden lg:flex absolute inset-y-0 left-0 w-[64%] items-center">
        <img
          src="/login-bg.jpg"
          alt=""
          className="w-full h-auto max-h-full object-contain"
          style={{
            maskImage:
              'linear-gradient(to right, #000 80%, transparent), linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)',
            maskComposite: 'intersect',
            WebkitMaskImage:
              'linear-gradient(to right, #000 80%, transparent), linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)',
            WebkitMaskComposite: 'source-in',
          }}
        />
      </div>
      <div className="absolute inset-0" style={{ background: tint }} />
    </div>
  );
}
