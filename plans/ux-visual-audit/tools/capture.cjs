// Captura numerada + medidas. Uso: node capture.cjs <shots.json> <outDir> <elements.json>
const fs = require("fs");
const path = require("path");
const { launch, newPage, go } = require("./harness.cjs");
const inspect = require("./annotate.cjs");
const [,, shotsFile, outDir, jsonOut] = process.argv;
const shots = require(path.resolve(shotsFile));
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;

async function runStep(p, s) {
  if (s.click) { const loc = typeof s.click === "string" ? p.getByText(s.click, { exact: s.exact ?? false }).first() : p.locator(s.click.css).nth(s.click.nth || 0); await loc.scrollIntoViewIfNeeded().catch(()=>{}); await loc.click({ timeout: 4000 }); }
  if (s.role) await p.getByRole(s.role.role, { name: s.role.name.startsWith("^") ? new RegExp(s.role.name) : s.role.name, exact: s.role.name.startsWith("^") ? undefined : s.role.exact ?? false }).nth(s.role.nth || 0).click({ timeout: 4000 });
  if (s.css) await p.locator(s.css).nth(s.nth || 0).click({ timeout: 4000 });
  if (s.fill) await p.locator(s.fill.css).nth(s.fill.nth || 0).fill(s.fill.value);
  if (s.hover) await p.locator(s.hover).first().hover();
  if (s.eval) await p.evaluate(s.eval);
  await p.waitForTimeout(s.wait ?? 500);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const all = fs.existsSync(jsonOut) ? JSON.parse(fs.readFileSync(jsonOut, "utf8")) : {};
  const b = await launch();
  for (const shot of shots) {
    if (only && !only.test(shot.id)) continue;
    const variants = shot.variants || [{ suffix: "", width: 1440, height: 900, scheme: "dark" }];
    for (const v of variants) {
      const id = shot.id + (v.suffix || "");
      const p = await newPage(b, { width: v.width, height: v.height, scheme: v.scheme, auth: shot.auth === undefined ? "admin" : shot.auth, mockOpts: shot.mock || {} });
      try {
        await go(p, shot.path, shot.wait ?? 2200);
        for (const s of shot.steps || []) await runStep(p, s);
        const root = shot.root || "body";
        const data = await p.evaluate(`(${inspect.toString()})(${JSON.stringify(root)})`);
        if (shot.annotate !== false) {
          await p.screenshot({ path: `${outDir}/${id}.png`, fullPage: shot.fullPage !== false });
        }
        await p.evaluate(() => document.querySelectorAll('.__ann').forEach(n => n.remove()));
        const errs = p.__errors.filter((e) => !/ERR_FAILED|ERR_TOO_MANY_RETRIES|WebSocket|firebase|tunnel/i.test(e));
        all[id] = { path: shot.path, viewport: `${v.width}x${v.height}`, scheme: v.scheme, state: shot.state || "padrão", consoleErrors: errs, elements: data };
        console.log("ok", id, data.length, "elementos", errs.length ? "ERR:" + errs[0].slice(0, 120) : "");
      } catch (e) { console.log("FAIL", id, String(e).split("\n")[0]); await p.screenshot({ path: `${outDir}/${id}__fail.png` }).catch(()=>{}); }
      await p.context().close();
    }
  }
  await b.close();
  fs.writeFileSync(jsonOut, JSON.stringify(all, null, 1));
})();
