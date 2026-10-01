import { fetchEvolutionConnectionStates, isEvolutionApiConfigured } from "./evolutionApiClient.js";
import { listEvolutionInstancesSupabase, type EvolutionInstance } from "./evolutionSupabaseStore.js";
import { logger } from "./logger.js";
import { ntfyConfigFromEnv, sendNtfyNotification, type NtfyMessage } from "./ntfyNotifier.js";

// Avisa no celular (ntfy) quando uma instância de cliente fica desconectada.
// Consulta a Evolution por intervalo em vez de confiar só no webhook CONNECTION_UPDATE:
// se a Evolution ou a VPS travarem, nenhum webhook chega, e isso também precisa virar alerta.
// O Baileys oscila entre "connecting" e "open"; só alerta depois de `downAfterMs` fora do ar.

export type ConnectionMonitorDeps = {
  fetchStates: () => Promise<Map<string, string>>;
  listInstances: () => Promise<EvolutionInstance[]>;
  notify: (message: NtfyMessage) => Promise<boolean>;
  extraInstances: string[];
  downAfterMs: number;
  reminderMs: number;
  clickUrl: string | null;
};

type DownEntry = { downSince: number; alertedAt: number | null; label: string };

export function createConnectionMonitor(deps: ConnectionMonitorDeps) {
  const down = new Map<string, DownEntry>();
  let labels = new Map<string, string>();
  let apiDown: DownEntry | null = null;
  const click = deps.clickUrl ? { click: deps.clickUrl } : {};

  async function refreshWatched(): Promise<void> {
    try {
      const instances = await deps.listInstances();
      // Só instâncias vinculadas a uma unidade: as linhas de teste e simulação ficam de fora.
      labels = new Map(instances
        .filter((instance) => instance.unitName)
        .map((instance) => [instance.instanceName, [instance.unitName, instance.displayName].filter(Boolean).join(" · ")]));
    } catch (error) {
      // Mantém a última lista conhecida; o Supabase fora do ar não pode calar o monitor.
      logger.warn("[connection-monitor] Falha ao listar instâncias no Supabase", { error: error instanceof Error ? error.message : String(error) });
    }
    for (const name of deps.extraInstances) if (!labels.has(name)) labels.set(name, name);
  }

  async function checkApi(now: number, error: unknown): Promise<void> {
    if (!apiDown) apiDown = { downSince: now, alertedAt: null, label: "Evolution API" };
    const minutes = Math.round((now - apiDown.downSince) / 60_000);
    const due = apiDown.alertedAt === null
      ? now - apiDown.downSince >= deps.downAfterMs
      : now - apiDown.alertedAt >= deps.reminderMs;
    if (!due) return;
    const sent = await deps.notify({
      title: "Evolution API fora do ar",
      message: `A Evolution não responde há ${minutes} min. Nenhuma instância está recebendo mensagens. Erro: ${error instanceof Error ? error.message : String(error)}`.slice(0, 500),
      priority: 5,
      tags: ["rotating_light"],
    });
    if (sent) apiDown.alertedAt = now;
  }

  async function tick(now = Date.now()): Promise<void> {
    await refreshWatched();

    let states: Map<string, string>;
    try {
      states = await deps.fetchStates();
    } catch (error) {
      await checkApi(now, error);
      return;
    }
    if (apiDown) {
      if (apiDown.alertedAt !== null) {
        await deps.notify({ title: "Evolution API voltou", message: "A Evolution voltou a responder.", priority: 3, tags: ["white_check_mark"] });
      }
      apiDown = null;
    }

    for (const name of Array.from(down.keys())) {
      if (!labels.has(name) || !states.has(name)) down.delete(name);
    }

    for (const [name, label] of Array.from(labels)) {
      const state = states.get(name);
      // Instância que não existe mais na Evolution foi apagada de propósito; não é queda.
      if (state === undefined) continue;
      const entry = down.get(name);

      if (state === "open") {
        if (entry?.alertedAt != null) {
          await deps.notify({
            title: `Reconectou: ${label}`,
            message: `A instância ${name} voltou a receber mensagens.`,
            priority: 3,
            tags: ["white_check_mark"],
          });
        }
        down.delete(name);
        continue;
      }

      const current = entry ?? { downSince: now, alertedAt: null, label };
      down.set(name, current);
      const due = current.alertedAt === null
        ? now - current.downSince >= deps.downAfterMs
        : now - current.alertedAt >= deps.reminderMs;
      if (!due) continue;
      const minutes = Math.round((now - current.downSince) / 60_000);
      const sent = await deps.notify({
        title: `${current.alertedAt === null ? "WhatsApp desconectado" : "Ainda desconectado"}: ${label}`,
        message: `A instância ${name} está "${state}" há ${minutes} min e não recebe mensagens. Abra o WhatsApp no celular do cliente ou leia o QR de novo no painel.`,
        priority: 4,
        tags: ["warning"],
        ...click,
      });
      if (sent) current.alertedAt = now;
    }
  }

  return { tick };
}

let monitorTimer: NodeJS.Timeout | null = null;
let ticking = false;

function envMinutes(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function startEvolutionConnectionMonitor(): void {
  if (!ntfyConfigFromEnv() || !isEvolutionApiConfigured()) {
    logger.info("[connection-monitor] Desligado: defina NTFY_URL, NTFY_TOPIC e EVOLUTION_API_URL/KEY para ativar.");
    return;
  }
  const appUrl = process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const monitor = createConnectionMonitor({
    fetchStates: fetchEvolutionConnectionStates,
    listInstances: listEvolutionInstancesSupabase,
    notify: sendNtfyNotification,
    extraInstances: (process.env.EVOLUTION_ALERT_EXTRA_INSTANCES ?? "").split(",").map((name) => name.trim()).filter(Boolean),
    downAfterMs: envMinutes("EVOLUTION_ALERT_DOWN_MINUTES", 5) * 60_000,
    reminderMs: envMinutes("EVOLUTION_ALERT_REMINDER_HOURS", 24) * 3_600_000,
    clickUrl: appUrl ? `${appUrl}/pixel` : null,
  });
  if (monitorTimer) clearInterval(monitorTimer);
  monitorTimer = setInterval(() => {
    if (ticking) return;
    ticking = true;
    monitor.tick()
      .catch((error) => logger.error("[connection-monitor] Erro inesperado", { error: error instanceof Error ? error.message : String(error) }))
      .finally(() => { ticking = false; });
  }, 60_000);
  monitorTimer.unref?.();
}
