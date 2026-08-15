import crypto from "crypto";
import { describe, expect, it, vi } from "vitest";
import { authenticateScheduledTask } from "./manusScheduleAuth.js";

function signCronSession(secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ openId: "cron_daily-ai", appId: "app-test", name: "Daily AI", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

describe("autenticação de callbacks agendados", () => {
  it("aceita apenas uma sessão cron validada pelo serviço de identidade", async () => {
    const secret = "schedule-test-secret";
    const token = signCronSession(secret);
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ taskUid: "task-daily-ai" }), { status: 200 }));
    await expect(authenticateScheduledTask({ headers: { cookie: `app_session_id=${token}` } }, {
      fetcher, oauthUrl: "https://oauth.example", appId: "app-test", cookieSecret: secret,
    })).resolves.toBe("task-daily-ai");
    expect(fetcher).toHaveBeenCalledWith("https://oauth.example/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt", expect.objectContaining({ method: "POST" }));
  });

  it("rejeita um callback sem sessão cron válida", async () => {
    await expect(authenticateScheduledTask({ headers: {} }, { cookieSecret: "secret", oauthUrl: "https://oauth.example", appId: "app-test" })).rejects.toThrow("não autorizado");
  });
});
