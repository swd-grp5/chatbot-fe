import type { Session } from "./mock-data";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

export const groupFor = (d: Date): Session["group"] => {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay) return "Hôm nay";
  if (d.toDateString() === y.toDateString()) return "Hôm qua";
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return "7 ngày qua";
  return "Cũ hơn";
};

const parseUpdatedAt = (value: string): Date => {
  const now = new Date();

  if (ISO_RE.test(value)) {
    const iso = new Date(value);
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  if (value === "Vừa xong") return now;
  if (value === "Yesterday" || value === "Hôm qua") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const d = new Date(now);
    d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 1);
    return d;
  }

  // "May 21" — phải gắn năm hiện tại, tránh Date.parse("May 21") → 2001
  const monthDay = Date.parse(`${value} ${now.getFullYear()}`);
  if (!Number.isNaN(monthDay)) return new Date(monthDay);

  return now;
};

/** Gán lại thời gian gần đây cho session mock cũ (format legacy / năm 2001). */
const RECENT_OFFSETS_MS = [
  12 * 60 * 1000,
  2 * 3600000,
  86400000,
  3 * 86400000,
  5 * 86400000,
  9 * 86400000,
];

export function normalizeSession(session: Session, index = 0): Session {
  let date = parseUpdatedAt(session.updatedAt);
  const legacy = !ISO_RE.test(session.updatedAt) || date.getFullYear() < 2024;
  if (legacy) {
    date = new Date(Date.now() - (RECENT_OFFSETS_MS[index] ?? 86400000));
  }
  return {
    ...session,
    updatedAt: date.toISOString(),
    group: groupFor(date),
  };
}

export function formatRelativeTime(value: string | Date, now = new Date()): string {
  const date = typeof value === "string" ? parseUpdatedAt(value) : value;
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24 && date.toDateString() === now.toDateString()) {
    return `${diffHour} giờ trước`;
  }
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  if (diffDay < 30) return `${diffDay} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
  });
}

export function toSessionTimestamp(date = new Date()): string {
  return date.toISOString();
}

export { parseUpdatedAt };
