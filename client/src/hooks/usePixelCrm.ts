import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CrmBoard, CrmFilters, CrmLead, CrmStage } from "../../../shared/crm";
import { appendCrmPage, findCrmLead, optimisticCrmMove, placeCrmLead } from "@/lib/crmBoardState";
import {
  CrmRequestError,
  fetchCrmBoard,
  fetchCrmLeadPage,
  moveCrmLeadRequest,
  resumeCrmAutomationRequest,
} from "@/lib/pixelCrmApi";

export type CrmAccessProblem = "unauthenticated" | "forbidden" | "disabled" | null;

const POLL_MS = 20_000;
const MAX_BACKOFF_STEPS = 3;

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// Uma requisição de mutação com rede instável é repetida uma vez com o mesmo requestId: o servidor
// reconhece a repetição e não aplica a mudança duas vezes.
async function withOneRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof CrmRequestError && error.code === "NETWORK") return run();
    throw error;
  }
}

export function usePixelCrm(unitId: string | null, filters: CrmFilters) {
  const [board, setBoard] = useState<CrmBoard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<CrmAccessProblem>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState<ReadonlySet<CrmStage>>(new Set());

  const filtersKey = JSON.stringify(filters);
  const scopeKey = `${unitId ?? ""}|${filtersKey}`;
  const scopeRef = useRef(scopeKey);
  const filtersRef = useRef(filters);
  const boardRef = useRef<CrmBoard | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(0);
  const failuresRef = useRef(0);
  scopeRef.current = scopeKey;
  filtersRef.current = filters;
  boardRef.current = board;

  const setSaving = useCallback((leadId: string, saving: boolean) => {
    setSavingIds((current) => {
      const next = new Set(current);
      if (saving) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  }, []);

  // Sessão expirada ou acesso revogado: nada da unidade continua na tela.
  const handleAccessError = useCallback((reason: unknown): boolean => {
    if (!(reason instanceof CrmRequestError)) return false;
    const next: CrmAccessProblem = reason.status === 401 ? "unauthenticated"
      : reason.code === "DISABLED" ? "disabled"
      : reason.status === 403 ? "forbidden" : null;
    if (!next) return false;
    abortRef.current?.abort();
    setBoard(null);
    setProblem(next);
    setStatus("error");
    return true;
  }, []);

  const load = useCallback(async (mode: "initial" | "background") => {
    if (!unitId) return;
    if (mode === "background" && (pendingRef.current > 0 || abortRef.current)) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const key = scopeRef.current;
    if (mode === "initial") setStatus((current) => (boardRef.current ? current : "loading"));
    setRefreshing(true);
    try {
      const data = await fetchCrmBoard(unitId, filtersRef.current, controller.signal);
      // Resposta atrasada de outra unidade/filtro, ou mutação iniciada no meio: descarta.
      if (key !== scopeRef.current || controller.signal.aborted || pendingRef.current > 0) return;
      failuresRef.current = 0;
      setBoard(data);
      setStatus("ready");
      setError(null);
      setProblem(null);
      setLastUpdatedAt(new Date());
    } catch (reason) {
      if (isAbort(reason) || key !== scopeRef.current) return;
      failuresRef.current += 1;
      if (handleAccessError(reason)) return;
      setError(errorMessage(reason, "Não foi possível carregar o CRM."));
      setStatus(boardRef.current ? "ready" : "error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (key === scopeRef.current) setRefreshing(false);
    }
  }, [unitId, filtersKey, handleAccessError]);

  // Troca de unidade limpa tudo na hora; troca de filtro mantém o quadro até a nova resposta.
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBoard(null);
    setError(null);
    setProblem(null);
    setLastUpdatedAt(null);
    setSavingIds(new Set());
    setStatus("loading");
  }, [unitId]);

  useEffect(() => {
    void load("initial");
  }, [load]);

  // Polling só com a aba visível, sem sobreposição e com backoff em falhas.
  useEffect(() => {
    if (!unitId) return;
    let timer: number | undefined;
    const schedule = () => {
      const delay = POLL_MS * 2 ** Math.min(failuresRef.current, MAX_BACKOFF_STEPS);
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") void load("background");
        schedule();
      }, delay);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load("background");
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [unitId, load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const refresh = useCallback(() => load("initial"), [load]);

  const loadMore = useCallback(async (stage: CrmStage) => {
    const cursor = boardRef.current?.columns[stage].nextCursor;
    if (!unitId || !cursor) return;
    const key = scopeRef.current;
    setLoadingMore((current) => new Set(current).add(stage));
    try {
      const page = await fetchCrmLeadPage(unitId, stage, filtersRef.current, cursor);
      if (key !== scopeRef.current) return;
      setBoard((current) => (current ? appendCrmPage(current, stage, page) : current));
    } catch (reason) {
      if (key !== scopeRef.current || handleAccessError(reason)) return;
      if (reason instanceof CrmRequestError && reason.status === 422) void load("initial");
      else toast.error(errorMessage(reason, "Não foi possível carregar mais cartões."));
    } finally {
      setLoadingMore((current) => {
        const next = new Set(current);
        next.delete(stage);
        return next;
      });
    }
  }, [unitId, handleAccessError, load]);

  const runMutation = useCallback(async (
    lead: CrmLead,
    optimistic: CrmLead,
    request: (requestId: string) => Promise<CrmLead>,
    messages: { success?: string; failure: string },
  ): Promise<CrmLead | null> => {
    if (!unitId) return null;
    const key = scopeRef.current;
    const requestId = crypto.randomUUID();
    pendingRef.current += 1;
    abortRef.current?.abort();
    setSaving(lead.id, true);
    setBoard((current) => (current ? placeCrmLead(current, optimistic) : current));
    try {
      const saved = await withOneRetry(() => request(requestId));
      if (key !== scopeRef.current) return null;
      setBoard((current) => (current ? placeCrmLead(current, saved) : current));
      if (messages.success) toast.success(messages.success);
      return saved;
    } catch (reason) {
      if (key !== scopeRef.current || handleAccessError(reason)) return null;
      if (reason instanceof CrmRequestError && reason.code === "VERSION_CONFLICT" && reason.lead) {
        const serverLead = reason.lead;
        setBoard((current) => (current ? placeCrmLead(current, serverLead) : current));
        toast.warning(reason.message);
        return serverLead;
      }
      setBoard((current) => (current ? placeCrmLead(current, lead) : current));
      if (reason instanceof CrmRequestError && reason.status === 404) {
        toast.error("Este lead não está mais disponível nesta unidade.");
      } else {
        toast.error(errorMessage(reason, messages.failure));
      }
      return null;
    } finally {
      pendingRef.current -= 1;
      setSaving(lead.id, false);
      if (pendingRef.current === 0 && key === scopeRef.current) void load("background");
    }
  }, [unitId, setSaving, handleAccessError, load]);

  const moveLead = useCallback(async (leadId: string, stage: CrmStage, note?: string) => {
    const lead = findCrmLead(boardRef.current, leadId);
    if (!lead || !unitId || lead.crmStage === stage || savingIds.has(leadId)) return null;
    return runMutation(lead, optimisticCrmMove(lead, stage), (requestId) => moveCrmLeadRequest(unitId, lead, stage, requestId, note), {
      failure: "Não foi possível mover o lead. O cartão voltou para a etapa anterior.",
    });
  }, [unitId, savingIds, runMutation]);

  const resumeAutomation = useCallback(async (leadId: string) => {
    const lead = findCrmLead(boardRef.current, leadId);
    if (!lead || !unitId || lead.crmStageMode === "automatic" || savingIds.has(leadId)) return null;
    return runMutation(lead, { ...lead, crmStageMode: "automatic" }, (requestId) => resumeCrmAutomationRequest(unitId, lead, requestId), {
      success: "Automação reativada. A Laya reavalia este lead na próxima varredura.",
      failure: "Não foi possível reativar a automação.",
    });
  }, [unitId, savingIds, runMutation]);

  /** Atualiza um cartão já presente no quadro com dados mais novos (ex.: detalhe aberto). */
  const syncLead = useCallback((lead: CrmLead) => {
    setBoard((current) => {
      const existing = findCrmLead(current, lead.id);
      if (!current || !existing || existing.crmVersion > lead.crmVersion) return current;
      return placeCrmLead(current, lead);
    });
  }, []);

  return {
    board, status, error, problem, refreshing, lastUpdatedAt, savingIds, loadingMore,
    refresh, loadMore, moveLead, resumeAutomation, syncLead,
  };
}
