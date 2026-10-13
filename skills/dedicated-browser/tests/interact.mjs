// Test helper for smoke.sh: drive the running dedicated browser the way the agent's MCP server
// does, with Playwright attached over the debugging port, against a small local web app.
//
//   node interact.mjs <port> <app-port> login <screenshot>   load a German page (no translate
//                                                            offer), sign in through the form,
//                                                            click, set localStorage, load a real
//                                                            website, read the window's theme
//   node interact.mjs <port> <app-port> check <screenshot>   after a restart: the server still sees
//                                                            the cookie, localStorage is still there
//
// The web app listens on 127.0.0.1:<app-port>. Its form sets a session cookie with a real
// Set-Cookie header, the way a login does. Both phases must use the same app port: localStorage
// belongs to the origin, which includes the port. Prints "ok <what>" or "FAIL <what>" per check
// and exits 1 if any failed. Needs Node 22+ and playwright-core installed next to this file
// (smoke.sh does that).

import http from 'node:http';
import { chromium } from 'playwright-core';

const [port, appPort, phase, screenshot] = process.argv.slice(2);
const isPort = (p) => /^[0-9]+$/.test(p ?? '');
if (!isPort(port) || !isPort(appPort) || !['login', 'check'].includes(phase) || !screenshot) {
  console.error('usage: node interact.mjs <port> <app-port> login|check <screenshot.png>');
  process.exit(2);
}
if (port === '9222' || appPort === '9222') {
  console.error('refusing port 9222: it belongs to another browser');
  process.exit(2);
}

const USER = 'smoke-user';
// Enough text in one language for Chrome to detect it. Chrome offers to translate a page that is
// not in the browser's language, unless the profile turns the offer off.
const GERMAN = 'Die Stadtwerke informieren ihre Kundinnen und Kunden regelmässig über aktuelle Entwicklungen bei der Stromversorgung. In diesem Beitrag erklären wir, wie sich die Tarife im kommenden Jahr verändern und welche Möglichkeiten es gibt, den eigenen Verbrauch zu senken.';
const escape = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/login') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const user = new URLSearchParams(body).get('user') ?? '';
      res.writeHead(303, {
        'Set-Cookie': `smoke_session=${encodeURIComponent(user)}; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax`,
        Location: '/',
      });
      res.end();
    });
    return;
  }
  if (req.url === '/de') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html>
<html lang="de">
<title>Aktuelle Meldungen</title>
${`<p>${GERMAN}</p>\n`.repeat(8)}`);
    return;
  }
  const session = /(?:^|;\s*)smoke_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
  const who = session ? `Signed in as ${escape(decodeURIComponent(session))}` : 'Signed out';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<title>dedicated-browser smoke</title>
<style>body { font: 20px system-ui; margin: 40px } input, button { font: inherit }</style>
<h1 id="who">${who}</h1>
<form method="post" action="/login">
  <input name="user" aria-label="User name"> <button>Sign in</button>
</form>
<p>Clicks: <button id="count" onclick="this.textContent = Number(this.textContent) + 1">0</button></p>`);
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(Number(appPort), '127.0.0.1', resolve);
});
const app = `http://127.0.0.1:${appPort}/`;

let failed = 0;
const check = (passed, what) => {
  console.log(`${passed ? 'ok' : 'FAIL'} ${what}`);
  if (!passed) failed += 1;
};

// The default context is the dedicated profile, where the logins live. A new context would be a
// throwaway one with no logins, so the MCP server uses this one too.
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(15000);
const who = () => page.locator('#who').textContent();

// Chrome counts what it does in histograms, and the debugging port reads them. They cover the
// whole browser since its start, so a check compares the samples before and after its own step.
const cdp = await browser.newBrowserCDPSession();
const samples = async (name) => {
  const { histograms } = await cdp.send('Browser.getHistograms', { query: name });
  const buckets = histograms.find((h) => h.name === name)?.buckets ?? [];
  return new Map(buckets.map((bucket) => [bucket.low, bucket.count]));
};
const total = (counts) => [...counts.values()].reduce((sum, count) => sum + count, 0);
// Waits up to 15 seconds for the histogram to gain a sample. Returns the new counts, or null.
const nextSample = async (name, before) => {
  for (let i = 0; i < 75; i += 1) {
    const now = await samples(name);
    if (total(now) > total(before)) return now;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
};

try {
  if (phase === 'login') {
    // No translate offer, checked by what Chrome does. smoke.sh also reads translate.enabled from
    // the profile, which shows the setting and not its effect. Chrome records one decision per page
    // when the page goes away. 7 is "the user turned the offer off", 13 is "show the offer"
    // (kDisabledNeverOfferTranslations and kShowUI in Chromium's TriggerDecision). The page must
    // stay until Chrome has detected its language.
    const detectedBefore = await samples('Translate.LanguageDetection.ContentLength');
    await page.goto(`${app}de`);
    const detected = await nextSample('Translate.LanguageDetection.ContentLength', detectedBefore);
    const decidedBefore = await samples('Translate.PageLoad.TriggerDecision');
    await page.goto(app);
    const decided = detected && (await nextSample('Translate.PageLoad.TriggerDecision', decidedBefore));
    const decisions = decided ? [...decided.keys()].filter((low) => decided.get(low) > (decidedBefore.get(low) ?? 0)) : [];
    check(decisions.length === 1 && decisions[0] === 7, `no translate offer for a German page (decision ${decisions.join(', ') || 'not recorded'}, 7 is "offer turned off")`);
    check((await who()) === 'Signed out', 'fresh profile: the app says signed out');
    await page.getByLabel('User name').fill(USER);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.locator('#who', { hasText: 'Signed in' }).waitFor();
    check((await who()) === `Signed in as ${USER}`, 'typing and a click sign in; the server set a cookie');
    for (let i = 0; i < 3; i += 1) await page.locator('#count').click();
    check((await page.locator('#count').textContent()) === '3', 'three clicks run the page script');
    await page.evaluate(() => localStorage.setItem('smoke', 'kept'));
    await page.screenshot({ path: screenshot });
    await page.goto('https://example.com/');
    check((await page.title()) === 'Example Domain', 'a real website loads (example.com)');
    // FedCM's page API exists on https pages unless the launch flags turn the feature off.
    check((await page.evaluate(() => typeof window.IdentityCredential)) === 'undefined', 'FedCM is off (no IdentityCredential on an https page)');
    // The window has the theme color that the new profile got: Chrome's Orange. Chrome derives the
    // frame color from that color and from light or dark mode, so the check is "a warm color" (red
    // over green over blue) and not one value. Without a theme the frame is blue or grey.
    await page.goto('chrome://theme/colors.css?sets=ui,chrome');
    const frame = /--color-sys-header:\s*#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(await page.evaluate(() => document.body.innerText));
    const [red, green, blue] = frame ? frame.slice(1).map((hex) => parseInt(hex, 16)) : [0, 0, 0];
    check(red > green && green > blue && red - blue >= 24, `the window frame has the orange theme (frame color ${frame ? `#${frame.slice(1).join('')}` : 'not found'})`);
  } else {
    await page.goto(app);
    check((await who()) === `Signed in as ${USER}`, 'after the restart the server still sees the cookie');
    check((await page.evaluate(() => localStorage.getItem('smoke'))) === 'kept', 'localStorage survived the restart');
    await page.screenshot({ path: screenshot });
  }
} catch (error) {
  check(false, `${phase}: ${error.message.split('\n')[0]}`);
}

// No browser.close(): exiting only drops the connection, the way a stopped MCP server does, and
// smoke.sh checks that the browser is still running afterwards.
await page.close().catch(() => {});
server.close();
process.exit(failed ? 1 : 0);
