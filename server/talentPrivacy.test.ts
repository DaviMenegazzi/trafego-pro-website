import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, any>>,
  removedFiles: [] as string[],
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      const filters: Array<(row: Record<string, any>) => boolean> = [];
      let operation: "select" | "update" | "delete" = "select";
      let patch: Record<string, unknown> = {};
      let max = 100;
      const matches = (row: Record<string, any>) => filters.every((filter) => filter(row));
      const execute = () => {
        const matching = table === "talent_submissions" ? state.rows.filter(matches).slice(0, max) : [];
        if (operation === "update") matching.forEach((row) => Object.assign(row, patch));
        if (operation === "delete") state.rows = state.rows.filter((row) => !matching.includes(row));
        return matching;
      };
      const query = {
        select: () => query,
        update: (value: Record<string, unknown>) => { operation = "update"; patch = value; return query; },
        delete: () => { operation = "delete"; return query; },
        eq: (key: string, value: unknown) => { filters.push((row) => row[key] === value); return query; },
        lt: (key: string, value: string) => { filters.push((row) => row[key] < value); return query; },
        order: () => query,
        limit: (value: number) => { max = value; return query; },
        maybeSingle: async () => ({ data: execute()[0] ?? null, error: null }),
        then: (resolve: (value: unknown) => unknown) => resolve({ data: execute(), error: null }),
      };
      return query;
    },
    storage: { from: () => ({ remove: async (keys: string[]) => {
      state.removedFiles.push(...keys);
      return { error: null };
    } }) },
  }),
}));

import { anonymizeTalentSubmissionForClient, cleanupExpiredTalentSubmissions } from "./talentBankSupabaseStore.js";

const unitA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const unitB = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

describe("candidate privacy operations", () => {
  beforeEach(() => {
    process.env.EVOLUTION_SUPABASE_URL = "https://example.supabase.co";
    process.env.EVOLUTION_SUPABASE_SERVICE_ROLE_KEY = "test-key";
    state.removedFiles = [];
    state.rows = [
      { id: "a-old", client_id: unitA, created_at: "2020-01-01", candidate_name: "Ana", candidate_email: "a@example.test", candidate_phone: "123", answers: { cpf: "secret" }, file_attachments: [{ fieldKey: "cv", fileName: "cv.pdf", storageKey: "a/cv.pdf" }], ip_hash: "hash", user_agent: "browser" },
      { id: "b-old", client_id: unitB, created_at: "2020-01-01", candidate_name: "Bia", file_attachments: [{ fieldKey: "cv", fileName: "cv.pdf", storageKey: "b/cv.pdf" }] },
      { id: "a-new", client_id: unitA, created_at: "2999-01-01", candidate_name: "Caio", file_attachments: [] },
    ];
  });

  it("anonymizes only the authorized unit and removes its attachment", async () => {
    expect(await anonymizeTalentSubmissionForClient("b-old", unitA)).toBe(false);
    expect(await anonymizeTalentSubmissionForClient("a-old", unitA)).toBe(true);
    const row = state.rows.find((item) => item.id === "a-old")!;
    expect(row.candidate_name).toBeNull();
    expect(row.candidate_email).toBeNull();
    expect(row.answers).toMatchObject({ _anonymized: true });
    expect(row.file_attachments).toEqual([]);
    expect(row.ip_hash).toBeNull();
    expect(state.removedFiles).toEqual(["a/cv.pdf"]);
    expect(state.rows.find((item) => item.id === "b-old")?.candidate_name).toBe("Bia");
  });

  it("deletes only expired records in the chosen unit", async () => {
    const result = await cleanupExpiredTalentSubmissions({ clientId: unitA, retentionDays: 180 });
    expect(result).toEqual({ deleted: 1, hasMore: false });
    expect(state.rows.map((row) => row.id)).toEqual(["b-old", "a-new"]);
    expect(state.removedFiles).toEqual(["a/cv.pdf"]);
  });
});
