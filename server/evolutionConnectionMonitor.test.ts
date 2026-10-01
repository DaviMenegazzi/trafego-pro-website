import { describe, expect, it, vi } from "vitest";
import { createConnectionMonitor, type ConnectionMonitorDeps } from "./evolutionConnectionMonitor.js";
import type { EvolutionInstance } from "./evolutionSupabaseStore.js";
import type { NtfyMessage } from "./ntfyNotifier.js";

const MIN = 60_000;

function instance(instanceName: string, unitName: string | null, displayName: string | null = "Atendimento"): EvolutionInstance {
  return { instanceName, displayName, unitId: unitName ? "u1" : null, unitName, metaAccountId: null, connectionStatus: "open", lastEventAt: null, lastMessageAt: null };
}

function setup(overrides: Partial<ConnectionMonitorDeps> = {}) {
  let states = new Map<string, string>([["pixel-a", "open"]]);
  let apiError: Error | null = null;
  const sent: NtfyMessage[] = [];
  const deps: ConnectionMonitorDeps = {
    fetchStates: vi.fn(async () => { if (apiError) throw apiError; return states; }),
    listInstances: vi.fn(async () => [instance("pixel-a", "Vida Card Ijuí"), instance("__teste", null)]),
    notify: vi.fn(async (message: NtfyMessage) => { sent.push(message); return true; }),
    extraInstances: [],
    watchAll: false,
    downAfterMs: 5 * MIN,
    reminderMs: 24 * 60 * MIN,
    clickUrl: "https://www.trafego.pro/pixel",
    ...overrides,
  };
  return {
    monitor: createConnectionMonitor(deps),
    sent,
    deps,
    setState: (name: string, state: string) => { states = new Map(states); states.set(name, state); },
    setApiError: (error: Error | null) => { apiError = error; },
  };
}

describe("monitor de conexão da Evolution", () => {
  it("ignora oscilação curta e só alerta depois do tempo mínimo fora do ar", async () => {
    const { monitor, sent, setState } = setup();
    setState("pixel-a", "connecting");
    await monitor.tick(0);
    await monitor.tick(4 * MIN);
    expect(sent).toHaveLength(0);

    await monitor.tick(5 * MIN);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ title: "WhatsApp desconectado: Vida Card Ijuí · Atendimento", priority: 4, click: "https://www.trafego.pro/pixel" });

    await monitor.tick(6 * MIN);
    expect(sent).toHaveLength(1);
  });

  it("não alerta se reconectar antes do tempo mínimo", async () => {
    const { monitor, sent, setState } = setup();
    setState("pixel-a", "close");
    await monitor.tick(0);
    setState("pixel-a", "open");
    await monitor.tick(2 * MIN);
    setState("pixel-a", "close");
    await monitor.tick(3 * MIN);
    await monitor.tick(7 * MIN);
    expect(sent).toHaveLength(0);
  });

  it("avisa quando reconecta depois de um alerta e lembra se continuar caída", async () => {
    const { monitor, sent, setState } = setup({ reminderMs: 60 * MIN });
    setState("pixel-a", "close");
    await monitor.tick(0);
    await monitor.tick(5 * MIN);
    await monitor.tick(65 * MIN);
    expect(sent.map((m) => m.title)).toEqual([
      "WhatsApp desconectado: Vida Card Ijuí · Atendimento",
      "Ainda desconectado: Vida Card Ijuí · Atendimento",
    ]);

    setState("pixel-a", "open");
    await monitor.tick(66 * MIN);
    expect(sent[2]?.title).toBe("Reconectou: Vida Card Ijuí · Atendimento");
  });

  it("vigia só instâncias com unidade (e as extras), ignorando as apagadas da Evolution", async () => {
    const { monitor, sent, setState } = setup({ extraInstances: ["whatsapp-teste"] });
    setState("__teste", "close");
    setState("whatsapp-teste", "close");
    await monitor.tick(0);
    await monitor.tick(10 * MIN);
    expect(sent.map((m) => m.title)).toEqual(["WhatsApp desconectado: whatsapp-teste"]);
  });

  it("com watchAll vigia toda instância da Evolution, mantendo o nome da unidade quando existe", async () => {
    const { monitor, sent, setState } = setup({ watchAll: true });
    setState("pixel-a", "close");
    setState("sdr_8ac450c6_x", "connecting");
    await monitor.tick(0);
    await monitor.tick(5 * MIN);
    expect(sent.map((m) => m.title).sort()).toEqual([
      "WhatsApp desconectado: Vida Card Ijuí · Atendimento",
      "WhatsApp desconectado: sdr_8ac450c6_x",
    ]);
  });

  it("alerta quando a própria Evolution para de responder", async () => {
    const { monitor, sent, setApiError } = setup();
    setApiError(new Error("A Evolution API demorou demais para responder."));
    await monitor.tick(0);
    await monitor.tick(5 * MIN);
    expect(sent[0]).toMatchObject({ title: "Evolution API fora do ar", priority: 5 });

    setApiError(null);
    await monitor.tick(6 * MIN);
    expect(sent[1]?.title).toBe("Evolution API voltou");
  });

  it("tenta de novo no próximo ciclo se o envio ao ntfy falhar", async () => {
    const notify = vi.fn(async () => false);
    const { monitor, setState } = setup({ notify });
    setState("pixel-a", "close");
    await monitor.tick(0);
    await monitor.tick(5 * MIN);
    await monitor.tick(6 * MIN);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("continua com a última lista de instâncias se o Supabase falhar", async () => {
    const listInstances = vi.fn()
      .mockResolvedValueOnce([instance("pixel-a", "Vida Card Ijuí")])
      .mockRejectedValue(new Error("supabase fora"));
    const { monitor, sent, setState } = setup({ listInstances });
    setState("pixel-a", "close");
    await monitor.tick(0);
    await monitor.tick(5 * MIN);
    expect(sent).toHaveLength(1);
  });
});
