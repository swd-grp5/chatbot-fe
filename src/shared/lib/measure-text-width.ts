import { useLayoutEffect, useState } from "react";

export function measureTextWidth(text: string, className: string): number {
  if (typeof document === "undefined") return 0;
  const el = document.createElement("span");
  el.className = className;
  el.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none;";
  el.textContent = text;
  document.body.appendChild(el);
  const width = el.getBoundingClientRect().width;
  document.body.removeChild(el);
  return width;
}

export function measureMaxTextWidth(texts: string[], className: string): number {
  if (texts.length === 0) return 0;
  return Math.max(...texts.map((text) => measureTextWidth(text, className)));
}

/** Đo width px theo chuỗi dài nhất (dùng font/class giống UI thật). */
export function useMeasuredMaxWidth(
  texts: string[],
  className = "text-xs font-normal",
  extraPadding = 44,
): number | undefined {
  const [width, setWidth] = useState<number | undefined>();
  const labelsKey = texts.length > 0 ? texts.join("\0") : "";

  useLayoutEffect(() => {
    if (!labelsKey) {
      setWidth(undefined);
      return;
    }
    const items = labelsKey.split("\0");
    setWidth(Math.ceil(measureMaxTextWidth(items, className)) + extraPadding);
  }, [labelsKey, className, extraPadding]);

  return width;
}
