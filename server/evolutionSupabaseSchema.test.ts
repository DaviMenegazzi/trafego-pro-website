import { describe, expect, it } from "vitest";

describe("Esquema Supabase exclusivo do Evolution", () => {
  it("expõe as tabelas isoladas pela API do novo projeto", async () => {
    const projectUrl = process.env.EVOLUTION_SUPABASE_URL!;
    const serviceRoleKey = process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

    const results = await Promise.all(
      ["evolution_instances", "evolution_events", "evolution_leads"].map(async (table) => {
        const response = await fetch(`${projectUrl}/rest/v1/${table}?select=*&limit=1`, { headers });
        return { table, status: response.status };
      }),
    );

    expect(results).toEqual([
      { table: "evolution_instances", status: 200 },
      { table: "evolution_events", status: 200 },
      { table: "evolution_leads", status: 200 },
    ]);
  });
});
