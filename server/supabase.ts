import "./env.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client do Supabase para uso NO SERVIDOR. Duas formas de autorizar a leitura:
//
// 1) SUPABASE_SERVICE_KEY (service_role): ignora o RLS. Se existir, é usada direto.
// 2) SUPABASE_AUTH_EMAIL + SUPABASE_AUTH_PASSWORD: o servidor faz login no Supabase Auth
//    (com a publishable key), obtendo uma sessão de usuário real — assim o RLS libera a
//    leitura exatamente como acontecia na dashboard antiga. A senha fica só no servidor,
//    nunca no bundle do front.
//
// Se nenhuma das duas estiver presente, cai no acesso anônimo (a publishable sozinha),
// que só retorna dados se o RLS permitir leitura ao papel anon.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY;
const AUTH_EMAIL = process.env.SUPABASE_AUTH_EMAIL;
const AUTH_PASSWORD = process.env.SUPABASE_AUTH_PASSWORD;

const KEY = SERVICE_KEY || PUBLISHABLE_KEY;

let _client: SupabaseClient | null = null;
let _signedInAt = 0;
// Revalida a sessão a cada ~50 min (o access token do Supabase dura ~1h).
const SESSION_TTL_MS = 50 * 60 * 1000;

function baseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !KEY) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// Uso interno síncrono (ex.: rotas que não dependem de RLS ou quando há service key).
export function getSupabase(): SupabaseClient | null {
  return baseClient();
}

/**
 * Cria um cliente de curta duração que executa consultas com o access token
 * do próprio usuário. Assim, as políticas RLS do Supabase continuam sendo a
 * fonte de verdade para unidades, métricas e permissões do dashboard.
 */
export function getSupabaseForAccessToken(accessToken: string | undefined): SupabaseClient | null {
  if (!accessToken) return null;
  const clientKey = PUBLISHABLE_KEY || SERVICE_KEY;
  if (!SUPABASE_URL || !clientKey) return null;

  return createClient(SUPABASE_URL, clientKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Client com privilégio elevado (service_role) reservado estritamente para jobs de sistema.
export function getServiceSupabase(): SupabaseClient | null {
  return baseClient();
}

// Client autorizado para leitura protegida por RLS.
// - service key: retorna direto (já ignora RLS).
// - publishable + credenciais: garante uma sessão logada antes de retornar.
export async function getAuthedSupabase(): Promise<SupabaseClient | null> {
  const sb = baseClient();
  if (!sb) return null;

  // Com service key não é preciso logar.
  if (SERVICE_KEY) return sb;

  // Sem credenciais de login, devolve o client anônimo (pode esbarrar no RLS).
  if (!AUTH_EMAIL || !AUTH_PASSWORD) return sb;

  const fresh = Date.now() - _signedInAt < SESSION_TTL_MS;
  const { data: sessionData } = await sb.auth.getSession();
  if (fresh && sessionData.session) return sb;

  const { error } = await sb.auth.signInWithPassword({ email: AUTH_EMAIL, password: AUTH_PASSWORD });
  if (error) {
    console.error(`[supabase] Falha no login (${AUTH_EMAIL}): ${error.message}`);
    // Retorna o client mesmo assim; a query seguirá anônima e provavelmente vazia.
    return sb;
  }
  _signedInAt = Date.now();
  return sb;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && KEY);
}

// Diagnóstico para a rota de status: diz como a leitura está autorizada.
export function supabaseAuthMode(): "service_key" | "user_login" | "anon" | "unconfigured" {
  if (!isSupabaseConfigured()) return "unconfigured";
  if (SERVICE_KEY) return "service_key";
  if (AUTH_EMAIL && AUTH_PASSWORD) return "user_login";
  return "anon";
}
