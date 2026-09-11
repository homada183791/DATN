import { notifyGlobalToast } from '../context/ToastContext';

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export function getApiUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = window.localStorage.getItem('accessToken');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

let last401Time = 0;

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    const defaultSignal = AbortSignal.timeout(15000); // 15s default timeout
    response = await fetch(getApiUrl(path), {
      signal: defaultSignal,
      ...init,
      headers: {
        ...getAuthHeaders(),
        ...(init.headers ?? {}),
      },
    });
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      notifyGlobalToast('Máy chủ không phản hồi (Timeout). Vui lòng thử lại sau.', 'error');
      throw new ApiError(408, 'Request Timeout', error);
    }
    notifyGlobalToast('Không thể kết nối máy chủ', 'error');
    throw new ApiError(0, 'Không thể kết nối máy chủ', error);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      window.localStorage.removeItem('accessToken');

      // Chỉ hiện toast "hết hạn" và redirect khi KHÔNG ở trang login.
      // Khi ở trang login, 401 nghĩa là sai mật khẩu — form tự xử lý lỗi.
      if (window.location.pathname !== '/login') {
        const now = Date.now();
        if (now - last401Time > 3000) {
          last401Time = now;
          notifyGlobalToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
        }
        window.location.assign('/login');
      }
    } else if (response.status === 429) {
      notifyGlobalToast('Bạn thao tác quá nhanh, vui lòng thử lại sau.', 'error');
    }

    const message =
      typeof payload === 'string'
        ? payload
        : (payload as { message?: string })?.message ?? response.statusText ?? 'Request failed';
    throw new ApiError(response.status, message, payload);
  }

  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as ApiResponse<T>).data as T;
  }

  return payload as T;
}
