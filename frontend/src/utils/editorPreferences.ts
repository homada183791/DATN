export interface EditorPreferences {
  editorTheme: string;
  fontSize: number;
  tabSize: number;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  editorTheme: 'auto',
  fontSize: 14,
  tabSize: 4,
};

const STORAGE_KEY = 'user_preferences';
const CHANGE_EVENT = 'jh-editor-preferences-changed';
const VALID_FONT_SIZES = [12, 14, 16, 18];
const VALID_TAB_SIZES = [2, 4];

/** Chuẩn hóa cấu hình trình soạn thảo từ hồ sơ người dùng hoặc localStorage. */
export function parseEditorPreferences(
  raw: Record<string, unknown> | null | undefined,
): EditorPreferences {
  if (!raw) return { ...DEFAULT_EDITOR_PREFERENCES };
  const fontSize = Number(raw.fontSize);
  const tabSize = Number(raw.tabSize);
  const editorTheme =
    typeof raw.editorTheme === 'string' && raw.editorTheme.trim()
      ? raw.editorTheme.trim()
      : DEFAULT_EDITOR_PREFERENCES.editorTheme;

  return {
    editorTheme,
    fontSize: VALID_FONT_SIZES.includes(fontSize)
      ? fontSize
      : DEFAULT_EDITOR_PREFERENCES.fontSize,
    tabSize: VALID_TAB_SIZES.includes(tabSize)
      ? tabSize
      : DEFAULT_EDITOR_PREFERENCES.tabSize,
  };
}

/** Đọc cấu hình đã lưu (ưu tiên nguồn được truyền vào nếu có dữ liệu, sau đó đến localStorage). */
export function readStoredEditorPreferences(
  primary?: Record<string, unknown> | null,
): EditorPreferences {
  let stored: Record<string, unknown> | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    stored = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    stored = null;
  }
  const hasPrimary = primary && Object.keys(primary).length > 0;
  return parseEditorPreferences(hasPrimary ? primary : stored);
}

/** Lưu cấu hình vào localStorage và thông báo tới các editor đang mở. */
export function saveAndBroadcastEditorPreferences(preferences: Record<string, unknown>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preferences }));
}

/** Lắng nghe thay đổi cấu hình editor trong cùng tab hoặc tab khác. */
export function subscribeEditorPreferences(
  onChange: (prefs: EditorPreferences) => void,
): () => void {
  const handler = (event: Event) => {
    if (event instanceof CustomEvent) {
      onChange(parseEditorPreferences(event.detail as Record<string, unknown>));
      return;
    }
    onChange(readStoredEditorPreferences());
  };

  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
