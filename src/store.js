const KEY = "streaks.habits";

export function createStore(storage) {
  return {
    load() {
      try {
        const habits = JSON.parse(storage.getItem(KEY));
        return Array.isArray(habits) ? habits : [];
      } catch {
        return [];
      }
    },
    save(habits) {
      storage.setItem(KEY, JSON.stringify(habits));
    },
  };
}
