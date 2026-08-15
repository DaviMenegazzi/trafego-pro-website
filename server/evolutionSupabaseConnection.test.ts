import { describe, expect, it } from "vitest";

describe("Supabase exclusivo do Evolution", () => {
  it("aceita a chave de serviço na configuração pública do projeto", async () => {
    const projectUrl = process.env.EVOLUTION_SUPABASE_URL;
    const serviceRoleKey = process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY;

    expect(projectUrl).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i);
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(`${projectUrl}/auth/v1/settings`, {
      headers: { apikey: serviceRoleKey!, Authorization: `Bearer ${serviceRoleKey!}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { external?: Record<string, boolean> };
    expect(body).toHaveProperty("external");
  });
});
