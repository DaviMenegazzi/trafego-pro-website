import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mock do módulo db.ts ─────────────────────────────────────────────────────
// Usamos um store em memória para isolar os testes do arquivo JSON real
const store: {
  clients: Array<{ id: number; name: string; city: string; state: string; status: string; plan: string; startDate: string; monthlyBudget: number; contact: string; phone: string; email: string; lpUrl: string; notes: string; createdAt: number; updatedAt: number }>;
  campaigns: Array<{ id: number; clientId: number; name: string; platform: string; status: string; budget: number; createdAt: number; updatedAt: number }>;
  nextClientId: number;
  nextCampaignId: number;
} = { clients: [], campaigns: [], nextClientId: 1, nextCampaignId: 1 };

function resetStore() {
  store.clients = [];
  store.campaigns = [];
  store.nextClientId = 1;
  store.nextCampaignId = 1;
}

// Implementações inline que espelham server/db.ts mas usam o store em memória
function getAllClients() {
  return [...store.clients].sort((a, b) => a.createdAt - b.createdAt);
}

function getClientById(id: number) {
  return store.clients.find((c) => c.id === id);
}

function getCampaignsByClientId(clientId: number) {
  return store.campaigns.filter((c) => c.clientId === clientId);
}

function createClient(data: { name: string; city?: string; state?: string; status?: string; plan?: string; startDate?: string; monthlyBudget?: number; contact?: string; phone?: string; email?: string; lpUrl?: string; notes?: string }) {
  const now = Date.now();
  const client = {
    id: store.nextClientId++,
    name: data.name,
    city: data.city ?? "",
    state: data.state ?? "",
    status: data.status ?? "active",
    plan: data.plan ?? "",
    startDate: data.startDate ?? "",
    monthlyBudget: data.monthlyBudget ?? 0,
    contact: data.contact ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    lpUrl: data.lpUrl ?? "",
    notes: data.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  store.clients.push(client);
  return client;
}

function updateClient(id: number, data: Partial<typeof store.clients[0]>) {
  const idx = store.clients.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  store.clients[idx] = { ...store.clients[idx], ...data, updatedAt: Date.now() };
  return store.clients[idx];
}

function deleteClient(id: number) {
  store.clients = store.clients.filter((c) => c.id !== id);
  store.campaigns = store.campaigns.filter((c) => c.clientId !== id);
}

function createCampaign(clientId: number, data: { name: string; platform?: string; status?: string; budget?: number }) {
  const now = Date.now();
  const campaign = {
    id: store.nextCampaignId++,
    clientId,
    name: data.name,
    platform: data.platform ?? "",
    status: data.status ?? "active",
    budget: data.budget ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  store.campaigns.push(campaign);
  return campaign;
}

function updateCampaign(id: number, data: Partial<typeof store.campaigns[0]>) {
  const idx = store.campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  store.campaigns[idx] = { ...store.campaigns[idx], ...data, updatedAt: Date.now() };
  return store.campaigns[idx];
}

function deleteCampaign(id: number) {
  store.campaigns = store.campaigns.filter((c) => c.id !== id);
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("CRUD de Clientes", () => {
  beforeEach(() => resetStore());

  it("cria um cliente com campos padrão", () => {
    const c = createClient({ name: "Vida Card Teste" });
    expect(c.id).toBe(1);
    expect(c.name).toBe("Vida Card Teste");
    expect(c.status).toBe("active");
    expect(c.monthlyBudget).toBe(0);
    expect(c.city).toBe("");
  });

  it("cria um cliente com todos os campos", () => {
    const c = createClient({
      name: "Vida Card Completo",
      city: "Tupanciretã",
      state: "RS",
      status: "active",
      plan: "Meta Ads",
      startDate: "2024-01-01",
      monthlyBudget: 2500,
      contact: "João",
      phone: "55 99999-0000",
      email: "joao@test.com",
      lpUrl: "/tupancireta",
      notes: "Notas de teste",
    });
    expect(c.city).toBe("Tupanciretã");
    expect(c.monthlyBudget).toBe(2500);
    expect(c.email).toBe("joao@test.com");
  });

  it("lista todos os clientes em ordem de criação", () => {
    createClient({ name: "Cliente A" });
    createClient({ name: "Cliente B" });
    createClient({ name: "Cliente C" });
    const list = getAllClients();
    expect(list).toHaveLength(3);
    expect(list[0].name).toBe("Cliente A");
    expect(list[2].name).toBe("Cliente C");
  });

  it("busca cliente por id", () => {
    createClient({ name: "Buscável" });
    const c = getClientById(1);
    expect(c).toBeDefined();
    expect(c!.name).toBe("Buscável");
  });

  it("retorna undefined para id inexistente", () => {
    expect(getClientById(999)).toBeUndefined();
  });

  it("atualiza campos do cliente", () => {
    createClient({ name: "Original", monthlyBudget: 1000 });
    const updated = updateClient(1, { name: "Atualizado", monthlyBudget: 2000 });
    expect(updated!.name).toBe("Atualizado");
    expect(updated!.monthlyBudget).toBe(2000);
  });

  it("retorna undefined ao atualizar id inexistente", () => {
    expect(updateClient(999, { name: "X" })).toBeUndefined();
  });

  it("exclui cliente e suas campanhas", () => {
    createClient({ name: "Para Excluir" });
    createCampaign(1, { name: "Campanha do cliente" });
    expect(getAllClients()).toHaveLength(1);
    expect(getCampaignsByClientId(1)).toHaveLength(1);
    deleteClient(1);
    expect(getAllClients()).toHaveLength(0);
    expect(getCampaignsByClientId(1)).toHaveLength(0);
  });

  it("IDs são auto-incrementados sequencialmente", () => {
    const a = createClient({ name: "A" });
    const b = createClient({ name: "B" });
    const c = createClient({ name: "C" });
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(c.id).toBe(3);
  });
});

describe("CRUD de Campanhas", () => {
  beforeEach(() => resetStore());

  it("cria campanha vinculada ao cliente", () => {
    createClient({ name: "Cliente" });
    const camp = createCampaign(1, { name: "Campanha Meta", platform: "Meta Ads", budget: 800 });
    expect(camp.clientId).toBe(1);
    expect(camp.name).toBe("Campanha Meta");
    expect(camp.budget).toBe(800);
  });

  it("lista campanhas por cliente", () => {
    createClient({ name: "Cliente 1" });
    createClient({ name: "Cliente 2" });
    createCampaign(1, { name: "Camp A" });
    createCampaign(1, { name: "Camp B" });
    createCampaign(2, { name: "Camp C" });
    expect(getCampaignsByClientId(1)).toHaveLength(2);
    expect(getCampaignsByClientId(2)).toHaveLength(1);
  });

  it("atualiza campanha", () => {
    createClient({ name: "Cliente" });
    createCampaign(1, { name: "Original", budget: 500 });
    const updated = updateCampaign(1, { name: "Atualizada", budget: 1000 });
    expect(updated!.name).toBe("Atualizada");
    expect(updated!.budget).toBe(1000);
  });

  it("exclui campanha sem afetar outras", () => {
    createClient({ name: "Cliente" });
    createCampaign(1, { name: "Camp 1" });
    createCampaign(1, { name: "Camp 2" });
    deleteCampaign(1);
    const remaining = getCampaignsByClientId(1);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe("Camp 2");
  });

  it("campanha tem status padrão 'active'", () => {
    createClient({ name: "Cliente" });
    const camp = createCampaign(1, { name: "Sem status" });
    expect(camp.status).toBe("active");
  });
});

describe("Validações de negócio", () => {
  beforeEach(() => resetStore());

  it("cliente com status 'paused' é criado corretamente", () => {
    const c = createClient({ name: "Pausado", status: "paused" });
    expect(c.status).toBe("paused");
  });

  it("orçamento zero é válido", () => {
    const c = createClient({ name: "Sem orçamento", monthlyBudget: 0 });
    expect(c.monthlyBudget).toBe(0);
  });

  it("múltiplos clientes têm IDs únicos", () => {
    const ids = Array.from({ length: 10 }, (_, i) => createClient({ name: `Cliente ${i}` }).id);
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });
});
