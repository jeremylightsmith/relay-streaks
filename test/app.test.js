import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Just enough DOM for src/app.js.
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = {};
    this.className = "";
    this.value = "";
    this.type = "";
    this._text = "";
  }
  get textContent() {
    return this._text + this.children.map((c) => (typeof c === "string" ? c : c.textContent)).join("");
  }
  set textContent(text) {
    this._text = String(text);
    this.children = [];
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes) {
    this._text = "";
    this.children = nodes;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }
  dispatch(type, event = {}) {
    for (const fn of this.listeners[type] ?? []) fn({ type, target: this, preventDefault() {}, ...event });
  }
  click() {
    this.dispatch("click");
  }
  focus() {}
}

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

let loads = 0;

async function loadApp(storage = fakeStorage()) {
  const els = Object.fromEntries(
    ["add-habit", "habit-name", "error", "today", "today-date"].map((id) => [id, new FakeElement("div")]),
  );
  const document = new FakeElement("document");
  document.visibilityState = "visible";
  document.getElementById = (id) => els[id] ?? null;
  document.createElement = (tag) => new FakeElement(tag);
  globalThis.document = document;
  globalThis.window = new FakeElement("window");
  globalThis.localStorage = storage;
  await import(`../src/app.js?load=${++loads}`);
  return { els, document, window: globalThis.window, storage };
}

function rows(els) {
  return els.today.children.map((li) => {
    const button = li.children[0];
    return {
      button,
      id: button.dataset.id,
      name: button.textContent.replace("✓", "").trim(),
      pressed: button.getAttribute("aria-pressed"),
      check: button.children.find((c) => c.className === "check")?.textContent,
    };
  });
}

function addHabit(els, name) {
  els["habit-name"].value = name;
  els["add-habit"].dispatch("submit");
}

const saved = (storage) => JSON.parse(storage.data["streaks.habits"]);

beforeEach(() => {
  // 9pm local on Oct 22 2026, three hours before midnight.
  mock.timers.enable({ apis: ["Date", "setTimeout"], now: new Date(2026, 9, 22, 21, 0, 0) });
});

afterEach(() => {
  mock.timers.reset();
});

test("each habit is a full-row button, not done when new", async () => {
  const { els } = await loadApp();
  addHabit(els, "Read");
  const [row] = rows(els);
  assert.equal(row.button.tagName, "BUTTON");
  assert.equal(row.button.type, "button");
  assert.equal(row.button.className, "habit");
  assert.equal(row.name, "Read");
  assert.equal(row.pressed, "false");
  assert.notEqual(row.check, "✓");
  assert.equal(row.button.children[0].getAttribute("aria-hidden"), "true");
});

test("tapping a habit marks it done, saves, and tapping again undoes it", async () => {
  const { els, storage } = await loadApp();
  addHabit(els, "Read");
  addHabit(els, "Run");

  rows(els)[0].button.click();
  let [read, run] = rows(els);
  assert.equal(read.pressed, "true");
  assert.equal(read.check, "✓");
  assert.equal(run.pressed, "false");
  assert.deepEqual(saved(storage)[0].doneDates, ["2026-10-22"]);
  assert.deepEqual(rows(els).map((r) => r.name), ["Read", "Run"]);

  rows(els)[0].button.click();
  [read] = rows(els);
  assert.equal(read.pressed, "false");
  assert.notEqual(read.check, "✓");
  assert.deepEqual(saved(storage)[0].doneDates, []);
});

test("done state survives a reload", async () => {
  const first = await loadApp();
  addHabit(first.els, "Read");
  rows(first.els)[0].button.click();

  const second = await loadApp(fakeStorage(first.storage.data));
  assert.equal(rows(second.els)[0].pressed, "true");
});

test("the date heading is set on load", async () => {
  const { els } = await loadApp();
  assert.match(els["today-date"].textContent, /October 22/);
});

test("at midnight the list resets to not done, without saving", async () => {
  const { els, storage } = await loadApp();
  addHabit(els, "Read");
  rows(els)[0].button.click();
  const before = storage.data["streaks.habits"];

  mock.timers.tick(3 * 60 * 60 * 1000);
  assert.equal(rows(els)[0].pressed, "false");
  assert.match(els["today-date"].textContent, /October 23/);
  assert.equal(storage.data["streaks.habits"], before);

  // The timer reschedules itself for the following midnight.
  rows(els)[0].button.click();
  mock.timers.tick(24 * 60 * 60 * 1000);
  assert.equal(rows(els)[0].pressed, "false");
  assert.match(els["today-date"].textContent, /October 24/);
});

test("returning to the tab or window after midnight re-renders", async () => {
  const { els, document, window } = await loadApp();
  addHabit(els, "Read");
  rows(els)[0].button.click();

  // Move the clock past midnight without firing timers (as when a laptop sleeps).
  mock.timers.setTime(new Date(2026, 9, 23, 8, 0, 0).getTime());
  document.visibilityState = "hidden";
  document.dispatch("visibilitychange");
  assert.equal(rows(els)[0].pressed, "true");

  document.visibilityState = "visible";
  document.dispatch("visibilitychange");
  assert.equal(rows(els)[0].pressed, "false");

  rows(els)[0].button.click();
  mock.timers.setTime(new Date(2026, 9, 24, 8, 0, 0).getTime());
  window.dispatch("focus");
  assert.equal(rows(els)[0].pressed, "false");
});
