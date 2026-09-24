import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase (projeto trafegopro-analise) que guarda os dados próprios do site:
// feedbacks, formulários, publicações sociais e tokens da API externa.
// Acesso só pelo servidor com service_role — as tabelas têm RLS sem políticas.
let client: SupabaseClient | null = null;

export function getSiteSupabase(): SupabaseClient {
  const url = process.env.EVOLUTION_SUPABASE_URL;
  const serviceRoleKey = process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase do site não configurado (EVOLUTION_SUPABASE_URL / EVOLUTION_SUPABASE_SERVICE_ROLE_KEY)");
  if (!client) client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Lança o erro do Supabase (se houver) e devolve os dados. */
export function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
