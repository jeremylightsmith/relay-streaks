import { addHabit, todayList, dayKey, isDoneToday, toggleDone, msUntilNextDay } from "./habits.js";
import { createStore } from "./store.js";

const store = createStore(localStorage);
let habits = store.load();
let renderedDay;

const form = document.getElementById("add-habit");
const input = document.getElementById("habit-name");
const error = document.getElementById("error");
const list = document.getElementById("today");
const heading = document.getElementById("today-date");

function habitRow(habit, now) {
  const done = isDoneToday(habit, now);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "habit";
  button.dataset.id = habit.id;
  button.setAttribute("aria-pressed", String(done));

  const check = document.createElement("span");
  check.className = "check";
  check.setAttribute("aria-hidden", "true");
  check.textContent = done ? "✓" : "";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = habit.name;

  button.append(check, name);
  button.addEventListener("click", () => {
    habits = toggleDone(habits, habit.id, new Date());
    store.save(habits);
    render();
  });

  const li = document.createElement("li");
  li.append(button);
  return li;
}

function render() {
  const now = new Date();
  renderedDay = dayKey(now);
  heading.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  list.replaceChildren(...todayList(habits).map((habit) => habitRow(habit, now)));
}

function checkDay() {
  if (dayKey(new Date()) !== renderedDay) render();
}

function scheduleRollover() {
  setTimeout(() => {
    checkDay();
    scheduleRollover();
  }, msUntilNextDay(new Date()));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    habits = addHabit(habits, input.value);
  } catch (e) {
    error.textContent = e.message;
    return;
  }
  store.save(habits);
  render();
  input.value = "";
  error.textContent = "";
  input.focus();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkDay();
});
window.addEventListener("focus", checkDay);

render();
scheduleRollover();
