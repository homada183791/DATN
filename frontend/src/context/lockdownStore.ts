import { useSyncExternalStore } from 'react';

/**
 * Trạng thái "đang ở chế độ Lockdown" dùng chung giữa màn hình làm bài thi và Layout.
 * Khi bật, Layout ẩn sidebar và thanh navbar để thí sinh chỉ thấy màn hình làm bài.
 */
let active = false;
const listeners = new Set<() => void>();

export function setLockdownActive(value: boolean) {
  if (active === value) return;
  active = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLockdownActive() {
  return useSyncExternalStore(subscribe, () => active, () => false);
}