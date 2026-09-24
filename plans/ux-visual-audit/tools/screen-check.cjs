// Uso: node screen-check.cjs <prefixo> '<json de passos por captura>'
const { launch, newPage, go } = require("./harness.cjs");
const [, , prefix, spec] = process.argv;
const shots = JSON.parse(spec);
(async () => {
  const b = await launch();
  for (const s of shots) {
    const p = await newPage(b, { width: s.w || 1440, height: s.h || 900, auth: s.auth === undefined ? "admin" : s.auth, mockOpts: s.mock || {} });
    await go(p, s.path, s.wait || 3000);
    for (const st of s.steps || []) {
      if (st.role) await p.getByRole(st.role[0], { name: new RegExp(st.role[1]) }).nth(st.nth || 0).click();
      if (st.text) await p.getByText(st.text, { exact: !!st.exact }).first().click();
      if (st.hover) await p.getByRole(st.hover[0], { name: new RegExp(st.hover[1]) }).first().hover();
      if (st.key) await p.keyboard.press(st.key);
      await p.waitForTimeout(st.wait || 600);
    }
    await p.screenshot({ path: `${prefix}-${s.name}.png`, fullPage: !!s.full });
    const sw = await p.evaluate(() => { const W = document.documentElement.clientWidth; let over = 0; document.querySelectorAll("main *").forEach((e) => { const r = e.getBoundingClientRect(); if (r.right > W + 1 && r.width > 0 && getComputedStyle(e).position !== "fixed") { let a = e.parentElement, clipped = false; while (a) { const o = getComputedStyle(a).overflowX; if ((o === "auto" || o === "scroll") && a.getBoundingClientRect().right <= W + 1) { clipped = true; break; } a = a.parentElement; } if (!clipped) over++; } }); return over; });
    const errs = p.__errors.filter((e) => !/ERR_|WebSocket|tunnel|firebase/i.test(e));
    console.log(s.name, "fora-da-tela:", sw, errs.length ? "ERROS: " + errs.slice(0, 3).join(" | ") : "");
    await p.context().close();
  }
  await b.close();
})();
