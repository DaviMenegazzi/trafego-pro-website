export type ScopeInstance = { instanceName: string; unitName: string | null };
export type ScopeLead = { instanceName: string; classification: string; funnelStage: string };
export type ScopeEvent = { instanceName: string; receivedAt: string };

export function scopeEvolutionData<TInstance extends ScopeInstance, TLead extends ScopeLead, TEvent extends ScopeEvent>(
  instances: TInstance[], leads: TLead[], events: TEvent[], unitScope: string, instanceScope: string,
) {
  const unitOptions = Array.from(new Set(instances.map((instance) => instance.unitName || "__unassigned"))).sort();
  const unitInstances = instances.filter((instance) => unitScope === "all" || (instance.unitName || "__unassigned") === unitScope);
  const visibleInstances = unitInstances.filter((instance) => instanceScope === "all" || instance.instanceName === instanceScope);
  const visibleInstanceNames = new Set(visibleInstances.filter((instance) => instanceScope === "all" || instance.instanceName === instanceScope).map((instance) => instance.instanceName));
  const visibleLeads = leads.filter((lead) => visibleInstanceNames.has(lead.instanceName));
  const visibleEvents = events.filter((event) => visibleInstanceNames.has(event.instanceName));
  return { unitOptions, visibleInstances, visibleLeads, visibleEvents };
}
