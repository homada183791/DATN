# JudgeHub Frontend

Frontend React, Vite, TypeScript, Tailwind CSS và React Query.

## Yêu cầu

- Node.js 20+
- npm 10+
- Backend chạy tại `http://localhost:3000`

## Cài đặt

```bash
cd frontend
npm install
```

File `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Chạy development

Khởi động backend trước:

```bash
cd backend
npm run start:dev
```

Mở terminal khác để chạy frontend:

```bash
cd frontend
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`.

## Build production

```bash
cd frontend
npm run build
npm run preview
```

## API và dữ liệu thật

Các màn hình chính đã dùng backend thật:

- Problem list: `GET /api/v1/problems`
- Problem detail: `GET /api/v1/problems/:id`
- Contest: `GET /api/v1/contests`
- Leaderboard: `GET /api/v1/contests/:id/leaderboard`
- Submission history: `GET /api/v1/submissions`
- Submit code: `POST /api/v1/submissions`
- Auth: `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/profile`

Payload submit:

```json
{
  "problem_id": "problem-uuid",
  "language": "CPP",
  "source_code": "..."
}
```

FE map ngôn ngữ editor như sau:

- `cpp` -> `CPP`
- `python` -> `PYTHON`
- `java` -> `JAVA`

Role backend `STUDENT`/`INSTRUCTOR` được hydrate thành role frontend `student`/`instructor`.

## Xử lý lỗi và realtime

- `401`: xóa token và chuyển về `/login`.
- `429`: hiển thị thông báo toàn cục.
- Lỗi mạng: hiển thị `Không thể kết nối máy chủ`.
- Sau khi submit, FE nhận `submission_status_changed` qua Socket.io.
- Event `leaderboard_updated` làm mới cache React Query của leaderboard.

## Dữ liệu legacy

`src/data/legacyData.ts` vẫn được giữ cho các màn hình chưa có endpoint backend tương ứng, chẳng hạn Class, Homework và một số trang Instructor/Profile. Không xóa file này cho tới khi các màn hình đó được chuyển sang API thật.

## Kiểm tra và reset localStorage

FE lưu token và một số trạng thái editor trong localStorage. Khi cần reset phiên:

1. Mở DevTools.
2. Vào Application -> Local Storage.
3. Xóa `accessToken` và các key bắt đầu bằng `jh-`.

Không commit `node_modules`, `dist`, `.env` hoặc secrets lên Git.
