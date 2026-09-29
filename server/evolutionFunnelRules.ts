import type { EvolutionCrmStage } from "./evolutionSupabaseStore.js";

// Mesma lógica do funil do SDR Flow (packages/runtime/src/funnel/funnel-rules.ts), traduzida para
// as etapas de CRM do Pixel. O funil só anda para frente, exceto que um lead perdido
// (closed_lost) pode ser reaberto por novos sinais de compra. closed_won é final.
const FORWARD_ORDER: EvolutionCrmStage[] = [
  "lead_not_responded",
  "lead_responded",
  "follow_up",
  "lead_replied",
  "negotiation",
  "closed_won",
];

export type FunnelSource = "text_rule" | "laya";

export type FunnelSignal = {
  stage: EvolutionCrmStage;
  source: FunnelSource;
  reason: string;
  evidence?: string | null;
  confidence?: number | null;
};

function rank(stage: EvolutionCrmStage): number {
  return FORWARD_ORDER.indexOf(stage);
}

/** Se um sinal pode mover o funil a partir de `current`. */
export function canAdvanceFunnel(current: EvolutionCrmStage, candidate: EvolutionCrmStage): boolean {
  if (current === "closed_won" || current === candidate) return false;
  if (candidate === "closed_lost") return true;
  if (current === "closed_lost") return rank(candidate) >= rank("negotiation");
  return rank(candidate) > rank(current);
}

/** O sinal mais avançado vence; closed_lost só vence quando nada no mesmo lote aponta para frente. */
export function strongestSignal(signals: FunnelSignal[]): FunnelSignal | null {
  const forward = signals.filter((signal) => signal.stage !== "closed_lost");
  if (forward.length === 0) return signals[0] ?? null;
  return forward.reduce((best, signal) => (rank(signal.stage) > rank(best.stage) ? signal : best));
}

function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Só conta o que o contato escreveu: a mensagem da equipe nunca prova que houve pagamento.
const TEXT_RULES: Array<{ stage: EvolutionCrmStage; pattern: RegExp; reason: string }> = [
  {
    stage: "closed_won",
    pattern: /\b(paguei|ja paguei|fiz o pix|pix feito|ja transferi|segue (o )?comprovante|mandei o comprovante)\b/,
    reason: "lead confirmou o pagamento",
  },
  {
    stage: "negotiation",
    pattern: /\b(quanto (custa|fica|sai|e|eh)|qual (e |eh )?o (valor|preco)|valores?|precos?|boleto|pix|parcel\w*|desconto|forma de pagamento|formas de pagamento|proposta|contrato|mensalidade)\b/,
    reason: "lead falou de preço, pagamento ou proposta",
  },
];

/** Sinais em PT-BR nas mensagens do próprio contato, sem custo de inferência. */
export function signalsFromLeadText(texts: Array<string | null | undefined>): FunnelSignal[] {
  const signals: FunnelSignal[] = [];
  for (const raw of texts) {
    if (!raw) continue;
    const text = normalizeText(raw);
    for (const rule of TEXT_RULES) {
      const match = text.match(rule.pattern);
      if (match) {
        signals.push({ stage: rule.stage, source: "text_rule", reason: rule.reason, evidence: match[0] });
        break;
      }
    }
  }
  return signals;
}
