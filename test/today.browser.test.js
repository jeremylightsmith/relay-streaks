import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "../server.js";

let server;
let base;
let browser;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
  try {
    browser = await chromium.launch();
  } catch (e) {
    throw new Error(`Couldn't launch Chromium. Run \`npx playwright install chromium\`.\n${e.message}`);
  }
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
});

async function withPage(options, fn) {
  const context = await browser.newContext(options);
  try {
    await fn(await context.newPage());
  } finally {
    await context.close();
  }
}

async function addHabit(page, name) {
  await page.fill("#habit-name", name);
  await page.press("#habit-name", "Enter");
}

function habit(page, name) {
  return page.locator("#today .habit", { hasText: name });
}

test("tap toggles done and survives reload", async () => {
  await withPage({}, async (page) => {
    await page.goto(base + "/");
    await addHabit(page, "Read");

    const read = habit(page, "Read");
    await assertPressed(read, "false");
    await read.click();
    await assertPressed(read, "true");
    assert.equal(await read.locator(".check").textContent(), "✓");
    assert.ok(await read.locator(".check").isVisible());

    await page.reload();
    await assertPressed(read, "true");
    await read.click();
    await assertPressed(read, "false");

    await page.reload();
    await assertPressed(read, "false");
  });
});

test("page left open past midnight clears the checks", async () => {
  await withPage({ timezoneId: "UTC", locale: "en-US" }, async (page) => {
    await page.clock.install({ time: new Date(Date.UTC(2026, 9, 22, 23, 59, 0)) });
    await page.goto(base + "/");
    await addHabit(page, "Read");

    const read = habit(page, "Read");
    await read.click();
    await assertPressed(read, "true");
    const before = await page.textContent("#today-date");
    assert.match(before, /22/);

    await page.clock.runFor(2 * 60 * 1000);

    await assertPressed(read, "false");
    const after = await page.textContent("#today-date");
    assert.notEqual(after, before);
    assert.match(after, /23/);

    await page.reload();
    await assertPressed(read, "false");
  });
});

async function assertPressed(locator, value) {
  await locator.waitFor();
  assert.equal(await locator.getAttribute("aria-pressed"), value);
}
