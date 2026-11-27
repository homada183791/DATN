-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_vi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_skills" (
    "problem_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AI',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_skills_pkey" PRIMARY KEY ("problem_id","skill_id")
);

-- CreateTable
CREATE TABLE "skill_masteries" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "p_mastery" DOUBLE PRECISION NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_masteries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_code_key" ON "skills"("code");

-- CreateIndex
CREATE INDEX "problem_skills_skill_id_idx" ON "problem_skills"("skill_id");

-- CreateIndex
CREATE INDEX "skill_masteries_scope_skill_id_idx" ON "skill_masteries"("scope", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_masteries_student_id_skill_id_scope_key" ON "skill_masteries"("student_id", "skill_id", "scope");

-- AddForeignKey
ALTER TABLE "problem_skills" ADD CONSTRAINT "problem_skills_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_skills" ADD CONSTRAINT "problem_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_masteries" ADD CONSTRAINT "skill_masteries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_masteries" ADD CONSTRAINT "skill_masteries_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Danh mục kỹ năng chuẩn (giữ khớp với src/modules/skills/skill-catalog.ts)
INSERT INTO "skills" ("id", "code", "name_vi", "name_en", "category", "description", "sort") VALUES
  ('skill-io', 'IO', 'Nhập/xuất dữ liệu', 'Input/output', 'BASICS', 'Đọc/ghi dữ liệu đúng định dạng, đọc nhiều dòng, đọc đến hết dữ liệu', 0),
  ('skill-variables-types', 'VARIABLES_TYPES', 'Biến và kiểu dữ liệu', 'Variables and types', 'BASICS', 'Khai báo biến, chọn kiểu dữ liệu phù hợp, ép kiểu', 1),
  ('skill-arithmetic', 'ARITHMETIC', 'Phép toán số học', 'Arithmetic operations', 'BASICS', 'Cộng trừ nhân chia, chia lấy dư, chia nguyên', 2),
  ('skill-int-overflow', 'INT_OVERFLOW', 'Tràn số / số lớn', 'Integer overflow / big numbers', 'BASICS', 'Nhận ra khi cần long long, tránh tràn khi nhân/cộng dồn', 3),
  ('skill-float-precision', 'FLOAT_PRECISION', 'Số thực và sai số', 'Floating point precision', 'BASICS', 'Làm tròn, so sánh số thực với epsilon, in đúng số chữ số', 4),
  ('skill-conditionals', 'CONDITIONALS', 'Câu lệnh rẽ nhánh', 'If / else statements', 'BASICS', 'If, else if, switch, xét đủ các trường hợp', 5),
  ('skill-logic-operators', 'LOGIC_OPERATORS', 'Toán tử logic', 'Logical operators', 'BASICS', 'Kết hợp điều kiện bằng &&, ||, !', 6),
  ('skill-comparisons', 'COMPARISONS', 'So sánh giá trị', 'Numerical comparisons', 'BASICS', 'So sánh, tìm lớn nhất/nhỏ nhất, xử lý bằng nhau', 7),
  ('skill-loops-for', 'LOOPS_FOR', 'Vòng lặp for', 'For loops', 'BASICS', 'Duyệt với số bước xác định, biên chạy đúng', 8),
  ('skill-loops-while', 'LOOPS_WHILE', 'Vòng lặp while', 'While loops', 'BASICS', 'Lặp theo điều kiện, điều kiện dừng đúng', 9),
  ('skill-nested-loops', 'NESTED_LOOPS', 'Vòng lặp lồng nhau', 'Nested loops', 'BASICS', 'Hai/ba vòng lặp lồng, duyệt cặp, duyệt ma trận', 10),
  ('skill-functions', 'FUNCTIONS', 'Hàm', 'Functions', 'BASICS', 'Tách hàm, tham số, giá trị trả về, truyền tham chiếu', 11),
  ('skill-recursion', 'RECURSION', 'Đệ quy', 'Recursion', 'BASICS', 'Hàm gọi lại chính nó, điểm dừng, độ sâu đệ quy', 12),
  ('skill-array-1d', 'ARRAY_1D', 'Mảng một chiều', 'Arrays', 'DATA_STRUCTURES', 'Lưu và duyệt mảng, chỉ số, biên mảng', 13),
  ('skill-array-2d', 'ARRAY_2D', 'Mảng hai chiều / ma trận', '2D arrays / matrices', 'DATA_STRUCTURES', 'Duyệt ma trận, ô kề, đường chéo', 14),
  ('skill-string-basic', 'STRING_BASIC', 'Chuỗi cơ bản', 'Basic strings', 'DATA_STRUCTURES', 'Duyệt ký tự, độ dài, nối chuỗi, đổi hoa/thường', 15),
  ('skill-string-processing', 'STRING_PROCESSING', 'Xử lý chuỗi nâng cao', 'String processing', 'DATA_STRUCTURES', 'Tách từ, đối xứng, tìm chuỗi con, đếm tần suất ký tự', 16),
  ('skill-pointers', 'POINTERS', 'Con trỏ / tham chiếu', 'Pointers / references', 'DATA_STRUCTURES', 'Con trỏ, cấp phát động, tham chiếu', 17),
  ('skill-structs-oop', 'STRUCTS_OOP', 'Struct / lớp đối tượng', 'Structs / OOP', 'DATA_STRUCTURES', 'Gom dữ liệu thành struct/class, phương thức', 18),
  ('skill-stack', 'STACK', 'Ngăn xếp', 'Stack', 'DATA_STRUCTURES', 'Stack, ngoặc hợp lệ, stack đơn điệu', 19),
  ('skill-queue-deque', 'QUEUE_DEQUE', 'Hàng đợi / deque', 'Queue / deque', 'DATA_STRUCTURES', 'Queue, deque, hàng đợi đơn điệu', 20),
  ('skill-linked-list', 'LINKED_LIST', 'Danh sách liên kết', 'Linked list', 'DATA_STRUCTURES', 'Thêm/xoá nút, đảo danh sách', 21),
  ('skill-hash-map', 'HASH_MAP', 'Bảng băm / map', 'Hash map / dictionary', 'DATA_STRUCTURES', 'map/unordered_map/dict để đếm, tra cứu nhanh', 22),
  ('skill-set', 'SET', 'Tập hợp', 'Set', 'DATA_STRUCTURES', 'set/unordered_set, loại trùng, kiểm tra tồn tại', 23),
  ('skill-priority-queue', 'PRIORITY_QUEUE', 'Hàng đợi ưu tiên / heap', 'Priority queue / heap', 'DATA_STRUCTURES', 'Lấy phần tử lớn/nhỏ nhất liên tục', 24),
  ('skill-trees', 'TREES', 'Cây / cây nhị phân', 'Trees / binary trees', 'DATA_STRUCTURES', 'Duyệt cây, cây nhị phân tìm kiếm, chiều cao', 25),
  ('skill-dsu', 'DSU', 'Hợp nhất tập hợp (DSU)', 'Disjoint set union', 'DATA_STRUCTURES', 'Union-find, gộp thành phần', 26),
  ('skill-range-query-ds', 'RANGE_QUERY_DS', 'Cây phân đoạn / Fenwick', 'Segment tree / Fenwick', 'DATA_STRUCTURES', 'Truy vấn và cập nhật trên đoạn', 27),
  ('skill-sorting', 'SORTING', 'Sắp xếp', 'Sorting', 'ALGORITHMS', 'Sắp xếp, dùng thứ tự để đơn giản hoá bài', 28),
  ('skill-custom-comparator', 'CUSTOM_COMPARATOR', 'Sắp xếp theo tiêu chí riêng', 'Custom comparators', 'ALGORITHMS', 'Hàm so sánh, sắp nhiều khoá', 29),
  ('skill-binary-search', 'BINARY_SEARCH', 'Tìm kiếm nhị phân', 'Binary search', 'ALGORITHMS', 'Tìm trên mảng đã sắp, lower/upper bound', 30),
  ('skill-binary-search-answer', 'BINARY_SEARCH_ANSWER', 'Chặt nhị phân đáp án', 'Binary search on the answer', 'ALGORITHMS', 'Chặt nhị phân trên giá trị kết quả với hàm kiểm tra đơn điệu', 31),
  ('skill-two-pointers', 'TWO_POINTERS', 'Hai con trỏ', 'Two pointers', 'ALGORITHMS', 'Hai chỉ số di chuyển cùng chiều/ngược chiều', 32),
  ('skill-sliding-window', 'SLIDING_WINDOW', 'Cửa sổ trượt', 'Sliding window', 'ALGORITHMS', 'Duy trì đoạn liên tiếp khi trượt', 33),
  ('skill-prefix-sum', 'PREFIX_SUM', 'Mảng cộng dồn', 'Prefix sums', 'ALGORITHMS', 'Tổng đoạn nhanh, mảng hiệu', 34),
  ('skill-greedy', 'GREEDY', 'Tham lam', 'Greedy', 'ALGORITHMS', 'Chọn tối ưu cục bộ có chứng minh', 35),
  ('skill-brute-force', 'BRUTE_FORCE', 'Vét cạn', 'Brute force', 'ALGORITHMS', 'Thử mọi khả năng khi giới hạn nhỏ', 36),
  ('skill-backtracking', 'BACKTRACKING', 'Quay lui', 'Backtracking', 'ALGORITHMS', 'Sinh hoán vị/tổ hợp, cắt nhánh', 37),
  ('skill-divide-conquer', 'DIVIDE_CONQUER', 'Chia để trị', 'Divide and conquer', 'ALGORITHMS', 'Chia bài toán con, gộp kết quả', 38),
  ('skill-bit-manipulation', 'BIT_MANIPULATION', 'Thao tác bit / bitmask', 'Bit manipulation', 'ALGORITHMS', 'Phép toán bit, duyệt tập con bằng bitmask', 39),
  ('skill-simulation', 'SIMULATION', 'Mô phỏng', 'Simulation', 'ALGORITHMS', 'Làm đúng theo mô tả từng bước', 40),
  ('skill-dp-1d', 'DP_1D', 'Quy hoạch động cơ bản', 'Basic dynamic programming', 'DYNAMIC_PROGRAMMING', 'Trạng thái một chiều, công thức truy hồi', 41),
  ('skill-dp-knapsack', 'DP_KNAPSACK', 'Bài toán cái túi', 'Knapsack DP', 'DYNAMIC_PROGRAMMING', 'Cái túi 0/1, không giới hạn, đổi tiền', 42),
  ('skill-dp-2d', 'DP_2D', 'Quy hoạch động 2 chiều', '2D dynamic programming', 'DYNAMIC_PROGRAMMING', 'Đường đi trên lưới, LCS, chỉnh sửa chuỗi', 43),
  ('skill-dp-subsequence', 'DP_SUBSEQUENCE', 'Dãy con (LIS, ...)', 'Subsequence DP', 'DYNAMIC_PROGRAMMING', 'Dãy con tăng dài nhất, dãy con có tổng lớn nhất', 44),
  ('skill-graph-representation', 'GRAPH_REPRESENTATION', 'Biểu diễn đồ thị', 'Graph representation', 'GRAPHS', 'Danh sách kề, ma trận kề, đọc cạnh', 45),
  ('skill-bfs', 'BFS', 'Duyệt theo chiều rộng (BFS)', 'Breadth-first search', 'GRAPHS', 'BFS, đường đi ngắn nhất không trọng số, loang trên lưới', 46),
  ('skill-dfs', 'DFS', 'Duyệt theo chiều sâu (DFS)', 'Depth-first search', 'GRAPHS', 'DFS, thành phần liên thông, phát hiện chu trình', 47),
  ('skill-shortest-path', 'SHORTEST_PATH', 'Đường đi ngắn nhất', 'Shortest paths', 'GRAPHS', 'Dijkstra, Bellman-Ford, Floyd', 48),
  ('skill-mst', 'MST', 'Cây khung nhỏ nhất', 'Minimum spanning tree', 'GRAPHS', 'Kruskal, Prim', 49),
  ('skill-topological-sort', 'TOPOLOGICAL_SORT', 'Sắp xếp topo', 'Topological sort', 'GRAPHS', 'Thứ tự phụ thuộc trên DAG', 50),
  ('skill-number-theory', 'NUMBER_THEORY', 'Số học (ước, nguyên tố, gcd)', 'Number theory', 'MATH', 'Kiểm tra nguyên tố, sàng, ước chung, bội chung', 51),
  ('skill-modular-arithmetic', 'MODULAR_ARITHMETIC', 'Đồng dư / modulo', 'Modular arithmetic', 'MATH', 'Lấy dư từng bước, lũy thừa nhanh', 52),
  ('skill-combinatorics', 'COMBINATORICS', 'Tổ hợp / đếm', 'Combinatorics', 'MATH', 'Chỉnh hợp, tổ hợp, nguyên lý đếm', 53),
  ('skill-geometry', 'GEOMETRY', 'Hình học', 'Geometry', 'MATH', 'Toạ độ, khoảng cách, diện tích, tích chéo', 54)
ON CONFLICT ("code") DO NOTHING;
