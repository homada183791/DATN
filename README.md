# JudgeHub

Hệ thống online judge gồm frontend React/Vite, backend NestJS/Prisma, PostgreSQL, Redis, RabbitMQ và judge runner.

## Yêu cầu

- Node.js 20+ và npm 10+
- Docker Desktop đang chạy
- Docker Compose v2

## Chạy local để phát triển

### 1. Cài dependencies

```bash
cd backend
npm install
npx prisma generate

cd ../frontend
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

### 4. Chạy backend

Mở terminal riêng:

```bash
cd backend
npm run start:dev
```

Backend API chạy tại `http://localhost:3000`.

### 5. Chạy frontend

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
