import { test } from "node:test";
import assert from "node:assert/strict";
import { addHabit, todayList, dayKey, isDoneToday, toggleDone, msUntilNextDay } from "../src/habits.js";

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

test("dayKey pads month and day from the local date", () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 12)), "2026-01-05");
  assert.equal(dayKey(new Date(2026, 11, 25, 0)), "2026-12-25");
  assert.equal(dayKey(new Date(2026, 9, 22, 23)), "2026-10-22");
});

const today = new Date(2026, 9, 22, 9);
const read = { id: "a", name: "Read", createdAt: "2026-10-01T00:00:00.000Z" };
const run = { id: "b", name: "Run", createdAt: "2026-10-01T00:00:00.000Z", doneDates: ["2026-10-20"] };

test("a habit with no doneDates is not done today", () => {
  assert.equal(isDoneToday(read, today), false);
});

test("toggle once is done today; toggle twice restores doneDates", () => {
  const once = toggleDone([run], "b", today);
  assert.equal(isDoneToday(once[0], today), true);
  const twice = toggleDone(once, "b", today);
  assert.equal(isDoneToday(twice[0], today), false);
  assert.deepEqual(twice[0].doneDates, ["2026-10-20"]);
});

test("toggling a habit with no doneDates marks it done", () => {
  const once = toggleDone([read], "a", today);
  assert.deepEqual(once[0].doneDates, ["2026-10-22"]);
});

test("toggling keeps a past day, and done yesterday is not done today", () => {
  const yesterday = new Date(2026, 9, 21, 20);
  const done = toggleDone([read], "a", yesterday);
  assert.equal(isDoneToday(done[0], yesterday), true);
  assert.equal(isDoneToday(done[0], today), false);
  const both = toggleDone(done, "a", today);
  assert.deepEqual(both[0].doneDates, ["2026-10-21", "2026-10-22"]);
});

test("only the target habit changes and the input is not mutated", () => {
  const input = [read, run];
  const before = structuredClone(input);
  const result = toggleDone(input, "a", today);
  assert.deepEqual(input, before);
  assert.notEqual(result, input);
  assert.deepEqual(result[1], before[1]);
  assert.deepEqual(result[0], { ...before[0], doneDates: ["2026-10-22"] });
});

test("an unknown id returns an equal copy", () => {
  const input = [read, run];
  const result = toggleDone(input, "nope", today);
  assert.notEqual(result, input);
  assert.deepEqual(result, input);
});

test("msUntilNextDay counts to the next local midnight", () => {
  const late = new Date(2026, 9, 22, 23, 59, 0);
  assert.equal(msUntilNextDay(late), 60000);
  assert.equal(msUntilNextDay(late), new Date(2026, 9, 23) - late);
  const midnight = new Date(2026, 9, 22, 0, 0, 0);
  assert.equal(msUntilNextDay(midnight), new Date(2026, 9, 23) - midnight);
  const plainDay = new Date(2026, 5, 10, 0, 0, 0);
  assert.equal(msUntilNextDay(plainDay), 86400000);
});
