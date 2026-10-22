import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      return send(res, 400, "Bad request");
    }
    // URL parsing collapses "..", so check the raw path as well as the decoded one.
    if ([req.url.split("?")[0], pathname].some((p) => p.split(/[\\/]/).includes(".."))) {
      return send(res, 400, "Bad request");
    }
    if (pathname === "/") pathname = "/index.html";

    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT + path.sep)) return send(res, 400, "Bad request");

    try {
      const body = await readFile(file);
      send(res, 200, body, TYPES[path.extname(file)] ?? "application/octet-stream");
    } catch {
      send(res, 404, "Not found");
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3014;
  createServer().listen(port, () => console.log(`Streaks on http://localhost:${port}`));
}
