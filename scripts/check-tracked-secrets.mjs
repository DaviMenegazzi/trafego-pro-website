import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const blockedFiles = new Set([".project-config.json"]);
const findings = [];

for (const file of trackedFiles) {
  if (blockedFiles.has(file)) findings.push(`${file}: arquivo de configuração sensível não pode ser rastreado`);
  if (!existsSync(file)) continue;
  const content = readFileSync(file, "utf8");
  const checks = [
    ["chave OpenAI", /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/],
    ["token Supabase service role", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
    ["credencial AWS", /(?:AKIA|ASIA)[A-Z0-9]{16}/],
    ["URL de banco com senha", /mysql:\/\/[^\s"']+:[^\s"']+@/],
  ];
  for (const [label, pattern] of checks) {
    if (pattern.test(content)) findings.push(`${file}: ${label}`);
  }
  const assignedSecret = /(?:OPENAI_API_KEY|EVOLUTION_SUPABASE_SERVICE_ROLE_KEY|EVOLUTION_WEBHOOK_SECRET|BUILT_IN_FORGE_API_KEY|VITE_FRONTEND_FORGE_API_KEY|JWT_SECRET)\s*[:=]\s*["']([^"']+)["']/g;
  for (const match of content.matchAll(assignedSecret)) {
    if (!/^(?:test|example|your|<)/i.test(match[1])) findings.push(`${file}: valor atribuído a segredo`);
  }
}

if (findings.length) {
  console.error("Verificação de segredos falhou:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Verificação de segredos aprovada: ${trackedFiles.length} arquivo(s) rastreado(s), sem valores sensíveis.`);
