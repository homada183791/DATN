import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, Eye, EyeOff,
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
  EASY:   { label: 'Dễ',        color: 'text-emerald-800 bg-emerald-100 border-emerald-300 ring-emerald-200' },
  MEDIUM: { label: 'Trung bình', color: 'text-yellow-800 bg-yellow-100 border-yellow-300 ring-yellow-200' },
  HARD:   { label: 'Khó',        color: 'text-red-800 bg-red-100 border-red-300 ring-red-200' },
} as const;

const TIME_PRESETS = [500, 1000, 2000, 3000];
const MEM_PRESETS  = [64, 128, 256, 512];

/* ─────────────────────────────── styles ─────────────────────────────── */
const FIELD_BASE  = 'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all text-[#191919] placeholder-[#bfae99]';
const FIELD_IDLE  = 'border-[#e5dac9] bg-white focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]';
const FIELD_ERR   = 'border-red-400 ring-1 ring-red-300 bg-red-50';

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
    if (!title.trim() || title.trim().length < 3) e.title = 'Tiêu đề cần ít nhất 3 ký tự.';
    if (!description.trim())  e.description = 'Mô tả không được để trống.';
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
      const hasCaseErr = Object.keys(errors).some(k => k.startsWith('tc_') || k === 'cases');
      const hasDescErr = !!(errors.title || errors.description);
      if (!hasDescErr && hasCaseErr) setActiveTab('cases');
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      difficulty,
      time_limit: timeLimit,
      memory_limit: memoryLimit,
      test_cases: testCases,
    });
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      {/* ─── Modal shell — Warm cream, same as Homework modal ─── */}
      <div
        className="relative w-full max-w-4xl bg-[#f7f4eb] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-[#e5dac9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dac9] flex-shrink-0 bg-[#f7f4eb]">
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
            className="p-2 rounded-xl text-[#8a8073] hover:bg-[#e5dac9] hover:text-[#191919] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-[#e5dac9] flex-shrink-0 bg-[#f7f4eb]">
          {([
            { key: 'desc'  as const, label: 'Thông tin đề bài', icon: AlignLeft,    err: !!(errors.title || errors.description), count: undefined },
            { key: 'cases' as const, label: 'Test Cases',        icon: FlaskConical, err: caseErrCount > 0,                        count: testCases.length },
          ]).map(({ key, label, icon: Icon, err, count }) => (
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
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#193a2b] text-white text-[10px] font-bold leading-none">{count}</span>
              )}
              {err && <AlertCircle size={13} className="text-red-500 ml-0.5" />}
            </button>
          ))}
        </div>

        {/* ── BODY ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">

            {/* ─── TAB: Thông tin đề bài ─── */}
            {activeTab === 'desc' && (
              <div className="p-6 space-y-5">

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-[#191919] mb-1.5">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                    placeholder="VD: Two Sum, Sắp xếp nổi bọt..."
                    className={`${FIELD_BASE} ${errors.title ? FIELD_ERR : FIELD_IDLE}`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={11} />{errors.title}
                    </p>
                  )}
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

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Time */}
                  <div>
                    <label className="block text-sm font-semibold text-[#191919] mb-1.5">
                      <span className="flex items-center gap-1.5"><Clock size={13} className="text-[#8a8073]" />Thời gian (ms)</span>
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className={`${FIELD_BASE} ${FIELD_IDLE}`}
                    />
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {TIME_PRESETS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTimeLimit(v)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                            timeLimit === v
                              ? 'bg-[#193a2b] text-white border-[#193a2b]'
                              : 'border-[#e5dac9] text-[#8a8073] bg-white hover:border-[#193a2b] hover:text-[#193a2b]'
                          }`}
                        >
                          {v}ms
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Memory */}
                  <div>
                    <label className="block text-sm font-semibold text-[#191919] mb-1.5">
                      <span className="flex items-center gap-1.5"><HardDrive size={13} className="text-[#8a8073]" />Bộ nhớ (MB)</span>
                    </label>
                    <input
                      type="number"
                      min="16"
                      value={memoryLimit}
                      onChange={(e) => setMemoryLimit(Number(e.target.value))}
                      className={`${FIELD_BASE} ${FIELD_IDLE}`}
                    />
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {MEM_PRESETS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMemoryLimit(v)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                            memoryLimit === v
                              ? 'bg-[#193a2b] text-white border-[#193a2b]'
                              : 'border-[#e5dac9] text-[#8a8073] bg-white hover:border-[#193a2b] hover:text-[#193a2b]'
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
                    Mô tả chi tiết{' '}
                    <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-[#8a8073]">(hỗ trợ Markdown)</span>
                  </label>
                  <textarea
                    rows={10}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all font-mono leading-6 resize-y text-[#191919] placeholder-[#bfae99] ${
                      errors.description ? FIELD_ERR : 'border-[#e5dac9] bg-white focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]'
                    }`}
                    placeholder={`## Mô tả bài toán\nCho một mảng số nguyên nums và target...\n\n## Định dạng đầu vào\nDòng 1: n (số phần tử)\nDòng 2: n số nguyên cách nhau dấu cách\n\n## Định dạng đầu ra\nIn ra chỉ số của hai phần tử...`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={11} />{errors.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: Test Cases ─── */}
            {activeTab === 'cases' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[#191919]">Test Cases</h3>
                    <p className="text-xs text-[#8a8073] mt-0.5">
                      Ít nhất 1 test case hiển thị (mẫu). Khuyến khích thêm hidden test case để chấm điểm chính xác.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#193a2b] text-white text-sm font-medium hover:bg-[#143022] transition-colors shadow-sm"
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
                    className="rounded-2xl border-2 border-dashed border-[#e5dac9] p-12 text-center cursor-pointer hover:border-[#193a2b] hover:bg-[#f0ebd9] transition-all group"
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
                        className={`rounded-xl border overflow-hidden ${
                          (errors[`tc_input_${index}`] || errors[`tc_out_${index}`])
                            ? 'border-red-300'
                            : 'border-[#e5dac9]'
                        }`}
                      >
                        {/* Case header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#eee8d8] border-b border-[#e5dac9]">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-[#5c5446] font-mono">TC #{index + 1}</span>
                            {/* Toggle switch */}
                            <button
                              type="button"
                              onClick={() => updateTestCase(index, 'is_hidden', !tc.is_hidden)}
                              className="flex items-center gap-2"
                            >
                              <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${tc.is_hidden ? 'bg-[#193a2b]' : 'bg-[#c8bfad]'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tc.is_hidden ? 'translate-x-4' : ''}`} />
                              </div>
                              {tc.is_hidden
                                ? <span className="text-[11px] font-semibold text-[#193a2b] flex items-center gap-1"><EyeOff size={11} />Hidden</span>
                                : <span className="text-[11px] text-[#8a8073] flex items-center gap-1"><Eye size={11} />Hiển thị mẫu</span>
                              }
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTestCase(index)}
                            className="p-1.5 rounded-lg text-[#8a8073] hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Input / Output side by side */}
                        <div className="grid grid-cols-2 divide-x divide-[#e5dac9] bg-white">
                          <div className="p-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8a8073] mb-2">Input</label>
                            <textarea
                              rows={4}
                              value={tc.input}
                              onChange={(e) => {
                                updateTestCase(index, 'input', e.target.value);
                                setErrors(p => ({ ...p, [`tc_input_${index}`]: '' }));
                              }}
                              className={`w-full rounded-lg border px-3 py-2.5 text-sm font-mono text-[#191919] placeholder-[#bfae99] outline-none resize-y transition-all ${
                                errors[`tc_input_${index}`]
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-[#e5dac9] bg-[#f7f4eb] focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]'
                              }`}
                              placeholder="Dữ liệu đầu vào&#10;VD: 3 5"
                            />
                            {errors[`tc_input_${index}`] && (
                              <p className="mt-1 text-[11px] text-red-600">{errors[`tc_input_${index}`]}</p>
                            )}
                          </div>
                          <div className="p-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8a8073] mb-2">Expected Output</label>
                            <textarea
                              rows={4}
                              value={tc.expected_output}
                              onChange={(e) => {
                                updateTestCase(index, 'expected_output', e.target.value);
                                setErrors(p => ({ ...p, [`tc_out_${index}`]: '' }));
                              }}
                              className={`w-full rounded-lg border px-3 py-2.5 text-sm font-mono text-[#191919] placeholder-[#bfae99] outline-none resize-y transition-all ${
                                errors[`tc_out_${index}`]
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-[#e5dac9] bg-[#f7f4eb] focus:border-[#193a2b] focus:ring-1 focus:ring-[#193a2b]'
                              }`}
                              placeholder="Kết quả mong đợi&#10;VD: 8"
                            />
                            {errors[`tc_out_${index}`] && (
                              <p className="mt-1 text-[11px] text-red-600">{errors[`tc_out_${index}`]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Quick add row */}
                    <button
                      type="button"
                      onClick={addTestCase}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-[#e5dac9] text-sm text-[#8a8073] hover:border-[#193a2b] hover:text-[#193a2b] hover:bg-[#f0ebd9] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={15} /> Thêm test case
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#e5dac9] bg-[#eee8d8] flex-shrink-0 rounded-b-2xl">
            {/* Summary */}
            <div className="flex items-center gap-3 text-xs text-[#8a8073]">
              <span className="flex items-center gap-1"><Clock size={12} />{timeLimit}ms</span>
              <span className="flex items-center gap-1"><HardDrive size={12} />{memoryLimit}MB</span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${DIFFICULTY_CONFIG[difficulty].color}`}>
                {DIFFICULTY_CONFIG[difficulty].label}
              </span>
              <span className="text-[#5c5446] font-medium">{testCases.length} test case{testCases.length !== 1 ? 's' : ''}</span>
            </div>
            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl text-sm font-medium text-[#5c5446] border border-[#e5dac9] bg-white hover:bg-[#f0ebd9] transition-colors disabled:opacity-50"
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
