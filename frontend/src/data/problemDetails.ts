export type Lang = 'cpp' | 'python' | 'java';

export interface SampleTest {
  input: string;
  output: string;
  note?: string;
}

export interface StatementSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
}

export interface ProblemDetail {
  code: string;
  timeLimit: string;
  memoryLimit: string;
  points: number;
  sections: StatementSection[];
  samples: SampleTest[];
  templates: Record<Lang, string>;
  solutions: Record<Lang, string>;
  successPattern: RegExp;
}

export const LANG_LABELS: Record<Lang, string> = {
  cpp: 'C++17',
  python: 'Python 3.11',
  java: 'Java 21',
};

const cppTemplate = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // TODO: đọc dữ liệu và giải

    return 0;
}
`;

const pythonTemplate = `import sys
input = sys.stdin.readline

# TODO: đọc dữ liệu và giải
`;

const javaTemplate = `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // TODO: đọc dữ liệu và giải
    }
}
`;

export const problemDetails: Record<string, ProblemDetail> = {
  P003: {
    code: 'SORT-ASC',
    timeLimit: '1.0 s',
    memoryLimit: '256 MB',
    points: 100,
    sections: [
      {
        paragraphs: [
          'Cho một dãy gồm n số nguyên. Hãy in ra dãy sau khi sắp xếp theo thứ tự không giảm (tăng dần).',
        ],
      },
      {
        heading: 'Đầu vào',
        bullets: [
          'Dòng đầu chứa số nguyên n (1 ≤ n ≤ 10⁵).',
          'Dòng thứ hai chứa n số nguyên aᵢ (−10⁹ ≤ a ≤ 10⁹).',
        ],
      },
      {
        heading: 'Đầu ra',
        paragraphs: [
          'In ra n số nguyên đã sắp xếp tăng dần, cách nhau bởi dấu cách trên một dòng.',
        ],
      },
      {
        heading: 'Ràng buộc',
        table: {
          head: ['Đại lượng', 'Giới hạn'],
          rows: [
            ['n', '1 ≤ n ≤ 10⁵'],
            ['aᵢ', '−10⁹ ≤ aᵢ ≤ 10⁹'],
            ['Subtask 1 (40đ)', 'n ≤ 10³'],
            ['Subtask 2 (60đ)', 'Không có ràng buộc gì thêm'],
          ],
        },
      },
    ],
    samples: [
      { input: '4\n3 1 4 2', output: '1 2 3 4' },
      { input: '5\n-1 0 -5 2 2', output: '-5 -1 0 2 2', note: 'Dãy có thể chứa số âm và phần tử trùng nhau.' },
    ],
    templates: { cpp: cppTemplate, python: pythonTemplate, java: javaTemplate },
    solutions: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    sort(a.begin(), a.end());
    for (int i = 0; i < n; ++i)
        cout << a[i] << " \\n"[i == n - 1];
    return 0;
}
`,
      python: `import sys
input = sys.stdin.readline
n = int(input())
a = sorted(map(int, input().split()))
print(*a)
`,
      java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());
        StringTokenizer st = new StringTokenizer(br.readLine());
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = Long.parseLong(st.nextToken());
        Arrays.sort(a);
        StringBuilder sb = new StringBuilder();
        for (long x : a) sb.append(x).append(' ');
        System.out.println(sb);
    }
}
`,
    },
    successPattern: /sort\s*\(|sorted\s*\(|Arrays\.sort/,
  },

  P001: {
    code: 'SUM-AB',
    timeLimit: '1.0 s',
    memoryLimit: '256 MB',
    points: 100,
    sections: [
      {
        paragraphs: ['Cho hai số nguyên a và b. Hãy in ra tổng a + b.'],
      },
      {
        heading: 'Đầu vào',
        bullets: ['Một dòng duy nhất chứa hai số nguyên a, b (|a|, |b| ≤ 10¹⁸).'],
      },
      {
        heading: 'Đầu ra',
        paragraphs: ['In ra một số nguyên duy nhất là a + b.'],
      },
      {
        heading: 'Ràng buộc',
        table: {
          head: ['Đại lượng', 'Giới hạn'],
          rows: [
            ['a, b', '|a|, |b| ≤ 10¹⁸'],
            ['Lưu ý', 'Sử dụng kiểu số nguyên 64-bit (long long / long).'],
          ],
        },
      },
    ],
    samples: [
      { input: '3 5', output: '8' },
      { input: '-1000000000000000000 1', output: '-999999999999999999' },
    ],
    templates: { cpp: cppTemplate, python: pythonTemplate, java: javaTemplate },
    solutions: {
      cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    long long a, b;
    cin >> a >> b;
    cout << a + b;
    return 0;
}
`,
      python: `a, b = map(int, input().split())
print(a + b)
`,
      java: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long a = sc.nextLong(), b = sc.nextLong();
        System.out.println(a + b);
    }
}
`,
    },
    successPattern: /\+|add|sum/i,
  },

  P002: {
    code: 'FIB-N',
    timeLimit: '1.0 s',
    memoryLimit: '256 MB',
    points: 100,
    sections: [
      {
        paragraphs: [
          'Dãy Fibonacci được định nghĩa: F₀ = 0, F₁ = 1 và Fₙ = Fₙ₋₁ + Fₙ₋₂ với n ≥ 2.',
          'Cho n, hãy in ra Fₙ theo modulo 10⁹ + 7.',
        ],
      },
      {
        heading: 'Đầu vào',
        bullets: ['Một dòng duy nhất chứa số nguyên n (0 ≤ n ≤ 10⁷).'],
      },
      {
        heading: 'Đầu ra',
        paragraphs: ['In ra Fₙ mod (10⁹ + 7).'],
      },
      {
        heading: 'Ràng buộc',
        table: {
          head: ['Đại lượng', 'Giới hạn'],
          rows: [
            ['n', '0 ≤ n ≤ 10⁷'],
            ['Subtask 1 (30đ)', 'n ≤ 30'],
            ['Subtask 2 (70đ)', 'Không có ràng buộc gì thêm'],
          ],
        },
      },
    ],
    samples: [
      { input: '2', output: '1' },
      { input: '10', output: '55' },
      { input: '10000000', output: '711227705', note: 'Cần lấy modulo để tránh tràn số.' },
    ],
    templates: { cpp: cppTemplate, python: pythonTemplate, java: javaTemplate },
    solutions: {
      cpp: `#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1e9 + 7;
int main() {
    int n; cin >> n;
    long long a = 0, b = 1;
    for (int i = 2; i <= n; ++i) {
        long long c = (a + b) % MOD;
        a = b; b = c;
    }
    cout << (n == 0 ? 0 : b);
    return 0;
}
`,
      python: `MOD = 10**9 + 7
n = int(input())
a, b = 0, 1
for _ in range(2, n + 1):
    a, b = b, (a + b) % MOD
print(a if n == 0 else b)
`,
      java: `import java.util.*;
public class Main {
    static final long MOD = 1_000_000_007L;
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) { long c = (a + b) % MOD; a = b; b = c; }
        System.out.println(n == 0 ? 0 : b);
    }
}
`,
    },
    successPattern: /fib|%|mod|for|while/i,
  },
};

export function getDetail(problemId: string, title: string, points: number): ProblemDetail {
  if (problemDetails[problemId]) return problemDetails[problemId];
  return {
    code: problemId.replace('P', 'PROB-'),
    timeLimit: '1.0 s',
    memoryLimit: '256 MB',
    points,
    sections: [
      {
        paragraphs: [
          `Bài toán "${title}". Hãy đọc kỹ yêu cầu, thiết kế thuật toán phù hợp và cài đặt bằng một trong các ngôn ngữ được hỗ trợ.`,
          'Bài tập này thuộc hệ thống JudgeHub — kết quả chấm được trả về tự động trong vòng vài giây.',
        ],
      },
      {
        heading: 'Đầu vào',
        bullets: ['Dữ liệu vào từ bàn phím (stdin), gồm nhiều dòng theo định dạng mô tả trong đề gốc.'],
      },
      {
        heading: 'Đầu ra',
        paragraphs: ['In kết quả ra màn hình (stdout) theo đúng định dạng yêu cầu.'],
      },
      {
        heading: 'Ràng buộc',
        table: {
          head: ['Đại lượng', 'Giới hạn'],
          rows: [
            ['Thời gian', '1.0 s'],
            ['Bộ nhớ', '256 MB'],
          ],
        },
      },
    ],
    samples: [{ input: '2\n1 2', output: '3' }],
    templates: { cpp: cppTemplate, python: pythonTemplate, java: javaTemplate },
    solutions: {
      cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    // Lời giải tham khảo
    return 0;
}
`,
      python: `# Lời giải tham khảo\n`,
      java: `public class Main {\n    public static void main(String[] args) {\n        // Lời giải tham khảo\n    }\n}\n`,
    },
    successPattern: /cout|print|System\.out/,
  };
}
