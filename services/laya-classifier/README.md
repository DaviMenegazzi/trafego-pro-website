# Laya Lead Stage Classifier

Microserviço Python (FastAPI) que roda o modelo [Laya](https://huggingface.co/convaiinnovations/laya)
(somente o checkpoint multilíngue, via `laya.load(..., subfolder="multilingual")`) para classificar
ao vivo a etapa do funil de uma conversa do WhatsApp, sem depender da OpenAI.

> **Não use `Router(preload=True)`**: ele mantém 3 checkpoints residentes (~4,6GB em fp32) e em
> 2026-09-23 esgotou a RAM da VPS, derrubando a Evolution API de produção.

Em produção roda em `https://laya.147.93.10.249.sslip.io`, na mesma VPS da Evolution, com limite
rígido de recursos no compose (`mem_limit`/`memswap_limit: 2000m`, `cpus: 0.6`,
`restart: on-failure:3`) e uma inferência por vez (lock). Medido: ~23s para carregar do cache,
~2,5s por conversa curta, ~9s no pior caso (10 mensagens longas), ~1,7GB de RAM.

Recebe `POST /classify` com o histórico recente do lead e devolve `{proposedStage, confidence}`
usando os mesmos 7 estágios já definidos em `server/evolutionAiClassification.ts`.

Também expõe `POST /predict` genérico (usado pelo SDR Flow, que roda na mesma VPS e chama
`http://127.0.0.1:8010`): recebe `{state, questions}` no formato do `agent.predict` da Laya e
devolve `{answers, elapsedMs}`. Usa o mesmo modelo, o mesmo lock e o mesmo segredo do `/classify`,
então **a fila de uma inferência por vez é compartilhada entre os dois projetos**. Para não
estourar o `mem_limit`, o payload é validado: `state` até 12.000 caracteres, até 4 perguntas,
tipos `choice` (2–10 opções), `score` (2–10 níveis) ou `noul`, instruções até 800 caracteres e
cada critério até 300.

## Passo 0 — descobrir o proxy HTTPS já existente na VPS

Antes de expor este serviço em `laya.147.93.10.249.sslip.io`, é preciso saber como
`evolution.147.93.10.249.sslip.io` já recebe HTTPS hoje (não está no `docker-compose.yml` do
projeto `evolution`, então é algo no host). Rode via SSH e me envie a saída:

```bash
sudo ss -tlnp | grep -E ':80|:443'
systemctl status caddy 2>/dev/null | head -5
systemctl status nginx 2>/dev/null | head -5
sudo find / -maxdepth 4 -iname "Caddyfile" -o -iname "*.conf" -path "*nginx*" 2>/dev/null
```

Com isso eu ajusto o passo 3 abaixo para reaproveitar o proxy existente em vez de tentar subir um
segundo serviço escutando nas portas 80/443 (o que quebraria o `evolution-manager`/API atuais).

## Passo 1 — copiar os arquivos para a VPS

```bash
scp -r services/laya-classifier root@147.93.10.249:/opt/laya-classifier
```

## Passo 2 — criar o `.env` de produção

```bash
ssh root@147.93.10.249 "cd /opt/laya-classifier && cp .env.example .env"
# gere um segredo forte e cole no .env (mesmo valor vai em LAYA_SERVICE_SECRET no app Node)
ssh root@147.93.10.249 "openssl rand -hex 32"
```

## Passo 3 — adicionar o serviço ao docker-compose existente

Edite `/opt/evolution/docker-compose.yml` na VPS e adicione este serviço (mantém o padrão dos
demais: build local, sempre reiniciar, só acessível em loopback — o proxy HTTPS do passo 0 é quem
expõe a porta publicamente):

```yaml
  laya-classifier:
    build:
      context: /opt/laya-classifier
      dockerfile: Dockerfile
    container_name: laya_classifier
    restart: on-failure:3
    mem_limit: 2000m
    memswap_limit: 2000m
    cpus: 0.6
    ports:
      - "127.0.0.1:8010:8010"
    env_file:
      - /opt/laya-classifier/.env
    environment:
      - OMP_NUM_THREADS=1
      - HF_HOME=/hf-cache
    volumes:
      - /opt/laya-classifier/hf-cache:/hf-cache
    networks:
      - evolution_net
```

Depois:

```bash
cd /opt/evolution && docker compose up -d --build laya-classifier
docker compose logs -f laya-classifier   # espere "Laya Router carregado em ...s"
```

## Passo 4 — expor via HTTPS

Depende do que o Passo 0 revelar. Se for Caddy, normalmente basta adicionar ao `Caddyfile`:

```
laya.147.93.10.249.sslip.io {
  reverse_proxy 127.0.0.1:8010
}
```

e recarregar (`caddy reload` ou `systemctl reload caddy`). Se for nginx + certbot, o equivalente é
um novo `server{}` com `proxy_pass http://127.0.0.1:8010;` seguido de
`certbot --nginx -d laya.147.93.10.249.sslip.io`. Eu escrevo o bloco exato assim que souber qual dos
dois (ou outro) está em uso.

## Teste manual

```bash
curl -s https://laya.147.93.10.249.sslip.io/health
curl -s https://laya.147.93.10.249.sslip.io/classify \
  -H "Authorization: Bearer <LAYA_SERVICE_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"leadId":"test","instanceName":"test","currentStage":"lead_not_responded","messages":[{"direction":"incoming","bodyText":"Oi, quanto custa o plano?"}]}'
```

## Recursos da VPS

A VPS atual (plano KVM 1: 1 vCPU / 4GB RAM) já roda Evolution API + Postgres + Redis +
whatsapp-assistant. Um modelo de ~322M parâmetros rodando em CPU, concorrendo por esse único core,
não vai chegar nos ~33ms/GPU do model card — espere algo na casa de várias centenas de ms a poucos
segundos por classificação, especialmente sob carga. O endpoint roda de forma síncrona (uvicorn
padrão, sem workers extras) de propósito, para não competir por CPU com o restante da stack. Se a
latência ficar alta demais ou prejudicar a Evolution API, o caminho é aumentar o plano da VPS ou
mover este serviço para outra máquina.
