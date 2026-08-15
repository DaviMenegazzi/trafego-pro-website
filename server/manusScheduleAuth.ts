import crypto from "crypto";
import type { Request } from "express";

type CronUserInfo = { taskUid?: unknown };

function readCookie(req: Pick<Request, "headers">, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw || Array.isArray(raw)) return null;
  const part = raw.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  if (!part) return null;
  try { return decodeURIComponent(part.slice(name.length + 1)); } catch { return null; }
}

function verifyManusSession(token: string, secret: string): { openId: string } | null {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { openId?: unknown; exp?: unknown };
    if (typeof payload.openId !== "string" || !payload.openId.startsWith("cron_")) return null;
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
    return { openId: payload.openId };
  } catch { return null; }
}

export async function authenticateScheduledTask(
  req: Pick<Request, "headers">,
  options: { fetcher?: typeof fetch; oauthUrl?: string; appId?: string; cookieSecret?: string } = {},
): Promise<string> {
  const token = readCookie(req, "app_session_id");
  const cookieSecret = options.cookieSecret ?? process.env.JWT_SECRET;
  const oauthUrl = options.oauthUrl ?? process.env.OAUTH_SERVER_URL;
  const appId = options.appId ?? process.env.VITE_APP_ID;
  if (!token || !cookieSecret || !oauthUrl || !appId || !verifyManusSession(token, cookieSecret)) {
    throw new Error("Callback agendado não autorizado");
  }
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${oauthUrl.replace(/\/$/, "")}/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jwtToken: token, projectId: appId }),
  });
  if (!response.ok) throw new Error("Não foi possível validar o callback agendado");
  const user = await response.json() as CronUserInfo;
  if (typeof user.taskUid !== "string" || !user.taskUid) throw new Error("Callback agendado sem task_uid");
  return user.taskUid;
}
