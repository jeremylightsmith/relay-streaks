import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createServer } from "../server.js";

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

function rawGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port: server.address().port, path }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("GET / serves the page", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/html/);
  const body = await res.text();
  for (const id of ['id="add-habit"', 'id="habit-name"', 'id="today"']) {
    assert.ok(body.includes(id), `missing ${id}`);
  }
});

test("GET serves the app modules as JavaScript", async () => {
  for (const path of ["/src/app.js", "/src/habits.js"]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get("content-type"), /^text\/javascript/, path);
  }
});

test("GET a missing file is a 404", async () => {
  const res = await fetch(`${base}/nope.js`);
  assert.equal(res.status, 404);
});

test("path traversal does not return the file", async () => {
  const res = await rawGet("/../package.json");
  assert.notEqual(res.status, 200);
  assert.ok(!res.body.includes('"relay-streaks"'));
});
