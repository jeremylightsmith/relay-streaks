import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  };
}

const habits = [{ id: "a", name: "Read", createdAt: "2026-10-22T09:00:00.000Z" }];

test("load on empty storage returns []", () => {
  assert.deepEqual(createStore(fakeStorage()).load(), []);
});

test("save then load returns equal data, including from a second store", () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  store.save(habits);
  assert.deepEqual(store.load(), habits);
  assert.deepEqual(createStore(storage).load(), habits);
});

test("corrupt or non-array JSON loads as []", () => {
  for (const raw of ["{oops", "{}"]) {
    const storage = fakeStorage();
    storage.setItem("streaks.habits", raw);
    assert.deepEqual(createStore(storage).load(), []);
  }
});
