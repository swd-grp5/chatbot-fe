/** Hex form of `--primary: oklch(0.52 0.09 160)` — Ant Design cannot parse oklch(). */
export const BRAND_PRIMARY = "#327957";

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}

/** Resolve live Tailwind `bg-primary` to a hex Ant Design can use. */
export function getBrandPrimaryColor(): string {
  if (typeof document === "undefined") return BRAND_PRIMARY;

  const probe = document.createElement("span");
  probe.className = "bg-primary";
  probe.setAttribute("aria-hidden", "true");
  Object.assign(probe.style, {
    position: "fixed",
    left: "-9999px",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(probe);
  const { backgroundColor } = getComputedStyle(probe);
  document.body.removeChild(probe);

  const rgb = backgroundColor.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgb) {
    return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
  }

  // Modern browsers may return color(srgb ...) or keep oklch — fall back to hex constant
  if (backgroundColor.startsWith("#")) return backgroundColor;
  return BRAND_PRIMARY;
}
