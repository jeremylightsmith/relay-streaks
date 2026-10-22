import { addHabit, todayList } from "./habits.js";
import { createStore } from "./store.js";

const store = createStore(localStorage);
let habits = store.load();

const form = document.getElementById("add-habit");
const input = document.getElementById("habit-name");
const error = document.getElementById("error");
const list = document.getElementById("today");

document.getElementById("today-date").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function render() {
  list.replaceChildren(
    ...todayList(habits).map((habit) => {
      const li = document.createElement("li");
      li.textContent = habit.name;
      return li;
    }),
  );
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

render();
