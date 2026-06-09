export function getPaginationItems(
  page: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const siblings = 1;
  const items: Array<number | "ellipsis"> = [0];

  const rangeStart = Math.max(1, page - siblings);
  const rangeEnd = Math.min(totalPages - 2, page + siblings);

  if (rangeStart > 1) {
    items.push("ellipsis");
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    items.push(i);
  }

  if (rangeEnd < totalPages - 2) {
    items.push("ellipsis");
  }

  items.push(totalPages - 1);
  return items;
}
