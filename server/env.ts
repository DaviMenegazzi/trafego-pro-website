// Carrega o arquivo .env para process.env ANTES de qualquer outro módulo ler
// variáveis de ambiente. Deve ser o primeiro import de server/db.ts e server/index.ts.
// Usa o carregador nativo do Node (>= 20.12 / 22) — sem dependências externas.
try {
  process.loadEnvFile?.();
} catch {
  // .env ausente ou ilegível — seguimos com as variáveis já presentes no ambiente
  // (ex.: definidas direto no host de produção).
}
