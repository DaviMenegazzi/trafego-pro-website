const e = require(process.argv[2]);
let title = 0, iconNoLabel = 0, native = 0, small = 0, total = 0, heights = {};
for (const id of Object.keys(e)) {
  if (!e[id].viewport.startsWith("1440")) continue;
  for (const el of e[id].elements) {
    total++;
    if (el.hasTitleTooltip) title++;
    if (el.iconOnly && !el.label) iconNoLabel++;
    if (el.native) native++;
    if (el.h < 24 && el.tag !== "a") small++;
  }
}
console.log({ screens: Object.keys(e).length, total, title, iconNoLabel, native, small });
