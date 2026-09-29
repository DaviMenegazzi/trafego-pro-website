import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  forms: [
    { id: "form-a", client_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
    { id: "form-b", client_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" },
  ],
  deleted: [] as string[],
  bucketUpdates: 0,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let action = "read";
      const matches = (row: Record<string, unknown>) =>
        Object.entries(filters).every(([key, value]) => row[key] === value);
      const query = {
        select: () => query,
        delete: () => { action = "delete"; return query; },
        eq: (key: string, value: unknown) => { filters[key] = value; return query; },
        order: () => query,
        range: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: table === "talent_forms" ? state.forms.find(matches) ?? null : null, error: null }),
        then: (resolve: (value: unknown) => unknown) => {
          const rows = table === "talent_forms" ? state.forms.filter(matches) : [];
          if (action === "delete") state.deleted.push(...rows.map((row) => row.id));
          return resolve({ data: rows.map((row) => ({ id: row.id })), error: null });
        },
      };
      return query;
    },
    storage: {
      listBuckets: async () => ({ data: [], error: null }),
      createBucket: async () => { throw new Error("unavailable"); },
      updateBucket: async () => { state.bucketUpdates++; return { error: null }; },
    },
  }),
}));

import { deleteTalentFormForClient, getTalentFormForClient, uploadTalentLogo } from "./talentBankSupabaseStore.js";

describe("tenant boundaries in talent forms", () => {
  beforeEach(() => {
    process.env.EVOLUTION_SUPABASE_URL = "https://example.supabase.co";
    process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY = "test-key";
    state.deleted.length = 0;
    state.bucketUpdates = 0;
  });

  it("does not read or delete another unit's form even with its ID", async () => {
    const unitA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
    expect(await getTalentFormForClient(unitA, "form-b")).toBeNull();
    expect(await deleteTalentFormForClient(unitA, "form-b")).toBe(false);
    expect(state.deleted).toEqual([]);
  });

  it("never changes the private resume bucket when logo storage fails", async () => {
    await expect(uploadTalentLogo({
      clientId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      formId: "form-a",
      fileName: "logo.png",
      file: Buffer.from("image"),
      mimeType: "image/png",
    })).rejects.toThrow("Bucket público de logos indisponível");
    expect(state.bucketUpdates).toBe(0);
  });
});
