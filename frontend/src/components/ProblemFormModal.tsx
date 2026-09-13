import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, Eye, EyeOff, ChevronDown,
  Clock, HardDrive, AlignLeft, FlaskConical, Loader2,
  AlertCircle,
} from 'lucide-react';
import { CreateProblemDto, ProblemDifficulty, ProblemDto } from '../api/problems';

interface ProblemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProblemDto) => void;
  initialData?: ProblemDto | null;
  isLoading?: boolean;
}

const DIFFICULTY_CONFIG = {
  EASY:   { label: 'Dễ',       color: 'text-emerald-700 bg-emerald-50 border-emerald-300 ring-emerald-200' },
  MEDIUM: { label: 'Trung bình', color: 'text-yellow-700 bg-yellow-50 border-yellow-300 ring-yellow-200' },
  HARD:   { label: 'Khó',       color: 'text-red-700 bg-red-50 border-red-300 ring-red-200' },
} as const;

const TIME_PRESETS = [500, 1000, 2000, 3000];
const MEM_PRESETS  = [64, 128, 256, 512];

export default function ProblemFormModal({
  isOpen, onClose, onSubmit, initialData, isLoading,
}: ProblemFormModalProps) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [difficulty,  setDifficulty]  = useState<ProblemDifficulty>('EASY');
  const [timeLimit,   setTimeLimit]   = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [testCases,   setTestCases]   = useState<CreateProblemDto['test_cases']>([]);
  const [activeTab,   setActiveTab]   = useState<'desc' | 'cases'>('desc');
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
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
      setErrors({});
      setActiveTab('desc');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  /* ── Validation ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim())       e.title = 'Tiêu đề không được để trống.';
    if (title.trim().length < 3) e.title = 'Tiêu đề cần ít nhất 3 ký tự.';
    if (!description.trim()) e.description = 'Mô tả không được để trống.';
    if (testCases.length === 0) e.cases = 'Cần ít nhất 1 test case.';
    testCases.forEach((tc, i) => {
      if (!tc.input.trim())           e[`tc_input_${i}`] = 'Input không được rỗng.';
      if (!tc.expected_output.trim()) e[`tc_out_${i}`]   = 'Output không được rỗng.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Switch to cases tab if case errors
      const hasDescErr = errors.title || errors.description;
      const hasCaseErr = errors.cases || Object.keys(errors).some(k => k.startsWith('tc_'));
      if (!hasDescErr && hasCaseErr) setActiveTab('cases');
      return;
    }
    onSubmit({ title: title.trim(), description: description.trim(), difficulty, time_limit: timeLimit, memory_limit: memoryLimit, test_cases: testCases });
  };

  const addTestCase    = () => setTestCases([...testCases, { input: '', expected_output: '', is_hidden: false }]);
  const removeTestCase = (i: number) => setTestCases(testCases.filter((_, idx) => idx !== i));
  const updateTestCase = (i: number, field: keyof CreateProblemDto['test_cases'][0], value: unknown) => {
    const next = [...testCases];
    next[i] = { ...next[i], [field]: value };
    setTestCases(next);
  };

  const isEdit = !!initialData;
  const caseErrCount = Object.keys(errors).filter(k => k.startsWith('tc_') || k === 'cases').length;

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-stretch justify-center bg-black/60 backdrop-blur-[2px] p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--ws-panel,#fdfbf7)] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-screen sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9] flex-shrink-0 bg-[var(--ws-panel,#fdfbf7)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#193a2b]/10">
              <FlaskConical size={18} className="text-[#193a2b]" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#191919] leading-tight">
                {isEdit ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}
              </h2>
              <p className="text-xs text-[#8a8073]">
                {isEdit ? `Cập nhật: ${initialData.title}` : 'Ngân hàng bài tập hệ thống'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8a8073] hover:bg-[#f0ebd9] hover:text-[#191919] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-[#e5dac9] flex-shrink-0 bg-[var(--ws-panel,#fdfbf7)]">
          {([
            { key: 'desc',  label: 'Thông tin đề bài', icon: AlignLeft,    err: !!(errors.title || errors.description) },
            { key: 'cases', label: 'Test Cases',        icon: FlaskConical, err: caseErrCount > 0, count: testCases.length },
          ] as const).map(({ key, label, icon: Icon, err, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === key
                  ? 'border-[#193a2b] text-[#193a2b]'
                  : 'border-transparent text-[#8a8073] hover:text-[#191919]'
              }`}
            >
              <Icon size={15} />
              {label}
              {count !== undefined && count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#193a2b] text-white text-[10px] font-bold">{count}</span>
              )}
              {err && <AlertCircle size={13} className="text-red-500 ml-0.5" />}
            </button>
          ))}
        </div>

        {/* ── BODY ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">

            {/* TAB: Description */}
            {activeTab === 'desc' && (
              <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-[#191919] mb-1.5">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: '' })); }}
                    placeholder="VD: Two Sum, Sắp xếp nổi bọt..."
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${
                      errors.title
                        ? 'border-red-400 ring-1 ring-red-300 bg-red-50'
                        : 'border-[#e5dac9] bg-white focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]'
                    }`}
                  />
                  {errors.title && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{errors.title}</p>}
                </div>

                {/* Difficulty — visual toggle */}
                <div>
                  <label className="block text-sm font-semibold text-[#191919] mb-2">Độ khó</label>
                  <div className="flex gap-2">
                    {(Object.keys(DIFFICULTY_CONFIG) as ProblemDifficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                          difficulty === d
                            ? DIFFICULTY_CONFIG[d].color + ' ring-2 shadow-sm'
                            : 'border-[#e5dac9] text-[#8a8073] bg-white hover:border-[#d5c9b5] hover:text-[#191919]'
                        }`}
                      >
                        {DIFFICULTY_CONFIG[d].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Limits — two-column with quick presets */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#191919] mb-1.5 flex items-center gap-1.5">
                      <Clock size={13} className="text-[#8a8073]" /> Thời gian giới hạn (ms)
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#e5dac9] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {TIME_PRESETS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTimeLimit(v)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                            timeLimit === v
                              ? 'bg-[#193a2b] text-white border-[#193a2b]'
                              : 'border-[#e5dac9] text-[#8a8073] hover:border-[#193a2b] hover:text-[#193a2b]'
                          }`}
                        >
                          {v}ms
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#191919] mb-1.5 flex items-center gap-1.5">
                      <HardDrive size={13} className="text-[#8a8073]" /> Bộ nhớ giới hạn (MB)
                    </label>
                    <input
                      type="number"
                      min="16"
                      value={memoryLimit}
                      onChange={(e) => setMemoryLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#e5dac9] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {MEM_PRESETS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMemoryLimit(v)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                            memoryLimit === v
                              ? 'bg-[#193a2b] text-white border-[#193a2b]'
                              : 'border-[#e5dac9] text-[#8a8073] hover:border-[#193a2b] hover:text-[#193a2b]'
                          }`}
                        >
                          {v}MB
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-[#191919] mb-1.5">
                    Mô tả chi tiết <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-[#8a8073]">(hỗ trợ Markdown)</span>
                  </label>
                  <textarea
                    rows={10}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: '' })); }}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all font-mono leading-6 resize-y ${
                      errors.description
                        ? 'border-red-400 ring-1 ring-red-300 bg-red-50'
                        : 'border-[#e5dac9] bg-white focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]'
                    }`}
                    placeholder={`## Mô tả bài toán\nCho một mảng số nguyên nums và một số nguyên target...\n\n## Định dạng đầu vào\nDòng 1: n (số phần tử)\nDòng 2: n số nguyên cách nhau bởi dấu cách\n\n## Định dạng đầu ra\nIn ra chỉ số của hai phần tử...`}
                  />
                  {errors.description && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{errors.description}</p>}
                </div>
              </div>
            )}

            {/* TAB: Test Cases */}
            {activeTab === 'cases' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[#191919]">Test Cases</h3>
                    <p className="text-xs text-[#8a8073] mt-0.5">
                      Ít nhất 1 test case hiển thị (mẫu) + khuyến khích thêm hidden test case để chấm điểm chính xác.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#193a2b] text-white text-sm font-medium hover:bg-[#143022] transition-colors shadow-sm"
                  >
                    <Plus size={15} /> Thêm test case
                  </button>
                </div>

                {errors.cases && (
                  <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle size={15} /> {errors.cases}
                  </div>
                )}

                {testCases.length === 0 ? (
                  <div
                    className="rounded-2xl border-2 border-dashed border-[#e5dac9] p-12 text-center cursor-pointer hover:border-[#193a2b] hover:bg-[#f7f4eb] transition-all group"
                    onClick={addTestCase}
                  >
                    <FlaskConical size={40} className="text-[#bfae99] mx-auto mb-3 group-hover:text-[#193a2b] transition-colors" />
                    <p className="font-medium text-[#5c5446] group-hover:text-[#193a2b]">Chưa có test case nào</p>
                    <p className="text-sm text-[#8a8073] mt-1">Click để thêm test case đầu tiên</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testCases.map((tc, index) => (
                      <div
                        key={index}
                        className={`rounded-xl border bg-white overflow-hidden transition-all ${
                          (errors[`tc_input_${index}`] || errors[`tc_out_${index}`])
                            ? 'border-red-300'
                            : 'border-[#e5dac9]'
                        }`}
                      >
                        {/* Case header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#f7f4eb] border-b border-[#e5dac9]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#5c5446] font-mono">TC #{index + 1}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <div
                                onClick={() => updateTestCase(index, 'is_hidden', !tc.is_hidden)}
                                className={`relative w-8 h-4 rounded-full transition-colors ${tc.is_hidden ? 'bg-[#193a2b]' : 'bg-[#d5c9b5]'}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${tc.is_hidden ? 'translate-x-4' : ''}`} />
                              </div>
                              {tc.is_hidden
                                ? <span className="text-[11px] font-semibold text-[#193a2b] flex items-center gap-1"><EyeOff size={11} /> Hidden</span>
                                : <span className="text-[11px] text-[#8a8073] flex items-center gap-1"><Eye size={11} /> Hiển thị mẫu</span>
                              }
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTestCase(index)}
                            className="p-1.5 rounded-lg text-[#8a8073] hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Xoá test case"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Input / Output */}
                        <div className="grid grid-cols-2 divide-x divide-[#e5dac9]">
                          <div className="p-3">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8a8073] mb-1.5">Input</label>
                            <textarea
                              rows={3}
                              value={tc.input}
                              onChange={(e) => {
                                updateTestCase(index, 'input', e.target.value);
                                setErrors(prev => ({ ...prev, [`tc_input_${index}`]: '' }));
                              }}
                              className={`w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none resize-y transition-all ${
                                errors[`tc_input_${index}`]
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-[#e5dac9] bg-[#fdfbf7] focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]'
                              }`}
                              placeholder="Dữ liệu đầu vào..."
                            />
                            {errors[`tc_input_${index}`] && (
                              <p className="mt-1 text-[11px] text-red-500">{errors[`tc_input_${index}`]}</p>
                            )}
                          </div>
                          <div className="p-3">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8a8073] mb-1.5">Expected Output</label>
                            <textarea
                              rows={3}
                              value={tc.expected_output}
                              onChange={(e) => {
                                updateTestCase(index, 'expected_output', e.target.value);
                                setErrors(prev => ({ ...prev, [`tc_out_${index}`]: '' }));
                              }}
                              className={`w-full rounded-lg border px-3 py-2 text-sm font-mono outline-none resize-y transition-all ${
                                errors[`tc_out_${index}`]
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-[#e5dac9] bg-[#fdfbf7] focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]'
                              }`}
                              placeholder="Kết quả mong đợi..."
                            />
                            {errors[`tc_out_${index}`] && (
                              <p className="mt-1 text-[11px] text-red-500">{errors[`tc_out_${index}`]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Quick add */}
                    <button
                      type="button"
                      onClick={addTestCase}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-[#e5dac9] text-sm text-[#8a8073] hover:border-[#193a2b] hover:text-[#193a2b] hover:bg-[#f7f4eb] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={15} /> Thêm test case
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#e5dac9] bg-[var(--ws-panel,#fdfbf7)] flex-shrink-0">
            <div className="flex items-center gap-4 text-xs text-[#8a8073]">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {timeLimit}ms
              </span>
              <span className="flex items-center gap-1">
                <HardDrive size={12} /> {memoryLimit}MB
              </span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${DIFFICULTY_CONFIG[difficulty].color}`}>
                {DIFFICULTY_CONFIG[difficulty].label}
              </span>
              <span>{testCases.length} test case{testCases.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl text-sm font-medium text-[#5c5446] border border-[#e5dac9] hover:bg-[#f0ebd9] transition-colors disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#193a2b] text-white text-sm font-semibold hover:bg-[#143022] disabled:opacity-50 transition-colors shadow-sm"
              >
                {isLoading && <Loader2 size={15} className="animate-spin" />}
                {isLoading ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Tạo bài tập')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
