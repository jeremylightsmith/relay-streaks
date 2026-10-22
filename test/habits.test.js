import { test } from "node:test";
import assert from "node:assert/strict";
import { addHabit, todayList } from "../src/habits.js";

const now = new Date("2026-10-22T09:00:00.000Z");

test("adding to [] returns one habit with trimmed name, string id and createdAt", () => {
  const habits = addHabit([], "  Read  ", now);
  assert.equal(habits.length, 1);
  assert.equal(habits[0].name, "Read");
  assert.equal(typeof habits[0].id, "string");
  assert.equal(habits[0].createdAt, now.toISOString());
});

test("does not mutate the input array", () => {
  const input = [];
  addHabit(input, "Read", now);
  assert.deepEqual(input, []);
});

test("two adds give different ids and todayList keeps insertion order", () => {
  const habits = addHabit(addHabit([], "Read", now), "Run", now);
  assert.notEqual(habits[0].id, habits[1].id);
  const list = todayList(habits);
  assert.deepEqual(list.map((h) => h.name), ["Read", "Run"]);
  assert.notEqual(list, habits);
});

test("empty or blank name throws", () => {
  assert.throws(() => addHabit([], ""), { message: "Name your habit" });
  assert.throws(() => addHabit([], "   "), { message: "Name your habit" });
});

test("duplicate name (case-insensitive, trimmed) throws", () => {
  const habits = addHabit([], "Read", now);
  assert.throws(() => addHabit(habits, "read"), { message: "You already have that habit" });
  assert.throws(() => addHabit(habits, " Read "), { message: "You already have that habit" });
});
