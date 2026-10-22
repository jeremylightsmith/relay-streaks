export function addHabit(habits, name, now = new Date()) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name your habit");
  const key = trimmed.toLowerCase();
  if (habits.some((h) => h.name.trim().toLowerCase() === key)) {
    throw new Error("You already have that habit");
  }
  return [...habits, { id: crypto.randomUUID(), name: trimmed, createdAt: now.toISOString() }];
}

export function todayList(habits) {
  return [...habits];
}

export function dayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isDoneToday(habit, now = new Date()) {
  return (habit.doneDates ?? []).includes(dayKey(now));
}

export function toggleDone(habits, id, now = new Date()) {
  const key = dayKey(now);
  return habits.map((h) => {
    if (h.id !== id) return h;
    const dates = h.doneDates ?? [];
    const doneDates = dates.includes(key) ? dates.filter((k) => k !== key) : [...dates, key];
    return { ...h, doneDates };
  });
}

export function msUntilNextDay(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next - now;
}
