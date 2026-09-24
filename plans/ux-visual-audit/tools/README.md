# Ferramentas da auditoria

Reproduzem as capturas numeradas sem backend: o Playwright intercepta `/api/*` e a leitura do Firebase com os dados de `mock.cjs`.

```bash
npx vite --port 5173 &            # front-end
cd plans/ux-visual-audit/tools
npm i playwright                  # uma vez, fora do projeto
node capture.cjs shots.json ../img ../elements.json          # antes
node capture.cjs shots.json ../after ../after/elements.json  # depois
ONLY='^04-dashboard' node capture.cjs shots.json ../after ../after/elements.json
```

- `harness.cjs` abre o navegador (usa o Chromium em `/opt/pw-browsers` quando existir) e instala as rotas simuladas.
- `annotate.cjs` é o `annotate-elements.js` do kit: numera e mede cada elemento interativo.
- `shots.json` lista telas, estados (cliques) e resoluções.
