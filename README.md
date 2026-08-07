# JudgeHub — Online Judge System

Hệ thống chấm bài lập trình trực tuyến, gồm 3 thành phần chính:

- **frontend/** — Vite - React.js (TypeScript)
- **backend/** — Node.js + TypeScript (Express/Fastify), quản lý bài tập, người dùng, submissions
- **judge-runner/** — service cô lập, chịu trách nhiệm compile & chạy code người dùng nộp trong container riêng

## 1. Yêu cầu môi trường

- [Docker](https://www.docker.com/) >= 24.x và Docker Compose v2
- Node.js >= 20.x (chỉ cần nếu muốn chạy từng service riêng ngoài Docker để debug)
- Git

Kiểm tra đã cài đặt:

```bash
docker --version
docker compose version
```

## 2. Clone dự án

```bash
git clone <repo-url> DATN
cd DATN
```

## 3. Cấu hình biến môi trường

Tạo file `.env` ở thư mục gốc (không commit file này lên Git):

```env
# backend
DATABASE_URL=postgresql://judge:judge@db:5432/judgehub
JUDGE_RUNNER_URL=http://judge-runner:4000
JWT_SECRET=thay_bang_chuoi_bi_mat_cua_ban

# frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Copy `.env.example` (nếu có) làm mẫu, hoặc tạo mới theo nội dung trên.

## 4. Cài đặt dependencies (lần đầu, ngoài Docker)

Nếu muốn chạy `npm install` trước để IDE nhận diện types, cache nhanh hơn khi build Docker:

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd judge-runner && npm install && cd ..
```

Bước này không bắt buộc — `docker compose build` sẽ tự cài dependencies trong container.

## 5. Build và chạy toàn bộ hệ thống

```bash
docker compose build
docker compose up -d
```

Kiểm tra các container đang chạy:

```bash
docker compose ps
```

Xem log của một service cụ thể:

```bash
docker compose logs -f backend
docker compose logs -f judge-runner
```

## 6. Truy cập ứng dụng

| Service | URL | Ghi chú |
|---|---|---|
| Frontend | http://localhost:3000 | Giao diện người dùng |
| Backend API | http://localhost:3001 | REST API |
| Judge runner | http://localhost:4000 | Nội bộ, không cần truy cập trực tiếp |
| PostgreSQL | localhost:5432 | user/pass/db: xem `.env` |

## 7. Chạy migration database (lần đầu)

```bash
docker compose exec backend npm run migrate
```

Nếu dùng Prisma:

```bash
docker compose exec backend npx prisma migrate deploy
```

## 8. Chạy ở chế độ development (hot reload)

Compose mặc định đã mount source code (`volumes`) nên sửa code ở `backend/` hoặc `frontend/` sẽ tự reload. Nếu muốn xem riêng từng service không qua Docker:

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

Lưu ý: khi chạy `backend` ngoài Docker, cần trỏ `JUDGE_RUNNER_URL` và `DATABASE_URL` về `localhost` thay vì tên service (`db`, `judge-runner`), vì tên service chỉ resolve được trong network nội bộ của Docker Compose.

## 9. Dừng hệ thống

```bash
docker compose down
```

Dừng và xoá luôn volumes (mất data database, dùng khi cần reset sạch):

```bash
docker compose down -v
```

## 10. Kiểm tra judge-runner hoạt động đúng

Sau khi hệ thống chạy, thử nộp một bài mẫu (C++ "Hello World") qua frontend, hoặc gọi trực tiếp API backend:

```bash
curl -X POST http://localhost:3001/api/submissions \
  -H "Content-Type: application/json" \
  -d '{"problemId": 1, "language": "cpp", "code": "#include<iostream>\nint main(){std::cout<<\"Hello\";}"}'
```

Xem kết quả chấm bằng cách lấy `submissionId` trả về, sau đó:

```bash
curl http://localhost:3001/api/submissions/<submissionId>
```

## 11. Cấu trúc thư mục

```
DATN/
├── frontend/        # Next.js
├── backend/         # API chính (không chứa compiler)
├── judge-runner/    # Service compile/chạy code, cô lập network & tài nguyên
├── docker-compose.yml
└── README.md
```

## 12. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `backend` không kết nối được `db` | Container `db` chưa sẵn sàng khi `backend` start | Thêm `depends_on` + healthcheck, hoặc chạy lại `docker compose up -d` sau vài giây |
| Nộp bài bị treo / timeout | `judge-runner` chưa cấu hình đúng `mem_limit`/`cpus`/`pids_limit` | Kiểm tra lại `docker-compose.yml` phần `judge-runner` |
| Port bị chiếm (`3000`/`3001`/`5432`) | Có service khác trên máy đang dùng port đó | Đổi port map trong `docker-compose.yml`, ví dụ `"3010:3000"` |
| `npm ci` lỗi trong build | `package-lock.json` không khớp `package.json` | Chạy `npm install` lại ở máy local trước, commit lại lockfile |

## 13. Ghi chú bảo mật (quan trọng)

- Container `judge-runner` chạy với `network_mode: none`, `cap_drop: ALL`, giới hạn CPU/RAM/pids — **không tự ý bỏ các giới hạn này** khi debug, vì đây là lớp bảo vệ chính chống code độc hại từ người dùng nộp bài.
- Không commit file `.env` hoặc bất kỳ secret nào lên Git.
- Thư mục tạm chứa code khi chấm bài (`/tmp/judge` trong container) tự sinh và tự xoá theo từng submission, không lưu trữ lâu dài.
