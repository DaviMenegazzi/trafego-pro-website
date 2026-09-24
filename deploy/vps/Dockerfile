# Imagem de produção da Tráfego Pro para a VPS.
# O build (vite + esbuild) roda FORA da VPS — aqui só entram o dist/ pronto
# e as dependências de produção, para não disputar memória com a Evolution.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3200 \
    NODE_OPTIONS=--max-old-space-size=384

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune

COPY dist ./dist

USER node
EXPOSE 3200
CMD ["node", "dist/index.js"]
