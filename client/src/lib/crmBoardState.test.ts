import { describe, expect, it } from "vitest";
import { CRM_STAGES, type CrmBoard, type CrmLead, type CrmStage } from "../../../shared/crm";
import { appendCrmPage, findCrmLead, optimisticCrmMove, placeCrmLead } from "./crmBoardState";

function lead(id: string, stage: CrmStage, updatedAt: string): CrmLead {
  return {
    id, instanceName: "centro", instanceDisplayName: null, contactName: id, contactPhone: null, phoneLast4: null,
    classification: "lead", crmStage: stage, crmStageMode: "automatic", crmVersion: 1, crmStageUpdatedAt: updatedAt,
    crmStageUpdatedBy: null, temperature: null, leadScore: null, leadScoreUpdatedAt: null, firstContactAt: updatedAt,
    lastMessageAt: updatedAt, messagesReceived: 1, messagesSent: 1, originPlatform: "meta", originEvidence: "verified",
  };
}

function board(items: CrmLead[], totals: Partial<Record<CrmStage, number>> = {}): CrmBoard {
  const columns = Object.fromEntries(CRM_STAGES.map((stage) => {
    const stageItems = items.filter((item) => item.crmStage === stage);
    const total = totals[stage] ?? stageItems.length;
    return [stage, { items: stageItems, total, hasMore: total > stageItems.length, nextCursor: total > stageItems.length ? "c" : null }];
  })) as CrmBoard["columns"];
  return { unit: { id: "u", name: "U" }, instances: [], columns, total: items.length, generatedAt: "" };
}

describe("estado do quadro do CRM", () => {
  it("move o cartão de coluna e acerta os totais", () => {
    const a = lead("a", "lead_not_responded", "2026-09-29T10:00:00.000Z");
    const b = lead("b", "negotiation", "2026-09-29T09:00:00.000Z");
    const moved = placeCrmLead(board([a, b]), optimisticCrmMove(a, "negotiation", new Date("2026-09-29T11:00:00.000Z")));
    expect(moved.columns.lead_not_responded).toMatchObject({ items: [], total: 0 });
    expect(moved.columns.negotiation.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(moved.columns.negotiation.total).toBe(2);
    expect(findCrmLead(moved, "a")?.crmStageMode).toBe("manual");
    expect(moved.total).toBe(2);
  });

  it("reverte para o estado original sem deixar cópia do cartão", () => {
    const a = lead("a", "follow_up", "2026-09-29T10:00:00.000Z");
    const initial = board([a]);
    const reverted = placeCrmLead(placeCrmLead(initial, optimisticCrmMove(a, "closed_won")), a);
    expect(reverted.columns.follow_up.items).toEqual([a]);
    expect(reverted.columns.closed_won.items).toEqual([]);
    expect(reverted.total).toBe(1);
  });

  it("não duplica cartões ao carregar a próxima página depois de um movimento", () => {
    const a = lead("a", "negotiation", "2026-09-29T10:00:00.000Z");
    const b = lead("b", "negotiation", "2026-09-29T09:00:00.000Z");
    const current = board([a], { negotiation: 2 });
    const next = appendCrmPage(current, "negotiation", { items: [a, b], total: 2, hasMore: false, nextCursor: null });
    expect(next.columns.negotiation.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(next.columns.negotiation.hasMore).toBe(false);
  });
});
