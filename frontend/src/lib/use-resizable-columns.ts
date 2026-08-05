"use client";

import { useCallback, useState, type RefObject } from "react";

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  minWidth?: number;
}

export function useResizableColumns(
  initialColumns: ColumnDef[],
  _containerRef?: RefObject<HTMLElement | null>
) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initialColumns.map((c) => [c.key, c.width])
    )
  );

  const startResize = useCallback(
    (key: string, minWidth = 60) =>
      (e: React.MouseEvent) => {
        e.preventDefault();

        const currentIndex = initialColumns.findIndex(
          (c) => c.key === key
        );

        if (
          currentIndex < 0 ||
          currentIndex >= initialColumns.length - 1
        ) {
          return;
        }

        const nextColumn =
          initialColumns[currentIndex + 1];

        const nextMinWidth =
          nextColumn.minWidth ?? 60;

        const startX = e.clientX;

        const leftStartWidth =
          widths[key] ?? initialColumns[currentIndex].width;

        const rightStartWidth =
          widths[nextColumn.key] ??
          nextColumn.width;

        function onMouseMove(ev: MouseEvent) {
          const delta = ev.clientX - startX;

          let leftWidth =
            leftStartWidth + delta;

          let rightWidth =
            rightStartWidth - delta;

          if (leftWidth < minWidth) {
            leftWidth = minWidth;
            rightWidth =
              leftStartWidth +
              rightStartWidth -
              minWidth;
          }

          if (rightWidth < nextMinWidth) {
            rightWidth = nextMinWidth;
            leftWidth =
              leftStartWidth +
              rightStartWidth -
              nextMinWidth;
          }

          setWidths((prev) => ({
            ...prev,
            [key]: leftWidth,
            [nextColumn.key]: rightWidth,
          }));
        }

        function onMouseUp() {
          window.removeEventListener(
            "mousemove",
            onMouseMove
          );

          window.removeEventListener(
            "mouseup",
            onMouseUp
          );

          document.body.style.userSelect = "";
          document.body.style.cursor = "";
        }

        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";

        window.addEventListener(
          "mousemove",
          onMouseMove
        );

        window.addEventListener(
          "mouseup",
          onMouseUp
        );
      },
    [widths, initialColumns]
  );

  const totalWidth = initialColumns.reduce(
    (sum, c) => sum + (widths[c.key] ?? c.width),
    0
  );

  return {
    widths,
    startResize,
    totalWidth,
  };
}