import type { INestApplication } from '@nestjs/common';
import { json, type NextFunction, type Request, type Response } from 'express';

/**
 * Nới giới hạn body JSON cho vài đường dẫn cần dữ liệu lớn.
 *
 * LƯU Ý: không app.use(json(...)) trực tiếp. Nest bỏ qua bộ đọc JSON mặc định nếu thấy đã có middleware
 * tên "jsonParser" → mọi API khác (đăng nhập…) nhận body rỗng. Bọc trong hàm có tên khác để tránh việc đó.
 */
export function registerLargeBodyRoutes(app: INestApplication) {
  const routes: Array<[string, string]> = [
    // Kết quả sinh test từ máy chấm (input sinh ra + stdout) có thể vài MB
    ['/api/v1/webhook/judge/batch', '40mb'],
    // Đề kèm test lớn (test sinh bằng AI có thể tới ~1 MB/test) khi tạo / sửa bài
    ['/api/v1/problems', '20mb'],
  ];
  for (const [path, limit] of routes) {
    const parser = json({ limit });
    app.use(path, function largeJsonBody(req: Request, res: Response, next: NextFunction) {
      parser(req, res, next);
    });
  }
}
