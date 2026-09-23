import type { SupabaseClient } from "@supabase/supabase-js";

// Alterações feitas pela própria pessoa em Configurações da conta. As funções
// recebem os clientes do Supabase por parâmetro para serem testáveis sem rede.

export const MIN_PASSWORD_LENGTH = 6;

export type AccountResult = { ok: true } | { ok: false; status: number; error: string };

export function validatePasswordChange(currentPassword: unknown, newPassword: unknown): AccountResult {
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
    return { ok: false, status: 400, error: "Informe a senha atual e a nova senha." };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, status: 400, error: `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (newPassword === currentPassword) {
    return { ok: false, status: 400, error: "A nova senha precisa ser diferente da atual." };
  }
  return { ok: true };
}

/**
 * Confere a senha atual abrindo uma sessão num cliente descartável (nunca no
 * cliente compartilhado do servidor) e troca a senha com essa mesma sessão.
 */
export async function changeOwnPassword(
  ephemeralClient: SupabaseClient,
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<AccountResult> {
  const { data, error } = await ephemeralClient.auth.signInWithPassword({ email, password: currentPassword });
  if (error || !data.session) {
    return { ok: false, status: 401, error: "A senha atual não confere." };
  }

  const { error: updateError } = await ephemeralClient.auth.updateUser({ password: newPassword });
  if (updateError) {
    const weak = /weak|short|at least|characters/i.test(updateError.message);
    return {
      ok: false,
      status: weak ? 400 : 502,
      error: weak ? "A nova senha não atende aos requisitos de segurança." : "Não foi possível alterar a senha agora. Tente novamente.",
    };
  }
  return { ok: true };
}

export function validateProfileName(name: unknown): { ok: true; name: string } | { ok: false; status: number; error: string } {
  const trimmed = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (trimmed.length < 3) return { ok: false, status: 400, error: "O nome deve ter pelo menos 3 caracteres." };
  if (trimmed.length > 120) return { ok: false, status: 400, error: "O nome deve ter no máximo 120 caracteres." };
  return { ok: true, name: trimmed };
}

/** Grava o nome no Auth (usado no login) e no perfil (usado nas listas de usuários). */
export async function updateOwnName(serviceClient: SupabaseClient, userId: string, name: string): Promise<AccountResult> {
  const { error: authError } = await serviceClient.auth.admin.updateUserById(userId, { user_metadata: { name } });
  if (authError) return { ok: false, status: 502, error: "Não foi possível salvar o nome agora. Tente novamente." };

  const { error: profileError } = await serviceClient.from("user_profiles").update({ full_name: name }).eq("id", userId);
  if (profileError) return { ok: false, status: 502, error: "O nome foi salvo no acesso, mas não no perfil. Tente novamente." };
  return { ok: true };
}
