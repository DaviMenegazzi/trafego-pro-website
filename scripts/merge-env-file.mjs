import { readFile, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const targetPath = valueFor("--target");
const sourcePath = valueFor("--source");
const mappings = args
  .filter((value, index) => args[index - 1] === "--map")
  .map((entry) => entry.split("=", 2));

if (!targetPath || !sourcePath || mappings.some(([source, target]) => !source || !target)) {
  throw new Error(
    "Uso: node scripts/merge-env-file.mjs --target .env --source arquivo.env --map ORIGEM=DESTINO",
  );
}

const parseEnv = (contents) => {
  const values = new Map();
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
};

const [targetContents, sourceContents] = await Promise.all([
  readFile(targetPath, "utf8"),
  readFile(sourcePath, "utf8"),
]);

const sourceValues = parseEnv(sourceContents);
const replacements = new Map();
for (const [sourceName, targetName] of mappings) {
  const value = sourceValues.get(sourceName);
  if (value === undefined || value === "") {
    throw new Error(`Variável obrigatória ausente na origem: ${sourceName}`);
  }
  replacements.set(targetName, value);
}

const seen = new Set();
const lines = targetContents.split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
  if (!match || !replacements.has(match[1])) return line;
  seen.add(match[1]);
  return `${match[1]}=${replacements.get(match[1])}`;
});

for (const [name, value] of replacements) {
  if (!seen.has(name)) lines.push(`${name}=${value}`);
}

await writeFile(targetPath, `${lines.join("\n").replace(/\n+$/, "")}\n`, {
  encoding: "utf8",
  mode: 0o600,
});

console.log(`Atualizadas ${replacements.size} variáveis em ${targetPath}.`);
