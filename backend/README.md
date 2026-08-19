# JudgeHub Backend

Backend NestJS cung cấp REST API, xác thực JWT, Prisma/PostgreSQL, Socket.io và RabbitMQ queue.

## Yêu cầu

- Node.js 20+
- PostgreSQL, Redis và RabbitMQ đang chạy
- npm 10+

## Cài đặt

```bash
cd backend
npm install
npx prisma generate
```

Khi chạy local, tạo `backend/.env`:

```env
DATABASE_URL=postgresql://root:rootpassword@localhost:5433/online_judge_db?schema=public
RABBITMQ_URL=amqp://root:rootpassword@localhost:5672
REDIS_URL=redis://localhost:6379
PORT=3000
JWT_SECRET=super-secret-key-for-dev
```

## Khởi động hạ tầng

Từ thư mục gốc:

```bash
docker compose up -d postgres redis rabbitmq
```

## Prisma

```bash
npx prisma migrate deploy
npx prisma generate
```

Trong quá trình phát triển schema, có thể dùng:

```bash
npx prisma migrate dev --name describe_change
```

## Chạy backend

```bash
npm run start:dev
```

Các lệnh khác:

```bash
npm run build
npm run start:prod
npm run test
npm run test:e2e
```

API mặc định chạy tại `http://localhost:3000`.

## Route chính

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/profile`
- `GET /api/v1/problems`
- `GET /api/v1/problems/:id`
- `POST /api/v1/submissions`
- `GET /api/v1/submissions`
- `GET /api/v1/contests`
- `GET /api/v1/contests/:id/leaderboard`

Submission dùng payload:

```json
{
  "problem_id": "problem-uuid",
  "language": "CPP",
  "source_code": "..."
}
```

Ngôn ngữ hợp lệ gồm `C`, `CPP`, `PYTHON`, `GO`, `JAVA`. Role hợp lệ gồm `STUDENT` và `INSTRUCTOR`.

## Realtime

Socket.io chạy cùng backend. Các event chính:

- `join_submission` với `{ "submission_id": "..." }`
- `submission_status_changed` trong room submission
- `leaderboard_updated` sau khi webhook cập nhật kết quả

## Webhook judge

Judge runner gửi kết quả tới:

```text
POST /webhook/judge
```

## Lỗi thường gặp

- Không kết nối được server: kiểm tra backend có log `Nest application successfully started` và port `3000` đang mở.
- Không kết nối PostgreSQL: kiểm tra Docker và `DATABASE_URL` dùng port host `5433`.
- RMQ package missing: chạy lại `npm install`.
- Prisma thiếu model/type: chạy `npx prisma generate`.
