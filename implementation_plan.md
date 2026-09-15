# Kế hoạch Kiểm thử & Sửa lỗi — JudgeHub

## Trạng thái sau Vùng 1 & Vùng 2

### Đã fix trong Vùng 1 (Auth)
| Commit | Nội dung |
|--------|---------|
| `f8f0d7e` | Fix login double-unwrap, thêm username field + login bằng username |
| `4618960` | Suppress toast "hết hạn" khi đang ở `/login` |
| `65a4d8b` | Thêm route `/instructor/submissions`, fix link Dashboard |

### Đã fix trong Vùng 2 (Classes)
| Commit | Nội dung |
|--------|---------|
| `d9d325b` | Thêm `semester` field, thêm `POST /classes/join-by-code` |
| `d2baba9` | Fix race condition join-via-link, confirm dialog kick SV |
| `a321bf6` | Fix flash login `/join/:code`, fix confirm rời lớp trong modal |

---

## Vùng 1 — Kết quả test

| ID | Mô tả | Kết quả |
|---|---|---|
| A1 | Đăng nhập đúng | PASS |
| A2 | Đăng nhập sai mật khẩu | PASS |
| A3 | Student vào `/instructor/*` | PASS |
| A4 | Instructor vào `/student/*` | PASS |
| A5 | Đăng xuất | PASS |
| A6 | Refresh khi đang login | PASS |
| A7 | Token hết hạn | PASS |

---

## Vùng 2 — Kết quả test

| ID | Mô tả | Kết quả | Ghi chú |
|---|---|---|---|
| C1 | Tạo lớp mới | PASS | |
| C2 | Danh sách lớp GV | PASS | [2-BUG-1] đã fix trong branch Vùng 3 |
| C3 | Chi tiết lớp | PASS | |
| C4 | Xóa lớp | PASS | |
| C5 | Kick sinh viên | PASS | |
| C6 | Mã mời | PASS | |
| C7 | Join bằng mã | PASS | |
| C8 | Join lớp đã tham gia | PASS | |
| C9 | Join sai mã | PASS | |
| C10 | Rời lớp | PASS | |
| C11 | Link `/join/:code` | PASS | |

### Bugs còn sót lại Vùng 2

> [!WARNING]
> Các vấn đề sau chưa được fix

**[2-BUG-1] ClassContext.tsx:75 — `myClasses` lọc sai**

```typescript
// SAI: fullName = username (phần trước @), không match email
return allClasses.filter((c) => c.instructor === user.email || c.instructor === user.fullName);
// SỬA:
return allClasses.filter((c) => c.instructor === user.email);
```

**[2-BUG-2] ClassContext.tsx:121 — biến `cls` thừa (unused)**

```typescript
// Dòng 121: khai báo nhưng không dùng — xóa đi
const cls = allClasses.find((c) => c.id === result?.class_id);
```

**[2-BUG-3] ClassContext.tsx:55-56 — `homeworkCount`/`contestCount` hardcode = 0**

Cần BE include count → fix phức tạp, để sau.

---

## Vùng 3: Bài tập về nhà

### Branch: `fix/homework-zone3-bugs` (commit `1c83cbd`) ✅ HOÀN THÀNH

| ID | Mô tả | Kết quả UI | Kết quả Code | Trạng thái |
|---|---|---|---|---|
| H1 | GV tạo bài tập | PASS | ⚠️ Deadline ISO UTC | ✅ ĐÃ FIX |
| H2 | Validate FE | PASS | ✅ | PASS |
| H3 | BE lỗi → modal giữ | PASS | ✅ | PASS |
| H4 | Sửa bài tập | BUG (-7h drift) | ⚠️ ISO→datetime-local sai | ✅ ĐÃ FIX |
| H5 | Xóa bài tập | PASS | ⚠️ delete không await | ✅ ĐÃ FIX |
| H6 | Deadline/Status | PASS | ⚠️ upcoming luôn = 0 | Giữ (design) |
| H-GV-VIEW | Modal xem chi tiết | PASS | ✅ | PASS |
| H-GV-FILTER | Filter theo lớp | PASS | ✅ | PASS |
| H7 | SV chỉ thấy bài lớp mình | PASS | ✅ Double filter BE+FE | PASS |
| H8 | SV xem bài toán + Play | Play không hoạt động | ⚠️ Link chung /problems | Feature gap — sau |
| H-SV-SEARCH | Search (student/problems) | CRASH trang trắng | `description` null → crash | ✅ ĐÃ FIX |
| H-AUTH-2 | SV không thấy nút quản lý | PASS | ✅ | PASS |
| BE-1 | Ownership PATCH | — | ❌ Không check | ✅ ĐÃ FIX |
| BE-2 | Ownership DELETE | — | ❌ Không check | ✅ ĐÃ FIX |

### Fixes áp dụng (commit `1c83cbd`)

| File | Fix |
|---|---|
| `frontend/src/utils/dateTime.ts` | **[NEW]** Utility timezone UTC+7 toàn app |
| `HomeworkContext.tsx` | Dùng `datetimeLocalToISO()` → fix drift -7h |
| `instructor/Homework.tsx` | `toDatetimeLocal()` cho form edit; `formatVN()` hiển thị |
| `student/Homework.tsx` | `formatVN()` cho deadline display |
| `student/ProblemList.tsx` | Null-guard `description ?? ''` → fix crash |
| `homeworks.service.ts` | `update()` và `remove()` check ownership |
| `homeworks.controller.ts` | Truyền `userId` vào service |
| `ClassContext.tsx` | Fix [2-BUG-1] + [2-BUG-2] |

### Còn lại chưa fix

- **[3-LATER-1]** H8: Nút Play cần design về homework task submission
- **[3-LATER-2]** H6-A: `upcoming` status cần `start_time` field

---

## Vùng 4: Kỳ thi

### Fix trước khi test

**[4-FIX-1] BE — `leaderboard.service.ts` response thiếu fields FE cần**

Backend trả: `{ user_id, email, solved, penalty }`
FE expect: `{ rank, username, fullName, solvedCount, rating }`

Sửa `leaderboard.service.ts` dòng 146:
```typescript
const result = leaderboard.map((stat, index) => ({
  rank: index + 1,
  user_id: stat.user_id,
  username: stat.email.split('@')[0],
  fullName: stat.email.split('@')[0],
  email: stat.email,
  solvedCount: stat.solved,
  solved: stat.solved,
  penalty: stat.penalty,
  rating: 0,
}));
```

Sửa `api/contests.ts` — cập nhật `LeaderboardEntryDto`:
```typescript
export interface LeaderboardEntryDto {
  rank: number;
  username: string;
  fullName: string;
  solvedCount: number;
  penalty?: number;
  rating: number;
}
```

**[4-FIX-2] FE — `api/contests.ts` hardcode `participantCount=0`, `problemCount=0`, `type='ICPC'`**

Bổ sung `_count` trong `ContestsService.findAll()`.

**[4-FIX-3] FE — `student/Class.tsx` dùng `legacyData.contests` (mock) trong modal lớp**

Thay bằng `useContestsQuery()` + filter theo `classId`.

**[4-FIX-4] FE — `instructor/Contest.tsx:269` nút "Xem bài" không có onClick**

Thêm navigation hoặc modal bài toán của kỳ thi.

| ID | Mô tả | Fix | Kỳ vọng |
|---|---|---|---|
| K1 | GV tạo kỳ thi | — | Xuất hiện trong danh sách |
| K2 | Status đúng | — | Thời gian thực phản ánh đúng |
| K3 | Thêm bài vào kỳ thi | — | API thành công |
| K4 | Xóa kỳ thi | — | Kỳ thi biến mất |
| K5 | Xem leaderboard | **[4-FIX-1]** | Hiển thị đúng ranking |
| K6 | Leaderboard real-time | — | Socket → reload |
| K7 | SV nộp trong kỳ thi | — | Chấm bình thường |
| K8 | Nộp khi chưa bắt đầu | — | Lỗi 400 |
| K9 | Nộp sau khi kết thúc | — | Lỗi 400 |

---

## Vùng 5: Submissions

### Fix trước khi test

**[5-FIX-1] FE — `student/Dashboard.tsx:40` verdict không map đúng**

```typescript
// Sửa map verdict
const STATUS_MAP: Record<string, string> = {
  ACCEPTED: 'AC', WRONG_ANSWER: 'WA', TIME_LIMIT_EXCEEDED: 'TLE',
  COMPILE_ERROR: 'CE', RUNTIME_ERROR: 'RTE', PENDING: 'PENDING', IN_QUEUE: 'PENDING',
};
verdict: STATUS_MAP[submission.status] ?? submission.status,
```

**[5-FIX-2] FE — `ProblemSolve.tsx` Run Samples là mock, không gọi API**

BE đã có `POST /api/v1/submissions/run-custom` + Socket.io `custom_run_<session_id>`.
→ Feature lớn, thực hiện sau khi test S1-S9.

**[5-FIX-3] BE — `submissions.service.ts:229` `runCustomCode` thiếu `async`**

```typescript
// Sửa
async runCustomCode(userId: string, dto: RunCustomCodeDto) {
```

| ID | Mô tả | Fix | Kỳ vọng |
|---|---|---|---|
| S1 | AC | — | Verdict "AC", progress 100% |
| S2 | WA | **[5-FIX-1]** | Verdict "WA", màu đỏ |
| S3 | TLE | **[5-FIX-1]** | Verdict "TLE" |
| S4 | RTE | **[5-FIX-1]** | Verdict "RTE" |
| S5 | CE | **[5-FIX-1]** | Verdict "CE" |
| S6 | Watchdog 60s | — | Toast sau 60s |
| S7 | Run Custom Code | **[5-FIX-2]+[5-FIX-3]** | Output trong console |
| S8 | GV xem tất cả | — | Thấy tất cả |
| S9 | SV chỉ thấy của mình | — | Filter đúng |
| S10 | Xem code submission | — | Modal hiện code |
| S11 | Filter verdict | — | Lọc đúng |
| S12 | Tỷ lệ AC Dashboard GV | — | Tính đúng |

---

## Vùng 6: Dashboard

### Fix trước khi test

**[6-FIX-1] BE — `/auth/profile` không trả `username`**

Hiện trả `{ userId, email, role }`. FE hiển thị `fullName = phần trước @`.
Sửa auth controller → include `username` từ DB.

| ID | Mô tả | Fix | Kỳ vọng |
|---|---|---|---|
| D1 | Tổng SV GV | — | Tổng đúng |
| D2 | Bài đang mở | — | Chỉ bài chưa hết hạn |
| D3 | Kỳ thi đang chạy | — | Đúng thời gian thực |
| D4 | Tỷ lệ AC GV | — | Đúng |
| D5 | Card lớp học GV | **[2-BUG-1]** | Chỉ lớp của mình |
| D6 | Bài nộp gần đây GV | — | Đúng username, verdict |
| D7 | Link "Xem tất cả" | Đã fix `65a4d8b` | Không 403 |
| D8 | Hạn chót sắp tới | — | Danh sách bài chưa hết hạn |
| D9 | Lớp đã tham gia SV | — | Đúng |
| D10 | Xin chào `fullName` | **[6-FIX-1]** | Tên đúng |

---

## Vùng 7: Problems

**[7-FIX-1] FE — `ProblemSolve.tsx` — `detail` từ mock data**

`templates`, `samples`, `successPattern` từ `problemDetails.ts`.
→ `samples` nên lấy từ `apiProblem.test_cases` (visible cases).

| ID | Mô tả | Fix | Kỳ vọng |
|---|---|---|---|
| P1 | Danh sách bài | — | Đủ title, difficulty |
| P2 | Tìm kiếm | — | Lọc đúng |
| P3 | Vào bài cụ thể | — | Đầy đủ đề bài |
| P4 | Markdown render | — | Render đúng |

---

## Vùng 8: Hồ sơ

| ID | Mô tả | Fix | Kỳ vọng |
|---|---|---|---|
| U1 | Xem hồ sơ | **[6-FIX-1]** | Tên, email, role đúng |
| U2 | Heatmap | Cần kiểm tra BE | Ô ngày có submission đậm hơn |

---

## Vùng 9: Edge Cases

| ID | Mô tả | Fix |
|---|---|---|
| E1 | Mất mạng | — (đã có handler) |
| E2 | Backend > 15s | — (timeout 15s có sẵn) |
| E3 | 2 tab khác nhau | — |
| E4 | Đổi tài khoản | — (queryClient.clear()) |
| E5 | Nhiều 401 | Đã fix `4618960` |
| E6 | Empty state | — |
| E7 | Dữ liệu lớn | — |

---

## Thứ tự thực hiện đề xuất

```
DONE  Vùng 1 — Auth
DONE  Vùng 2 — Classes
DONE  Vùng 3 — Homework (branch: fix/homework-zone3-bugs ✅)
        ✅ Timezone UTC+7 global utility
        ✅ Deadline drift -7h fix  
        ✅ openEdit deadline parse đúng
        ✅ delete await + error handling
        ✅ BE ownership check update/delete
        ✅ ProblemList crash null description
        ⏳ H8 Play button (design decision)
        ⏳ H6 upcoming filter (design decision)

NEXT  Fix [5-FIX-1] student/Dashboard verdict map
      Fix [5-FIX-3] submissions.service async
      Fix [4-FIX-1] leaderboard format BE+FE
      Fix [4-FIX-2] contests count fields
      Fix [4-FIX-3] student/Class contests từ API
      Test Vùng 4
      Test Vùng 5 (S1-S9, S7 sau)
      Fix [6-FIX-1] profile trả username
      Test Vùng 6, 7, 8, 9
      Fix [5-FIX-2] Run Custom Code (feature lớn)
```

---

## Open Questions

> [!IMPORTANT]
> 1. Leaderboard `fullName`: dùng phần username của email hay hiển thị cả email?
> 2. `homeworkCount`/`contestCount`: có cần BE trả count không?
> 3. Run Custom Code (S7): triển khai ngay hay để cuối?
> 4. `/auth/profile`: thêm `username` DB hay dùng email split làm displayName?
