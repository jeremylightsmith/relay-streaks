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
