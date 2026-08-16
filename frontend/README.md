# JudgeHub Frontend

Frontend cho hệ thống online judge, xây dựng bằng Vite, React, TypeScript và Tailwind CSS.

Các màn hình chính đã dùng API thật thay cho `mockData.ts`:

- Danh sách bài tập: `GET /api/v1/problems`
- Chi tiết bài tập: `GET /api/v1/problems/:id`
- Danh sách kỳ thi: `GET /api/v1/contests`
- Bảng xếp hạng: `GET /api/v1/contests/:id/leaderboard`
- Đăng nhập/đăng ký: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
- Nộp bài: `POST /api/v1/submissions`

## Yêu cầu môi trường

- Node.js 20+ (khuyến nghị Node.js 22 LTS)
- npm 10+
- Backend chạy tại `http://localhost:3000` nếu dùng cấu hình mặc định
- Database đã được migrate và có dữ liệu test nếu muốn xem dữ liệu động

## Cài đặt

Từ thư mục frontend:

```bash
cd frontend
npm install
```

## Chạy development

Khởi động backend trước:

```bash
cd backend
npm install
npm run start:dev
```

Sau đó khởi động frontend ở terminal khác:

```bash
cd frontend
npm run dev
```

Frontend chạy tại:

- http://localhost:5173

Vite proxy các request bắt đầu bằng `/api` tới `http://localhost:3000`. Cấu hình nằm trong `vite.config.ts`.

Nếu backend dùng URL khác, tạo file `.env.local` trong thư mục frontend:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Khi chạy qua Vite proxy, có thể để trống biến này.

## Build production

```bash
cd frontend
npm run build
npm run preview
```

Không commit các thư mục sinh ra sau build:

- `node_modules/`
- `dist/`
- `.env.local`

## Tài khoản test

FE ưu tiên gọi backend auth. Nếu backend chưa có user seed hoặc backend chưa chạy, FE có fallback demo cho hai tài khoản sau:

- Sinh viên
  - Email: `nguyenvana@university.edu.vn`
  - Mật khẩu: `123456`
- Giảng viên
  - Email: `tranducb@university.edu.vn`
  - Mật khẩu: `123456`

Fallback demo chỉ phục vụ kiểm tra giao diện. Dữ liệu bài tập, contest và leaderboard vẫn cần backend trả về.

## Kiến trúc dữ liệu

- `src/api/http.ts`: HTTP client, bearer token và `ApiError`.
- `src/api/queryClient.ts`: cấu hình React Query.
- `src/api/problems.ts`: query cho danh sách và chi tiết bài tập.
- `src/api/contests.ts`: query cho contest và leaderboard.
- `src/data/legacyData.ts`: dữ liệu tĩnh tạm thời cho các màn hình legacy chưa có API tương ứng.

React Query được khởi tạo tại `src/main.tsx` với cache mặc định 30 giây.

## Các trạng thái lỗi được xử lý

- `401`: đăng nhập thất bại.
- `403`: kỳ thi đã đóng hoặc deadline đã qua khi nộp bài.
- `404`: bài tập không tồn tại hoặc route không tồn tại.
- `409`: dữ liệu bị trùng, ví dụ email đã tồn tại.
- `429`: người dùng thao tác nộp bài quá nhanh; FE hiện toast và khóa nút Nộp bài trong 60 giây.

## Dữ liệu động và backend contract

Backend cần cung cấp đúng các endpoint và JSON contract được liệt kê ở đầu README. Trong workspace hiện tại, controller cho problems và auth đã có; contest, leaderboard và submission cần được triển khai hoặc bật đúng module ở backend trước khi kiểm thử đầy đủ.

Nếu API trả response dạng `{ success, data }`, HTTP client sẽ tự lấy trường `data`. Nếu API trả trực tiếp mảng/object, FE cũng hỗ trợ dạng đó.

## LocalStorage

FE dùng localStorage cho một số trạng thái giao diện và code đang soạn, ví dụ:

- `accessToken`
- `jh-code-*`
- `jh-contest-registrations-*`
- các key bắt đầu bằng `jh-` từ các màn hình legacy

Để reset dữ liệu trình duyệt khi test:

1. Mở DevTools.
2. Vào Application -> Local Storage.
3. Xóa các key bắt đầu bằng `jh-` và `accessToken`.

## Upload lên GitHub

Nên commit:

- `src/`
- `public/`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `Dockerfile`
- `docker-compose.yml`
- `nginx.conf`
- `README.md`

Không commit:

- `node_modules/`
- `dist/`
- `.env.local`
- token, API key, mật khẩu hoặc log chứa thông tin nhạy cảm

Nếu repo chưa có `.gitignore`, thêm tối thiểu:

```gitignore
node_modules/
dist/
.env
.env.*
```
