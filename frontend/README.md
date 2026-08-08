# JudgeHub Frontend (Vite + React + Tailwind)

Frontend cho hệ thống online judge, đang dùng mock data local để demo toàn bộ luồng sinh viên/giảng viên.

## 1) Yêu cầu môi trường

- Node.js 20+ (khuyến nghị Node.js 22 LTS)
- npm 10+

## 2) Cài đặt và chạy frontend

Tại thư mục gốc dự án:

```bash
npm install
npm run dev
```

Mặc định app chạy tại:

- http://localhost:5173

Build production:

```bash
npm run build
npm run preview
```

## 3) Dùng mock data để đăng nhập

Mock auth nằm trong:

- src/data/mockData.ts
- src/context/AuthContext.tsx

Tài khoản mẫu:

- Sinh viên:
  - username: nguyenvana
  - email: nguyenvana@university.edu.vn
  - password: 123456
- Giảng viên:
  - username: tranducb
  - email: tranducb@university.edu.vn
  - password: 123456

## 4) Mock kỳ thi public/private

Dữ liệu kỳ thi nằm trong:

- src/data/mockData.ts

Mỗi contest có trường:

- visibility: public | private
- accessCode: chỉ dùng cho contest private

Mã truy cập mẫu hiện có:

- C002: GRAPH2025
- C004: MIDTERM-INT1009
- C006: FINAL-INT1009

## 5) LocalStorage đang dùng

Một số dữ liệu chạy demo lưu vào localStorage (ví dụ bài đóng góp cộng đồng, đăng ký contest, code đang làm).

Nếu muốn reset dữ liệu demo:

- Mở DevTools -> Application -> Local Storage
- Xóa các key bắt đầu bằng jh-

## 6) Cần upload gì lên GitHub

Nên upload:

- src/
- public/
- package.json
- package-lock.json
- tsconfig.json
- vite.config.ts
- index.html
- Dockerfile
- docker-compose.yml
- nginx.conf
- README.md
- nextjs/ (nếu bạn muốn giữ luôn bản Next.js migration)

Không nên upload:

- node_modules/
- dist/
- file log tạm
- thông tin bí mật (token, key, mật khẩu thật)

## 7) Gợi ý trước khi push

Nếu repo chưa có .gitignore, hãy thêm tối thiểu:

```gitignore
node_modules/
dist/
.env
.env.*
```
