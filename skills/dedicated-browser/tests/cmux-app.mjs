// Local web app for smoke-cmux.sh: a sign-in that sets a real Set-Cookie, a page that shows the
// cookies the server received, and a page with a link that opens a pop-up.
// Usage: node cmux-app.mjs <port>
import { createServer } from "node:http";

const port = Number(process.argv[2]);
const html = (body) => "<!doctype html><meta charset=\"utf-8\"><title>smoke</title><body>" + body + "</body>";
const send = (res, body, headers = {}) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...headers });
  res.end(html(body));
};

createServer((req, res) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  if (path === "/login") {
    return send(res, "signed in", { "Set-Cookie": "session=smoke; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax" });
  }
  if (path === "/whoami") return send(res, "cookies: " + (req.headers.cookie ?? "(none)"));
  if (path === "/popup") return send(res, "<a id=\"open\" href=\"/whoami\" target=\"_blank\">open</a>");
  return send(res, "home");
}).listen(port, "127.0.0.1");
