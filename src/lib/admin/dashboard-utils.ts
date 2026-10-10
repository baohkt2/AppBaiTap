export type DashboardRange = "today" | "7d" | "30d" | "all";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveRange(range: DashboardRange, now = new Date()) {
  const copy = new Date(now);
  copy.setHours(0, 0, 0, 0);

  const end = new Date(copy);
  end.setHours(23, 59, 59, 999);

  const start = new Date(copy);
  const previousStart = new Date(copy);
  const previousEnd = new Date(copy);

  if (range === "today") {
    previousStart.setDate(copy.getDate() - 1);
    previousEnd.setDate(copy.getDate() - 1);
    previousEnd.setHours(23, 59, 59, 999);
    previousStart.setHours(0, 0, 0, 0);
    return { start: new Date(copy), end, previousStart, previousEnd };
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 365;
  start.setDate(copy.getDate() - days + 1);
  previousStart.setDate(copy.getDate() - days * 2 + 1);
  previousEnd.setDate(copy.getDate() - days);
  previousEnd.setHours(23, 59, 59, 999);
  previousStart.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end, previousStart, previousEnd };
}

export function fillMissingDays(items: Array<{ date: string; value: number }>, from: Date, to: Date) {
  const map = new Map(items.map((item) => [item.date, item.value]));
  const result: Array<{ date: string; value: number }> = [];
  const cursor = new Date(from);

  while (cursor <= to) {
    const key = toDateKey(cursor);
    result.push({ date: key, value: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function bucketScores(values: number[]) {
  const buckets = [
    { label: "0", range: [0, 0], count: 0 },
    { label: "1-10", range: [1, 10], count: 0 },
    { label: "11-30", range: [11, 30], count: 0 },
    { label: "31-60", range: [31, 60], count: 0 },
    { label: "61+", range: [61, Number.POSITIVE_INFINITY], count: 0 },
  ];

  for (const value of values) {
    const point = Number(value ?? 0);
    if (point <= 0) buckets[0].count += 1;
    else if (point <= 10) buckets[1].count += 1;
    else if (point <= 30) buckets[2].count += 1;
    else if (point <= 60) buckets[3].count += 1;
    else buckets[4].count += 1;
  }

  return buckets;
}
