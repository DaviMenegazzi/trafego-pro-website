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
};

const defaultData: ExternalAiMcpData = {
  listUnits: listExternalAiUnits,
  getUnit: getExternalAiUnit,
  getMetrics: getExternalAiMetrics,
  getAdsMetrics: getExternalAiAdsMetrics,
  getLeadSummary: getExternalAiLeadSummary,
  getCrmSummary: getExternalAiCrmSummary,
  getCreatives: getExternalAiCreatives,
};

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
