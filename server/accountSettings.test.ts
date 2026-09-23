import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { changeOwnPassword, updateOwnName, validatePasswordChange, validateProfileName } from "./accountSettings.js";

function authClient(signIn: { error?: unknown; session?: unknown }, update: { error?: { message: string } | null } = {}) {
  const signInWithPassword = vi.fn().mockResolvedValue({ data: { session: signIn.session ?? null }, error: signIn.error ?? null });
  const updateUser = vi.fn().mockResolvedValue({ data: {}, error: update.error ?? null });
  return { client: { auth: { signInWithPassword, updateUser } } as unknown as SupabaseClient, signInWithPassword, updateUser };
}

describe("validatePasswordChange", () => {
  it("exige os dois campos, tamanho mínimo e senha diferente", () => {
    expect(validatePasswordChange("", "novasenha")).toMatchObject({ ok: false, status: 400 });
    expect(validatePasswordChange("atual123", "curta")).toMatchObject({ ok: false, status: 400 });
    expect(validatePasswordChange("mesma123", "mesma123")).toMatchObject({ ok: false, status: 400 });
    expect(validatePasswordChange("atual123", "novasenha")).toEqual({ ok: true });
  });
});

describe("changeOwnPassword", () => {
  it("não altera nada quando a senha atual está errada", async () => {
    const { client, updateUser } = authClient({ error: new Error("Invalid login credentials") });
    await expect(changeOwnPassword(client, "a@b.com", "errada", "novasenha")).resolves.toMatchObject({ ok: false, status: 401 });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("troca a senha com a sessão recém-aberta", async () => {
    const { client, signInWithPassword, updateUser } = authClient({ session: { access_token: "t" } });
    await expect(changeOwnPassword(client, "a@b.com", "atual123", "novasenha")).resolves.toEqual({ ok: true });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "atual123" });
    expect(updateUser).toHaveBeenCalledWith({ password: "novasenha" });
  });

  it("não relata sucesso quando o Supabase recusa a nova senha", async () => {
    const { client } = authClient({ session: {} }, { error: { message: "Password should be at least 8 characters" } });
    await expect(changeOwnPassword(client, "a@b.com", "atual123", "novasenha")).resolves.toMatchObject({ ok: false, status: 400 });
  });
});

describe("perfil", () => {
  it("normaliza e valida o nome", () => {
    expect(validateProfileName("  Ana   Souza ")).toEqual({ ok: true, name: "Ana Souza" });
    expect(validateProfileName("A")).toMatchObject({ ok: false });
    expect(validateProfileName(42)).toMatchObject({ ok: false });
  });

  it("grava o nome no Auth e no perfil", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { admin: { updateUserById } }, from: vi.fn(() => ({ update })) } as unknown as SupabaseClient;

    await expect(updateOwnName(client, "user-1", "Ana Souza")).resolves.toEqual({ ok: true });
    expect(updateUserById).toHaveBeenCalledWith("user-1", { user_metadata: { name: "Ana Souza" } });
    expect(update).toHaveBeenCalledWith({ full_name: "Ana Souza" });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });
});
