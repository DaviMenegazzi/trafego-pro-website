export type CrmStage = "lead_not_responded" | "lead_responded" | "follow_up" | "lead_replied" | "negotiation" | "closed_won" | "closed_lost";

export type CrmLeadReference = { id: string; crmStage: CrmStage };

const crmStages = new Set<CrmStage>([
  "lead_not_responded",
  "lead_responded",
  "follow_up",
  "lead_replied",
  "negotiation",
  "closed_won",
  "closed_lost",
]);

export function resolveCrmDrop<T extends CrmLeadReference>(leads: T[], activeId: string, targetId: string | null): { lead: T; stage: CrmStage } | null {
  const lead = leads.find((candidate) => candidate.id === activeId);
  if (!lead || !targetId || !crmStages.has(targetId as CrmStage)) return null;
  const stage = targetId as CrmStage;
  return lead.crmStage === stage ? null : { lead, stage };
}
