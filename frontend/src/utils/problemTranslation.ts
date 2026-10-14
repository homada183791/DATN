/**
 * Helper dịch song ngữ cho đề bài (English <-> Tiếng Việt)
 * Đảm bảo khi người dùng chuyển đổi ngôn ngữ trên giao diện,
 * tiêu đề và nội dung bài toán được hiển thị phù hợp.
 */

// Từ điển dịch tiêu đề các bài toán thuật toán phổ biến
const TITLE_TRANSLATIONS: Record<string, string> = {
  'Two Sum': 'Tổng hai số',
  'Add Two Numbers': 'Cộng hai số lớn (Danh sách liên kết)',
  'Longest Substring Without Repeating Characters': 'Chuỗi con dài nhất không lặp ký tự',
  'Median of Two Sorted Arrays': 'Trung vị của hai mảng đã sắp xếp',
  'Longest Palindromic Substring': 'Chuỗi đối xứng dài nhất',
  'Zigzag Conversion': 'Chuyển đổi chuỗi Zigzag',
  'Reverse Integer': 'Đảo ngược số nguyên',
  'String to Integer (atoi)': 'Chuyển đổi chuỗi sang số nguyên (atoi)',
  'Palindrome Number': 'Số đối xứng (Palindrome)',
  'Regular Expression Matching': 'Khớp biểu thức chính quy (Regex)',
  'Container With Most Water': 'Thùng chứa nhiều nước nhất',
  'Integer to Roman': 'Chuyển đổi số nguyên sang số La Mã',
  'Roman to Integer': 'Chuyển đổi số La Mã sang số nguyên',
  'Longest Common Prefix': 'Tiền tố chung dài nhất',
  '3Sum': 'Bộ ba số có tổng bằng 0 (3Sum)',
  '3Sum Closest': 'Bộ ba số có tổng gần nhất (3Sum Closest)',
  'Letter Combinations of a Phone Number': 'Tổ hợp chữ cái của bàn phím điện thoại',
  '4Sum': 'Bộ bốn số có tổng bằng Target (4Sum)',
  'Remove Nth Node From End of List': 'Xóa nút thứ N từ cuối danh sách liên kết',
  'Valid Parentheses': 'Kiểm tra dấu ngoặc hợp lệ',
  'Merge Two Sorted Lists': 'Hợp nhất hai danh sách đã sắp xếp',
  'Generate Parentheses': 'Sinh các chuỗi ngoặc hợp lệ',
  'Merge k Sorted Lists': 'Hợp nhất K danh sách liên kết đã sắp xếp',
  'Swap Nodes in Pairs': 'Đổi chỗ từng cặp nút trong danh sách liên kết',
  'Reverse Nodes in k-Group': 'Đảo ngược danh sách liên kết theo nhóm K nút',
  'Remove Duplicates from Sorted Array': 'Xóa phần tử trùng lặp trong mảng đã sắp xếp',
  'Remove Element': 'Xóa phần tử khỏi mảng',
  'Find the Index of the First Occurrence in a String': 'Tìm vị trí xuất hiện đầu tiên của chuỗi con',
  'Divide Two Integers': 'Chia hai số nguyên không dùng phép nhân chia',
  'Substring with Concatenation of All Words': 'Chuỗi con chứa tất cả các từ',
  'Next Permutation': 'Hoán vị kế tiếp',
  'Longest Valid Parentheses': 'Chuỗi ngoặc hợp lệ dài nhất',
  'Search in Rotated Sorted Array': 'Tìm kiếm trong mảng đã sắp xếp bị xoay',
  'Find First and Last Position of Element in Sorted Array': 'Tìm vị trí đầu và cuối của phần tử trong mảng',
  'Search Insert Position': 'Tìm vị trí chèn phần tử',
  'Valid Sudoku': 'Kiểm tra bảng Sudoku hợp lệ',
  'Sudoku Solver': 'Giải bài toán Sudoku',
  'Count and Say': 'Đếm và đọc chuỗi',
  'Combination Sum': 'Tổ hợp có tổng bằng Target',
  'Combination Sum II': 'Tổ hợp có tổng bằng Target II (Không trùng lặp)',
  'First Missing Positive': 'Số nguyên dương nhỏ nhất còn thiếu',
  'Trapping Rain Water': 'Hứng nước mưa (Trapping Rain Water)',
  'Multiply Strings': 'Nhân hai chuỗi số nguyên lớn',
  'Wildcard Matching': 'Khớp chuỗi với ký tự đại diện (*, ?)',
  'Jump Game': 'Trò chơi nhảy vị trí (Jump Game)',
  'Jump Game II': 'Trò chơi nhảy vị trí II (Số bước nhảy tối thiểu)',
  'Permutations': 'Liệt kê tất cả hoán vị',
  'Permutations II': 'Hoán vị có phần tử trùng lặp',
  'Rotate Image': 'Xoay ma trận hình ảnh 90 độ',
  'Group Anagrams': 'Nhóm các từ đảo chữ (Anagrams)',
  'Pow(x, n)': 'Tính lũy thừa Pow(x, n)',
  'N-Queens': 'Bài toán xếp N quân Hậu',
  'N-Queens II': 'Đếm số cách xếp N quân Hậu',
  'Maximum Subarray': 'Mảng con có tổng lớn nhất (Thuật toán Kadane)',
  'Spiral Matrix': 'Duyệt ma trận theo hình xoắn ốc',
  'Spiral Matrix II': 'Tạo ma trận xoắn ốc II',
  'Permutation Sequence': 'Tìm hoán vị thứ K',
  'Rotate List': 'Xoay danh sách liên kết',
  'Unique Paths': 'Đếm số đường đi duy nhất trên lưới',
  'Unique Paths II': 'Đường đi duy nhất trên lưới có chướng ngại vật',
  'Minimum Path Sum': 'Đường đi có tổng chi phí nhỏ nhất',
  'Valid Number': 'Kiểm tra chuỗi số hợp lệ',
  'Plus One': 'Cộng thêm một vào mảng chữ số',
  'Add Binary': 'Cộng hai chuỗi nhị phân',
  'Text Justification': 'Căn đều hai bên văn bản',
  'Sqrt(x)': 'Tính căn bậc hai của x',
  'Climbing Stairs': 'Bài toán leo cầu thang (Fibonacci)',
  'Simplify Path': 'Đơn giản hóa đường dẫn hệ điều hành',
  'Edit Distance': 'Khoảng cách chỉnh sửa chuỗi (Levenshtein Distance)',
  'Set Matrix Zeroes': 'Thiết lập số 0 cho hàng và cột trong ma trận',
  'Search a 2D Matrix': 'Tìm kiếm trong ma trận 2D đã sắp xếp',
  'Sort Colors': 'Sắp xếp ba màu (Bài toán lá cờ Hà Lan)',
  'Minimum Window Substring': 'Chuỗi con nhỏ nhất chứa toàn bộ ký tự',
  'Combinations': 'Liệt kê các tổ hợp chập K của N',
  'Subsets': 'Liệt kê tất cả tập con (Power Set)',
  'Word Search': 'Tìm kiếm từ trong ma trận chữ',
  'Remove Duplicates from Sorted Array II': 'Xóa phần tử trùng lặp II (Tối đa 2 lần)',
  'Search in Rotated Sorted Array II': 'Tìm kiếm trong mảng xoay có phần tử trùng',
  'Remove Duplicates from Sorted List': 'Xóa nút trùng lặp trong danh sách liên kết',
  'Remove Duplicates from Sorted List II': 'Xóa tất cả các nút bị trùng lặp',
  'Largest Rectangle in Histogram': 'Hình chữ nhật lớn nhất trong biểu đồ cột',
  'Maximal Rectangle': 'Hình chữ nhật lớn nhất toàn số 1 trong ma trận',
  'Partition List': 'Phân vùng danh sách liên kết quanh giá trị X',
  'Scramble String': 'Kiểm tra chuỗi bị xáo trộn',
  'Merge Sorted Array': 'Hợp nhất hai mảng đã sắp xếp tại chỗ',
  'Gray Code': 'Sinh mã Gray',
  'Subsets II': 'Tập con của tập hợp có phần tử trùng lặp',
  'Decode Ways': 'Đếm số cách giải mã chuỗi số',
  'Reverse Linked List II': 'Đảo ngược danh sách liên kết từ vị trí M đến N',
  'Restore IP Addresses': 'Khôi phục địa chỉ IP hợp lệ',
  'Binary Tree Inorder Traversal': 'Duyệt cây nhị phân theo thứ tự giữa (Inorder)',
  'Unique Binary Search Trees II': 'Sinh tất cả cây tìm kiếm nhị phân duy nhất',
  'Unique Binary Search Trees': 'Đếm số cây tìm kiếm nhị phân (Số Catalan)',
  'Interleaving String': 'Kiểm tra chuỗi xen kẽ',
  'Validate Binary Search Tree': 'Kiểm tra cây tìm kiếm nhị phân (BST) hợp lệ',
  'Recover Binary Search Tree': 'Khôi phục cây tìm kiếm nhị phân bị tráo đổi nút',
  'Same Tree': 'Kiểm tra hai cây nhị phân giống nhau',
  'Symmetric Tree': 'Kiểm tra cây nhị phân đối xứng',
  'Binary Tree Level Order Traversal': 'Duyệt cây nhị phân theo từng tầng (BFS)',
  'Coin Change': 'Đổi tiền xu (Số đồng xu tối thiểu)',
  'Course Schedule': 'Lập lịch các khóa học (Phát hiện chu trình đồ thị)',
};

// Tạo từ điển đảo ngược để dịch ngược từ Tiếng Việt sang Tiếng Anh khi cần
const TITLE_TRANSLATIONS_REVERSE: Record<string, string> = Object.entries(TITLE_TRANSLATIONS).reduce(
  (acc, [en, vi]) => {
    acc[vi.trim().toLowerCase()] = en;
    // Bỏ phần chú thích trong ngoặc nếu có để match tốt hơn
    const plainVi = vi.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    if (plainVi && !acc[plainVi]) {
      acc[plainVi] = en;
    }
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Phân tích và trích xuất nội dung song ngữ [Tiếng Việt] và [English]
 * từ mô tả bài toán (chuẩn cấu trúc Hard_450.json / Medium / Custom upload).
 */
export function parseBilingualDescription(raw: string | undefined | null): {
  vi: string;
  en: string;
  isBilingual: boolean;
} {
  if (!raw) return { vi: '', en: '', isBilingual: false };

  // Nhận diện các thẻ phân tách ngôn ngữ
  const viHeaderRegex = /\[(?:Tiếng Việt|Vietnamese|VI)\]/i;
  const enHeaderRegex = /\[(?:English|Tiếng Anh|EN)\]/i;

  const viMatch = viHeaderRegex.exec(raw);
  const enMatch = enHeaderRegex.exec(raw);

  if (viMatch && enMatch) {
    if (viMatch.index < enMatch.index) {
      // Cấu trúc: [Tiếng Việt] ... ---------- ... [English] ...
      let viPart = raw.slice(viMatch.index + viMatch[0].length, enMatch.index);
      let enPart = raw.slice(enMatch.index + enMatch[0].length);

      // Làm sạch các dòng phân cách như ---------- hoặc ===
      viPart = viPart.replace(/\n\s*[-=_]{3,}\s*\n/g, '\n').trim();
      enPart = enPart.replace(/^\s*[-=_]{3,}\s*\n/g, '').trim();

      return { vi: viPart, en: enPart, isBilingual: true };
    } else {
      // Cấu trúc: [English] ... ---------- ... [Tiếng Việt] ...
      let enPart = raw.slice(enMatch.index + enMatch[0].length, viMatch.index);
      let viPart = raw.slice(viMatch.index + viMatch[0].length);

      enPart = enPart.replace(/\n\s*[-=_]{3,}\s*\n/g, '\n').trim();
      viPart = viPart.replace(/^\s*[-=_]{3,}\s*\n/g, '').trim();

      return { vi: viPart, en: enPart, isBilingual: true };
    }
  }

  // Kiểm tra comment HTML: <!-- vi --> ... <!-- en -->
  const htmlViMatch = /<!--\s*vi\s*-->([\s\S]*?)(?:<!--\s*en\s*-->|$)/i.exec(raw);
  const htmlEnMatch = /<!--\s*en\s*-->([\s\S]*?)(?:<!--\s*vi\s*-->|$)/i.exec(raw);
  if (htmlViMatch && htmlEnMatch) {
    return {
      vi: htmlViMatch[1].trim(),
      en: htmlEnMatch[1].trim(),
      isBilingual: true,
    };
  }

  return { vi: raw, en: raw, isBilingual: false };
}

/**
 * Trả về tiêu đề bài toán theo ngôn ngữ lựa chọn (VI hoặc EN)
 */
export function getLocalizedProblemTitle(title: string | undefined | null, lang: string): string {
  if (!title) return '';
  const isEn = (lang || 'vi').toLowerCase().startsWith('en');

  // Nếu giao diện chọn English (EN)
  if (isEn) {
    const key = title.trim().toLowerCase();
    if (TITLE_TRANSLATIONS_REVERSE[key]) {
      return TITLE_TRANSLATIONS_REVERSE[key];
    }
    return title;
  }

  // Nếu giao diện chọn Tiếng Việt (VI)
  if (TITLE_TRANSLATIONS[title]) {
    return TITLE_TRANSLATIONS[title];
  }

  // Dịch mẫu một số cấu trúc phổ biến
  let viTitle = title;
  const patterns: Array<[RegExp, string]> = [
    [/^Total Sum of (.*)/i, 'Tổng chi phí của $1'],
    [/^Count of (.*)/i, 'Đếm số lượng $1'],
    [/^Maximum (.*)/i, 'Giá trị lớn nhất của $1'],
    [/^Minimum (.*)/i, 'Giá trị nhỏ nhất của $1'],
    [/^Find (.*)/i, 'Tìm $1'],
    [/^Check if (.*)/i, 'Kiểm tra xem $1'],
    [/^Number of (.*)/i, 'Số lượng $1'],
    [/^Valid (.*)/i, 'Kiểm tra tính hợp lệ của $1'],
  ];

  for (const [regex, repl] of patterns) {
    if (regex.test(viTitle)) {
      viTitle = viTitle.replace(regex, repl);
      break;
    }
  }

  return viTitle;
}

/**
 * Dịch và trích xuất nội dung mô tả bài toán (Markdown) theo ngôn ngữ lựa chọn (VI hoặc EN).
 * - Nếu đề bài có cấu trúc song ngữ [Tiếng Việt] ... [English] (như Hard_450.json):
 *   -> Tự động trích xuất đúng phần Tiếng Việt hoặc Tiếng Anh tương ứng với ngôn ngữ UI.
 * - Nếu đề bài chỉ có 1 ngôn ngữ đơn:
 *   -> Tự động chuyển đổi các đề mục / từ khóa Markdown theo ngôn ngữ UI.
 */
export function getLocalizedProblemDescription(desc: string | undefined | null, lang: string): string {
  if (!desc) return '';
  const isEn = (lang || 'vi').toLowerCase().startsWith('en');

  // Bước 1: Kiểm tra xem đề bài có phần song ngữ [Tiếng Việt] và [English] không
  const bilingual = parseBilingualDescription(desc);
  if (bilingual.isBilingual) {
    return isEn ? bilingual.en : bilingual.vi;
  }

  // Bước 2: Nếu là tiếng Anh và không có bản song ngữ -> giữ nguyên bản gốc tiếng Anh
  if (isEn) {
    return desc;
  }

  // Bước 3: Nếu là tiếng Việt và đề gốc là tiếng Anh đơn ngữ -> dịch các thẻ Markdown & mẫu câu
  let localized = desc;

  // Dịch các tiêu đề đề mục chuẩn Markdown
  localized = localized.replace(/###?\s*Description/gi, '### Mô tả bài toán');
  localized = localized.replace(/###?\s*Problem Statement/gi, '### Đề bài');
  localized = localized.replace(/###?\s*Input\s*Format/gi, '### Định dạng đầu vào');
  localized = localized.replace(/###?\s*Input/gi, '### Đầu vào (Input)');
  localized = localized.replace(/###?\s*Output\s*Format/gi, '### Định dạng đầu ra');
  localized = localized.replace(/###?\s*Output/gi, '### Đầu ra (Output)');
  localized = localized.replace(/###?\s*Constraints/gi, '### Ràng buộc dữ liệu');
  localized = localized.replace(/###?\s*Example\s*(\d+):?/gi, '### Ví dụ $1:');
  localized = localized.replace(/###?\s*Examples?:?/gi, '### Ví dụ mẫu:');
  localized = localized.replace(/###?\s*Explanation:?/gi, '### Giải thích:');
  localized = localized.replace(/\*\*Input:\*\*/gi, '**Đầu vào:**');
  localized = localized.replace(/\*\*Output:\*\*/gi, '**Đầu ra:**');
  localized = localized.replace(/\*\*Explanation:\*\*/gi, '**Giải thích:**');
  localized = localized.replace(/\*\*Constraints:\*\*/gi, '**Ràng buộc:**');

  // Dịch các cụm từ hướng dẫn mẫu phổ biến
  localized = localized.replace(/Given an array of integers `nums`/gi, 'Cho một mảng các số nguyên `nums`');
  localized = localized.replace(/Given an array of integers/gi, 'Cho một mảng số nguyên');
  localized = localized.replace(/Given a string `s`/gi, 'Cho một chuỗi ký tự `s`');
  localized = localized.replace(/Given two integers `a` and `b`/gi, 'Cho hai số nguyên `a` và `b`');
  localized = localized.replace(/Given an integer `n`/gi, 'Cho một số nguyên `n`');
  localized = localized.replace(/return the sum of/gi, 'hãy trả về tổng của');
  localized = localized.replace(/return the maximum/gi, 'hãy trả về giá trị lớn nhất');
  localized = localized.replace(/return the minimum/gi, 'hãy trả về giá trị nhỏ nhất');
  localized = localized.replace(/return `true` if/gi, 'hãy trả về `true` nếu');
  localized = localized.replace(/otherwise return `false`/gi, 'ngược lại trả về `false`');

  return localized;
}
