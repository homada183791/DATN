# Hướng dẫn chạy dự án bằng Docker

Dự án đã kèm `Dockerfile` và `docker-compose.yml` để bạn chạy server Node trong container, không cần cài Node/Express trên máy.

## Chạy bằng Docker Compose

1. Mở terminal tại thư mục `leetcode-clone`.
2. Chạy:
   ```powershell
   docker compose up --build
   ```
3. Mở trình duyệt tới:
   ```text
   http://localhost:3000
   ```
4. Dừng dịch vụ:
   ```powershell
   docker compose down
   ```

## Chạy lại mà không cần build lại

Nếu bạn không thay đổi `Dockerfile` hoặc `package.json`, chỉ cần:

```powershell
docker compose up
```

## Nếu container không khởi động vì thiếu module

1. Mở file `Dockerfile`.
2. Đảm bảo có:
   ```dockerfile
   COPY package.json ./
   RUN npm install
   COPY . .
   ```
3. Sau đó chạy lại:
   ```powershell
   docker compose up --build
   ```

## Lưu ý

- C++ và Python được chạy bằng backend server trong Docker.
- Frontend chỉ gửi mã lên server để biên dịch/chạy và so sánh kết quả.
- Nếu muốn chỉnh sửa code, sửa trực tiếp trong thư mục dự án rồi refresh trình duyệt.

- Thêm ngôn ngữ khác (Java, C, Go...) — chỉ cần thêm vào `LANG_META` trong `app.js` và
  `starterCode` cho ngôn ngữ đó trong `problems.js`, Piston đã hỗ trợ sẵn hàng chục ngôn ngữ.
- Lưu code đang gõ vào `localStorage` để không mất khi refresh (vẫn không cần login/DB).
- Tự dựng một Piston server riêng (Docker, mã nguồn mở tại `github.com/engineer-man/piston`)
  nếu muốn kiểm soát hạ tầng chấm bài thay vì phụ thuộc server công khai của cộng đồng.
- Thêm chế độ "Random bài" / lọc theo độ khó, tag (mảng, chuỗi, đệ quy...).
