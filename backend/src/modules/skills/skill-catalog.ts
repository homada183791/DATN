/**
 * Danh mục kỹ năng chuẩn (~50). Bài báo KCGen-KT cho thấy 50–60 nhãn là mức cân bằng tốt giữa
 * độ chi tiết và khả năng dùng chung giữa các bài. Migration add_skills chèn sẵn danh mục này.
 * Muốn đổi danh mục: thêm migration mới (không sửa migration cũ).
 */
export interface SkillDef {
  code: string;
  name_vi: string;
  name_en: string;
  category: 'BASICS' | 'DATA_STRUCTURES' | 'ALGORITHMS' | 'DYNAMIC_PROGRAMMING' | 'GRAPHS' | 'MATH';
  description: string;
}

export const SKILL_CATALOG: SkillDef[] = [
  // Nền tảng
  { code: 'IO', name_vi: 'Nhập/xuất dữ liệu', name_en: 'Input/output', category: 'BASICS', description: 'Đọc/ghi dữ liệu đúng định dạng, đọc nhiều dòng, đọc đến hết dữ liệu' },
  { code: 'VARIABLES_TYPES', name_vi: 'Biến và kiểu dữ liệu', name_en: 'Variables and types', category: 'BASICS', description: 'Khai báo biến, chọn kiểu dữ liệu phù hợp, ép kiểu' },
  { code: 'ARITHMETIC', name_vi: 'Phép toán số học', name_en: 'Arithmetic operations', category: 'BASICS', description: 'Cộng trừ nhân chia, chia lấy dư, chia nguyên' },
  { code: 'INT_OVERFLOW', name_vi: 'Tràn số / số lớn', name_en: 'Integer overflow / big numbers', category: 'BASICS', description: 'Nhận ra khi cần long long, tránh tràn khi nhân/cộng dồn' },
  { code: 'FLOAT_PRECISION', name_vi: 'Số thực và sai số', name_en: 'Floating point precision', category: 'BASICS', description: 'Làm tròn, so sánh số thực với epsilon, in đúng số chữ số' },
  { code: 'CONDITIONALS', name_vi: 'Câu lệnh rẽ nhánh', name_en: 'If / else statements', category: 'BASICS', description: 'If, else if, switch, xét đủ các trường hợp' },
  { code: 'LOGIC_OPERATORS', name_vi: 'Toán tử logic', name_en: 'Logical operators', category: 'BASICS', description: 'Kết hợp điều kiện bằng &&, ||, !' },
  { code: 'COMPARISONS', name_vi: 'So sánh giá trị', name_en: 'Numerical comparisons', category: 'BASICS', description: 'So sánh, tìm lớn nhất/nhỏ nhất, xử lý bằng nhau' },
  { code: 'LOOPS_FOR', name_vi: 'Vòng lặp for', name_en: 'For loops', category: 'BASICS', description: 'Duyệt với số bước xác định, biên chạy đúng' },
  { code: 'LOOPS_WHILE', name_vi: 'Vòng lặp while', name_en: 'While loops', category: 'BASICS', description: 'Lặp theo điều kiện, điều kiện dừng đúng' },
  { code: 'NESTED_LOOPS', name_vi: 'Vòng lặp lồng nhau', name_en: 'Nested loops', category: 'BASICS', description: 'Hai/ba vòng lặp lồng, duyệt cặp, duyệt ma trận' },
  { code: 'FUNCTIONS', name_vi: 'Hàm', name_en: 'Functions', category: 'BASICS', description: 'Tách hàm, tham số, giá trị trả về, truyền tham chiếu' },
  { code: 'RECURSION', name_vi: 'Đệ quy', name_en: 'Recursion', category: 'BASICS', description: 'Hàm gọi lại chính nó, điểm dừng, độ sâu đệ quy' },
  // Cấu trúc dữ liệu
  { code: 'ARRAY_1D', name_vi: 'Mảng một chiều', name_en: 'Arrays', category: 'DATA_STRUCTURES', description: 'Lưu và duyệt mảng, chỉ số, biên mảng' },
  { code: 'ARRAY_2D', name_vi: 'Mảng hai chiều / ma trận', name_en: '2D arrays / matrices', category: 'DATA_STRUCTURES', description: 'Duyệt ma trận, ô kề, đường chéo' },
  { code: 'STRING_BASIC', name_vi: 'Chuỗi cơ bản', name_en: 'Basic strings', category: 'DATA_STRUCTURES', description: 'Duyệt ký tự, độ dài, nối chuỗi, đổi hoa/thường' },
  { code: 'STRING_PROCESSING', name_vi: 'Xử lý chuỗi nâng cao', name_en: 'String processing', category: 'DATA_STRUCTURES', description: 'Tách từ, đối xứng, tìm chuỗi con, đếm tần suất ký tự' },
  { code: 'POINTERS', name_vi: 'Con trỏ / tham chiếu', name_en: 'Pointers / references', category: 'DATA_STRUCTURES', description: 'Con trỏ, cấp phát động, tham chiếu' },
  { code: 'STRUCTS_OOP', name_vi: 'Struct / lớp đối tượng', name_en: 'Structs / OOP', category: 'DATA_STRUCTURES', description: 'Gom dữ liệu thành struct/class, phương thức' },
  { code: 'STACK', name_vi: 'Ngăn xếp', name_en: 'Stack', category: 'DATA_STRUCTURES', description: 'Stack, ngoặc hợp lệ, stack đơn điệu' },
  { code: 'QUEUE_DEQUE', name_vi: 'Hàng đợi / deque', name_en: 'Queue / deque', category: 'DATA_STRUCTURES', description: 'Queue, deque, hàng đợi đơn điệu' },
  { code: 'LINKED_LIST', name_vi: 'Danh sách liên kết', name_en: 'Linked list', category: 'DATA_STRUCTURES', description: 'Thêm/xoá nút, đảo danh sách' },
  { code: 'HASH_MAP', name_vi: 'Bảng băm / map', name_en: 'Hash map / dictionary', category: 'DATA_STRUCTURES', description: 'map/unordered_map/dict để đếm, tra cứu nhanh' },
  { code: 'SET', name_vi: 'Tập hợp', name_en: 'Set', category: 'DATA_STRUCTURES', description: 'set/unordered_set, loại trùng, kiểm tra tồn tại' },
  { code: 'PRIORITY_QUEUE', name_vi: 'Hàng đợi ưu tiên / heap', name_en: 'Priority queue / heap', category: 'DATA_STRUCTURES', description: 'Lấy phần tử lớn/nhỏ nhất liên tục' },
  { code: 'TREES', name_vi: 'Cây / cây nhị phân', name_en: 'Trees / binary trees', category: 'DATA_STRUCTURES', description: 'Duyệt cây, cây nhị phân tìm kiếm, chiều cao' },
  { code: 'DSU', name_vi: 'Hợp nhất tập hợp (DSU)', name_en: 'Disjoint set union', category: 'DATA_STRUCTURES', description: 'Union-find, gộp thành phần' },
  { code: 'RANGE_QUERY_DS', name_vi: 'Cây phân đoạn / Fenwick', name_en: 'Segment tree / Fenwick', category: 'DATA_STRUCTURES', description: 'Truy vấn và cập nhật trên đoạn' },
  // Thuật toán
  { code: 'SORTING', name_vi: 'Sắp xếp', name_en: 'Sorting', category: 'ALGORITHMS', description: 'Sắp xếp, dùng thứ tự để đơn giản hoá bài' },
  { code: 'CUSTOM_COMPARATOR', name_vi: 'Sắp xếp theo tiêu chí riêng', name_en: 'Custom comparators', category: 'ALGORITHMS', description: 'Hàm so sánh, sắp nhiều khoá' },
  { code: 'BINARY_SEARCH', name_vi: 'Tìm kiếm nhị phân', name_en: 'Binary search', category: 'ALGORITHMS', description: 'Tìm trên mảng đã sắp, lower/upper bound' },
  { code: 'BINARY_SEARCH_ANSWER', name_vi: 'Chặt nhị phân đáp án', name_en: 'Binary search on the answer', category: 'ALGORITHMS', description: 'Chặt nhị phân trên giá trị kết quả với hàm kiểm tra đơn điệu' },
  { code: 'TWO_POINTERS', name_vi: 'Hai con trỏ', name_en: 'Two pointers', category: 'ALGORITHMS', description: 'Hai chỉ số di chuyển cùng chiều/ngược chiều' },
  { code: 'SLIDING_WINDOW', name_vi: 'Cửa sổ trượt', name_en: 'Sliding window', category: 'ALGORITHMS', description: 'Duy trì đoạn liên tiếp khi trượt' },
  { code: 'PREFIX_SUM', name_vi: 'Mảng cộng dồn', name_en: 'Prefix sums', category: 'ALGORITHMS', description: 'Tổng đoạn nhanh, mảng hiệu' },
  { code: 'GREEDY', name_vi: 'Tham lam', name_en: 'Greedy', category: 'ALGORITHMS', description: 'Chọn tối ưu cục bộ có chứng minh' },
  { code: 'BRUTE_FORCE', name_vi: 'Vét cạn', name_en: 'Brute force', category: 'ALGORITHMS', description: 'Thử mọi khả năng khi giới hạn nhỏ' },
  { code: 'BACKTRACKING', name_vi: 'Quay lui', name_en: 'Backtracking', category: 'ALGORITHMS', description: 'Sinh hoán vị/tổ hợp, cắt nhánh' },
  { code: 'DIVIDE_CONQUER', name_vi: 'Chia để trị', name_en: 'Divide and conquer', category: 'ALGORITHMS', description: 'Chia bài toán con, gộp kết quả' },
  { code: 'BIT_MANIPULATION', name_vi: 'Thao tác bit / bitmask', name_en: 'Bit manipulation', category: 'ALGORITHMS', description: 'Phép toán bit, duyệt tập con bằng bitmask' },
  { code: 'SIMULATION', name_vi: 'Mô phỏng', name_en: 'Simulation', category: 'ALGORITHMS', description: 'Làm đúng theo mô tả từng bước' },
  // Quy hoạch động
  { code: 'DP_1D', name_vi: 'Quy hoạch động cơ bản', name_en: 'Basic dynamic programming', category: 'DYNAMIC_PROGRAMMING', description: 'Trạng thái một chiều, công thức truy hồi' },
  { code: 'DP_KNAPSACK', name_vi: 'Bài toán cái túi', name_en: 'Knapsack DP', category: 'DYNAMIC_PROGRAMMING', description: 'Cái túi 0/1, không giới hạn, đổi tiền' },
  { code: 'DP_2D', name_vi: 'Quy hoạch động 2 chiều', name_en: '2D dynamic programming', category: 'DYNAMIC_PROGRAMMING', description: 'Đường đi trên lưới, LCS, chỉnh sửa chuỗi' },
  { code: 'DP_SUBSEQUENCE', name_vi: 'Dãy con (LIS, ...)', name_en: 'Subsequence DP', category: 'DYNAMIC_PROGRAMMING', description: 'Dãy con tăng dài nhất, dãy con có tổng lớn nhất' },
  // Đồ thị
  { code: 'GRAPH_REPRESENTATION', name_vi: 'Biểu diễn đồ thị', name_en: 'Graph representation', category: 'GRAPHS', description: 'Danh sách kề, ma trận kề, đọc cạnh' },
  { code: 'BFS', name_vi: 'Duyệt theo chiều rộng (BFS)', name_en: 'Breadth-first search', category: 'GRAPHS', description: 'BFS, đường đi ngắn nhất không trọng số, loang trên lưới' },
  { code: 'DFS', name_vi: 'Duyệt theo chiều sâu (DFS)', name_en: 'Depth-first search', category: 'GRAPHS', description: 'DFS, thành phần liên thông, phát hiện chu trình' },
  { code: 'SHORTEST_PATH', name_vi: 'Đường đi ngắn nhất', name_en: 'Shortest paths', category: 'GRAPHS', description: 'Dijkstra, Bellman-Ford, Floyd' },
  { code: 'MST', name_vi: 'Cây khung nhỏ nhất', name_en: 'Minimum spanning tree', category: 'GRAPHS', description: 'Kruskal, Prim' },
  { code: 'TOPOLOGICAL_SORT', name_vi: 'Sắp xếp topo', name_en: 'Topological sort', category: 'GRAPHS', description: 'Thứ tự phụ thuộc trên DAG' },
  // Toán
  { code: 'NUMBER_THEORY', name_vi: 'Số học (ước, nguyên tố, gcd)', name_en: 'Number theory', category: 'MATH', description: 'Kiểm tra nguyên tố, sàng, ước chung, bội chung' },
  { code: 'MODULAR_ARITHMETIC', name_vi: 'Đồng dư / modulo', name_en: 'Modular arithmetic', category: 'MATH', description: 'Lấy dư từng bước, lũy thừa nhanh' },
  { code: 'COMBINATORICS', name_vi: 'Tổ hợp / đếm', name_en: 'Combinatorics', category: 'MATH', description: 'Chỉnh hợp, tổ hợp, nguyên lý đếm' },
  { code: 'GEOMETRY', name_vi: 'Hình học', name_en: 'Geometry', category: 'MATH', description: 'Toạ độ, khoảng cách, diện tích, tích chéo' },
];
