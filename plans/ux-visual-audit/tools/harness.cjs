const { chromium } = require("playwright");
const mock = require("./mock.cjs");
const BASE = process.env.BASE || "http://localhost:5173";

async function launch() {
  return chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });
}

async function newPage(browser, { width = 1440, height = 900, scheme = "dark", auth = "admin", mockOpts = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1, ignoreHTTPSErrors: true, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();
  page.__errors = [];
  page.on("pageerror", (e) => page.__errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push(m.text()); });
  await page.route(/googletagmanager|google-analytics|facebook\.net|doubleclick/, (r) => r.abort());
  await page.route(/firebaseio\.com/, (r) => {
    const u = r.request().url();
    if (u.includes("trafegopro.json") && r.request().method() === "GET") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockOpts.emptyFinance ? null : mock.financeDB()) });
    return r.abort();
  });
  await page.route(/\/api\//, (r) => {
    const req = r.request();
    const [status, body] = mock.handle(req.url(), req.method(), mockOpts);
    return r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  if (auth) {
    const user = auth === "client" ? mock.CLIENT : mock.ADMIN;
    await page.addInitScript(([u]) => {
      if (!sessionStorage.getItem("__seeded")) {
        localStorage.setItem("tp_token", "tok");
        localStorage.setItem("tp_user", JSON.stringify(u));
        sessionStorage.setItem("__seeded", "1");
      }
    }, [user]);
  }
  return page;
}

async function go(page, path, wait = 1500) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(wait);
}

module.exports = { launch, newPage, go, BASE };
