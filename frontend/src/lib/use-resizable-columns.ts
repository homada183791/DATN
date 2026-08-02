"use client";

import { useCallback, useRef, useState, type RefObject } from "react";

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  minWidth?: number;
}

export function useResizableColumns(
  initialColumns: ColumnDef[],
  containerRef?: RefObject<HTMLElement | null>
) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialColumns.map((c) => [c.key, c.width]))
  );
  const dragRef = useRef<{ key: string; startX: number; startWidth: number } | null>(
    null
  );

  const startResize = useCallback(
    (key: string, minWidth = 60) =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = { key, startX: e.clientX, startWidth: widths[key] };
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";

        // Tổng độ rộng của các cột còn lại (không đổi trong suốt lần kéo này)
        // — dùng để tính phần không gian còn lại bên phải cho cột đang kéo.
        const othersWidth = initialColumns
          .filter((c) => c.key !== key)
          .reduce((sum, c) => sum + (widths[c.key] ?? c.width), 0);

        function onMouseMove(ev: MouseEvent) {
          const drag = dragRef.current;
          if (!drag) return;
          const delta = ev.clientX - drag.startX;
          let next = Math.max(minWidth, drag.startWidth + delta);

          // Giới hạn bên phải: tổng độ rộng các cột không được vượt quá
          // chiều rộng thực tế của khung chứa bảng.
          const containerWidth = containerRef?.current?.clientWidth;
          if (containerWidth) {
            const maxAllowed = containerWidth - othersWidth;
            if (maxAllowed >= minWidth) {
              next = Math.min(next, maxAllowed);
            }
          }

          setWidths((prev) => ({ ...prev, [drag.key]: next }));
        }

        function onMouseUp() {
          dragRef.current = null;
          document.body.style.userSelect = "";
          document.body.style.cursor = "";
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        }

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      },
    [widths, initialColumns, containerRef]
  );

  const totalWidth = initialColumns.reduce((sum, c) => sum + (widths[c.key] ?? c.width), 0);

  return { widths, startResize, totalWidth };
}