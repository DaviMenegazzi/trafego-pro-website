import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  getExternalAiAdsMetrics,
  getExternalAiCreatives,
  getExternalAiCrmSummary,
  getExternalAiLeadSummary,
  getExternalAiMetrics,
  getExternalAiUnit,
  listExternalAiUnits,
} from "./externalAiApiData.js";
import { listFeedbackLeadsInPeriodSql, type SqlFeedbackLead } from "./feedbackSql.js";
import {
  hasExternalAiApiScope,
  isExternalAiApiUnitAllowed,
  resolveExternalAiApiDateRange,
  type ExternalAiApiScope,
} from "./externalAiApiPolicy.js";

export type ExternalAiMcpToken = { id: string; scopes: ExternalAiApiScope[]; unitIds: string[] };

export type ExternalAiMcpData = {
  listUnits: typeof listExternalAiUnits;
  getUnit: typeof getExternalAiUnit;
  getMetrics: typeof getExternalAiMetrics;
  getAdsMetrics: typeof getExternalAiAdsMetrics;
  getLeadSummary: typeof getExternalAiLeadSummary;
  getCrmSummary: typeof getExternalAiCrmSummary;
  getCreatives: typeof getExternalAiCreatives;
  /** Fechamentos semanais da unidade (pelo nome) cujas semanas tocam o período. */
  getFechamentos: (unitName: string, start: string, end: string) => Promise<SqlFeedbackLead[]>;
};

const defaultData: ExternalAiMcpData = {
  listUnits: listExternalAiUnits,
  getUnit: getExternalAiUnit,
  getMetrics: getExternalAiMetrics,
  getAdsMetrics: getExternalAiAdsMetrics,
  getLeadSummary: getExternalAiLeadSummary,
  getCrmSummary: getExternalAiCrmSummary,
  getCreatives: getExternalAiCreatives,
  getFechamentos: listFeedbackLeadsInPeriodSql,
};

/**
 * Fechamentos no formato da API: números, notas, motivo e comentário da unidade,
 * sem nome nem e-mail de quem enviou. Se a mesma semana foi enviada mais de uma
 * vez, todos os envios vêm, e só o mais recente de cada semana entra nos totais.
 */
export function fechamentosPayload(rows: SqlFeedbackLead[]) {
  const seenWeeks = new Set<string>();
  const items = rows.map((row) => {
    const week = `${row.weekStart}/${row.weekEnd}`;
    const isLatestForWeek = !seenWeeks.has(week);
    seenWeeks.add(week);
    const comment = [row.observations, row.agencyAdjustment].map((text) => text.trim()).filter(Boolean).join("\n\n");
    return {
      weekStart: row.weekStart,
      weekEnd: row.weekEnd,
      submittedAt: row.submittedAt,
      isLatestForWeek,
      leadsReceived: row.totalLeads,
      leadsClosed: row.leadsConverted,
      leadsInNegotiation: row.leadsInNegotiation,
      leadsLost: row.leadsLost,
      conversionRate: row.totalLeads > 0 ? Number((row.leadsConverted / row.totalLeads).toFixed(4)) : null,
      lossReason: row.lossReason || null,
      leadQuality: row.leadQuality || null,
      agencySatisfaction: row.agencySatisfaction || null,
      comment: comment || null,
    };
  });
  const latest = items.filter((item) => item.isLatestForWeek);
  const sum = (pick: (item: (typeof items)[number]) => number) => latest.reduce((total, item) => total + pick(item), 0);
  const received = sum((item) => item.leadsReceived);
  const closed = sum((item) => item.leadsClosed);
  return {
    totals: {
      weeksReported: latest.length,
      leadsReceived: received,
      leadsClosed: closed,
      leadsInNegotiation: sum((item) => item.leadsInNegotiation),
      leadsLost: sum((item) => item.leadsLost),
      conversionRate: received > 0 ? Number((closed / received).toFixed(4)) : null,
    },
    fechamentos: items,
  };
}

const unitIdSchema = z.string().trim().describe("ID da unidade, obtido com list_units");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const periodShape = {
  unit_id: unitIdSchema,
  start: dateSchema.optional().describe("Data inicial YYYY-MM-DD. Padrão: 29 dias antes de hoje"),
  end: dateSchema.optional().describe("Data final YYYY-MM-DD. Padrão: hoje. Período máximo de 366 dias"),
};

function json(payload: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function toolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function envelope(extra: Record<string, unknown>) {
  return { apiVersion: "v1", generatedAt: new Date().toISOString(), ...extra };
}

/**
 * Monta um servidor MCP somente leitura preso a um token da API externa.
 * Cada requisição HTTP cria o seu, então o token, os escopos e as unidades
 * valem apenas para aquela chamada.
 */
export function createExternalAiMcpServer(
  token: ExternalAiMcpToken,
  options: { data?: ExternalAiMcpData; onOutcome?: (outcome: string) => void } = {},
): McpServer {
  const data = options.data ?? defaultData;
  const outcome = options.onOutcome ?? (() => {});
  const server = new McpServer({ name: "trafego-pro", version: "1.0.0" });

  const guard = async (unitId: string, run: () => Promise<CallToolResult>): Promise<CallToolResult> => {
    if (!isExternalAiApiUnitAllowed(token.unitIds, unitId)) {
      outcome("unit_denied");
      return toolError("O token não possui acesso a esta unidade");
    }
    try {
      return await run();
    } catch (error) {
      console.error("[external-ai-mcp] Falha na ferramenta:", error);
      outcome("upstream_error");
      return toolError("Os dados estão temporariamente indisponíveis");
    }
  };

  const period = (start?: string, end?: string) => resolveExternalAiApiDateRange(start, end);
  const can = (scope: ExternalAiApiScope) => hasExternalAiApiScope(token.scopes, scope);

  server.registerTool(
    "list_units",
    {
      title: "Listar unidades",
      description: "Lista as unidades (contas de anúncio) que este token pode consultar. Use os IDs nas outras ferramentas.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        return json(envelope({ dataClassification: "aggregated", units: await data.listUnits(token.unitIds) }));
      } catch (error) {
        console.error("[external-ai-mcp] Falha ao listar unidades:", error);
        outcome("upstream_error");
        return toolError("Os dados estão temporariamente indisponíveis");
      }
    },
  );

  if (can("metrics:read")) {
    server.registerTool(
      "get_metrics",
      {
        title: "Métricas da unidade",
        description:
          "Métricas agregadas da Meta para uma unidade no período: investimento, conversas iniciadas, leads, impressões, cliques, custo por conversa, CPC, CTR e série diária.",
        inputSchema: periodShape,
        annotations: { readOnlyHint: true },
      },
      async ({ unit_id, start, end }) =>
        guard(unit_id, async () => {
          const range = period(start, end);
          if (!range.ok) return toolError(range.error);
          const [unit, metrics] = await Promise.all([data.getUnit(unit_id), data.getMetrics(unit_id, range.start, range.end)]);
          return json(envelope({ dataClassification: "aggregated", unit, metrics }));
        }),
    );
  }

  if (can("ads:metrics:read")) {
    server.registerTool(
      "get_ads_metrics",
      {
        title: "Métricas por anúncio",
        description: "Métricas da Meta quebradas por anúncio para uma unidade no período, quando disponíveis.",
        inputSchema: periodShape,
        annotations: { readOnlyHint: true },
      },
      async ({ unit_id, start, end }) =>
        guard(unit_id, async () => {
          const range = period(start, end);
          if (!range.ok) return toolError(range.error);
          return json(envelope(await data.getAdsMetrics(unit_id, range.start, range.end)));
        }),
    );
  }

  if (can("creatives:read")) {
    server.registerTool(
      "get_creatives",
      {
        title: "Criativos",
        description: "Metadados dos anúncios (criativos) de uma unidade.",
        inputSchema: { unit_id: unitIdSchema },
        annotations: { readOnlyHint: true },
      },
      async ({ unit_id }) => guard(unit_id, async () => json(envelope(await data.getCreatives(unit_id)))),
    );
  }

  if (can("leads:summary:read")) {
    server.registerTool(
      "get_leads_summary",
      {
        title: "Resumo de leads",
        description: "Resumo agregado dos leads de WhatsApp da unidade: total, classificação (pendente, lead, não lead) e origem.",
        inputSchema: { unit_id: unitIdSchema },
        annotations: { readOnlyHint: true },
      },
      async ({ unit_id }) =>
        guard(unit_id, async () => {
          const unit = await data.getUnit(unit_id);
          return json(envelope({ dataClassification: "aggregated", unit, leads: await data.getLeadSummary(unit.name) }));
        }),
    );
  }

  if (can("leads:summary:read")) {
    server.registerTool(
      "get_fechamentos",
      {
        title: "Fechamentos semanais",
        description:
          "Fechamentos que a própria unidade envia toda semana na aba Fechamentos do painel: leads recebidos, fechados, em negociação e perdidos, motivo principal das perdas, nota da qualidade dos leads (1 a 5), satisfação com a Tráfego Pro (1 a 5, null se pulou) e comentário. " +
          "As semanas seguem a regra do mês (sábado a sexta, com as pontas do mês cortadas), então weekStart/weekEnd podem ter menos de 7 dias. " +
          "Traz as semanas que tocam o período, da mais recente para a mais antiga; lista vazia significa que a unidade não enviou. Os totais contam só o envio mais recente de cada semana.",
        inputSchema: periodShape,
        annotations: { readOnlyHint: true },
      },
      async ({ unit_id, start, end }) =>
        guard(unit_id, async () => {
          const range = period(start, end);
          if (!range.ok) return toolError(range.error);
          const unit = await data.getUnit(unit_id);
          const rows = await data.getFechamentos(unit.name, range.start, range.end);
          return json(envelope({ dataClassification: "unit_reported", unit, period: { start: range.start, end: range.end }, ...fechamentosPayload(rows) }));
        }),
    );
  }

  if (can("crm:summary:read")) {
    server.registerTool(
      "get_crm_summary",
      {
        title: "Resumo do CRM",
        description: "Distribuição agregada dos leads da unidade por estágio do CRM.",
        inputSchema: { unit_id: unitIdSchema },
        annotations: { readOnlyHint: true },
      },
      async ({ unit_id }) =>
        guard(unit_id, async () => {
          const unit = await data.getUnit(unit_id);
          return json(envelope({ dataClassification: "aggregated", unit, crm: await data.getCrmSummary(unit.name) }));
        }),
    );
  }

  return server;
}
