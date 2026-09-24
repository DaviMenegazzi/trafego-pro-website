import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  formApiKeyPrefix,
  generateFormApiKey,
  hashFormApiKey,
  stripDangerousContent,
  sanitizeFields,
  sanitizeMetadata,
  validateFormApiKeyDraft,
  validateSubmissionPayload,
  isFormApiKeyOriginAllowed,
  isFormApiKeyClientAllowed,
  type FormApiKeyRecord,
} from "./formSubmissionPolicy.js";
import {
  createFormApiKeySql,
  createFormSubmissionSql,
  deleteFormSubmissionSql,
  findFormApiKeyByHashSql,
  listFormSubmissionsSql,
  revokeFormApiKeySql,
} from "./formSubmissionSql.js";
import { getSiteSupabase } from "./siteSupabase.js";
import { signToken, startServer } from "./index.js";

describe("Form Submission Security Policy", () => {
  it("generates valid API keys with tpf_live_ prefix", () => {
    const key = generateFormApiKey();
    expect(key.startsWith("tpf_live_")).toBe(true);
    expect(key.length).toBeGreaterThan(40);
    expect(formApiKeyPrefix(key)).toBe(key.slice(0, 12));
    expect(hashFormApiKey(key)).toBeDefined();
    expect(hashFormApiKey(key)).toHaveLength(64); // SHA-256 hex
  });

  it("sanitizes malicious HTML and script tags from text inputs", () => {
    const dirty = '<script>alert("hack")</script>Olá Mundo<img src="x" onerror="steal()"/>';
    const cleaned = stripDangerousContent(dirty);
    expect(cleaned).not.toContain("<script>");
    expect(cleaned).not.toContain("alert");
    expect(cleaned).not.toContain("<img");
    expect(cleaned).not.toContain("onerror");
    expect(cleaned).toBe("Olá Mundo");
  });

  it("removes control characters and strips dangerous protocols", () => {
    const malicious = "javascript:alert(1)\x00texto normal";
    const cleaned = stripDangerousContent(malicious);
    expect(cleaned).not.toContain("javascript:");
    expect(cleaned).not.toContain("\x00");
    expect(cleaned).toContain("texto normal");
  });

  it("sanitizes fields dictionary, limiting field count and sizes", () => {
    const dirtyFields = {
      nome: "  Carlos Andrade  <script>evil()</script>",
      telefone: "(54) 99999-8888",
      observacao: "A".repeat(6000), // > 5000 chars limit
      nested: {
        safe: "valor normal",
        bad: "<b onmouseover='boom()'>teste</b>",
      },
    };
    const sanitized = sanitizeFields(dirtyFields);
    expect(sanitized.nome).toBe("Carlos Andrade");
    expect(sanitized.telefone).toBe("(54) 99999-8888");
    expect(typeof sanitized.observacao).toBe("string");
    expect((sanitized.observacao as string).length).toBeLessThanOrEqual(5000);
    expect((sanitized.nested as any).safe).toBe("valor normal");
    expect((sanitized.nested as any).bad).toBe("teste");
  });

  it("sanitizes metadata allowing only whitelisted keys", () => {
    const rawMeta = {
      utm_source: "google",
      utm_medium: "cpc",
      hack_field: "ignored",
      source_url: "https://vidacard.com.br/caxias<script>",
    };
    const sanitized = sanitizeMetadata(rawMeta);
    expect(sanitized).not.toBeNull();
    expect(sanitized!.utm_source).toBe("google");
    expect(sanitized!.utm_medium).toBe("cpc");
    expect(sanitized!.hack_field).toBeUndefined();
    expect(sanitized!.source_url).toBe("https://vidacard.com.br/caxias");
  });

  it("validates form submission payload structure", () => {
    expect(validateSubmissionPayload(null).ok).toBe(false);
    expect(validateSubmissionPayload({}).ok).toBe(false);
    expect(validateSubmissionPayload({ clientId: "caxias" }).ok).toBe(false);
    expect(validateSubmissionPayload({ clientId: "caxias", fields: {} }).ok).toBe(false);

    const valid = validateSubmissionPayload({
      clientId: "vidacard-caxias",
      fields: { nome: "Maria", telefone: "5499999999" },
      metadata: { utm_source: "meta" },
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.clientId).toBe("vidacard-caxias");
      expect(valid.value.fields.nome).toBe("Maria");
    }
  });

  it("validates API key draft", () => {
    expect(validateFormApiKeyDraft({}).ok).toBe(false);
    expect(validateFormApiKeyDraft({ name: "" }).ok).toBe(false);
    expect(validateFormApiKeyDraft({ name: "Chave Caxias", clientIds: [] }).ok).toBe(false);

    const valid = validateFormApiKeyDraft({
      name: "Form Caxias",
      clientIds: ["vidacard-caxias"],
      allowedOrigins: ["https://vidacard.com.br"],
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.clientIds).toEqual(["vidacard-caxias"]);
      expect(valid.value.allowedOrigins).toEqual(["https://vidacard.com.br"]);
    }
  });

  it("correctly checks allowed origins and client ids", () => {
    const keyRecord: FormApiKeyRecord = {
      id: "key-1",
      name: "Test",
      keyPrefix: "tpf_live_12",
      keyHash: "hash",
      clientIds: ["vidacard-caxias"],
      allowedOrigins: ["https://vidacard.com.br"],
      createdBy: "admin@trafego.pro",
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };

    expect(isFormApiKeyClientAllowed(keyRecord, "vidacard-caxias")).toBe(true);
    expect(isFormApiKeyClientAllowed(keyRecord, "vidacard-ijui")).toBe(false);

    expect(isFormApiKeyOriginAllowed(keyRecord, "https://vidacard.com.br")).toBe(true);
    expect(isFormApiKeyOriginAllowed(keyRecord, "https://vidacard.com.br/")).toBe(true);
    expect(isFormApiKeyOriginAllowed(keyRecord, "https://malicious.com")).toBe(false);
    expect(isFormApiKeyOriginAllowed(keyRecord, undefined)).toBe(false); // origin required when allowedOrigins is set

    // Wildcard clients
    const wildcardKey: FormApiKeyRecord = { ...keyRecord, clientIds: ["*"], allowedOrigins: null };
    expect(isFormApiKeyClientAllowed(wildcardKey, "qualquer-unidade")).toBe(true);
    expect(isFormApiKeyOriginAllowed(wildcardKey, "https://qualquer.com")).toBe(true);
    expect(isFormApiKeyOriginAllowed(wildcardKey, undefined)).toBe(true);
  });
});

describe("Form Submissions Endpoints Integration", () => {
  let baseUrl = "";
  let server: Awaited<ReturnType<typeof startServer>>["server"] | undefined;

  const adminToken = () =>
    signToken({
      email: "admin@trafego.pro",
      name: "Admin Tester",
      role: "admin",
      id: "admin-uuid-1",
      allowedClientIds: ["*"],
    });

  const caxiasViewerToken = () =>
    signToken({
      email: "gestor@caxias.vidacard.com.br",
      name: "Gestor Caxias",
      role: "client_viewer",
      id: "viewer-uuid-caxias",
      allowedClientIds: ["vidacard-caxias"],
    });

  let validRawKey = "";
  let createdKeyId = "";
  const testStartedAt = new Date().toISOString();
  let testSubmissionId = "";

  beforeAll(async () => {
    const started = await startServer({ listen: false });
    server = started.server;
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server unavailable");
    baseUrl = `http://127.0.0.1:${address.port}`;

    // Create an API key for testing
    validRawKey = generateFormApiKey();
    const key = await createFormApiKeySql({
      name: "LP Caxias Integrada",
      keyPrefix: formApiKeyPrefix(validRawKey),
      keyHash: hashFormApiKey(validRawKey),
      clientIds: ["vidacard-caxias"],
      allowedOrigins: null,
      createdBy: "admin@trafego.pro",
      expiresAt: null,
    });
    createdKeyId = key.id;
  });

  afterAll(async () => {
    if (createdKeyId) await revokeFormApiKeySql(createdKeyId);
    if (testSubmissionId) await deleteFormSubmissionSql(testSubmissionId);
    // O banco é o Supabase real: apaga as chaves criadas por este teste (revogar não basta).
    const { data: testKeys } = await getSiteSupabase().from("form_api_keys").select("id")
      .in("name", ["LP Caxias Integrada", "Chave Temporária"]).gte("created_at", testStartedAt);
    const testKeyIds = (testKeys ?? []).map((key) => key.id as string);
    if (testKeyIds.length) {
      await getSiteSupabase().from("form_submissions").delete().in("form_key_id", testKeyIds);
      await getSiteSupabase().from("form_api_keys").delete().in("id", testKeyIds);
    }
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  });

  describe("Ingestion Endpoint (POST /api/forms/submit)", () => {
    it("rejects request without Authorization header", async () => {
      const res = await fetch(`${baseUrl}/api/forms/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "vidacard-caxias", fields: { nome: "João" } }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Chave de API ausente");
    });

    it("rejects request with invalid token prefix or bogus key", async () => {
      const res = await fetch(`${baseUrl}/api/forms/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer tpf_live_invalid_key_123456789012345678901234567890",
        },
        body: JSON.stringify({ clientId: "vidacard-caxias", fields: { nome: "João" } }),
      });
      expect(res.status).toBe(401);
    });

    it("rejects submission for a clientId not authorized on the key", async () => {
      const res = await fetch(`${baseUrl}/api/forms/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validRawKey}`,
        },
        body: JSON.stringify({
          clientId: "vidacard-ijui", // Key is scoped to vidacard-caxias
          fields: { nome: "Tentativa não autorizada", telefone: "5499999999" },
        }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("não tem permissão para esta unidade");
    });

    it("accepts valid submission and sanitizes malicious input in fields", async () => {
      const res = await fetch(`${baseUrl}/api/forms/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validRawKey}`,
        },
        body: JSON.stringify({
          clientId: "vidacard-caxias",
          fields: {
            nome: "Lucas Dorneles <script>alert('xss')</script>",
            telefone: "(54) 99887-7665",
            mensagem: "Gostaria de saber mais sobre o plano Vida Card",
          },
          metadata: {
            source_url: "https://vidacard.com.br/caxias-promo",
            utm_source: "google_ads",
          },
        }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as { id: string; receivedAt: string };
      expect(data.id).toBeDefined();
      expect(data.receivedAt).toBeDefined();
      testSubmissionId = data.id;

      // Verify the submission content in storage
      const storedList = await listFormSubmissionsSql({ clientId: "vidacard-caxias" });
      const found = storedList.submissions.find((s) => s.id === data.id);
      expect(found).toBeDefined();
      expect(found?.fields.nome).toBe("Lucas Dorneles"); // Script stripped!
      expect(found?.fields.telefone).toBe("(54) 99887-7665");
      expect(found?.metadata?.utm_source).toBe("google_ads");
    });
  });

  describe("Dashboard Endpoints (GET /api/forms/submissions)", () => {
    it("requires authentication", async () => {
      const res = await fetch(`${baseUrl}/api/forms/submissions`);
      expect(res.status).toBe(401);
    });

    it("allows unit viewer to view their own unit submissions", async () => {
      const res = await fetch(`${baseUrl}/api/forms/submissions?clientId=vidacard-caxias`, {
        headers: { Authorization: `Bearer ${caxiasViewerToken()}` },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { submissions: any[]; total: number };
      expect(data.submissions.length).toBeGreaterThan(0);
      expect(data.submissions.every((s) => s.clientId === "vidacard-caxias")).toBe(true);
    });

    it("forbids unit viewer from viewing submissions from another unit", async () => {
      const res = await fetch(`${baseUrl}/api/forms/submissions?clientId=vidacard-ijui`, {
        headers: { Authorization: `Bearer ${caxiasViewerToken()}` },
      });
      expect(res.status).toBe(403);
    });

    it("allows admin to view submissions and export CSV", async () => {
      const res = await fetch(`${baseUrl}/api/forms/submissions/export?clientId=vidacard-caxias`, {
        headers: { Authorization: `Bearer ${adminToken()}` },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      const csvText = await res.text();
      expect(csvText).toContain("Lucas Dorneles");
      expect(csvText).toContain("vidacard-caxias");
    });
  });

  describe("Key Management (POST/GET/DELETE /api/forms/keys)", () => {
    let keyToDelete = "";

    it("forbids non-admin users from creating or listing keys", async () => {
      const listRes = await fetch(`${baseUrl}/api/forms/keys`, {
        headers: { Authorization: `Bearer ${caxiasViewerToken()}` },
      });
      expect(listRes.status).toBe(403);

      const createRes = await fetch(`${baseUrl}/api/forms/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${caxiasViewerToken()}`,
        },
        body: JSON.stringify({ name: "Unauthorized", clientIds: ["vidacard-caxias"] }),
      });
      expect(createRes.status).toBe(403);
    });

    it("allows admin to create, list, and revoke API keys", async () => {
      // 1. Create key
      const createRes = await fetch(`${baseUrl}/api/forms/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken()}`,
        },
        body: JSON.stringify({
          name: "Chave Temporária",
          clientIds: ["vidacard-caxias"],
          allowedOrigins: ["https://vidacard.com.br"],
        }),
      });
      expect(createRes.status).toBe(201);
      const createdData = (await createRes.json()) as { key: string; metadata: any };
      expect(createdData.key.startsWith("tpf_live_")).toBe(true);
      expect(createdData.metadata.name).toBe("Chave Temporária");
      keyToDelete = createdData.metadata.id;

      // 2. List keys
      const listRes = await fetch(`${baseUrl}/api/forms/keys`, {
        headers: { Authorization: `Bearer ${adminToken()}` },
      });
      expect(listRes.status).toBe(200);
      const listData = (await listRes.json()) as { keys: any[] };
      const found = listData.keys.find((k) => k.id === keyToDelete);
      expect(found).toBeDefined();
      expect(found.keyHash).toBeUndefined(); // Sensitive hash must never be returned!

      // 3. Revoke key
      const deleteRes = await fetch(`${baseUrl}/api/forms/keys/${keyToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken()}` },
      });
      expect(deleteRes.status).toBe(200);

      // 4. Test that the revoked key is rejected immediately on ingestion
      const submitWithRevoked = await fetch(`${baseUrl}/api/forms/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${createdData.key}`,
        },
        body: JSON.stringify({
          clientId: "vidacard-caxias",
          fields: { nome: "Falha esperada" },
        }),
      });
      expect(submitWithRevoked.status).toBe(401);
    });
  });
});
