// Transformações puras do quadro do CRM no navegador: movimento otimista, reconciliação com o
// servidor e paginação sem duplicar cartões.
import type { CrmBoard, CrmColumn, CrmLead, CrmLeadPage, CrmStage } from "../../../shared/crm";

function compareCards(a: CrmLead, b: CrmLead): number {
  if (a.crmStageUpdatedAt !== b.crmStageUpdatedAt) return a.crmStageUpdatedAt < b.crmStageUpdatedAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function findCrmLead(board: CrmBoard | null, leadId: string): CrmLead | null {
  if (!board) return null;
  for (const column of Object.values(board.columns)) {
    const lead = column.items.find((item) => item.id === leadId);
    if (lead) return lead;
  }
  return null;
}

/** Coloca o cartão na coluna da sua etapa, removendo-o de onde estiver. Totais acompanham. */
export function placeCrmLead(board: CrmBoard, lead: CrmLead): CrmBoard {
  const columns = { ...board.columns };
  let removed = false;
  for (const stage of Object.keys(columns) as CrmStage[]) {
    const column = columns[stage];
    if (!column.items.some((item) => item.id === lead.id)) continue;
    removed = true;
    columns[stage] = {
      ...column,
      items: column.items.filter((item) => item.id !== lead.id),
      total: Math.max(0, column.total - 1),
    };
  }
  const target = columns[lead.crmStage];
  const items = [...target.items, lead].sort(compareCards);
  columns[lead.crmStage] = { ...target, items, total: removed ? target.total + 1 : Math.max(target.total, items.length) };
  const total = Object.values(columns).reduce((sum, column) => sum + column.total, 0);
  return { ...board, columns, total };
}

/** Anexa a próxima página de uma coluna ignorando cartões que já estão no quadro. */
export function appendCrmPage(board: CrmBoard, stage: CrmStage, page: CrmLeadPage): CrmBoard {
  const known = new Set(Object.values(board.columns).flatMap((column) => column.items.map((item) => item.id)));
  const column: CrmColumn = board.columns[stage];
  const fresh = page.items.filter((item) => !known.has(item.id) && item.crmStage === stage);
  return {
    ...board,
    columns: {
      ...board.columns,
      [stage]: { items: [...column.items, ...fresh], total: page.total, nextCursor: page.nextCursor, hasMore: page.hasMore },
    },
  };
}

/** Movimento otimista: o cartão já aparece na coluna nova, em modo manual. */
export function optimisticCrmMove(lead: CrmLead, stage: CrmStage, now = new Date()): CrmLead {
  return { ...lead, crmStage: stage, crmStageMode: "manual", crmStageUpdatedAt: now.toISOString() };
}
