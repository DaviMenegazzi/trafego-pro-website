import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Campaign {
  id: number;
  clientId: number;
  name: string;
  platform: string;
  status: string;
  budget: number;
  createdAt: number;
  updatedAt: number;
}

export interface Client {
  id: number;
  name: string;
  city: string;
  state: string;
  status: string;
  plan: string;
  startDate: string;
  monthlyBudget: number;
  contact: string;
  phone: string;
  email: string;
  lpUrl: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  createdAt: number;
}

export interface FeedbackLead {
  id: number;
  unit: string;
  responsible: string;
  weekStart: string;
  totalLeads: number;
  leadsCard: number;
  leadsConsultation: number;
  leadsDentistry: number;
  leadsBusinessPJ: number;
  leadsOutOfArea: number;
  leadsAnswered: number;
  leadsNoAnswer: number;
  salesClosed: number;
  mainReason: string;
  creativeFeedback: string;
  generalObservations: string;
  supportNeeded: string;
  submittedAt: string;
  createdAt: number;
}

interface DbSchema {
  clients: Client[];
  campaigns: Campaign[];
  users: User[];
  feedbackLeads: FeedbackLead[];
  _nextClientId: number;
  _nextCampaignId: number;
  _nextUserId: number;
  _nextFeedbackLeadId: number;
}

// ─── Setup ────────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, "../data/db.json");
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const adapter = new JSONFileSync<DbSchema>(DB_PATH);
const db = new LowSync<DbSchema>(adapter, {
  clients: [],
  campaigns: [],
  users: [],
  feedbackLeads: [],
  _nextClientId: 1,
  _nextCampaignId: 1,
  _nextUserId: 1,
  _nextFeedbackLeadId: 1,
});

db.read();

// ─── Migrations para arquivos de banco antigos ────────────────────────────────
if (!db.data.users) {
  (db.data as DbSchema).users = [];
  db.write();
}
if (db.data._nextUserId === undefined) {
  (db.data as DbSchema)._nextUserId = 1;
  db.write();
}
if (!db.data.feedbackLeads) {
  (db.data as DbSchema).feedbackLeads = [];
  db.write();
}
if (db.data._nextFeedbackLeadId === undefined) {
  (db.data as DbSchema)._nextFeedbackLeadId = 1;
  db.write();
}

// ─── Admin inicial a partir de variáveis de ambiente ──────────────────────────
// No primeiro boot, se não houver nenhum usuário e ADMIN_EMAIL/ADMIN_PASSWORD
// estiverem definidos, cria o admin com a senha já em hash. Substitui o antigo
// admin fixo que ficava hardcoded no código.
if (db.data.users.length === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  db.data.users.push({
    id: db.data._nextUserId++,
    name: process.env.ADMIN_NAME || "Admin",
    email: process.env.ADMIN_EMAIL,
    password: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10),
    role: "admin",
    createdAt: Date.now(),
  });
  db.write();
  console.log(`[db] Admin inicial criado para ${process.env.ADMIN_EMAIL}.`);
}

// ─── Seed inicial ─────────────────────────────────────────────────────────────
if (db.data.clients.length === 0) {
  const now = Date.now();

  const seedData: Array<Omit<Client, "id" | "createdAt" | "updatedAt"> & { campaigns: Array<Omit<Campaign, "id" | "clientId" | "createdAt" | "updatedAt">> }> = [
    {
      name: "Vida Card Tupanciretã",
      city: "Tupanciretã",
      state: "RS",
      status: "active",
      plan: "Meta Ads + Google Ads",
      startDate: "2024-03-01",
      monthlyBudget: 2500,
      contact: "Gerente Tupanciretã",
      phone: "(55) 99999-0001",
      email: "tupancireta@vidacard.com.br",
      lpUrl: "/tupancireta",
      notes: "Foco em geração de conversas qualificadas no WhatsApp. Público 25-55 anos.",
      campaigns: [
        { name: "Campanha Família", platform: "Meta Ads", status: "active", budget: 800 },
        { name: "Campanha Individual", platform: "Meta Ads", status: "active", budget: 600 },
        { name: "Pesquisa Marca", platform: "Google Ads", status: "active", budget: 500 },
        { name: "Pesquisa Concorrência", platform: "Google Ads", status: "active", budget: 600 },
      ],
    },
    {
      name: "Vida Card Júlio de Castilhos",
      city: "Júlio de Castilhos",
      state: "RS",
      status: "active",
      plan: "Meta Ads + Google Ads",
      startDate: "2024-04-01",
      monthlyBudget: 2000,
      contact: "Gerente Júlio de Castilhos",
      phone: "(55) 99999-0002",
      email: "juliodecastilhos@vidacard.com.br",
      lpUrl: "/juliodecastilhos",
      notes: "Praça menor, foco em awareness e conversão direta. Público 30-60 anos.",
      campaigns: [
        { name: "Campanha Família", platform: "Meta Ads", status: "active", budget: 700 },
        { name: "Campanha Individual", platform: "Meta Ads", status: "active", budget: 500 },
        { name: "Pesquisa Marca", platform: "Google Ads", status: "active", budget: 400 },
        { name: "Pesquisa Concorrência", platform: "Google Ads", status: "paused", budget: 400 },
      ],
    },
  ];

  for (const s of seedData) {
    const { campaigns, ...clientData } = s;
    const clientId = db.data._nextClientId++;
    const client: Client = { id: clientId, ...clientData, createdAt: now, updatedAt: now };
    db.data.clients.push(client);
    for (const c of campaigns) {
      const campaignId = db.data._nextCampaignId++;
      db.data.campaigns.push({ id: campaignId, clientId, ...c, createdAt: now, updatedAt: now });
    }
  }

  db.write();
}

// ─── User helpers ─────────────────────────────────────────────────────────────
export function getUserByEmail(email: string): User | undefined {
  db.read();
  return db.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserByName(name: string): User | undefined {
  db.read();
  return db.data.users.find((u) => u.name.toLowerCase() === name.toLowerCase());
}

export function getAllUsers(): User[] {
  db.read();
  return db.data.users;
}

export function createUser(data: { name: string; email: string; password: string; role?: "admin" | "user" }): User {
  db.read();
  const user: User = {
    id: db.data._nextUserId++,
    name: data.name,
    email: data.email,
    // Nunca guardamos senha em texto puro: armazenamos apenas o hash bcrypt.
    password: bcrypt.hashSync(data.password, 10),
    role: data.role ?? "admin",
    createdAt: Date.now(),
  };
  db.data.users.push(user);
  db.write();
  return user;
}

// Usado pela migração automática de senhas legadas (texto puro -> hash).
export function updateUserPassword(id: number, hashedPassword: string): void {
  db.read();
  const idx = db.data.users.findIndex((u) => u.id === id);
  if (idx === -1) return;
  db.data.users[idx].password = hashedPassword;
  db.write();
}

export function deleteUser(id: number): void {
  db.read();
  db.data.users = db.data.users.filter((u) => u.id !== id);
  db.write();
}

// ─── Query helpers ────────────────────────────────────────────────────────────
export function getAllClients(): Client[] {
  db.read();
  return [...db.data.clients].sort((a, b) => a.createdAt - b.createdAt);
}

export function getClientById(id: number): Client | undefined {
  db.read();
  return db.data.clients.find((c) => c.id === id);
}

export function getCampaignsByClientId(clientId: number): Campaign[] {
  db.read();
  return db.data.campaigns.filter((c) => c.clientId === clientId).sort((a, b) => a.createdAt - b.createdAt);
}

export type ClientInput = Omit<Client, "id" | "createdAt" | "updatedAt">;

export function createClient(data: Partial<ClientInput> & { name: string }): Client {
  db.read();
  const now = Date.now();
  const client: Client = {
    id: db.data._nextClientId++,
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
  db.data.clients.push(client);
  db.write();
  return client;
}

export function updateClient(id: number, data: Partial<ClientInput>): Client | undefined {
  db.read();
  const idx = db.data.clients.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  db.data.clients[idx] = { ...db.data.clients[idx], ...data, updatedAt: Date.now() };
  db.write();
  return db.data.clients[idx];
}

export function deleteClient(id: number): void {
  db.read();
  db.data.clients = db.data.clients.filter((c) => c.id !== id);
  db.data.campaigns = db.data.campaigns.filter((c) => c.clientId !== id);
  db.write();
}

export type CampaignInput = Omit<Campaign, "id" | "clientId" | "createdAt" | "updatedAt">;

export function createCampaign(clientId: number, data: Partial<CampaignInput> & { name: string }): Campaign {
  db.read();
  const now = Date.now();
  const campaign: Campaign = {
    id: db.data._nextCampaignId++,
    clientId,
    name: data.name,
    platform: data.platform ?? "",
    status: data.status ?? "active",
    budget: data.budget ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  db.data.campaigns.push(campaign);
  db.write();
  return campaign;
}

export function updateCampaign(id: number, data: Partial<CampaignInput>): Campaign | undefined {
  db.read();
  const idx = db.data.campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  db.data.campaigns[idx] = { ...db.data.campaigns[idx], ...data, updatedAt: Date.now() };
  db.write();
  return db.data.campaigns[idx];
}

export function deleteCampaign(id: number): void {
  db.read();
  db.data.campaigns = db.data.campaigns.filter((c) => c.id !== id);
  db.write();
}

// ─── Feedback Leads ───────────────────────────────────────────────────────────
export type FeedbackLeadInput = Omit<FeedbackLead, "id" | "createdAt">;

export function getAllFeedbackLeads(): FeedbackLead[] {
  db.read();
  return [...db.data.feedbackLeads].sort((a, b) => b.createdAt - a.createdAt);
}

export function getFeedbackLeadById(id: number): FeedbackLead | undefined {
  db.read();
  return db.data.feedbackLeads.find((f) => f.id === id);
}

export function getFeedbackLeadsByUnit(unit: string): FeedbackLead[] {
  db.read();
  return db.data.feedbackLeads
    .filter((f) => f.unit === unit)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function createFeedbackLead(data: FeedbackLeadInput): FeedbackLead {
  db.read();
  const feedback: FeedbackLead = {
    id: db.data._nextFeedbackLeadId++,
    unit: data.unit,
    responsible: data.responsible,
    weekStart: data.weekStart,
    totalLeads: data.totalLeads,
    leadsCard: data.leadsCard,
    leadsConsultation: data.leadsConsultation,
    leadsDentistry: data.leadsDentistry,
    leadsBusinessPJ: data.leadsBusinessPJ,
    leadsOutOfArea: data.leadsOutOfArea,
    leadsAnswered: data.leadsAnswered,
    leadsNoAnswer: data.leadsNoAnswer,
    salesClosed: data.salesClosed,
    mainReason: data.mainReason,
    creativeFeedback: data.creativeFeedback,
    generalObservations: data.generalObservations,
    supportNeeded: data.supportNeeded,
    submittedAt: data.submittedAt,
    createdAt: Date.now(),
  };
  db.data.feedbackLeads.push(feedback);
  db.write();
  return feedback;
}

export function deleteFeedbackLead(id: number): void {
  db.read();
  db.data.feedbackLeads = db.data.feedbackLeads.filter((f) => f.id !== id);
  db.write();
}
