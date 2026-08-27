const accountId = process.argv[2];
const token = process.env.META_DIRECT_TOKEN || process.env.META_ADS_VALIDATION_TOKEN;
if (!accountId || !token) throw new Error("Conta Meta ou token de leitura não configurado");
const normalized = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
const url = `https://graph.facebook.com/v21.0/${normalized}?fields=balance,spend_cap,amount_spent,funding_source_details&access_token=${encodeURIComponent(token)}`;
const response = await fetch(url);
const body = await response.json().catch(() => ({ error: { message: "Resposta não JSON" } }));
const safe = response.ok
  ? { status: response.status, accountId: normalized, fields: body }
  : { status: response.status, accountId: normalized, error: body?.error?.message ?? "Erro não identificado", code: body?.error?.code ?? null };
console.log(JSON.stringify(safe, null, 2));
