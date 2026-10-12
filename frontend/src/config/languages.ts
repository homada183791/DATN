export interface LanguageVersionConfig {
  id: string; // e.g. 'CPP17', 'CPP20', 'PYTHON3_11'
  name: string; // e.g. 'C++17', 'Python 3.11'
  category: 'CPP' | 'C' | 'PYTHON' | 'JAVA' | 'GO' | 'NODE';
  categoryLabel: string;
  compiler: string;
  description: string;
  extension: string;
  monacoLang: string;
  badgeColor: string;
  template: string;
}

export const SUPPORTED_LANGUAGES: LanguageVersionConfig[] = [
  // C++
  {
    id: 'CPP11',
    name: 'C++11',
    category: 'CPP',
    categoryLabel: 'C++',
    compiler: 'GCC 5.4 (-std=c++11)',
    description: 'Chuẩn ISO C++11 (auto, lambda, nullptr, move semantics)',
    extension: '.cpp',
    monacoLang: 'cpp',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    template: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // TODO: Đọc dữ liệu và giải thuật toán tại đây

    return 0;
}
`,
  },
  {
    id: 'CPP14',
    name: 'C++14',
    category: 'CPP',
    categoryLabel: 'C++',
    compiler: 'GCC 9.3 (-std=c++14)',
    description: 'Chuẩn ISO C++14 (generic lambdas, return type deduction)',
    extension: '.cpp',
    monacoLang: 'cpp',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    template: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // TODO: Đọc dữ liệu và giải thuật toán tại đây

    return 0;
}
`,
  },
  {
    id: 'CPP17',
    name: 'C++17',
    category: 'CPP',
    categoryLabel: 'C++',
    compiler: 'GCC 11.2 (-std=c++17)',
    description: 'Chuẩn ISO C++17 tiêu chuẩn trong thi đấu (structured binding, <bits/stdc++.h>)',
    extension: '.cpp',
    monacoLang: 'cpp',
    badgeColor: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // TODO: Đọc dữ liệu và giải thuật toán tại đây

    return 0;
}
`,
  },
  {
    id: 'CPP20',
    name: 'C++20',
    category: 'CPP',
    categoryLabel: 'C++',
    compiler: 'GCC 13.2 (-std=c++20)',
    description: 'Chuẩn ISO C++20 hiện đại (ranges, concepts, coroutines, format)',
    extension: '.cpp',
    monacoLang: 'cpp',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // TODO: Đọc dữ liệu và giải thuật toán tại đây

    return 0;
}
`,
  },

  // C
  {
    id: 'C99',
    name: 'C99',
    category: 'C',
    categoryLabel: 'C',
    compiler: 'GCC 9.3 (-std=c99)',
    description: 'Chuẩn ISO/IEC 9899:1999 (khai báo biến linh hoạt, kiểu bool)',
    extension: '.c',
    monacoLang: 'c',
    badgeColor: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    template: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // TODO: Đọc dữ liệu và giải thuật toán tại đây

    return 0;
}
`,
  },
  {
    id: 'C11',
    name: 'C11',
    category: 'C',
    categoryLabel: 'C',
    compiler: 'GCC 11.2 (-std=c11)',
    description: 'Chuẩn ISO/IEC 9899:2011 (generic selections, static assertions)',
    extension: '.c',
    monacoLang: 'c',
    badgeColor: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    template: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // TODO: Đọc dữ liệu và giải thuật toán tại đây

    return 0;
}
`,
  },

  // Python
  {
    id: 'PYTHON3_8',
    name: 'Python 3.8',
    category: 'PYTHON',
    categoryLabel: 'Python',
    compiler: 'CPython 3.8',
    description: 'Python 3.8 ổn định (toán tử gán Walrus :=)',
    extension: '.py',
    monacoLang: 'python',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    template: `import sys

def main():
    input = sys.stdin.readline
    # TODO: Đọc dữ liệu và giải thuật toán tại đây

if __name__ == '__main__':
    main()
`,
  },
  {
    id: 'PYTHON3_10',
    name: 'Python 3.10',
    category: 'PYTHON',
    categoryLabel: 'Python',
    compiler: 'CPython 3.10',
    description: 'Python 3.10 hỗ trợ pattern matching (match/case)',
    extension: '.py',
    monacoLang: 'python',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    template: `import sys

def main():
    input = sys.stdin.readline
    # TODO: Đọc dữ liệu và giải thuật toán tại đây

if __name__ == '__main__':
    main()
`,
  },
  {
    id: 'PYTHON3_11',
    name: 'Python 3.11',
    category: 'PYTHON',
    categoryLabel: 'Python',
    compiler: 'CPython 3.11 (Nhanh hơn ~25%)',
    description: 'Phiên bản phổ biến tối ưu trong giải thuật toán',
    extension: '.py',
    monacoLang: 'python',
    badgeColor: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    template: `import sys

def main():
    input = sys.stdin.readline
    # TODO: Đọc dữ liệu và giải thuật toán tại đây

if __name__ == '__main__':
    main()
`,
  },
  {
    id: 'PYTHON3_12',
    name: 'Python 3.12',
    category: 'PYTHON',
    categoryLabel: 'Python',
    compiler: 'CPython 3.12 (Mới nhất)',
    description: 'Python 3.12 với f-string nâng cao và cú pháp generic mới',
    extension: '.py',
    monacoLang: 'python',
    badgeColor: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    template: `import sys

def main():
    input = sys.stdin.readline
    # TODO: Đọc dữ liệu và giải thuật toán tại đây

if __name__ == '__main__':
    main()
`,
  },
  {
    id: 'PYPY3',
    name: 'PyPy 3.10',
    category: 'PYTHON',
    categoryLabel: 'Python',
    compiler: 'PyPy 7.3 JIT',
    description: 'JIT Compiler tối ưu siêu tốc cho bài giải thuật Python (3-10x tốc độ)',
    extension: '.py',
    monacoLang: 'python',
    badgeColor: 'bg-green-500/10 text-green-600 border-green-500/20',
    template: `import sys

def main():
    input = sys.stdin.readline
    # TODO: Đọc dữ liệu và giải thuật toán tại đây

if __name__ == '__main__':
    main()
`,
  },

  // Java
  {
    id: 'JAVA8',
    name: 'Java 8',
    category: 'JAVA',
    categoryLabel: 'Java',
    compiler: 'OpenJDK 1.8',
    description: 'Java 8 truyền thống, độ ổn định và tương thích cao',
    extension: '.java',
    monacoLang: 'java',
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    template: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // TODO: Đọc dữ liệu và giải thuật toán tại đây
    }
}
`,
  },
  {
    id: 'JAVA11',
    name: 'Java 11 LTS',
    category: 'JAVA',
    categoryLabel: 'Java',
    compiler: 'OpenJDK 11 LTS',
    description: 'Bản Long Term Support, hỗ trợ cú pháp var, String methods mới',
    extension: '.java',
    monacoLang: 'java',
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    template: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // TODO: Đọc dữ liệu và giải thuật toán tại đây
    }
}
`,
  },
  {
    id: 'JAVA17',
    name: 'Java 17 LTS',
    category: 'JAVA',
    categoryLabel: 'Java',
    compiler: 'OpenJDK 17 LTS',
    description: 'Bản LTS phổ biến: Records, Pattern matching, Sealed classes',
    extension: '.java',
    monacoLang: 'java',
    badgeColor: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    template: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // TODO: Đọc dữ liệu và giải thuật toán tại đây
    }
}
`,
  },
  {
    id: 'JAVA21',
    name: 'Java 21 LTS',
    category: 'JAVA',
    categoryLabel: 'Java',
    compiler: 'OpenJDK 21 LTS',
    description: 'Bản LTS hiện đại nhất: Virtual Threads, Sequenced Collections',
    extension: '.java',
    monacoLang: 'java',
    badgeColor: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    template: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // TODO: Đọc dữ liệu và giải thuật toán tại đây
    }
}
`,
  },

  // Go
  {
    id: 'GO1_20',
    name: 'Go 1.20',
    category: 'GO',
    categoryLabel: 'Go',
    compiler: 'Go 1.20',
    description: 'Golang 1.20 (Generics, Slice pointer)',
    extension: '.go',
    monacoLang: 'go',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    template: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    _ = reader
    // TODO: Đọc dữ liệu và giải thuật toán tại đây
    fmt.Println("")
}
`,
  },
  {
    id: 'GO1_22',
    name: 'Go 1.22',
    category: 'GO',
    categoryLabel: 'Go',
    compiler: 'Go 1.22',
    description: 'Golang 1.22 với vòng lặp for range integer và runtime cải tiến',
    extension: '.go',
    monacoLang: 'go',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    template: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    _ = reader
    // TODO: Đọc dữ liệu và giải thuật toán tại đây
    fmt.Println("")
}
`,
  },

  // JavaScript / Node.js
  {
    id: 'NODE18',
    name: 'Node.js 18 LTS',
    category: 'NODE',
    categoryLabel: 'JavaScript / Node.js',
    compiler: 'Node.js v18.x LTS (V8 Engine)',
    description: 'JavaScript ES2022 trên nền Node 18',
    extension: '.js',
    monacoLang: 'javascript',
    badgeColor: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    template: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    // TODO: Đọc dữ liệu và giải thuật toán tại đây
}

main();
`,
  },
  {
    id: 'NODE20',
    name: 'Node.js 20 LTS',
    category: 'NODE',
    categoryLabel: 'JavaScript / Node.js',
    compiler: 'Node.js v20.x LTS',
    description: 'JavaScript ES2023 hiện đại, tối ưu tốc độ V8',
    extension: '.js',
    monacoLang: 'javascript',
    badgeColor: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    template: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    // TODO: Đọc dữ liệu và giải thuật toán tại đây
}

main();
`,
  },
];

export const LANGUAGE_CATEGORIES = [
  { key: 'CPP', label: 'C++', icon: '🔵', desc: 'C++11, C++14, C++17, C++20' },
  { key: 'PYTHON', label: 'Python', icon: '🐍', desc: 'Python 3.8, 3.10, 3.11, 3.12, PyPy 3.10' },
  { key: 'JAVA', label: 'Java', icon: '☕', desc: 'Java 8, 11, 17, 21 LTS' },
  { key: 'C', label: 'C', icon: '⚙️', desc: 'C99, C11' },
  { key: 'GO', label: 'Go', icon: '🦫', desc: 'Go 1.20, Go 1.22' },
  { key: 'NODE', label: 'Node.js', icon: '🌐', desc: 'Node.js 18, 20 LTS' },
] as const;

export function getLanguageConfig(idOrCategory: string): LanguageVersionConfig {
  const upper = (idOrCategory || 'CPP17').toUpperCase();
  const direct = SUPPORTED_LANGUAGES.find((l) => l.id.toUpperCase() === upper);
  if (direct) return direct;

  // Fallbacks:
  if (upper === 'CPP') return SUPPORTED_LANGUAGES.find((l) => l.id === 'CPP17')!;
  if (upper === 'PYTHON' || upper === 'PY') return SUPPORTED_LANGUAGES.find((l) => l.id === 'PYTHON3_11')!;
  if (upper === 'JAVA') return SUPPORTED_LANGUAGES.find((l) => l.id === 'JAVA21')!;
  if (upper === 'C') return SUPPORTED_LANGUAGES.find((l) => l.id === 'C11')!;
  if (upper === 'GO') return SUPPORTED_LANGUAGES.find((l) => l.id === 'GO1_22')!;
  if (upper === 'NODE' || upper === 'JS' || upper === 'JAVASCRIPT') return SUPPORTED_LANGUAGES.find((l) => l.id === 'NODE20')!;

  return SUPPORTED_LANGUAGES[2]; // Default C++17
}

export function getAllowedLanguagesList(allowed?: string[]): LanguageVersionConfig[] {
  if (!allowed || allowed.length === 0) {
    return SUPPORTED_LANGUAGES;
  }
  const set = new Set(allowed.map((s) => s.toUpperCase()));
  return SUPPORTED_LANGUAGES.filter(
    (l) => set.has(l.id.toUpperCase()) || set.has(l.category.toUpperCase()),
  );
}

export function mapVersionToApi(id: string): {
  language: 'C' | 'CPP' | 'PYTHON' | 'GO' | 'JAVA' | 'NODE';
  language_version: string;
} {
  const cfg = getLanguageConfig(id);
  return {
    language: cfg.category,
    language_version: cfg.id,
  };
}
