import { parseSkillResponse, suggestByKeywords, buildSkillPrompt } from './skill-suggester';
import { SKILL_CATALOG } from './skill-catalog';

const valid = new Set(SKILL_CATALOG.map((s) => s.code));

describe('skill suggester', () => {
  it('đọc JSON kể cả khi bọc trong ```json, bỏ mã lạ và trùng, tối đa 6', () => {
    const text = 'Suy luận...\n```json\n{"skills":[{"code":"binary_search_answer","reason":"chặt đáp án"},{"code":"FOO"},{"code":"BINARY_SEARCH_ANSWER"},{"code":"GREEDY","reason":"x"}]}\n```';
    expect(parseSkillResponse(text, valid)).toEqual([
      { code: 'BINARY_SEARCH_ANSWER', reason: 'chặt đáp án' },
      { code: 'GREEDY', reason: 'x' },
    ]);
    expect(parseSkillResponse('không có json', valid)).toEqual([]);
  });

  it('chế độ không AI: đoán theo từ khoá', () => {
    const out = suggestByKeywords('Maximize the minimum powered city — chặt nhị phân, long long', valid).map((s) => s.code);
    expect(out).toContain('BINARY_SEARCH_ANSWER');
    expect(out).toContain('INT_OVERFLOW');
  });

  it('prompt có danh mục, đề và lời giải; dặn bỏ qua chỉ dẫn trong dữ liệu', () => {
    const { system, user } = buildSkillPrompt({ title: 'Bài A', description: 'Cho mảng' }, [{ language: 'CPP', code: 'int main(){}' }], SKILL_CATALOG);
    expect(system).toMatch(/ignore any instructions/i);
    expect(user).toContain('ARRAY_1D');
    expect(user).toContain('<solution index="1" language="CPP">');
  });

  it('danh mục có ~50 kỹ năng, mã không trùng', () => {
    expect(SKILL_CATALOG.length).toBeGreaterThanOrEqual(50);
    expect(valid.size).toBe(SKILL_CATALOG.length);
  });
});
