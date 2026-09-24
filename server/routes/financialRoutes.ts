import { Router, type Request, type Response, type NextFunction } from "express";
import { getSupabaseForRequest, readCookie, SUPABASE_ACCESS_COOKIE, requireAdmin, requireAuth } from "../auth.js";
import { getFinancialDatabase } from "../financialFirebase.js";

export const financialRouter = Router();

const writablePaths: Record<string, number[]> = {
  clientes: [1], cobrancas: [2], checklists: [2], arquivados: [1],
  despesas: [1], atas: [1], caixa: [0], despFixas: [1],
};

export function financialPath(raw: string | undefined): string | null {
  if (!raw) return null;
  const parts = raw.split("/");
  if (!Object.hasOwn(writablePaths, parts[0])) return null;
  const depths = writablePaths[parts[0]];
  if (!depths || !depths.includes(parts.length - 1)) return null;
  if (parts.slice(1).some((part) => !/^[a-zA-Z0-9_-]{1,128}$/.test(part))) return null;
  return `trafegopro/${parts.join("/")}`;
}

async function requireCurrentFinancialAdmin(req: Request, res: Response, next: NextFunction) {
  const sb = getSupabaseForRequest(req);
  const accessToken = readCookie(req, SUPABASE_ACCESS_COOKIE);
  if (!sb) { res.status(401).json({ error: "Sessão expirada" }); return; }
  try {
    const { data: authData, error: authError } = await sb.auth.getUser(accessToken);
    if (authError || authData.user?.id !== req.claims?.id) {
      res.status(401).json({ error: "Sessão expirada" }); return;
    }
    const { data: profile, error } = await sb.from("user_profiles")
      .select("role,status").eq("id", req.claims.id).maybeSingle();
    if (error || profile?.role !== "admin" || profile?.status !== "active") {
      res.status(403).json({ error: "Acesso financeiro não autorizado" }); return;
    }
    next();
  } catch {
    res.status(503).json({ error: "Não foi possível verificar o acesso financeiro" });
  }
}

financialRouter.use("/finance", requireAuth, requireAdmin, requireCurrentFinancialAdmin);

financialRouter.get("/finance", async (_req, res) => {
  try {
    const snapshot = await getFinancialDatabase().ref("trafegopro").get();
    res.setHeader("Cache-Control", "no-store");
    res.json(snapshot.val());
  } catch (error) {
    console.error("[finance] Falha na leitura:", error);
    res.status(503).json({ error: "Dados financeiros indisponíveis" });
  }
});

financialRouter.put("/finance/state", async (req, res) => {
  try {
    await getFinancialDatabase().ref("trafegopro").set(req.body);
    res.status(204).end();
  } catch (error) {
    console.error("[finance] Falha na gravação completa:", error);
    res.status(503).json({ error: "Não foi possível salvar os dados financeiros" });
  }
});

financialRouter.post("/finance/archive/:id", async (req, res) => {
  const id = req.params.id;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) { res.status(400).json({ error: "Unidade inválida" }); return; }
  try {
    await getFinancialDatabase().ref().update({
      [`trafegopro/arquivados/${id}`]: req.body,
      [`trafegopro/clientes/${id}`]: null,
      [`trafegopro/cobrancas/${id}`]: null,
      [`trafegopro/checklists/${id}`]: null,
    });
    res.status(204).end();
  } catch (error) {
    console.error("[finance] Falha no arquivamento:", error);
    res.status(503).json({ error: "Não foi possível arquivar a unidade" });
  }
});

financialRouter.put("/finance/item/*", async (req, res) => {
  const path = financialPath((req.params as Record<string, string>)["0"]);
  if (!path) { res.status(400).json({ error: "Caminho financeiro inválido" }); return; }
  try {
    await getFinancialDatabase().ref(path).set(req.body);
    res.status(204).end();
  } catch (error) {
    console.error("[finance] Falha na gravação:", error);
    res.status(503).json({ error: "Não foi possível salvar os dados financeiros" });
  }
});

financialRouter.delete("/finance/item/*", async (req, res) => {
  const path = financialPath((req.params as Record<string, string>)["0"]);
  if (!path) { res.status(400).json({ error: "Caminho financeiro inválido" }); return; }
  try {
    await getFinancialDatabase().ref(path).remove();
    res.status(204).end();
  } catch (error) {
    console.error("[finance] Falha na exclusão:", error);
    res.status(503).json({ error: "Não foi possível excluir os dados financeiros" });
  }
});
