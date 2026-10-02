// Test helper for smoke.sh: plant a persistent cookie in the running browser, or read it back.
// It talks to the browser-level DevTools endpoint, so it needs no page and no Playwright.
//
//   node cookie.mjs <port> set   plant a cookie that expires in a day
//   node cookie.mjs <port> get   print its value, or "missing"
//
// Needs Node 22+ (global WebSocket and fetch).

const [port, action] = process.argv.slice(2);
if (!/^[0-9]+$/.test(port ?? '') || !['set', 'get'].includes(action)) {
  console.error('usage: node cookie.mjs <port> set|get');
  process.exit(2);
}
if (port === '9222') {
  console.error('refusing port 9222: it belongs to another browser');
  process.exit(2);
}

const NAME = 'dedicated_browser_smoke';
const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 0;
const waiting = new Map();
ws.onmessage = (message) => {
  const reply = JSON.parse(message.data);
  waiting.get(reply.id)?.(reply);
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    waiting.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

if (action === 'set') {
  const reply = await send('Storage.setCookies', {
    cookies: [
      {
        name: NAME,
        value: 'survived',
        domain: 'example.com',
        path: '/',
        secure: true,
        expires: Math.floor(Date.now() / 1000) + 86400,
      },
    ],
  });
  if (reply.error) {
    console.error(reply.error.message);
    process.exit(1);
  }
  console.log('set');
} else {
  const reply = await send('Storage.getCookies');
  const cookie = reply.result?.cookies?.find((c) => c.name === NAME);
  console.log(cookie ? cookie.value : 'missing');
}
ws.close();
