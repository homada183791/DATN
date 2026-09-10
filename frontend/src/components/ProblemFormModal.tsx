import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { CreateProblemDto, ProblemDifficulty, ProblemDto } from '../api/problems';

interface ProblemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProblemDto) => void;
  initialData?: ProblemDto | null;
  isLoading?: boolean;
}

export default function ProblemFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading
}: ProblemFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>('EASY');
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [testCases, setTestCases] = useState<CreateProblemDto['test_cases']>([]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setDifficulty(initialData.difficulty);
      setTimeLimit(initialData.time_limit);
      setMemoryLimit(initialData.memory_limit);
      setTestCases(
        initialData.test_cases?.map((tc) => ({
          input: tc.input,
          expected_output: tc.expected_output,
          is_hidden: tc.is_hidden,
        })) ?? []
      );
    } else {
      setTitle('');
      setDescription('');
      setDifficulty('EASY');
      setTimeLimit(1000);
      setMemoryLimit(256);
      setTestCases([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      difficulty,
      time_limit: timeLimit,
      memory_limit: memoryLimit,
      test_cases: testCases,
    });
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expected_output: '', is_hidden: false }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof CreateProblemDto['test_cases'][0], value: any) => {
    const newTestCases = [...testCases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setTestCases(newTestCases);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#fdfbf7] shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5dac9] bg-[#fdfbf7] px-6 py-4">
          <h2 className="font-serif text-2xl font-bold text-[#191919]">
            {initialData ? 'Cập nhật bài tập' : 'Tạo bài tập mới'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-[#8a8073] hover:bg-[#f0ebd9] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#191919] mb-1">Tiêu đề</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-[#e5dac9] bg-white px-4 py-2.5 outline-none focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b] transition-all"
                placeholder="Nhập tiêu đề bài tập..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#191919] mb-1">Độ khó</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as ProblemDifficulty)}
                  className="w-full rounded-xl border border-[#e5dac9] bg-white px-4 py-2.5 outline-none focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b] transition-all"
                >
                  <option value="EASY">Dễ</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HARD">Khó</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#191919] mb-1">Thời gian giới hạn (ms)</label>
                <input
                  type="number"
                  required
                  min="100"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#e5dac9] bg-white px-4 py-2.5 outline-none focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#191919] mb-1">Bộ nhớ giới hạn (MB)</label>
                <input
                  type="number"
                  required
                  min="16"
                  value={memoryLimit}
                  onChange={(e) => setMemoryLimit(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#e5dac9] bg-white px-4 py-2.5 outline-none focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#191919] mb-1">Mô tả chi tiết</label>
              <textarea
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-[#e5dac9] bg-white px-4 py-3 outline-none focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b] transition-all"
                placeholder="Nhập mô tả đề bài, định dạng đầu vào, định dạng đầu ra..."
              />
            </div>
          </div>

          <div className="border-t border-[#e5dac9] pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-semibold text-[#191919]">Test cases</h3>
              <button
                type="button"
                onClick={addTestCase}
                className="flex items-center gap-2 rounded-xl bg-[#f0ebd9] px-4 py-2 text-sm font-medium text-[#193a2b] hover:bg-[#e5dac9] transition-colors"
              >
                <Plus size={16} /> Thêm Test case
              </button>
            </div>

            <div className="space-y-4">
              {testCases.map((tc, index) => (
                <div key={index} className="rounded-xl border border-[#e5dac9] bg-white p-4 relative group">
                  <button
                    type="button"
                    onClick={() => removeTestCase(index)}
                    className="absolute right-3 top-3 text-[#8a8073] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#8a8073] mb-1">Input</label>
                      <textarea
                        required
                        rows={2}
                        value={tc.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        className="w-full rounded-lg border border-[#e5dac9] bg-[#fdfbf7] px-3 py-2 text-sm outline-none font-mono"
                        placeholder="Dữ liệu đầu vào"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8a8073] mb-1">Expected Output</label>
                      <textarea
                        required
                        rows={2}
                        value={tc.expected_output}
                        onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                        className="w-full rounded-lg border border-[#e5dac9] bg-[#fdfbf7] px-3 py-2 text-sm outline-none font-mono"
                        placeholder="Kết quả mong đợi"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`hidden-tc-${index}`}
                      checked={tc.is_hidden}
                      onChange={(e) => updateTestCase(index, 'is_hidden', e.target.checked)}
                      className="rounded border-[#e5dac9] text-[#193a2b] focus:ring-[#193a2b]"
                    />
                    <label htmlFor={`hidden-tc-${index}`} className="text-sm text-[#8a8073]">
                      Ẩn test case này với sinh viên (Hidden Test)
                    </label>
                  </div>
                </div>
              ))}
              
              {testCases.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#bfae99] p-8 text-center text-[#8a8073]">
                  Chưa có test case nào. Hãy thêm ít nhất 1 test case.
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 -mx-6 -mb-6 mt-8 flex justify-end gap-3 border-t border-[#e5dac9] bg-[#fdfbf7] px-6 py-4 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-[#5c5446] hover:bg-[#f0ebd9] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || testCases.length === 0}
              className="rounded-xl bg-[#193a2b] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#122b1f] disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Đang lưu...' : (initialData ? 'Cập nhật' : 'Tạo mới')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
