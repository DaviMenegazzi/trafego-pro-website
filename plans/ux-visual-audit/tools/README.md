# Ferramentas da auditoria

Reproduzem as capturas numeradas sem backend: o Playwright intercepta `/api/*` e a leitura do Firebase com os dados de `mock.cjs`.

```bash
npx vite --port 5173 &            # front-end
cd plans/ux-visual-audit/tools
npm i playwright                  # uma vez, fora do projeto
node capture.cjs shots.json ../img ../elements.json                # antes (UI da auditoria)
node capture.cjs shots-after.json ../after ../after/elements.json  # depois (mesmos ids, cliques da UI nova)
ONLY='^04-dashboard' node capture.cjs shots-after.json ../after ../after/elements.json
node elstats.cjs $PWD/../after/elements.json                       # totais de title=, nativos, alvos < 24px
```

- `harness.cjs` abre o navegador (usa o Chromium em `/opt/pw-browsers` quando existir) e instala as rotas simuladas.
- `annotate.cjs` é o `annotate-elements.js` do kit: numera e mede cada elemento interativo.
- `shots.json` lista telas, estados (cliques) e resoluções da UI auditada; `shots-after.json` tem os mesmos ids com os cliques da UI nova (nomes começando com `^` viram expressão regular).
- `screen-check.cjs` tira capturas rápidas de uma tela e conta elementos fora da largura: `node screen-check.cjs saida/prefixo '[{"name":"x","path":"/dashboard"}]'`.
- O mock usa os escopos reais da API de IA (`leads:summary:read`, `crm:summary:read`).
