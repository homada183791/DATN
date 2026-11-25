import { HintType } from './dto/tutor-hint.dto';

/**
 * Câu trả lời soạn sẵn, dùng khi chưa cấu hình AI (AI_BASE_URL, AI_API_KEY)
 * hoặc khi nhà cung cấp AI lỗi. Giữ nội dung gợi ý chung như phiên bản cũ.
 */
export function tutorTemplate(
  hintType: HintType,
  title: string,
  difficulty: string,
): string {
  switch (hintType) {
    case HintType.COMPLEXITY:
      return (
        '### Phân tích độ phức tạp\n\n' +
        `- Với bài mức ${difficulty}, thường cần thuật toán O(N) hoặc O(N log N).\n` +
        '- Nếu đang dùng hai vòng lặp lồng nhau O(N²), hãy cân nhắc bảng băm, hai con trỏ, sắp xếp hoặc quy hoạch động.'
      );
    case HintType.EDGE_CASE:
      return (
        '### Các trường hợp biên cần kiểm tra\n\n' +
        '1. Dữ liệu rỗng hoặc chỉ một phần tử.\n' +
        '2. Giá trị rất lớn, âm hoặc bằng 0; tổng có vượt 2³¹ − 1 không (cần kiểu 64-bit)?\n' +
        '3. Các phần tử trùng nhau.\n' +
        '4. Kích thước dữ liệu tối đa có làm chương trình chạy quá thời gian không?'
      );
    case HintType.EXPLAIN_LOGIC:
      return (
        `### Hướng tiếp cận bài "${title}"\n\n` +
        '1. Xác định rõ dữ liệu vào và định dạng dữ liệu ra.\n' +
        '2. Chọn cấu trúc dữ liệu phù hợp.\n' +
        '3. Mô phỏng bằng tay trên ví dụ nhỏ trước khi viết code.'
      );
    case HintType.HINT:
    default:
      return (
        `### Gợi ý cho bài "${title}"\n\n` +
        '1. Mô phỏng thuật toán bằng tay trên một ví dụ nhỏ.\n' +
        '2. Có thể lưu lại kết quả trung gian để dùng lại không?\n' +
        '3. Kiểm tra điều kiện dừng và định dạng in kết quả (khoảng trắng, xuống dòng).'
      );
  }
}

export function explainTemplate(
  status: string,
  execMs?: number | null,
  memMb?: number | null,
): string {
  switch (status) {
    case 'WRONG_ANSWER':
      return (
        '### Sai đáp án\n\n' +
        'Chương trình chạy xong nhưng kết quả khác đáp án. Nguyên nhân hay gặp:\n' +
        '1. In thừa hoặc thiếu khoảng trắng, xuống dòng.\n' +
        '2. Sót trường hợp biên.\n' +
        '3. Tràn số khi tổng vượt 2 × 10⁹ (cần kiểu 64-bit).'
      );
    case 'TIME_LIMIT_EXCEEDED':
      return (
        '### Quá thời gian\n\n' +
        '- Tránh vòng lặp lồng O(N²) khi N ≥ 10⁵.\n' +
        '- Tăng tốc nhập xuất (C++: tắt đồng bộ stdio; Python: sys.stdin.readline).\n' +
        '- Kiểm tra vòng lặp while có điều kiện thoát.'
      );
    case 'COMPILE_ERROR':
      return (
        '### Lỗi biên dịch\n\n' +
        '- Kiểm tra dấu chấm phẩy, ngoặc, tên biến và hàm.\n' +
        '- Kiểm tra đã include hoặc import đủ thư viện chưa.'
      );
    case 'RUNTIME_ERROR':
      return (
        '### Lỗi khi chạy\n\n' +
        '- Kiểm tra truy cập mảng ngoài phạm vi, chia cho 0, đệ quy quá sâu.'
      );
    case 'ACCEPTED':
      return `### Bài đã đúng\n\nThời gian ${execMs ?? 0} ms, bộ nhớ ${memMb ?? 0} MB.`;
    default:
      return `Bài nộp đang ở trạng thái ${status}.`;
  }
}
