# JudgeHub

Hệ thống online judge gồm frontend React/Vite, backend NestJS/Prisma, PostgreSQL, Redis, RabbitMQ và judge runner.

## Yêu cầu

- Node.js 20+ và npm 10+
- Docker Desktop đang chạy
- Docker Compose v2

## Clone dự án

```bash
git clone <repo-url> DATN
cd DATN
```

## Cấu hình biến môi trường

Khi chạy backend local, tạo `backend/.env` và không commit file này:

```env
DATABASE_URL=postgresql://root:rootpassword@localhost:5433/online_judge_db?schema=public
RABBITMQ_URL=amqp://root:rootpassword@localhost:5672
REDIS_URL=redis://localhost:6379
PORT=3000
JWT_SECRET=thay_bang_chuoi_bi_mat_cua_ban
```

Frontend dùng `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Chạy local để phát triển

### 1. Cài dependencies

```bash
cd backend
npm install
npx prisma generate

cd ../frontend
npm install

cd ../judge-runner
npm install
```

### 2. Khởi động hạ tầng

Từ thư mục gốc dự án:

```bash
docker compose up -d postgres redis rabbitmq
docker compose ps
```

Các cổng hạ tầng:

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`
- RabbitMQ: `localhost:5672`
- RabbitMQ Management: `http://localhost:15672` (`root` / `rootpassword`)

### 3. Chạy migration

```bash
cd backend
npx prisma migrate deploy
```

### 4. Nạp bài tập mặc định

Sau khi chạy migration, từ thư mục `backend` chạy:

```bash
npm run seed:problems
```

Lệnh này đọc `leetcode_problems.json` ở thư mục gốc và thêm các bài chưa có vào database. Có thể chạy lại lệnh an toàn; các bài đã tồn tại sẽ được bỏ qua.

Các testcase chưa có `expected_output` sẽ không được nạp. Bài vẫn hiển thị trên web, nhưng cần bổ sung đáp án trước khi chấm tự động.

### 5. Chạy backend

Mở terminal riêng:

```bash
cd backend
npm run start:dev
```

Backend API chạy tại `http://localhost:3000`.

### 6. Chạy frontend

Mở terminal riêng:

```bash
cd frontend
npm run dev
```

Mở ứng dụng tại `http://localhost:5173`.

Frontend dùng các biến trong `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Build

```bash
cd frontend
npm run build

cd ../backend
npm run build
```

## Chạy hạ tầng bằng Docker

Lệnh trên khởi động PostgreSQL, Redis và RabbitMQ để chạy frontend/backend local. Xem trạng thái:

```bash
docker compose ps
```

Sau đó chạy backend và frontend bằng các lệnh ở phần trên. Khi thay đổi cách chạy bằng Docker cho application services, cần kiểm tra lại port publish và biến môi trường trong `docker-compose.yml`.

## API chính

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/profile`
- `GET /api/v1/problems`
- `GET /api/v1/problems/:id`
- `POST /api/v1/submissions`
- `GET /api/v1/submissions`
- `GET /api/v1/contests`
- `GET /api/v1/contests/:id/leaderboard`

Payload submission:

```json
{
  "problem_id": "problem-uuid",
  "language": "CPP",
  "source_code": "..."
}
```

Role backend là `STUDENT` và `INSTRUCTOR`; frontend chuyển tương ứng thành `student` và `instructor`.

## Dừng dịch vụ

```bash
docker compose down
```

Xóa cả dữ liệu database và queue:

```bash
docker compose down -v
```

Không commit `node_modules`, `dist`, file `.env` hoặc secrets lên Git.

## Cấu trúc thư mục

```text
DATN/
├── frontend/        # React/Vite frontend
├── backend/         # NestJS API và Prisma
├── judge-runner/    # Service compile/chạy code trong sandbox
├── docker-compose.yml
└── README.md
```

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Không kết nối được server | Backend chưa chạy hoặc sai port | Kiểm tra log có `Nest application successfully started`, sau đó mở port `3000` |
| Backend không kết nối PostgreSQL | Container database chưa chạy hoặc sai port | Chạy `docker compose up -d postgres`, kiểm tra `DATABASE_URL` dùng port `5433` |
| RMQ package missing | Dependencies backend chưa được cài | Chạy `cd backend && npm install` |
| Prisma thiếu model/type | Prisma Client chưa được generate | Chạy `npx prisma generate` |
| Nộp bài bị treo | RabbitMQ hoặc judge-runner chưa chạy | Kiểm tra `docker compose ps` và log các service liên quan |
| Port đã được sử dụng | Có service khác đang chiếm port | Dừng service đó hoặc đổi port trong cấu hình local |

## Ghi chú bảo mật

- Không commit `backend/.env`, `frontend/.env` hoặc bất kỳ secret nào lên Git.
- Không đưa JWT secret, mật khẩu database hay RabbitMQ credentials vào mã nguồn.
- Judge runner cần giữ các giới hạn tài nguyên và sandbox trong `docker-compose.yml`.
- Không tự ý bỏ `cap_drop`, `read_only`, giới hạn CPU/RAM/PID hoặc thư mục tạm riêng khi debug judge runner.
