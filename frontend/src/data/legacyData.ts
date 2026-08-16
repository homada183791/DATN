// Legacy static data retained only for screens that do not yet have backend APIs.

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  role: 'student' | 'instructor';
  institution: string;
  solvedCount: number;
  submissionCount: number;
  rating: number;
  joinDate: string;
  bio: string;
}

export interface MockAuthAccount {
  username: string;
  email: string;
  password: string;
  user: User;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  solvedCount: number;
  submissionCount: number;
  points: number;
  tags: string[];
}

export interface Submission {
  id: string;
  problemId: string;
  problemTitle: string;
  userId: string;
  username: string;
  language: string;
  verdict: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RTE' | 'CE' | 'PE';
  executionTime: number;
  memory: number;
  timestamp: string;
  code: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'running' | 'ended';
  participantCount: number;
  problemCount: number;
  type: 'ICPC' | 'OI' | 'Homework';
  visibility: 'public' | 'private';
  accessCode?: string;
  classId?: string;
  className?: string;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: 'active' | 'closed' | 'upcoming';
  problemCount: number;
  completedCount: number;
  classId: string;
  className: string;
  totalStudents: number;
  submittedStudents: number;
}

export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  instructor: string;
  semester: string;
  studentCount: number;
  homeworkCount: number;
  contestCount: number;
  description: string;
}

export interface StudentInfo {
  id: string;
  username: string;
  fullName: string;
  email: string;
  solvedCount: number;
  submissionCount: number;
  rating: number;
  lastActive: string;
  classId: string;
  className: string;
}

export const currentUser: User = {
  id: 'u1',
  username: 'nguyenvana',
  email: 'nguyenvana@university.edu.vn',
  fullName: 'Nguyễn Văn A',
  avatar: '',
  role: 'student',
  institution: 'Đại học Bách Khoa Hà Nội',
  solvedCount: 156,
  submissionCount: 489,
  rating: 1847,
  joinDate: '2024-09-01',
  bio: 'Sinh viên năm 3, chuyên ngành Khoa học Máy tính. Đam mê thuật toán và lập trình cạnh tranh.',
};

export const instructorUser: User = {
  id: 'u2',
  username: 'tranducb',
  email: 'tranducb@university.edu.vn',
  fullName: 'Trần Đức B',
  avatar: '',
  role: 'instructor',
  institution: 'Đại học Bách Khoa Hà Nội',
  solvedCount: 842,
  submissionCount: 2100,
  rating: 2450,
  joinDate: '2020-08-15',
  bio: 'Giảng viên khoa Công nghệ Thông tin. Chuyên gia thuật toán.',
};

export const mockAuthAccounts: MockAuthAccount[] = [
  {
    username: currentUser.username,
    email: currentUser.email,
    password: '123456',
    user: currentUser,
  },
  {
    username: instructorUser.username,
    email: instructorUser.email,
    password: '123456',
    user: instructorUser,
  },
];

export const problems: Problem[] = [
  { id: 'P001', title: 'Tổng hai số', difficulty: 'Easy', category: 'Math', solvedCount: 456, submissionCount: 890, points: 100, tags: ['math', 'basic'] },
  { id: 'P002', title: 'Dãy số Fibonacci', difficulty: 'Easy', category: 'DP', solvedCount: 312, submissionCount: 678, points: 100, tags: ['dp', 'math'] },
  { id: 'P003', title: 'Sắp xếp mảng', difficulty: 'Easy', category: 'Sorting', solvedCount: 289, submissionCount: 543, points: 100, tags: ['sorting', 'array'] },
  { id: 'P004', title: 'Tìm kiếm nhị phân', difficulty: 'Medium', category: 'Binary Search', solvedCount: 234, submissionCount: 567, points: 150, tags: ['binary-search'] },
  { id: 'P005', title: 'Đồ thị liên thông', difficulty: 'Medium', category: 'Graph', solvedCount: 178, submissionCount: 456, points: 200, tags: ['graph', 'dfs', 'bfs'] },
  { id: 'P006', title: 'Cây khung nhỏ nhất', difficulty: 'Medium', category: 'Graph', solvedCount: 145, submissionCount: 389, points: 200, tags: ['graph', 'mst', 'kruskal'] },
  { id: 'P007', title: 'Quy hoạch động trên cây', difficulty: 'Hard', category: 'DP', solvedCount: 67, submissionCount: 234, points: 300, tags: ['dp', 'tree'] },
  { id: 'P008', title: 'Luồng tối đa', difficulty: 'Hard', category: 'Graph', solvedCount: 45, submissionCount: 189, points: 350, tags: ['graph', 'flow', 'dinic'] },
  { id: 'P009', title: 'Chuỗi con chung dài nhất', difficulty: 'Medium', category: 'DP', solvedCount: 198, submissionCount: 423, points: 150, tags: ['dp', 'string'] },
  { id: 'P010', title: 'Ngăn xếp và hàng đợi', difficulty: 'Easy', category: 'Data Structure', solvedCount: 367, submissionCount: 612, points: 100, tags: ['stack', 'queue'] },
  { id: 'P011', title: 'Phân số tối giản', difficulty: 'Easy', category: 'Math', solvedCount: 423, submissionCount: 756, points: 100, tags: ['math', 'gcd'] },
  { id: 'P012', title: 'Segment Tree', difficulty: 'Hard', category: 'Data Structure', solvedCount: 89, submissionCount: 267, points: 300, tags: ['segment-tree', 'range-query'] },
  { id: 'P013', title: 'Phép toán trên ma trận', difficulty: 'Medium', category: 'Math', solvedCount: 156, submissionCount: 345, points: 200, tags: ['math', 'matrix'] },
  { id: 'P014', title: 'Đường đi ngắn nhất', difficulty: 'Medium', category: 'Graph', solvedCount: 201, submissionCount: 432, points: 200, tags: ['graph', 'dijkstra', 'shortest-path'] },
  { id: 'P015', title: 'Suffix Array', difficulty: 'Hard', category: 'String', solvedCount: 34, submissionCount: 156, points: 350, tags: ['string', 'suffix-array'] },
];

export const submissions: Submission[] = [
  { id: 'S001', problemId: 'P001', problemTitle: 'Tổng hai số', userId: 'u1', username: 'nguyenvana', language: 'C++', verdict: 'AC', executionTime: 12, memory: 1.2, timestamp: '2025-01-15 14:30:22', code: '#include <iostream>\nusing namespace std;\nint main() { int a, b; cin >> a >> b; cout << a + b; return 0; }' },
  { id: 'S002', problemId: 'P002', problemTitle: 'Dãy số Fibonacci', userId: 'u1', username: 'nguyenvana', language: 'Python', verdict: 'AC', executionTime: 45, memory: 8.4, timestamp: '2025-01-15 15:12:08', code: 'n = int(input())\nfib = [0, 1]\nfor i in range(2, n+1):\n  fib.append(fib[i-1] + fib[i-2])\nprint(fib[n])' },
  { id: 'S003', problemId: 'P005', problemTitle: 'Đồ thị liên thông', userId: 'u1', username: 'nguyenvana', language: 'C++', verdict: 'WA', executionTime: 89, memory: 3.5, timestamp: '2025-01-15 16:45:11', code: '#include <bits/stdc++.h>\nusing namespace std;\n// Wrong answer on test 3' },
  { id: 'S004', problemId: 'P004', problemTitle: 'Tìm kiếm nhị phân', userId: 'u1', username: 'nguyenvana', language: 'Java', verdict: 'TLE', executionTime: 2500, memory: 45.2, timestamp: '2025-01-14 10:22:33', code: 'import java.util.*;\npublic class Main { public static void main(String[] args) { // TLE } }' },
  { id: 'S005', problemId: 'P007', problemTitle: 'Quy hoạch động trên cây', userId: 'u1', username: 'nguyenvana', language: 'C++', verdict: 'RTE', executionTime: 0, memory: 0, timestamp: '2025-01-14 09:15:44', code: '#include <bits/stdc++.h>\nusing namespace std;\n// Runtime error' },
  { id: 'S006', problemId: 'P003', problemTitle: 'Sắp xếp mảng', userId: 'u1', username: 'nguyenvana', language: 'C++', verdict: 'AC', executionTime: 34, memory: 2.1, timestamp: '2025-01-13 20:11:55', code: '#include <bits/stdc++.h>\nusing namespace std;\nint main() { int n; cin >> n; vector<int> a(n); for(auto&x:a) cin>>x; sort(a.begin(),a.end()); for(auto x:a) cout<<x<<" "; }' },
  { id: 'S007', problemId: 'P006', problemTitle: 'Cây khung nhỏ nhất', userId: 'u1', username: 'nguyenvana', language: 'C++', verdict: 'AC', executionTime: 67, memory: 4.3, timestamp: '2025-01-13 18:30:12', code: '#include <bits/stdc++.h>\nusing namespace std;\n// Kruskal MST solution' },
  { id: 'S008', problemId: 'P009', problemTitle: 'Chuỗi con chung dài nhất', userId: 'u1', username: 'nguyenvana', language: 'Python', verdict: 'AC', executionTime: 120, memory: 12.3, timestamp: '2025-01-12 22:45:00', code: 's1 = input()\ns2 = input()\n# LCS solution' },
  { id: 'S009', problemId: 'P010', problemTitle: 'Ngăn xếp và hàng đợi', userId: 'u1', username: 'nguyenvana', language: 'C++', verdict: 'AC', executionTime: 8, memory: 0.8, timestamp: '2025-01-12 14:20:33', code: '#include <bits/stdc++.h>\nusing namespace std;\n// Stack and Queue solution' },
  { id: 'S010', problemId: 'P008', problemTitle: 'Luồng tối đa', userId: 'u1', username: 'nguyenvana', language: 'C++', verdict: 'CE', executionTime: 0, memory: 0, timestamp: '2025-01-12 11:05:18', code: '#include <bits/stdc++.h>\n// Compilation Error' },
  { id: 'S011', problemId: 'P011', problemTitle: 'Phân số tối giản', userId: 'u2', username: 'tranducb', language: 'C++', verdict: 'AC', executionTime: 5, memory: 0.5, timestamp: '2025-01-11 16:30:00', code: '#include <bits/stdc++.h>\nusing namespace std;\nint main() { long long a, b; cin >> a >> b; long long g = __gcd(a,b); cout << a/g << "/" << b/g; }' },
  { id: 'S012', problemId: 'P014', problemTitle: 'Đường đi ngắn nhất', userId: 'u2', username: 'tranducb', language: 'C++', verdict: 'AC', executionTime: 45, memory: 5.6, timestamp: '2025-01-11 14:15:22', code: '#include <bits/stdc++.h>\nusing namespace std;\n// Dijkstra solution' },
];

export const contests: Contest[] = [
  { id: 'C001', title: 'Kỳ thi Giải thuật 2025 - Vòng 1', description: 'Kỳ thi vòng loại giải thuật năm 2025. Gồm các bài toán cơ bản về mảng, chuỗi và sắp xếp.', startTime: '2025-02-01 09:00', endTime: '2025-02-01 12:00', status: 'upcoming', participantCount: 156, problemCount: 5, type: 'ICPC', visibility: 'public' },
  { id: 'C002', title: 'Luyện tập Đồ thị', description: 'Bài tập về các thuật toán đồ thị cơ bản: BFS, DFS, Dijkstra.', startTime: '2025-01-20 14:00', endTime: '2025-01-20 17:00', status: 'running', participantCount: 89, problemCount: 4, type: 'OI', visibility: 'private', accessCode: 'GRAPH2025' },
  { id: 'C003', title: 'Kỳ thi Giải thuật 2024 - Vòng chung kết', description: 'Vòng chung kết kỳ thi giải thuật 2024.', startTime: '2024-12-15 09:00', endTime: '2024-12-15 14:00', status: 'ended', participantCount: 45, problemCount: 8, type: 'ICPC', visibility: 'public' },
  { id: 'C004', title: 'Thi giữa kỳ - Cấu trúc dữ liệu', description: 'Bài thi giữa kỳ môn Cấu trúc dữ liệu và Giải thuật.', startTime: '2025-01-10 08:00', endTime: '2025-01-10 10:00', status: 'ended', participantCount: 67, problemCount: 3, type: 'Homework', visibility: 'private', accessCode: 'MIDTERM-INT1009', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'C005', title: 'Luyện tập Quy hoạch động', description: 'Các bài tập về quy hoạch động từ cơ bản đến nâng cao.', startTime: '2025-02-10 14:00', endTime: '2025-02-10 18:00', status: 'upcoming', participantCount: 34, problemCount: 6, type: 'OI', visibility: 'public' },
  { id: 'C006', title: 'Thi cuối kỳ - Cấu trúc dữ liệu', description: 'Bài thi cuối kỳ môn Cấu trúc dữ liệu và Giải thuật.', startTime: '2025-01-25 08:00', endTime: '2025-01-25 11:00', status: 'running', participantCount: 72, problemCount: 5, type: 'Homework', visibility: 'private', accessCode: 'FINAL-INT1009', classId: 'CL001', className: 'CTDL&GT - INT1009' },
];

export const homeworks: Homework[] = [
  { id: 'H001', title: 'Bài tập 1: Mảng và Sắp xếp', description: 'Các bài tập về mảng 1 chiều và các thuật toán sắp xếp cơ bản.', deadline: '2025-01-20 23:59', status: 'active', problemCount: 5, completedCount: 3, classId: 'CL001', className: 'CTDL&GT - INT1009', totalStudents: 45, submittedStudents: 32 },
  { id: 'H002', title: 'Bài tập 2: Chuỗi và Xử lý văn bản', description: 'Bài tập về xử lý chuỗi, tìm kiếm mẫu và các thuật toán liên quan.', deadline: '2025-01-25 23:59', status: 'active', problemCount: 4, completedCount: 1, classId: 'CL001', className: 'CTDL&GT - INT1009', totalStudents: 45, submittedStudents: 18 },
  { id: 'H003', title: 'Bài tập 3: Đồ thị', description: 'Bài tập về duyệt đồ thị, tìm đường đi và cây khung.', deadline: '2025-02-01 23:59', status: 'upcoming', problemCount: 6, completedCount: 0, classId: 'CL001', className: 'CTDL&GT - INT1009', totalStudents: 45, submittedStudents: 0 },
  { id: 'H004', title: 'Bài tập 4: Quy hoạch động', description: 'Bài tập về quy hoạch động từ cơ bản đến nâng cao.', deadline: '2025-02-10 23:59', status: 'upcoming', problemCount: 5, completedCount: 0, classId: 'CL001', className: 'CTDL&GT - INT1009', totalStudents: 45, submittedStudents: 0 },
  { id: 'H005', title: 'Bài tập 1: Giới thiệu C++', description: 'Các bài tập cơ bản về ngôn ngữ C++.', deadline: '2024-12-15 23:59', status: 'closed', problemCount: 3, completedCount: 3, classId: 'CL002', className: 'Lập trình C++ - INT1008', totalStudents: 52, submittedStudents: 48 },
  { id: 'H006', title: 'Bài tập 2: Con trỏ và Mảng', description: 'Bài tập về con trỏ, mảng động và cấp phát bộ nhớ.', deadline: '2024-12-30 23:59', status: 'closed', problemCount: 4, completedCount: 4, classId: 'CL002', className: 'Lập trình C++ - INT1008', totalStudents: 52, submittedStudents: 44 },
];

export const classes: ClassInfo[] = [
  { id: 'CL001', name: 'Cấu trúc dữ liệu & Giải thuật', code: 'INT1009', instructor: 'Trần Đức B', semester: 'Học kỳ 1 - 2024/2025', studentCount: 45, homeworkCount: 4, contestCount: 2, description: 'Môn học về các cấu trúc dữ liệu và giải thuật cơ bản.' },
  { id: 'CL002', name: 'Lập trình C++', code: 'INT1008', instructor: 'Nguyễn Thị C', semester: 'Học kỳ 1 - 2024/2025', studentCount: 52, homeworkCount: 2, contestCount: 1, description: 'Môn học về ngôn ngữ lập trình C++.' },
  { id: 'CL003', name: 'Phân tích Thiết kế Thuật toán', code: 'INT2010', instructor: 'Trần Đức B', semester: 'Học kỳ 2 - 2024/2025', studentCount: 38, homeworkCount: 0, contestCount: 0, description: 'Môn học về phân tích và thiết kế các thuật toán.' },
];

export const students: StudentInfo[] = [
  { id: 'u1', username: 'nguyenvana', fullName: 'Nguyễn Văn A', email: 'nguyenvana@university.edu.vn', solvedCount: 156, submissionCount: 489, rating: 1847, lastActive: '2025-01-15', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'u3', username: 'levanc', fullName: 'Lê Văn C', email: 'levanc@university.edu.vn', solvedCount: 134, submissionCount: 356, rating: 1723, lastActive: '2025-01-15', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'u4', username: 'phamd', fullName: 'Phạm Thị D', email: 'phamd@university.edu.vn', solvedCount: 189, submissionCount: 567, rating: 1956, lastActive: '2025-01-14', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'u5', username: 'hoange', fullName: 'Hoàng Văn E', email: 'hoange@university.edu.vn', solvedCount: 98, submissionCount: 234, rating: 1567, lastActive: '2025-01-13', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'u6', username: 'vof', fullName: 'Võ Thị F', email: 'vof@university.edu.vn', solvedCount: 167, submissionCount: 423, rating: 1834, lastActive: '2025-01-15', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'u7', username: 'dangg', fullName: 'Đặng Văn G', email: 'dangg@university.edu.vn', solvedCount: 78, submissionCount: 189, rating: 1423, lastActive: '2025-01-12', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'u8', username: 'buih', fullName: 'Bùi Thị H', email: 'buih@university.edu.vn', solvedCount: 201, submissionCount: 612, rating: 2034, lastActive: '2025-01-15', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'u9', username: 'duongi', fullName: 'Dương Văn I', email: 'duongi@university.edu.vn', solvedCount: 45, submissionCount: 123, rating: 1234, lastActive: '2025-01-10', classId: 'CL001', className: 'CTDL&GT - INT1009' },
  { id: 'u10', username: 'nguyenk', fullName: 'Nguyễn Thị K', email: 'nguyenk@university.edu.vn', solvedCount: 112, submissionCount: 289, rating: 1678, lastActive: '2025-01-14', classId: 'CL002', className: 'Lập trình C++ - INT1008' },
  { id: 'u11', username: 'tral', fullName: 'Trần Văn L', email: 'tral@university.edu.vn', solvedCount: 67, submissionCount: 178, rating: 1389, lastActive: '2025-01-11', classId: 'CL002', className: 'Lập trình C++ - INT1008' },
  { id: 'u12', username: 'phamm', fullName: 'Phạm Văn M', email: 'phamm@university.edu.vn', solvedCount: 145, submissionCount: 398, rating: 1789, lastActive: '2025-01-15', classId: 'CL002', className: 'Lập trình C++ - INT1008' },
  { id: 'u13', username: 'lehn', fullName: 'Lê Thị N', email: 'lehn@university.edu.vn', solvedCount: 89, submissionCount: 212, rating: 1501, lastActive: '2025-01-13', classId: 'CL002', className: 'Lập trình C++ - INT1008' },
];

export const leaderboardData = [
  { rank: 1, username: 'buih', fullName: 'Bùi Thị H', solvedCount: 201, rating: 2034 },
  { rank: 2, username: 'phamd', fullName: 'Phạm Thị D', solvedCount: 189, rating: 1956 },
  { rank: 3, username: 'vof', fullName: 'Võ Thị F', solvedCount: 167, rating: 1834 },
  { rank: 4, username: 'nguyenvana', fullName: 'Nguyễn Văn A', solvedCount: 156, rating: 1847 },
  { rank: 5, username: 'phamm', fullName: 'Phạm Văn M', solvedCount: 145, rating: 1789 },
  { rank: 6, username: 'levanc', fullName: 'Lê Văn C', solvedCount: 134, rating: 1723 },
  { rank: 7, username: 'nguyenk', fullName: 'Nguyễn Thị K', solvedCount: 112, rating: 1678 },
  { rank: 8, username: 'hoange', fullName: 'Hoàng Văn E', solvedCount: 98, rating: 1567 },
  { rank: 9, username: 'lehn', fullName: 'Lê Thị N', solvedCount: 89, rating: 1501 },
  { rank: 10, username: 'dangg', fullName: 'Đặng Văn G', solvedCount: 78, rating: 1423 },
];

export const activityData = [
  { date: '2025-01-15', count: 4 },
  { date: '2025-01-14', count: 2 },
  { date: '2025-01-13', count: 3 },
  { date: '2025-01-12', count: 2 },
  { date: '2025-01-11', count: 1 },
  { date: '2025-01-10', count: 0 },
  { date: '2025-01-09', count: 1 },
  { date: '2025-01-08', count: 3 },
  { date: '2025-01-07', count: 2 },
  { date: '2025-01-06', count: 4 },
  { date: '2025-01-05', count: 1 },
  { date: '2025-01-04', count: 0 },
];

export const skillRadar = [
  { skill: 'Math', score: 75 },
  { skill: 'DP', score: 60 },
  { skill: 'Graph', score: 70 },
  { skill: 'String', score: 55 },
  { skill: 'Data Structure', score: 80 },
  { skill: 'Binary Search', score: 65 },
];
