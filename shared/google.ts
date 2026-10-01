// Contrato entre o servidor e a tela do Google (GA4 + campanhas do Google Ads via GA4).

/** Landing Page vinculada a uma unidade: a propriedade do GA4 que mede o site dela. */
export type Ga4LandingPage = {
  id: string;
  /** Conta da Meta da unidade, sem o prefixo act_. */
  unitId: string;
  propertyId: string;
  name: string;
  /** Domínios que filtram a propriedade quando ela mede mais de um site; vazio = todos. */
  hostnames: string[];
  /** Endereço público, para o botão "Abrir Landing Page". */
  siteUrl: string | null;
  createdAt: string;
};

export type Ga4LandingPageInput = {
  unitId: string;
  propertyId: string;
  name: string;
  hostnames: string[];
  siteUrl: string | null;
};

export type Ga4LandingPagesResponse = {
  unitId: string;
  landingPages: Ga4LandingPage[];
  /** Administradores podem vincular e remover Landing Pages. */
  canManage: boolean;
  /** A conta de serviço do Google está configurada no servidor. */
  configured: boolean;
  /** Só para administradores: e-mail a adicionar como Leitor nas propriedades do GA4. */
  serviceAccountEmail: string | null;
};

export type Ga4Totals = {
  sessions: number;
  /** Usuários ativos (a métrica "Usuários" dos relatórios do GA4). */
  users: number;
  newUsers: number;
  engagedSessions: number;
  /** Sessões engajadas / sessões (0–1). */
  engagementRate: number;
  /** Tempo médio de engajamento por usuário ativo, em segundos. */
  avgEngagementSeconds: number;
  keyEvents: number;
  /** Sessões com ao menos uma conversão / sessões (0–1). Uma sessão com dois cliques no WhatsApp conta uma vez. */
  conversionRate: number;
  adCost: number;
  adClicks: number;
  adImpressions: number;
};

export type Ga4DailyRow = {
  date: string; // YYYY-MM-DD
  sessions: number;
  keyEvents: number;
};

export type Ga4KeyEventRow = {
  eventName: string;
  /** Nome para quem lê: lead_whatsapp → WhatsApp. */
  label: string;
  count: number;
};

export type Ga4LandingPageRow = {
  hostName: string;
  landingPage: string;
  sessions: number;
  engagedSessions: number;
  keyEvents: number;
  /** Sessões com ao menos uma conversão. */
  convertedSessions: number;
};

export type Ga4CityRow = {
  city: string;
  sessions: number;
  keyEvents: number;
  convertedSessions: number;
};

export type Ga4SourceRow = {
  sourceMedium: string;
  sessions: number;
  users: number;
  keyEvents: number;
};

export type Ga4CampaignRow = {
  campaign: string;
  cost: number;
  clicks: number;
  impressions: number;
  sessions: number;
  keyEvents: number;
};

export type Ga4Report = {
  propertyId: string;
  start: string;
  end: string;
  /** Período anterior de mesmo tamanho, para as variações dos cards. */
  previousStart: string;
  previousEnd: string;
  currency: string | null;
  totals: Ga4Totals;
  previousTotals: Ga4Totals;
  daily: Ga4DailyRow[];
  keyEventsByName: Ga4KeyEventRow[];
  landingPages: Ga4LandingPageRow[];
  cities: Ga4CityRow[];
  sources: Ga4SourceRow[];
  campaigns: Ga4CampaignRow[];
  /** Campanhas vêm numa consulta separada: se falharem, o resto do relatório continua valendo. */
  campaignsError: string | null;
  fetchedAt: string;
};

const KEY_EVENT_LABELS: Record<string, string> = {
  lead_whatsapp: "WhatsApp",
  click_whatsapp: "WhatsApp",
  whatsapp: "WhatsApp",
  lead_formulario: "Formulário",
  form_submit: "Formulário",
  generate_lead: "Lead",
  lead_telefone: "Telefone",
  click_phone: "Telefone",
  purchase: "Compra",
};

export function keyEventLabel(eventName: string): string {
  return KEY_EVENT_LABELS[eventName] ?? eventName;
}
