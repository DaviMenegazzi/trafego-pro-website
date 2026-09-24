// API simulada para a auditoria visual. Dados realistas, volumes de produção.
const UNITS = [
  "Vida Card Ijuí", "Vida Card Santa Rosa", "Vida Card Cruz Alta", "Vida Card Tupanciretã",
  "Vida Card Santo Ângelo", "Vida Card Panambi", "Vida Card Três Passos", "Vida Card Frederico Westphalen",
  "Vida Card Erechim", "Vida Card Passo Fundo", "Vida Card Carazinho", "Vida Card Palmeira das Missões",
].map((name, i) => ({ id: `act_10${2000 + i * 37}`, name }));

let seed = 42;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const round = (v, d = 2) => Number(v.toFixed(d));
const today = new Date("2026-09-24T12:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() - n); return d; };

function daily(n = 30) {
  const rows = [];
  for (let i = n - 1; i >= 0; i--) {
    const spend = 70 + rnd() * 60;
    const conv = Math.round(spend / (6 + rnd() * 6));
    const conn = conv + Math.round(rnd() * 4);
    const imp = Math.round(4000 + rnd() * 3000);
    const clicks = Math.round(imp * (0.011 + rnd() * 0.01));
    rows.push({
      date_start: iso(daysAgo(i)), total_spend: round(spend), total_conversas_iniciadas: conv,
      total_messaging_connections: conn, total_primeiras_respostas: Math.round(conv * 0.82),
      total_conversas_respondidas: Math.round(conn * 0.74), total_leads_meta: Math.round(conv * 0.3),
      total_impressions: imp, total_clicks: clicks, custo_por_conversa: round(spend / Math.max(conv, 1)),
      avg_cpc: round(spend / clicks), avg_cpm: round((spend / imp) * 1000), avg_ctr: round((clicks / imp) * 100),
      avg_frequency: round(1.2 + rnd() * 0.8),
    });
  }
  return rows;
}
const CAMPAIGN_NAMES = [
  "[CONV] WhatsApp | Plano Família | Aberto 25km", "[CONV] WhatsApp | Consultas R$ 39 | Interesses Saúde",
  "[CONV] WhatsApp | Exames com desconto | Remarketing 30d", "[CONV] WhatsApp | Odonto | Público 30-55",
  "[LEADS] Formulário | Adesão Online | LAL 1%", "[CONV] WhatsApp | Farmácia 20% | Aberto",
  "[RECONHEC] Vídeo | Institucional | Cidade + 40km", "[CONV] WhatsApp | Oferta relâmpago | Stories",
];
function campaigns() {
  return CAMPAIGN_NAMES.map((campaign_name, i) => {
    const spend = 180 + rnd() * 900; const conv = i === 6 ? 0 : Math.round(spend / (5 + rnd() * 14));
    const imp = Math.round(18000 + rnd() * 60000); const clicks = Math.round(imp * (0.008 + rnd() * 0.015));
    return { campaign_name, total_spend: round(spend), total_conversas_iniciadas: conv,
      custo_por_conversa: conv ? round(spend / conv) : null, total_leads_meta: Math.round(conv * 0.3),
      total_impressions: imp, total_clicks: clicks, avg_ctr: round((clicks / imp) * 100), avg_cpc: round(spend / clicks),
      avg_cpm: round((spend / imp) * 1000) };
  });
}
const OFFERS = ["Plano Família", "Consultas R$ 39", "Exames com desconto", "Odonto", "Adesão Online", "Farmácia 20%"];
function offers(unitId) {
  const rows = [];
  for (let i = 0; i < 38; i++) {
    const offer = OFFERS[i % OFFERS.length];
    const paused = i % 5 === 4;
    const spend = paused ? 0 : 20 + rnd() * 400;
    const conv = paused ? Math.round(rnd() * 4) : i % 11 === 7 ? 0 : Math.round(spend / (3 + rnd() * 15));
    const imp = Math.round(3000 + rnd() * 30000); const clicks = Math.round(imp * (0.007 + rnd() * 0.018));
    const cpc = conv ? spend / conv : 0;
    const perf = paused ? (conv ? "Residual" : null) : conv === 0 ? "Sem conversas" : cpc < 5 ? "Excelente" : cpc < 9 ? "Positivo" : cpc < 13 ? "Atenção" : "Crítico";
    rows.push({
      id: i + 1, account_id: unitId, date_start: iso(daysAgo(29)), date_stop: iso(today), synced_at: daysAgo(0).toISOString(),
      campaign_id: `c${i % 8}`, campaign_name: CAMPAIGN_NAMES[i % 8], adset_id: `as${i % 12}`, adset_name: `Conjunto ${(i % 4) + 1} | ${["Aberto", "Interesses", "Família", "Remarketing"][i % 4]}`,
      ad_id: `ad${i}`, ad_name: `${offer} | Criativo ${String.fromCharCode(65 + (i % 6))} | ${["Feed 4:5", "Stories 9:16", "Reels"][i % 3]}`,
      creative_id: `cr${i}`, creative_name: `${offer} ${i}`, offer_name: offer, offer_status: paused ? "Pausada" : "Ativa",
      status_formatado: paused ? "Pausada" : "Ativa", performance_status: perf, performance_reason: null,
      ad_image_url: null, total_spend: round(spend), total_conversas_iniciadas: conv, total_messaging_connections: conv + 2,
      total_leads_meta: Math.round(conv * 0.3), alcance: Math.round(imp * 0.7), total_impressions: imp, total_clicks: clicks,
      total_link_clicks: Math.round(clicks * 0.8), avg_ctr: round((clicks / imp) * 100), avg_cpc: round(clicks ? spend / clicks : 0),
      avg_cpm: round((spend / imp) * 1000), custo_por_conversa: conv ? round(spend / conv) : null, cpl_meta: null, frequency: round(1.1 + rnd()),
    });
  }
  return rows;
}
function profile(u, idx) {
  const status = ["CRITICO", "ATENCAO", "NORMAL"][idx % 3];
  const mean = 7 + rnd() * 5; const sd = 1.5 + rnd();
  const series = Array.from({ length: 30 }, (_, i) => {
    const cpl = mean + (rnd() - 0.5) * sd * 3; const leads = Math.round(8 + rnd() * 10);
    return { date: iso(daysAgo(29 - i)), sma7: round(mean + (rnd() - 0.5) * sd), cpl: round(cpl), spend: round(cpl * leads), leads, mean30d: round(mean), upperBound2Sigma: round(mean + 2 * sd) };
  });
  const target = 400 + Math.round(rnd() * 200); const cur = Math.round(target * (0.5 + rnd() * 0.35));
  const prob = status === "CRITICO" ? 0.22 : status === "ATENCAO" ? 0.55 : 0.86;
  const score = status === "CRITICO" ? 48 : status === "ATENCAO" ? 67 : 84;
  return {
    unitId: u.id, unitName: u.name, date: iso(today),
    confidence: { level: ["ALTA", "MÉDIA", "BAIXA"][idx % 3], sampleLeads: cur, sampleClicks: cur * 9, historyDays: 30, description: "Amostra de 30 dias com volume suficiente para leitura estatística." },
    cplMetrics: { todaySpend: 96.4, todayLeads: 11, cplToday: 8.76, cplTodayDisplay: "R$ 8,76", mean30d: round(mean), stdDev30d: round(sd), upperBound2Sigma: round(mean + 2 * sd), lowerBound2Sigma: round(Math.max(0, mean - 2 * sd)), deviationVsMeanPct: 6.1, deviationLabel: "6,1% acima da média", sma7Current: round(mean * 1.04), sma7Previous: round(mean), trendDirection: ["ALTA", "QUEDA", "ESTAVEL"][idx % 3], trendPct7d: 4.2, trendLabel: "Alta de 4,2% em 7 dias" },
    confidenceInterval: { conversionRate: 0.112, lowerBound: 0.098, upperBound: 0.126, marginError: 0.014, sampleSize: cur * 9, confidenceLevel: 0.95 },
    goalProbability: { totalTarget: target, currentLeads: cur, remainingLeads: target - cur, daysLeft: 6, requiredLeadsPerDay: round((target - cur) / 6, 1), currentLeadsPerDay: round(cur / 24, 1), dailyAvgClicks: 120, projectedClicks: 720, historicalConversion: 0.11, probability: prob, riskLevel: ["RISCO_ALTO", "MODERADA", "ALTA_PROBABILIDADE"][idx % 3], paceExplanation: "No ritmo atual, a unidade precisa acelerar a captação nos últimos dias do mês." },
    score: { scoreFinal: score, grade: score > 80 ? "A" : score > 65 ? "B" : "C", notaCpl: score + 4, notaConversao: score - 6, notaTendencia: score - 2, notaVolume: score + 1, scoreSummary: "CPL estável com volume abaixo da meta." },
    diagnosis: { evidenceLevel: ["Evidência Forte", "Evidência Moderada", "Evidência Fraca"][idx % 3], hypothesisTitle: status === "CRITICO" ? "Custo por lead acima da banda de controle" : "Volume abaixo do ritmo da meta", evidenceFacts: ["CPL dos últimos 3 dias acima de μ+2σ", "CTR caiu 18% frente à semana anterior", "Frequência média acima de 2,1"], actionPlan: "Renovar criativos da oferta principal e redistribuir verba para o conjunto de remarketing." },
    statusFlag: status, sma7Series: series,
  };
}
const PROFILES = UNITS.map(profile);

const NAMES = ["Ana Paula Ribeiro", "Bruno Kessler", "Carla Dornelles", "Diego Weber", "Eduarda Schmitt", "Fernanda Lopes", "Gustavo Hahn", "Helena Brum", "Igor Pedroso", "Juliana Mattos", "Kátia Frantz", "Leonardo Bonfanti", "Mariana Zanella", "Nicolas Fiorin", "Olívia Rech"];
const userAccess = NAMES.map((n, i) => ({
  id: `u${i}`, user_email: n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ /g, ".") + "@vidacard.com.br",
  full_name: n, role: i === 0 ? "admin" : i % 4 === 0 ? "viewer" : "client_viewer", status: i % 6 === 5 ? "pending" : i === 13 ? "inactive" : "active",
  bio: "", avatar_url: null, created_at: daysAgo(90 - i * 5).toISOString(), updated_at: daysAgo(i).toISOString(),
  client_access: i === 0 ? [] : [UNITS[i % 12], ...(i % 3 === 0 ? [UNITS[(i + 3) % 12]] : [])].map((u, k) => ({ id: `ca${i}${k}`, client_id: u.id, client_name: u.name, client_group: "Vida Card", granted_by: "davi@trafegopro.com.br", created_at: daysAgo(40).toISOString() })),
}));

const formKeys = [
  { id: "k1", name: "LP Plano Família", keyPrefix: "tpf_live_8f2a", clientIds: [UNITS[0].id, UNITS[1].id], allowedOrigins: ["https://vidacard.com.br"], createdBy: "davi@trafegopro.com.br", expiresAt: null, revokedAt: null, createdAt: daysAgo(60).toISOString() },
  { id: "k2", name: "LP Consultas R$ 39", keyPrefix: "tpf_live_91cd", clientIds: [UNITS[2].id], allowedOrigins: null, createdBy: "davi@trafegopro.com.br", expiresAt: daysAgo(-30).toISOString(), revokedAt: null, createdAt: daysAgo(45).toISOString() },
  { id: "k3", name: "Site institucional", keyPrefix: "tpf_live_77ab", clientIds: UNITS.slice(0, 6).map((u) => u.id), allowedOrigins: ["https://www.vidacard.com.br", "https://vidacard.com.br"], createdBy: "davi@trafegopro.com.br", expiresAt: null, revokedAt: null, createdAt: daysAgo(120).toISOString() },
  { id: "k4", name: "Teste antigo", keyPrefix: "tpf_live_03ee", clientIds: [UNITS[3].id], allowedOrigins: null, createdBy: "lucas@trafegopro.com.br", expiresAt: null, revokedAt: daysAgo(10).toISOString(), createdAt: daysAgo(200).toISOString() },
];
const formSubs = Array.from({ length: 64 }, (_, i) => ({
  id: `s${i}`, formKeyId: formKeys[i % 3].id, formName: formKeys[i % 3].name, clientId: UNITS[i % 6].id,
  fields: { nome: NAMES[i % 15], telefone: `(55) 9${8100 + i}-${1000 + i * 7}`, email: `lead${i}@gmail.com`, plano: ["Família", "Individual", "Empresarial"][i % 3], mensagem: i % 4 ? "" : "Gostaria de saber o valor para 4 pessoas." },
  metadata: { utm_source: ["facebook", "instagram", "google"][i % 3], utm_campaign: CAMPAIGN_NAMES[i % 8], page: "/plano-familia" }, ipHash: "a1b2c3", submittedAt: daysAgo(i * 0.4).toISOString(),
}));

const talentFields = [
  { fieldKey: "nome", label: "Nome completo", fieldType: "text", isRequired: true, orderIndex: 0, placeholder: "Seu nome", helpText: null, options: [], validationRules: {} },
  { fieldKey: "email", label: "E-mail", fieldType: "email", isRequired: true, orderIndex: 1, placeholder: "voce@email.com", helpText: null, options: [], validationRules: {} },
  { fieldKey: "telefone", label: "WhatsApp", fieldType: "phone", isRequired: true, orderIndex: 2, placeholder: "(55) 99999-9999", helpText: null, options: [], validationRules: {} },
  { fieldKey: "vaga", label: "Vaga de interesse", fieldType: "select", isRequired: true, orderIndex: 3, placeholder: null, helpText: null, options: [{ label: "Consultor comercial", value: "consultor" }, { label: "Recepção", value: "recepcao" }, { label: "Financeiro", value: "financeiro" }], validationRules: {} },
  { fieldKey: "experiencia", label: "Conte sua experiência", fieldType: "textarea", isRequired: false, orderIndex: 4, placeholder: null, helpText: "Opcional", options: [], validationRules: {} },
  { fieldKey: "curriculo", label: "Currículo", fieldType: "file", isRequired: true, orderIndex: 5, placeholder: null, helpText: "PDF ou DOCX até 5 MB", options: [], validationRules: {} },
];
const talentForm = (u, i) => ({ id: `tf${i}`, clientId: u.id, publicSlug: `vida-card-${u.name.split(" ").slice(2).join("-").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`, title: `Trabalhe na ${u.name}`, subtitle: "Faça parte do time que cuida da saúde da região.", bannerUrl: null, lgpdDisclaimer: "Seus dados serão usados apenas para este processo seletivo.", successTitle: "Candidatura enviada!", successMessage: "Entraremos em contato se o seu perfil combinar com a vaga.", isPublished: i % 2 === 0, fields: talentFields, createdAt: daysAgo(40).toISOString(), candidateCount: 35 });
const statuses = ["novo", "em_analise", "entrevista", "aprovado", "reprovado", "banco"];
const talentSubs = Array.from({ length: 35 }, (_, i) => ({ id: `ts${i}`, formId: "tf0", clientId: UNITS[0].id, candidateName: NAMES[i % 15], candidateEmail: `candidato${i}@gmail.com`, candidatePhone: `(55) 9${8200 + i}-${2000 + i}`, answers: { vaga: ["consultor", "recepcao", "financeiro"][i % 3], experiencia: "3 anos em vendas consultivas." }, attachments: i % 3 ? [{ fieldKey: "curriculo", fileName: `curriculo-${i}.pdf`, storageKey: "x", fileSize: 182000, mimeType: "application/pdf" }] : [], status: statuses[i % 6], notes: i % 4 ? null : "Boa comunicação.", createdAt: daysAgo(i * 0.7).toISOString(), updatedAt: daysAgo(i * 0.5).toISOString() }));

const feedbacks = Array.from({ length: 26 }, (_, i) => {
  const total = 60 + Math.round(rnd() * 90); const contacted = Math.round(total * 0.9); const responded = Math.round(contacted * 0.7);
  return { id: i + 1, unit: UNITS[i % 12].name, responsible: NAMES[i % 15], weekStart: iso(daysAgo(7 * Math.floor(i / 6) + 6)), weekEnd: iso(daysAgo(7 * Math.floor(i / 6))), totalLeads: total, leadsContacted: contacted, leadsResponded: responded, leadsConverted: Math.round(responded * 0.15), leadsLost: Math.round(responded * 0.3), leadsInNegotiation: Math.round(responded * 0.2), lossReason: ["Preço", "Sem retorno", "Já possui plano", "Fora da área"][i % 4], leadQuality: 1 + (i % 5), observations: i % 3 ? "" : "Muitos leads perguntando sobre odonto.", agencySatisfaction: 3 + (i % 3), communicationClarity: ["Sim", "Parcialmente"][i % 2], agencyAdjustment: i % 4 ? "" : "Mais criativos com valores.", submittedAt: daysAgo(7 * Math.floor(i / 6)).toISOString(), submittedByEmail: userAccess[(i % 14) + 1].user_email };
});

const aiTokens = {
  scopes: ["metrics:read", "leads:read", "crm:read"], rateLimitPerMinute: 60,
  units: UNITS.map((u) => ({ id: u.id, name: u.name })),
  tokens: [
    { id: "t1", name: "GPT análise semanal", tokenPrefix: "tpai_4f9c…", scopes: ["metrics:read", "leads:read"], unitIds: UNITS.slice(0, 4).map((u) => u.id), expiresAt: daysAgo(-60).toISOString(), revokedAt: null, lastUsedAt: daysAgo(1).toISOString(), createdAt: daysAgo(30).toISOString() },
    { id: "t2", name: "Claude relatórios", tokenPrefix: "tpai_a21e…", scopes: ["metrics:read", "crm:read"], unitIds: UNITS.map((u) => u.id), expiresAt: daysAgo(-10).toISOString(), revokedAt: null, lastUsedAt: daysAgo(0).toISOString(), createdAt: daysAgo(15).toISOString() },
    { id: "t3", name: "Teste n8n", tokenPrefix: "tpai_77b0…", scopes: ["leads:read"], unitIds: [UNITS[2].id], expiresAt: daysAgo(5).toISOString(), revokedAt: null, lastUsedAt: null, createdAt: daysAgo(40).toISOString() },
    { id: "t4", name: "Integração antiga", tokenPrefix: "tpai_0c3d…", scopes: ["metrics:read"], unitIds: [UNITS[5].id], expiresAt: daysAgo(-100).toISOString(), revokedAt: daysAgo(20).toISOString(), lastUsedAt: daysAgo(22).toISOString(), createdAt: daysAgo(80).toISOString() },
  ],
};

function financeDB() {
  const clientes = {}, cobrancas = {}, checklists = {};
  UNITS.forEach((u, i) => {
    const id = `cli${i}`;
    clientes[id] = { id, metaId: u.id, nome: u.name, cnpj: `12.345.${600 + i}/0001-${10 + i}`, endereco: "Rua do Comércio, 120", respUnid: NAMES[i], respFin: NAMES[(i + 3) % 15], emailBol: "financeiro@vidacard.com.br", vencDia: [5, 10, 15, 20][i % 4], mensalidade: [1800, 2200, 2500, 3200][i % 4], dataInicio: "2026-07-01", mesInicial: "2026_07", criadoEm: daysAgo(90).toISOString() };
    cobrancas[id] = {};
    ["2026_07", "2026_08", "2026_09"].forEach((m, k) => {
      const rec = k < 2 || i % 3 === 0;
      cobrancas[id][m] = { mes: m, boletoGerado: true, nfGerada: k < 2 || i % 2 === 0, recebido: rec, valorRecebido: rec ? clientes[id].mensalidade : null, divisao: rec ? { caixa: 0.2 * clientes[id].mensalidade, davi: 0.3 * clientes[id].mensalidade, lucas: 0.3 * clientes[id].mensalidade, ana: 0.2 * clientes[id].mensalidade, em: daysAgo(10).toISOString() } : null };
    });
    checklists[id] = { f1: { marcado: true, por: "davi", quando: daysAgo(80).toISOString() }, f2: { marcado: true, por: "davi", quando: daysAgo(80).toISOString() }, t1: { marcado: i % 2 === 0, por: "lucas" } };
  });
  const despesas = {};
  const cats = ["Ferramentas", "Impostos", "Pessoal", "Marketing", "Infraestrutura"];
  for (let i = 0; i < 22; i++) despesas[`d${i}`] = { id: `d${i}`, nome: ["Meta Verified", "Google Workspace", "Contabilidade", "DAS Simples", "Figma", "Canva Pro", "Supabase", "Hostinger", "Freelancer design", "ClickUp"][i % 10], cat: cats[i % 5], val: round(40 + rnd() * 1200), dia: 1 + (i % 28), mes: ["2026_07", "2026_08", "2026_09"][i % 3], desc: "", status: i % 3 ? "paga" : "pendente", criadoEm: daysAgo(i).toISOString(), criadoPor: "davi" };
  const atas = {};
  for (let i = 0; i < 6; i++) atas[`a${i}`] = { id: `a${i}`, titulo: ["Alinhamento mensal Vida Card", "Revisão de criativos", "Planejamento Q4", "Onboarding Erechim", "Ajuste de verba", "Retrospectiva agosto"][i], demandante: NAMES[i], data: iso(daysAgo(i * 9)), pauta: "1. Resultados do mês\n2. Criativos novos\n3. Próximos passos", participantes: ["Davi", "Lucas", "Ana"], criadoEm: daysAgo(i * 9).toISOString(), criadoPor: "davi" };
  const despFixas = { df1: { id: "df1", nome: "Contabilidade", val: 650 }, df2: { id: "df2", nome: "Google Workspace", val: 210 }, df3: { id: "df3", nome: "Supabase Pro", val: 140 }, df4: { id: "df4", nome: "ClickUp", val: 95 } };
  return { clientes, cobrancas, checklists, arquivados: {}, despesas, atas, caixa: { saldo: 18450.32, metaFimAno: 60000, atualizadoEm: daysAgo(2).toISOString() }, despFixas, logs: [{ u: "davi", a: "Marcou recebimento", q: daysAgo(1).toISOString() }] };
}

const ADMIN = { email: "davi@trafegopro.com.br", name: "Davi Menegazzi", role: "admin", allowedClientIds: ["*"] };
const CLIENT = { email: "ana.paula.ribeiro@vidacard.com.br", name: "Ana Paula Ribeiro", role: "client_viewer", allowedClientIds: [UNITS[0].id] };

function handle(url, method, opts = {}) {
  const u = new URL(url); const p = u.pathname; const q = u.searchParams;
  const empty = opts.empty; const fail = opts.fail;
  if (fail && p.startsWith("/api/metrics/dashboard-bundle")) return [500, { error: "Supabase indisponível (timeout ao consultar vw_meta_ads_daily_summary)" }];
  if (p === "/api/auth/me") return [200, opts.client ? CLIENT : ADMIN];
  if (p === "/api/metrics/clients") return [200, { configured: true, clients: opts.client ? [UNITS[0]] : UNITS }];
  if (p === "/api/metrics/dashboard-bundle") return [200, { configured: true, daily: empty ? [] : daily(), campaigns: empty ? [] : campaigns(), source: opts.source || "meta_direct", rateLimited: !!opts.rateLimited, cooldownRemainingSeconds: opts.rateLimited ? 540 : null, lastSyncedAt: daysAgo(0).toISOString() }];
  if (p === "/api/metrics/offers-rpc") return [200, { configured: true, rows: empty ? [] : offers(q.get("client_id") || UNITS[0].id), source: "meta_direct", lastSyncedAt: daysAgo(0).toISOString() }];
  if (p === "/api/analytics/predictive") return [200, PROFILES.find((x) => x.unitId === q.get("unit_id")) || PROFILES[0]];
  if (p === "/api/analytics/overview") return [200, { timestamp: today.toISOString(), date: iso(today), totalUnits: 12, daysLeftInMonth: 6, totalMonthSpend: 38210.4, totalMonthLeads: 4388, avgNetworkCpl: 8.71, totalNetworkTarget: 6000, networkGoalPacePct: 73.1, summary: { criticalUnitsCount: 4, warningUnitsCount: 4, healthyUnitsCount: 4 }, rankedProfiles: PROFILES }];
  if (p === "/api/user-access" && method === "GET") return [200, userAccess];
  if (p === "/api/forms/keys/exists") return [200, { hasEndpoint: true }];
  if (p === "/api/forms/keys" && method === "GET") return [200, { keys: formKeys }];
  if (p === "/api/forms/submissions") return [200, { submissions: empty ? [] : formSubs }];
  if (p.startsWith("/api/forms/submissions/")) return [200, { submission: formSubs[0] }];
  if (p === "/api/talent/admin/units") return [200, { units: UNITS.map((u) => ({ id: u.id, name: u.name })) }];
  if (p === "/api/talent/admin/form") { const i = Math.max(0, UNITS.findIndex((u) => u.id === q.get("client_id"))); const f = talentForm(UNITS[i], i); return [200, { form: f, forms: [f, { ...talentForm(UNITS[i], i + 1), id: `tf${i}b`, title: "Vagas administrativas" }] }]; }
  if (p === "/api/talent/admin/submissions") return [200, { submissions: talentSubs }];
  if (p.startsWith("/api/talent/public/")) return [200, talentForm(UNITS[0], 0)];
  if (p === "/api/feedback-leads" && method === "GET") return [200, feedbacks];
  if (p === "/api/external-ai/tokens" && method === "GET") return [200, aiTokens];
  if (p.startsWith("/api/auth/login")) return [200, { token: "tok", user: ADMIN }];
  return [200, { ok: true }];
}

module.exports = { handle, financeDB, ADMIN, CLIENT, UNITS };
