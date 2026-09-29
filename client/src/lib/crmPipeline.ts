// Etapas e resolução de movimento vivem em shared/crm.ts, compartilhadas com o servidor.
import type { CrmStage } from "../../../shared/crm";

export { resolveCrmDrop, type CrmStage } from "../../../shared/crm";

export type CrmLeadReference = { id: string; crmStage: CrmStage };
