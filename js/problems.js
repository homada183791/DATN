// Ngân hàng đề bài — mô hình stdin/stdout (giống Codeforces/HackerRank) để có thể chấm
// bài viết bằng nhiều ngôn ngữ khác nhau (JavaScript / Python / C++) bằng cùng một cơ chế:
// đưa `input` vào stdin của chương trình, so sánh stdout với `expected`.
const PROBLEMS = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Map"],
    description: `Cho một dòng số nguyên \`nums\` và một số nguyên \`target\` ở dòng thứ hai,
in ra chỉ số (index, đếm từ 0) của hai phần tử trong mảng sao cho tổng của chúng bằng \`target\`,
cách nhau bởi khoảng trắng.

**Input**
\`\`\`
Dòng 1: các phần tử của nums, cách nhau bởi khoảng trắng
Dòng 2: target
\`\`\`

**Ví dụ:**
\`\`\`
Input:
2 7 11 15
9

Output:
0 1
\`\`\``,
    io: {
      inputFormat: "Dòng 1: nums (cách nhau bởi dấu cách) — Dòng 2: target",
      outputFormat: "Hai chỉ số cách nhau bởi dấu cách, ví dụ: 0 1",
    },
    starterCode: {
      javascript:
`// Đọc input từ stdin, in kết quả ra stdout
const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');
const nums = lines[0].trim().split(/\\s+/).map(Number);
const target = parseInt(lines[1]);

// Viết code của bạn ở đây
`,
      python:
`import sys
data = sys.stdin.read().split('\\n')
nums = list(map(int, data[0].split()))
target = int(data[1])

# Viết code của bạn ở đây
`,
      cpp:
`#include <bits/stdc++.h>
using namespace std;

int main(){
    string line1;
    getline(cin, line1);
    stringstream ss(line1);
    vector<int> nums;
    int x;
    while (ss >> x) nums.push_back(x);
    int target;
    cin >> target;

    // Viết code của bạn ở đây

    return 0;
}
`,
    },
    testCases: [
      { input: "2 7 11 15\n9\n", expected: "0 1" },
      { input: "3 2 4\n6\n", expected: "1 2" },
      { input: "3 3\n6\n", expected: "0 1" },
      { input: "1 2 3 4 5\n9\n", expected: "3 4" },
    ],
  },
  {
    id: 2,
    title: "Reverse String",
    difficulty: "Easy",
    tags: ["String", "Two Pointers"],
    description: `Đọc một chuỗi \`s\` ở dòng đầu vào, in ra chuỗi đó sau khi đã đảo ngược.

**Ví dụ:**
\`\`\`
Input:
hello

Output:
olleh
\`\`\``,
    io: {
      inputFormat: "Dòng 1: chuỗi s",
      outputFormat: "Chuỗi s đã đảo ngược",
    },
    starterCode: {
      javascript:
`const s = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n')[0];

// Viết code của bạn ở đây
`,
      python:
`import sys
s = sys.stdin.readline().rstrip('\\n')

# Viết code của bạn ở đây
`,
      cpp:
`#include <bits/stdc++.h>
using namespace std;

int main(){
    string s;
    getline(cin, s);

    // Viết code của bạn ở đây

    return 0;
}
`,
    },
    testCases: [
      { input: "hello\n", expected: "olleh" },
      { input: "Claude\n", expected: "edualC" },
      { input: "\n", expected: "" },
      { input: "a\n", expected: "a" },
      { input: "12321\n", expected: "12321" },
    ],
  },
  {
    id: 3,
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    description: `Cho một chuỗi \`s\` chỉ chứa các ký tự \`(\`, \`)\`, \`{\`, \`}\`, \`[\`, \`]\`.
In ra \`true\` nếu chuỗi ngoặc hợp lệ (mỗi dấu mở phải có dấu đóng tương ứng, đúng thứ tự,
đúng loại), ngược lại in ra \`false\`.

**Ví dụ:**
\`\`\`
Input:
()[]{}

Output:
true
\`\`\``,
    io: {
      inputFormat: "Dòng 1: chuỗi ngoặc s",
      outputFormat: "true hoặc false",
    },
    starterCode: {
      javascript:
`const s = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n')[0];

// Viết code của bạn ở đây
`,
      python:
`import sys
s = sys.stdin.readline().rstrip('\\n')

# Viết code của bạn ở đây
`,
      cpp:
`#include <bits/stdc++.h>
using namespace std;

int main(){
    string s;
    getline(cin, s);

    // Viết code của bạn ở đây

    return 0;
}
`,
    },
    testCases: [
      { input: "()\n", expected: "true" },
      { input: "()[]{}\n", expected: "true" },
      { input: "(]\n", expected: "false" },
      { input: "([)]\n", expected: "false" },
      { input: "{[]}\n", expected: "true" },
      { input: "\n", expected: "true" },
    ],
  },
  {
    id: 4,
    title: "Maximum Subarray",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming"],
    description: `Cho một dòng số nguyên \`nums\`, tìm dãy con liên tiếp (contiguous subarray) có
tổng lớn nhất và in ra tổng đó (giải bằng thuật toán Kadane, độ phức tạp O(n)).

**Ví dụ:**
\`\`\`
Input:
-2 1 -3 4 -1 2 1 -5 4

Output:
6
\`\`\``,
    io: {
      inputFormat: "Dòng 1: nums (cách nhau bởi dấu cách)",
      outputFormat: "Một số nguyên: tổng lớn nhất",
    },
    starterCode: {
      javascript:
`const nums = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n')[0].trim().split(/\\s+/).map(Number);

// Viết code của bạn ở đây
`,
      python:
`import sys
nums = list(map(int, sys.stdin.readline().split()))

# Viết code của bạn ở đây
`,
      cpp:
`#include <bits/stdc++.h>
using namespace std;

int main(){
    string line;
    getline(cin, line);
    stringstream ss(line);
    vector<int> nums;
    int x;
    while (ss >> x) nums.push_back(x);

    // Viết code của bạn ở đây

    return 0;
}
`,
    },
    testCases: [
      { input: "-2 1 -3 4 -1 2 1 -5 4\n", expected: "6" },
      { input: "1\n", expected: "1" },
      { input: "5 4 -1 7 8\n", expected: "23" },
      { input: "-1 -2 -3\n", expected: "-1" },
    ],
  },
  {
    id: 5,
    title: "Palindrome Number",
    difficulty: "Easy",
    tags: ["Math"],
    description: `Đọc một số nguyên \`x\`, in ra \`true\` nếu \`x\` là số đối xứng (palindrome),
ngược lại in ra \`false\`. Số âm không phải là palindrome.

**Ví dụ:**
\`\`\`
Input:
121

Output:
true
\`\`\``,
    io: {
      inputFormat: "Dòng 1: số nguyên x",
      outputFormat: "true hoặc false",
    },
    starterCode: {
      javascript:
`const x = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n')[0].trim();

// Viết code của bạn ở đây
`,
      python:
`import sys
x = sys.stdin.readline().strip()

# Viết code của bạn ở đây
`,
      cpp:
`#include <bits/stdc++.h>
using namespace std;

int main(){
    string x;
    getline(cin, x);

    // Viết code của bạn ở đây

    return 0;
}
`,
    },
    testCases: [
      { input: "121\n", expected: "true" },
      { input: "-121\n", expected: "false" },
      { input: "10\n", expected: "false" },
      { input: "0\n", expected: "true" },
      { input: "12321\n", expected: "true" },
    ],
  },
  {
    id: 6,
    title: "Binary Search",
    difficulty: "Easy",
    tags: ["Array", "Binary Search"],
    description: `Cho một dòng số nguyên \`nums\` đã sắp xếp tăng dần và một số \`target\` ở dòng
thứ hai, in ra chỉ số của \`target\` trong mảng (đếm từ 0), hoặc \`-1\` nếu không tìm thấy.
Yêu cầu độ phức tạp O(log n).

**Ví dụ:**
\`\`\`
Input:
-1 0 3 5 9 12
9

Output:
4
\`\`\``,
    io: {
      inputFormat: "Dòng 1: nums (cách nhau bởi dấu cách) — Dòng 2: target",
      outputFormat: "Một số nguyên: chỉ số tìm được, hoặc -1",
    },
    starterCode: {
      javascript:
`const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');
const nums = lines[0].trim() ? lines[0].trim().split(/\\s+/).map(Number) : [];
const target = parseInt(lines[1]);

// Viết code của bạn ở đây
`,
      python:
`import sys
data = sys.stdin.read().split('\\n')
nums = list(map(int, data[0].split())) if data[0].strip() else []
target = int(data[1])

# Viết code của bạn ở đây
`,
      cpp:
`#include <bits/stdc++.h>
using namespace std;

int main(){
    string line1;
    getline(cin, line1);
    stringstream ss(line1);
    vector<int> nums;
    int x;
    while (ss >> x) nums.push_back(x);
    int target;
    cin >> target;

    // Viết code của bạn ở đây

    return 0;
}
`,
    },
    testCases: [
      { input: "-1 0 3 5 9 12\n9\n", expected: "4" },
      { input: "-1 0 3 5 9 12\n2\n", expected: "-1" },
      { input: "5\n5\n", expected: "0" },
      { input: "\n1\n", expected: "-1" },
    ],
  },
];
