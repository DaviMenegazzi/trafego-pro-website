
Bota o banco no servidor do motor de conversa — ele é a fonte da verdade da conversa. O dashboard não acessa esse banco diretamente (evita acoplamento entre os dois serviços); a ponte entre eles é a tabela `SYNC_EVENTS`, que funciona como outbox: toda vez que um lead muda de estado, grava um evento pendente ali, e um worker separado tenta entregar pro dashboard via API, com retry se o dashboard estiver fora do ar. Sem isso, se o servidor do dashboard cair um minuto, você perde lead.

**1. Payload que a Evolution API manda pro motor (inbound)**

Baseado na estrutura real da Evolution API v2:

```json
{
  "event": "messages.upsert",
  "instance": "cliente_uffa",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0C767D..."
    },
    "message": {
      "conversation": "Quero saber mais sobre o produto X"
    },
    "messageTimestamp": 1735689600,
    "referral": {
      "ctwa_clid": "AfeCbY...",
      "source_id": "1234567890",
      "source_type": "ad",
      "headline": "Campanha Setembro"
    }
  }
}
```

Ponto de atenção real: existe um bug conhecido na Evolution API (`#2645` no repo) onde o `referral`/`ctwa_clid` — que é exatamente o dado que amarra o lead ao anúncio — some do payload em algumas versões/configurações, e só vem na primeira mensagem do contato mesmo quando funciona. Isso é crítico pro seu caso porque é a atribuição anúncio → lead que você quer no dashboard. Vale testar isso na sua versão específica antes de depender dele — se estiver quebrado, dá pra contornar rastreando `remoteJid` + timestamp da primeira mensagem contra o clique reportado pela Meta Conversions API como fallback.

**2. Payload que o motor manda pro dashboard (outbound, seu contrato)**

```json
{
  "event_type": "lead.qualified",
  "client_id": "uuid-do-cliente",
  "lead": {
    "id": "uuid-do-lead",
    "phone": "5511999999999",
    "name": "João",
    "source_ad_id": "1234567890",
    "source_campaign": "Campanha Setembro",
    "status": "qualified_hot",
    "score": 82,
    "answers": {
      "orcamento": "5000-10000",
      "prazo": "esse mes",
      "interesse": "produto X"
    }
  },
  "occurred_at": "2026-09-01T14:30:00Z"
}
```

O worker do outbox assina esse payload com HMAC usando o `dashboard_webhook_secret` de cada cliente e faz POST no `dashboard_webhook_url`. O dashboard valida a assinatura, faz upsert do lead na tabela dele e já linka com a campanha (porque `source_ad_id` veio junto). Se o dashboard responder diferente de 2xx, o worker marca o evento como `failed`, incrementa `attempts` e tenta de novo com backoff — não perde o lead, só atrasa.