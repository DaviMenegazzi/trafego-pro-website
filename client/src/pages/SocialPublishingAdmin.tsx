import { AlertCircle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Facebook, ImagePlus, Instagram, LayoutList, Link2, Pencil, Plus, RefreshCw, Send, ShieldCheck, Trash2, X } from "lucide-react";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { chunkBulkQueue, loadBulkQueue, newBulkQueueItem, prepareBulkQueue, saveBulkQueue, type BulkQueueItem } from "@/lib/socialBulkQueue";
import { mapSocialExcelRows, SOCIAL_EXCEL_EXAMPLE, SOCIAL_EXCEL_HEADERS } from "@/lib/socialBulkExcel";
import { buildSocialCalendarMonth, socialCalendarKey } from "@/lib/socialCalendar";

type AppUser = { id: string; role: string; email?: string; name?: string };
type Unit = { id: string; name: string; client_group: string | null };
type Connection = { id: string; unitId: string; unitName: string; facebookPageName: string; instagramUsername: string | null; connectionStatus: string };
type SocialPost = { id: string; unitName: string; title: string; caption: string; contentFormat: "image" | "carousel" | "video" | "reel"; targetFacebook: boolean; targetInstagram: boolean; status: string; scheduledFor: string | null; createdAt: string; media: Array<{ id: string; url: string; mediaType: "image" | "video" }> };
type Overview = { units: Unit[]; connections: Connection[]; posts: SocialPost[]; metaConfigured: boolean; scheduler: { status: string; taskUid: string | null } };
type MetaCandidate = { facebookPageId: string; facebookPageName: string; instagramAccountId: string | null; instagramUsername: string | null };
type PostForm = { unitId: string; connectionId: string; title: string; caption: string; linkUrl: string; contentFormat: SocialPost["contentFormat"]; mediaUrls: string; targetFacebook: boolean; targetInstagram: boolean; scheduledFor: string };

const statusLabel: Record<string, string> = { draft: "Rascunho", scheduled: "Agendado", publishing: "Publicando", published: "Publicado", partially_published: "Parcial", failed: "Falhou", cancelled: "Cancelado", waiting_connection: "Aguardando Meta" };
const formatLabel: Record<SocialPost["contentFormat"], string> = { image: "Imagem", carousel: "Carrossel", video: "Vídeo", reel: "Reel" };
const fieldClass = "mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60";
const compactFieldClass = "w-full rounded-md border border-white/10 bg-[#101416] px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-cyan-300/60";

function readStoredUser(): AppUser | null {
  try { const stored = localStorage.getItem("tp_user"); return stored ? JSON.parse(stored) as AppUser : null; } catch { return null; }
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const raw = await response.text();
  try { return JSON.parse(raw) as T; } catch { throw new Error(response.status === 401 ? "Sessão expirada. Entre novamente." : fallback); }
}

function parseMedia(lines: string, fallbackType: "image" | "video") {
  return lines.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [prefix, ...rest] = line.split("|");
    if (prefix === "image" || prefix === "video") return { mediaType: prefix, url: rest.join("|").trim() };
    return { mediaType: fallbackType, url: line };
  });
}

function humanDate(value: string | null) {
  if (!value) return "Sem data definida";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

function defaultForm(unitId = ""): PostForm {
  return { unitId, connectionId: "", title: "", caption: "", linkUrl: "", contentFormat: "image", mediaUrls: "", targetFacebook: true, targetInstagram: true, scheduledFor: "" };
}

export default function SocialPublishingAdmin() {
  const [, navigate] = useLocation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showBulkPlanner, setShowBulkPlanner] = useState(false);
  const [form, setForm] = useState<PostForm>(defaultForm());
  const [metaCandidates, setMetaCandidates] = useState<MetaCandidate[]>([]);
  const [metaSession, setMetaSession] = useState<string | null>(() => new URLSearchParams(window.location.search).get("meta_session"));
  const [candidatePageId, setCandidatePageId] = useState("");
  const [candidateUnitId, setCandidateUnitId] = useState("");
  const [connectingMeta, setConnectingMeta] = useState(false);
  const [bulkOwnerUserId] = useState(() => readStoredUser()?.id ?? "");
  const [bulkQueue, setBulkQueue] = useState<BulkQueueItem[]>(() => bulkOwnerUserId ? loadBulkQueue(localStorage, bulkOwnerUserId) : []);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);
  const [bulkImportErrors, setBulkImportErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const requestHeaders = useCallback(() => {
    const token = localStorage.getItem("tp_token");
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/social/overview", { headers: requestHeaders() });
      const data = await readJson<Overview & { error?: string }>(response, "Não foi possível carregar o calendário social");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar o calendário social");
      setOverview(data);
      setForm((current) => ({ ...current, unitId: current.unitId || data.units[0]?.id || "" }));
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar o calendário social"); }
    finally { setLoading(false); }
  }, [requestHeaders]);

  useEffect(() => {
    const user = readStoredUser();
    if (!localStorage.getItem("tp_token") || user?.role !== "admin") { navigate("/login"); return; }
    void load();
  }, [load, navigate]);

  useEffect(() => {
    if (!metaSession) return;
    (async () => {
      try {
        const response = await fetch(`/api/social/meta/candidates/${metaSession}`, { headers: requestHeaders() });
        const data = await readJson<{ candidates?: MetaCandidate[]; error?: string }>(response, "Não foi possível carregar as páginas Meta");
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as páginas Meta");
        const candidates = data.candidates ?? [];
        setMetaCandidates(candidates);
        setCandidatePageId(candidates[0]?.facebookPageId ?? "");
      } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar as páginas Meta"); setMetaSession(null); }
    })();
  }, [metaSession, requestHeaders]);

  useEffect(() => {
    if (!candidateUnitId && overview?.units[0]?.id) setCandidateUnitId(overview.units[0].id);
  }, [candidateUnitId, overview?.units]);

  useEffect(() => {
    if (bulkOwnerUserId) saveBulkQueue(localStorage, bulkOwnerUserId, bulkQueue);
  }, [bulkOwnerUserId, bulkQueue]);

  const selectedUnit = useMemo(() => overview?.units.find((unit) => unit.id === form.unitId) ?? null, [form.unitId, overview?.units]);
  const compatibleConnections = useMemo(() => overview?.connections.filter((connection) => connection.unitId === form.unitId && connection.connectionStatus === "active") ?? [], [form.unitId, overview?.connections]);
  const calendarDays = useMemo(() => buildSocialCalendarMonth(calendarCursor), [calendarCursor]);
  const postsByDay = useMemo(() => {
    const grouped = new Map<string, SocialPost[]>();
    for (const post of overview?.posts ?? []) {
      if (!post.scheduledFor) continue;
      const key = socialCalendarKey(post.scheduledFor);
      grouped.set(key, [...(grouped.get(key) ?? []), post]);
    }
    return grouped;
  }, [overview?.posts]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUnit) { setError("Selecione uma unidade autorizada"); return; }
    setCreating(true);
    try {
      const fallbackType = form.contentFormat === "video" || form.contentFormat === "reel" ? "video" : "image";
      const response = await fetch("/api/social/posts", { method: "POST", headers: requestHeaders(), body: JSON.stringify({ ...form, connectionId: form.connectionId || null, scheduledFor: form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null, media: parseMedia(form.mediaUrls, fallbackType) }) });
      const data = await readJson<{ error?: string }>(response, "Não foi possível salvar a publicação");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a publicação");
      setForm(defaultForm(selectedUnit.id)); setShowComposer(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar a publicação"); }
    finally { setCreating(false); }
  }

  async function uploadComposerMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true); setError(null);
    try {
      const payload = new FormData(); payload.append("file", file);
      const token = localStorage.getItem("tp_token");
      const response = await fetch("/api/social/media", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: payload });
      const data = await readJson<{ url?: string; mediaType?: "image" | "video"; error?: string }>(response, "Não foi possível enviar a mídia");
      if (!response.ok || !data.url) throw new Error(data.error ?? "Não foi possível enviar a mídia");
      setForm((current) => ({ ...current, mediaUrls: [current.mediaUrls.trim(), `${data.mediaType}|${data.url}`].filter(Boolean).join("\n") }));
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível enviar a mídia"); }
    finally { setUploadingMedia(false); event.target.value = ""; }
  }

  async function cancelPost(postId: string) {
    if (!window.confirm("Excluir este agendamento? Itens já publicados não podem ser removidos.")) return;
    try {
      const response = await fetch(`/api/social/posts/${postId}`, { method: "DELETE", headers: requestHeaders() });
      const data = await readJson<{ error?: string }>(response, "Não foi possível excluir a publicação");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível excluir a publicação");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível excluir a publicação"); }
  }

  async function editPostSchedule(post: SocialPost) {
    const value = window.prompt("Nova data e horário (AAAA-MM-DDTHH:MM)", post.scheduledFor ? new Date(post.scheduledFor).toISOString().slice(0, 16) : "");
    if (!value) return;
    try {
      const response = await fetch(`/api/social/posts/${post.id}`, { method: "PATCH", headers: requestHeaders(), body: JSON.stringify({ scheduledFor: new Date(value).toISOString() }) });
      const data = await readJson<{ error?: string }>(response, "Não foi possível editar o agendamento");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível editar o agendamento");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível editar o agendamento"); }
  }

  async function startMetaConnection() {
    setConnectingMeta(true);
    try {
      const response = await fetch("/api/social/meta/connect", { headers: requestHeaders() });
      const data = await readJson<{ authorizationUrl?: string; error?: string }>(response, "Não foi possível iniciar a conexão Meta");
      if (!response.ok || !data.authorizationUrl) throw new Error(data.error ?? "Não foi possível iniciar a conexão Meta");
      window.location.assign(data.authorizationUrl);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível iniciar a conexão Meta"); setConnectingMeta(false); }
  }

  async function saveMetaConnection() {
    if (!metaSession || !candidatePageId || !candidateUnitId) { setError("Selecione uma Página Meta e uma unidade autorizada"); return; }
    setConnectingMeta(true);
    try {
      const response = await fetch("/api/social/meta/connections", { method: "POST", headers: requestHeaders(), body: JSON.stringify({ sessionId: metaSession, facebookPageId: candidatePageId, unitId: candidateUnitId }) });
      const data = await readJson<{ error?: string }>(response, "Não foi possível salvar a conexão Meta");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a conexão Meta");
      window.history.replaceState({}, "", "/publicacoes");
      setMetaSession(null); setMetaCandidates([]); setCandidatePageId(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar a conexão Meta"); }
    finally { setConnectingMeta(false); }
  }

  function updateBulkItem(localId: string, patch: Partial<BulkQueueItem>) {
    setBulkQueue((items) => items.map((item) => item.localId === localId ? { ...item, ...patch, state: item.state === "saved" ? "saved" : "draft", error: undefined } : item));
  }

  function addBulkItem(copyFrom?: BulkQueueItem) {
    const unitId = copyFrom?.unitId || form.unitId || overview?.units[0]?.id || "";
    setBulkQueue((items) => [...items, { ...newBulkQueueItem(unitId), connectionId: copyFrom?.connectionId || "", targetFacebook: copyFrom?.targetFacebook ?? true, targetInstagram: copyFrom?.targetInstagram ?? true }]);
  }

  async function sendBulkQueue() {
    const prepared = prepareBulkQueue(bulkQueue);
    setBulkQueue(prepared);
    const batches = chunkBulkQueue(prepared);
    if (!batches.length) { setBulkSummary("Corrija as linhas destacadas antes de enviar a fila."); return; }
    setBulkSending(true);
    setBulkSummary(`Enviando ${batches.reduce((sum, batch) => sum + batch.length, 0)} peça(s) em ${batches.length} lote(s)…`);
    let saved = 0; let failed = 0;
    try {
      for (const batch of batches) {
        setBulkQueue((items) => items.map((item) => batch.some((row) => row.localId === item.localId) ? { ...item, state: "sending", error: undefined } : item));
        const response = await fetch("/api/social/posts/batch", { method: "POST", headers: requestHeaders(), body: JSON.stringify({ items: batch.map((item) => ({ localId: item.localId, unitId: item.unitId, connectionId: item.connectionId || null, title: item.title, caption: item.caption, linkUrl: item.linkUrl || null, contentFormat: item.contentFormat, targetFacebook: item.targetFacebook, targetInstagram: item.targetInstagram, scheduledFor: new Date(item.scheduledFor).toISOString(), media: parseMedia(item.mediaUrls, item.contentFormat === "video" || item.contentFormat === "reel" ? "video" : "image") })) }) });
        const data = await readJson<{ results?: Array<{ localId: string; postId?: string; error?: string }>; error?: string }>(response, "Não foi possível enviar o lote");
        if (!response.ok && !data.results) throw new Error(data.error ?? "Não foi possível enviar o lote");
        const results = data.results ?? [];
        saved += results.filter((item) => item.postId).length;
        failed += results.filter((item) => item.error).length;
        setBulkQueue((items) => items.map((item) => {
          const result = results.find((value) => value.localId === item.localId);
          return result ? { ...item, state: result.postId ? "saved" : "error", serverPostId: result.postId, error: result.error } : item;
        }));
      }
      setBulkSummary(`${saved} peça(s) adicionada(s) ao calendário${failed ? `; ${failed} precisa(m) de correção` : ""}.`);
      await load();
    } catch (err) {
      setBulkSummary(err instanceof Error ? err.message : "Não foi possível enviar a fila");
      setBulkQueue((items) => items.map((item) => item.state === "sending" ? { ...item, state: "ready" } : item));
    } finally { setBulkSending(false); }
  }

  function downloadExcelTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([SOCIAL_EXCEL_HEADERS, SOCIAL_EXCEL_EXAMPLE]);
    worksheet["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 32 }, { wch: 58 }, { wch: 14 }, { wch: 52 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 22 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fila mensal");
    XLSX.writeFile(workbook, "modelo-fila-mensal-publicacoes.xlsx");
  }

  async function importExcelFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !overview) return;
    setBulkImporting(true); setBulkImportErrors([]);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error("A planilha não contém nenhuma aba");
      const worksheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: false });
      const result = mapSocialExcelRows(rows, overview.units, overview.connections);
      setBulkQueue((items) => [...items, ...result.items]);
      setBulkImportErrors(result.errors);
      setBulkSummary(`${result.items.length} linha(s) importada(s)${result.errors.length ? `; ${result.errors.length} linha(s) precisam de correção` : ""}. Revise a fila antes de enviar.`);
    } catch (err) { setBulkSummary(err instanceof Error ? err.message : "Não foi possível ler a planilha"); }
    finally { setBulkImporting(false); event.target.value = ""; }
  }

  return <main className="min-h-screen bg-[#080b0d] text-zinc-100"><div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
    <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-[10px] font-medium uppercase tracking-[.24em] text-cyan-300">Módulo isolado · administrativo</p><h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-light tracking-tight text-white">Central de Publicações</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Planeje conteúdo por unidade, mantenha rascunhos e programe feed, carrosséis, vídeos e Reels. Esta área não interfere na dashboard, no CRM ou no Evolution.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => navigate("/dashboard")} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Voltar à dashboard</button><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-[#07252a]"><RefreshCw className="h-3.5 w-3.5" />Atualizar</button></div>
    </header>

    {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span><button className="ml-auto" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
    {loading || !overview ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center text-sm text-zinc-500">Carregando calendário editorial…</div> : <>
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className={`rounded-2xl border p-5 ${overview.metaConfigured ? "border-emerald-400/25 bg-emerald-400/[.06]" : "border-amber-300/25 bg-amber-300/[.06]"}`}><div className="flex gap-3"><ShieldCheck className={`h-5 w-5 shrink-0 ${overview.metaConfigured ? "text-emerald-300" : "text-amber-200"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{overview.metaConfigured ? "Aplicação Meta configurada" : "Conexão Meta pendente"}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{overview.metaConfigured ? "Conecte uma Página e o Instagram profissional para liberar os agendamentos." : "O calendário pode ser preparado; a publicação será liberada após configurar a aplicação Meta."}</p>{overview.metaConfigured && <button disabled={connectingMeta} onClick={() => void startMetaConnection()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 px-3 py-2 text-xs font-medium text-emerald-100 disabled:opacity-60"><Link2 className="h-3.5 w-3.5" />{connectingMeta ? "Abrindo Meta…" : "Conectar Página Meta"}</button>}</div></div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] uppercase tracking-[.16em] text-zinc-500">Processador</p><p className="mt-2 text-sm text-white">{overview.scheduler.status === "active" ? "Ativo" : "Aguardando conexão Meta"}</p><p className="mt-1 text-xs text-zinc-500">{overview.scheduler.taskUid ? "Rotina registrada" : "Rotina será ativada após a primeira conexão"}</p></div>
      </section>

      {metaSession && <section className="mb-6 rounded-2xl border border-cyan-300/25 bg-cyan-300/[.05] p-5"><p className="text-xs font-medium text-cyan-100">Selecione onde a autorização Meta será usada</p><p className="mt-1 text-xs text-zinc-400">A Página e o perfil profissional retornados pela Meta podem ser vinculados apenas às unidades autorizadas.</p>{metaCandidates.length ? <div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Página Meta<select value={candidatePageId} onChange={(event) => setCandidatePageId(event.target.value)} className={fieldClass}><option value="">Selecione</option>{metaCandidates.map((candidate) => <option key={candidate.facebookPageId} value={candidate.facebookPageId}>{candidate.facebookPageName}{candidate.instagramUsername ? ` · @${candidate.instagramUsername}` : ""}</option>)}</select></label><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Unidade autorizada<select value={candidateUnitId} onChange={(event) => setCandidateUnitId(event.target.value)} className={fieldClass}><option value="">Selecione</option>{overview.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><div className="flex items-end"><button disabled={connectingMeta} onClick={() => void saveMetaConnection()} className="w-full rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-[#062428] disabled:opacity-60">{connectingMeta ? "Salvando…" : "Vincular conta"}</button></div></div> : <p className="mt-3 text-sm text-zinc-400">Nenhuma Página administrável foi retornada pela Meta nesta autorização.</p>}</section>}

      <section className="mb-7 rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Calendário editorial</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Publicações por unidade</h2><p className="mt-1 text-sm text-zinc-500">Os conteúdos ficam em rascunho até serem conectados e agendados para um destino Meta autorizado.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setShowBulkPlanner((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-medium text-cyan-100"><LayoutList className="h-3.5 w-3.5" />Planejar em massa</button><button onClick={() => setShowComposer((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0a1012]"><Plus className="h-3.5 w-3.5" />Nova publicação</button></div></div>
        {showComposer && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={createPost} className="mx-auto my-8 grid max-w-3xl gap-4 rounded-2xl border border-white/10 bg-[#0d1215] p-6 shadow-2xl lg:grid-cols-2"><div className="flex items-center justify-between lg:col-span-2"><div><p className="text-xs uppercase tracking-[.16em] text-cyan-300">Novo agendamento</p><h3 className="mt-1 text-xl text-white">Adicionar ao calendário</h3></div><button type="button" onClick={() => setShowComposer(false)} className="rounded-lg border border-white/10 p-2 text-zinc-300"><X className="h-4 w-4" /></button></div>
          <label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Unidade<select value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value, connectionId: "" })} className={fieldClass}><option value="">Selecione a unidade</option>{overview.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
          <label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Conta Meta conectada<select value={form.connectionId} onChange={(event) => setForm({ ...form, connectionId: event.target.value })} className={fieldClass}><option value="">Ainda não conectada — manter em espera</option>{compatibleConnections.map((connection) => <option key={connection.id} value={connection.id}>{connection.facebookPageName}{connection.instagramUsername ? ` · @${connection.instagramUsername}` : ""}</option>)}</select></label>
          <label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Título<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={255} className={fieldClass} placeholder="Ex.: Campanha de inverno" /></label>
          <label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Formato<select value={form.contentFormat} onChange={(event) => setForm({ ...form, contentFormat: event.target.value as SocialPost["contentFormat"] })} className={fieldClass}><option value="image">Imagem</option><option value="carousel">Carrossel</option><option value="video">Vídeo</option><option value="reel">Reel</option></select></label>
          <label className="lg:col-span-2 text-[10px] uppercase tracking-[.14em] text-zinc-500">Legenda<textarea required value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} rows={4} className={fieldClass} placeholder="Escreva a legenda, hashtags e chamada para ação." /></label>
          <div className="lg:col-span-2 rounded-xl border border-dashed border-cyan-300/25 bg-cyan-300/[.035] p-4"><p className="text-[10px] font-medium uppercase tracking-[.14em] text-cyan-100">Mídia do computador</p><p className="mt-1 text-xs text-zinc-500">Selecione JPG, PNG, WebP, MP4 ou MOV de até 50 MB. Para carrossel, escolha um arquivo por vez.</p><input ref={mediaFileInputRef} onChange={(event) => void uploadComposerMedia(event)} accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" type="file" className="hidden" /><button type="button" disabled={uploadingMedia} onClick={() => mediaFileInputRef.current?.click()} className="mt-3 rounded-lg border border-cyan-300/35 px-3 py-2 text-xs font-medium text-cyan-100 disabled:opacity-60">{uploadingMedia ? "Enviando mídia…" : "Selecionar arquivo"}</button>{form.mediaUrls && <p className="mt-3 text-xs text-emerald-200">{parseMedia(form.mediaUrls, "image").length} mídia(s) adicionada(s).</p>}</div>
          <label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Link opcional<input value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} type="url" className={fieldClass} placeholder="https://" /></label>
          <label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Publicar em<input value={form.scheduledFor} onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })} type="datetime-local" className={fieldClass} /></label>
          <div className="flex flex-wrap items-center gap-4 lg:col-span-2"><label className="flex items-center gap-2 text-sm text-zinc-300"><input checked={form.targetFacebook} onChange={(event) => setForm({ ...form, targetFacebook: event.target.checked })} type="checkbox" className="accent-cyan-300" /><Facebook className="h-4 w-4 text-[#7ba7ff]" />Página Facebook</label><label className="flex items-center gap-2 text-sm text-zinc-300"><input checked={form.targetInstagram} onChange={(event) => setForm({ ...form, targetInstagram: event.target.checked })} type="checkbox" className="accent-cyan-300" /><Instagram className="h-4 w-4 text-pink-300" />Instagram profissional</label><button disabled={creating || uploadingMedia} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-[#062428] disabled:opacity-60"><Send className="h-3.5 w-3.5" />{creating ? "Salvando…" : form.scheduledFor ? "Agendar publicação" : "Salvar rascunho"}</button></div>
        </form></div>}
      </section>

      {showBulkPlanner && <section className="mb-7 overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/[.035]"><div className="flex flex-col gap-3 border-b border-cyan-300/15 p-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-medium uppercase tracking-[.2em] text-cyan-300">Fila mensal persistente</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Planejar conteúdo em massa</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">As linhas ficam salvas neste navegador mesmo ao recarregar. Importe o Excel, revise unidade, Página Meta, mídia e horário; o sistema envia no máximo dez peças por vez e evita duplicação se a página for interrompida.</p></div><div className="flex flex-wrap gap-2"><input ref={bulkFileInputRef} onChange={(event) => void importExcelFile(event)} accept=".xlsx,.xls" type="file" className="hidden" /><button onClick={downloadExcelTemplate} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200">Modelo Excel</button><button disabled={bulkImporting} onClick={() => bulkFileInputRef.current?.click()} className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs text-cyan-100 disabled:opacity-60">{bulkImporting ? "Lendo Excel…" : "Importar Excel"}</button><button onClick={() => addBulkItem()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200"><Plus className="mr-1 inline h-3.5 w-3.5" />Adicionar linha</button><button disabled={bulkSending} onClick={() => void sendBulkQueue()} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-[#062428] disabled:opacity-60"><Send className="mr-1 inline h-3.5 w-3.5" />{bulkSending ? "Enviando…" : "Enviar fila"}</button></div></div>{bulkSummary && <p className="border-b border-cyan-300/15 px-5 py-3 text-xs text-cyan-100">{bulkSummary}</p>}{bulkImportErrors.length > 0 && <div className="border-b border-rose-400/20 bg-rose-400/[.05] px-5 py-3 text-xs text-rose-100"><p className="font-medium">Linhas não importadas</p><p className="mt-1">{bulkImportErrors.slice(0, 8).map((item) => `Linha ${item.row}: ${item.message}`).join(" · ")}{bulkImportErrors.length > 8 ? ` · e mais ${bulkImportErrors.length - 8}` : ""}</p></div>}<div className="overflow-x-auto"><div className="min-w-[1260px]"><div className="grid grid-cols-[150px_160px_190px_140px_220px_230px_190px_110px] gap-2 border-b border-white/10 bg-black/10 px-5 py-2 text-[10px] uppercase tracking-[.12em] text-zinc-500"><span>Unidade</span><span>Página Meta</span><span>Título e formato</span><span>Canais</span><span>Legenda</span><span>Mídias HTTPS</span><span>Data e horário</span><span>Ação</span></div>{bulkQueue.length === 0 ? <div className="px-5 py-10 text-center text-sm text-zinc-500">Importe o Excel do mês ou adicione as peças manualmente. O rascunho fica salvo neste navegador até ser enviado.</div> : bulkQueue.map((item) => <div key={item.localId} className={`grid grid-cols-[150px_160px_190px_140px_220px_230px_190px_110px] gap-2 border-b border-white/8 px-5 py-3 text-xs ${item.state === "error" ? "bg-rose-400/[.06]" : ""}`}><select value={item.unitId} onChange={(event) => updateBulkItem(item.localId, { unitId: event.target.value, connectionId: "" })} className={compactFieldClass}><option value="">Unidade</option>{overview.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><select value={item.connectionId} onChange={(event) => updateBulkItem(item.localId, { connectionId: event.target.value })} className={compactFieldClass}><option value="">Em espera</option>{overview.connections.filter((connection) => connection.unitId === item.unitId && connection.connectionStatus === "active").map((connection) => <option key={connection.id} value={connection.id}>{connection.facebookPageName}{connection.instagramUsername ? ` · @${connection.instagramUsername}` : ""}</option>)}</select><div className="space-y-1"><input value={item.title} onChange={(event) => updateBulkItem(item.localId, { title: event.target.value })} className={compactFieldClass} placeholder="Título" /><select value={item.contentFormat} onChange={(event) => updateBulkItem(item.localId, { contentFormat: event.target.value as BulkQueueItem["contentFormat"] })} className={compactFieldClass}><option value="image">Imagem</option><option value="carousel">Carrossel</option><option value="video">Vídeo</option><option value="reel">Reel</option></select></div><div className="space-y-1.5 py-1 text-zinc-300"><label className="flex items-center gap-1.5"><input checked={item.targetFacebook} onChange={(event) => updateBulkItem(item.localId, { targetFacebook: event.target.checked })} type="checkbox" className="accent-cyan-300" /><Facebook className="h-3.5 w-3.5 text-[#7ba7ff]" />Facebook</label><label className="flex items-center gap-1.5"><input checked={item.targetInstagram} onChange={(event) => updateBulkItem(item.localId, { targetInstagram: event.target.checked })} type="checkbox" className="accent-cyan-300" /><Instagram className="h-3.5 w-3.5 text-pink-300" />Instagram</label></div><textarea value={item.caption} onChange={(event) => updateBulkItem(item.localId, { caption: event.target.value })} rows={3} className={compactFieldClass} placeholder="Legenda" /><textarea value={item.mediaUrls} onChange={(event) => updateBulkItem(item.localId, { mediaUrls: event.target.value })} rows={3} className={`${compactFieldClass} font-mono text-[10px]`} placeholder="https://…" /><div className="space-y-1"><input value={item.scheduledFor} onChange={(event) => updateBulkItem(item.localId, { scheduledFor: event.target.value })} type="datetime-local" className={compactFieldClass} />{item.error && <p className="text-[10px] leading-4 text-rose-200">{item.error}</p>}{item.state === "saved" && <p className="text-[10px] text-emerald-200">No calendário</p>}</div><div className="flex items-start gap-1"><button title="Duplicar linha" onClick={() => addBulkItem(item)} className="rounded border border-white/10 p-1.5 text-zinc-300"><Plus className="h-3.5 w-3.5" /></button><button title="Remover linha" onClick={() => setBulkQueue((items) => items.filter((value) => value.localId !== item.localId))} className="rounded border border-white/10 p-1.5 text-zinc-300"><X className="h-3.5 w-3.5" /></button></div></div>)}</div></div></section>}

      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><LayoutList className="h-4 w-4 text-cyan-300" /><h2 className="font-['Space_Grotesk'] text-lg font-light text-white">Calendário de agendamentos</h2></div><div className="flex gap-1"><button onClick={() => setCalendarCursor((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="rounded border border-white/10 p-1.5"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => setCalendarCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="rounded border border-white/10 px-2 text-xs">Hoje</button><button onClick={() => setCalendarCursor((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="rounded border border-white/10 p-1.5"><ChevronRight className="h-4 w-4" /></button></div></div><p className="mt-2 text-sm text-zinc-400">{calendarCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p><div className="mt-4 overflow-x-auto"><div className="min-w-[840px]"><div className="grid grid-cols-7 border-b border-white/10 text-center text-[10px] uppercase tracking-[.14em] text-zinc-500">{"Dom Seg Ter Qua Qui Sex Sáb".split(" ").map((day) => <div key={day} className="p-2">{day}</div>)}</div><div className="grid grid-cols-7">{calendarDays.map((day) => <div key={day.key} className={`min-h-32 border-b border-r border-white/8 p-2 ${day.inMonth ? "bg-black/10" : "bg-black/30 text-zinc-700"}`}><p className="text-xs">{day.date.getDate()}</p><div className="mt-1 space-y-1">{(postsByDay.get(day.key) ?? []).map((post) => <button key={post.id} onClick={() => setSelectedPost(post)} className="block w-full rounded bg-cyan-300/15 px-1.5 py-1 text-left text-[10px] text-cyan-100"><span className="block truncate">{post.title}</span><span className="text-[9px] text-zinc-400">{post.targetFacebook ? "F" : ""}{post.targetInstagram ? "I" : ""} · {statusLabel[post.status] ?? post.status}</span></button>)}</div></div>)}</div></div></div></section>
      {selectedPost && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><div className="mx-auto my-10 max-w-xl rounded-2xl border border-white/10 bg-[#0d1215] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.16em] text-cyan-300">Detalhes da publicação</p><h3 className="mt-1 text-xl text-white">{selectedPost.title}</h3></div><button onClick={() => setSelectedPost(null)} className="rounded-lg border border-white/10 p-2 text-zinc-300"><X className="h-4 w-4" /></button></div><p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{selectedPost.caption}</p><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Data e hora</dt><dd className="mt-1 text-sm text-white">{humanDate(selectedPost.scheduledFor)}</dd></div><div><dt className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Unidade</dt><dd className="mt-1 text-sm text-white">{selectedPost.unitName}</dd></div><div><dt className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Canais</dt><dd className="mt-1 flex gap-2 text-sm text-white">{selectedPost.targetFacebook && <Facebook className="h-4 w-4 text-[#7ba7ff]" />}{selectedPost.targetInstagram && <Instagram className="h-4 w-4 text-pink-300" />}</dd></div><div><dt className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Estado</dt><dd className="mt-1 text-sm text-white">{statusLabel[selectedPost.status] ?? selectedPost.status}</dd></div></dl><div className="mt-6 flex justify-end gap-2"><button onClick={() => void editPostSchedule(selectedPost)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200">Editar data</button><button onClick={() => void cancelPost(selectedPost.id)} className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs text-rose-100">Excluir</button></div></div></div>}
    </>}
  </div></main>;
}
