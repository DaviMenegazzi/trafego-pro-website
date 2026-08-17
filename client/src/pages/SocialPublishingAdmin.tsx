import { AlertCircle, CalendarClock, CheckCircle2, ExternalLink, Facebook, ImagePlus, Instagram, LayoutList, Link2, Plus, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type AppUser = { id: string; role: string; email?: string; name?: string };
type Unit = { id: string; name: string; client_group: string | null };
type Connection = { id: string; unitId: string; unitName: string; facebookPageName: string; instagramUsername: string | null; connectionStatus: string };
type SocialPost = { id: string; unitName: string; title: string; caption: string; contentFormat: "image" | "carousel" | "video" | "reel"; targetFacebook: boolean; targetInstagram: boolean; status: string; scheduledFor: string | null; createdAt: string; media: Array<{ id: string; url: string; mediaType: "image" | "video" }> };
type Overview = { units: Unit[]; connections: Connection[]; posts: SocialPost[]; metaConfigured: boolean; scheduler: { status: string; taskUid: string | null } };
type MetaCandidate = { facebookPageId: string; facebookPageName: string; instagramAccountId: string | null; instagramUsername: string | null };

const statusLabel: Record<string, string> = { draft: "Rascunho", scheduled: "Agendado", publishing: "Publicando", published: "Publicado", partially_published: "Parcial", failed: "Falhou", cancelled: "Cancelado", waiting_connection: "Aguardando Meta" };
const formatLabel: Record<SocialPost["contentFormat"], string> = { image: "Imagem", carousel: "Carrossel", video: "Vídeo", reel: "Reel" };

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

export default function SocialPublishingAdmin() {
  const [, navigate] = useLocation();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ unitId: "", connectionId: "", title: "", caption: "", linkUrl: "", contentFormat: "image" as SocialPost["contentFormat"], mediaUrls: "", targetFacebook: true, targetInstagram: true, scheduledFor: "" });
  const [metaCandidates, setMetaCandidates] = useState<MetaCandidate[]>([]);
  const [metaSession, setMetaSession] = useState<string | null>(() => new URLSearchParams(window.location.search).get("meta_session"));
  const [candidatePageId, setCandidatePageId] = useState("");
  const [candidateUnitId, setCandidateUnitId] = useState("");
  const [connectingMeta, setConnectingMeta] = useState(false);

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

  const selectedUnit = useMemo(() => overview?.units.find((unit) => unit.id === form.unitId) ?? null, [form.unitId, overview?.units]);
  const compatibleConnections = useMemo(() => overview?.connections.filter((connection) => connection.unitId === form.unitId && connection.connectionStatus === "active") ?? [], [form.unitId, overview?.connections]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUnit) { setError("Selecione uma unidade autorizada"); return; }
    setCreating(true);
    try {
      const defaultType = form.contentFormat === "video" || form.contentFormat === "reel" ? "video" : "image";
      const response = await fetch("/api/social/posts", { method: "POST", headers: requestHeaders(), body: JSON.stringify({ unitId: selectedUnit.id, connectionId: form.connectionId || null, title: form.title, caption: form.caption, linkUrl: form.linkUrl || null, contentFormat: form.contentFormat, targetFacebook: form.targetFacebook, targetInstagram: form.targetInstagram, scheduledFor: form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null, media: parseMedia(form.mediaUrls, defaultType) }) });
      const data = await readJson<{ error?: string }>(response, "Não foi possível salvar a publicação");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a publicação");
      setForm((current) => ({ ...current, connectionId: "", title: "", caption: "", linkUrl: "", contentFormat: "image", mediaUrls: "", scheduledFor: "", targetFacebook: true, targetInstagram: true }));
      setShowComposer(false);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar a publicação"); }
    finally { setCreating(false); }
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
      setMetaSession(null); setMetaCandidates([]); setCandidatePageId("");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar a conexão Meta"); }
    finally { setConnectingMeta(false); }
  }

  return <main className="min-h-screen bg-[#080b0d] text-zinc-100"><div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
    <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-medium uppercase tracking-[.24em] text-cyan-300">Módulo isolado · administrativo</p><h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-light tracking-tight text-white">Central de Publicações</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Planeje conteúdo por unidade, mantenha rascunhos e programe feed, carrosséis, vídeos e Reels. Esta área não interfere na dashboard, no CRM ou no Evolution.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => navigate("/dashboard")} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">Voltar à dashboard</button><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-[#07252a] transition active:scale-[.97]"><RefreshCw className="h-3.5 w-3.5" />Atualizar</button></div></header>

    {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span><button className="ml-auto" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
    {loading || !overview ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center text-sm text-zinc-500">Carregando calendário editorial…</div> : <>
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><div className={`rounded-2xl border p-5 ${overview.metaConfigured ? "border-emerald-400/25 bg-emerald-400/[.06]" : "border-amber-300/25 bg-amber-300/[.06]"}`}><div className="flex gap-3"><ShieldCheck className={`h-5 w-5 shrink-0 ${overview.metaConfigured ? "text-emerald-300" : "text-amber-200"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{overview.metaConfigured ? "Aplicação Meta configurada" : "Conexão Meta pendente"}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{overview.metaConfigured ? "Conecte uma Página e o Instagram profissional para liberar os agendamentos." : "O calendário já pode ser preparado. A publicação automática será liberada após criar a aplicação Meta e inserir as credenciais protegidas."}</p>{overview.metaConfigured && <button disabled={connectingMeta} onClick={() => void startMetaConnection()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 px-3 py-2 text-xs font-medium text-emerald-100 disabled:opacity-60"><Link2 className="h-3.5 w-3.5" />{connectingMeta ? "Abrindo Meta…" : "Conectar Página Meta"}</button>}</div></div></div><div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[10px] uppercase tracking-[.16em] text-zinc-500">Processador</p><p className="mt-2 text-sm text-white">{overview.scheduler.status === "active" ? "Ativo" : "Aguardando conexão Meta"}</p><p className="mt-1 text-xs text-zinc-500">{overview.scheduler.taskUid ? "Rotina registrada" : "Rotina será ativada após a primeira conexão"}</p></div></section>
      {metaSession && <section className="mb-6 rounded-2xl border border-cyan-300/25 bg-cyan-300/[.05] p-5"><p className="text-xs font-medium text-cyan-100">Selecione onde a autorização Meta será usada</p><p className="mt-1 text-xs text-zinc-400">A Página e o perfil profissional exibidos abaixo vieram da autorização atual. O token fica protegido no servidor e não é enviado de volta ao navegador.</p>{metaCandidates.length ? <div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Página Meta<select value={candidatePageId} onChange={(event) => setCandidatePageId(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100"><option value="">Selecione</option>{metaCandidates.map((candidate) => <option key={candidate.facebookPageId} value={candidate.facebookPageId}>{candidate.facebookPageName}{candidate.instagramUsername ? ` · @${candidate.instagramUsername}` : ""}</option>)}</select></label><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Unidade autorizada<select value={candidateUnitId} onChange={(event) => setCandidateUnitId(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100"><option value="">Selecione</option>{overview.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><div className="flex items-end"><button disabled={connectingMeta} onClick={() => void saveMetaConnection()} className="w-full rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-[#062428] disabled:opacity-60">{connectingMeta ? "Salvando…" : "Vincular conta"}</button></div></div> : <p className="mt-3 text-sm text-zinc-400">Nenhuma Página administrável foi retornada pela Meta nesta autorização.</p>}</section>}

      <section className="mb-7 rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-zinc-600">Calendário editorial</p><h2 className="mt-1 font-['Space_Grotesk'] text-xl font-light text-white">Publicações por unidade</h2><p className="mt-1 text-sm text-zinc-500">Os conteúdos ficam em rascunho até serem conectados e agendados para um destino Meta autorizado.</p></div><button onClick={() => setShowComposer((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0a1012] transition active:scale-[.97]"><Plus className="h-3.5 w-3.5" />Nova publicação</button></div>
        {showComposer && <form onSubmit={createPost} className="mt-5 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-2"><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Unidade<select value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value, connectionId: "" })} className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60"><option value="">Selecione a unidade</option>{overview.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Conta Meta conectada<select value={form.connectionId} onChange={(event) => setForm({ ...form, connectionId: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60"><option value="">Ainda não conectada — manter em espera</option>{compatibleConnections.map((connection) => <option key={connection.id} value={connection.id}>{connection.facebookPageName}{connection.instagramUsername ? ` · @${connection.instagramUsername}` : ""}</option>)}</select></label><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Título<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={255} className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60" placeholder="Ex.: Campanha de inverno" /></label><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Formato<select value={form.contentFormat} onChange={(event) => setForm({ ...form, contentFormat: event.target.value as SocialPost["contentFormat"] })} className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60"><option value="image">Imagem</option><option value="carousel">Carrossel</option><option value="video">Vídeo</option><option value="reel">Reel</option></select></label><label className="lg:col-span-2 text-[10px] uppercase tracking-[.14em] text-zinc-500">Legenda<textarea required value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} rows={4} className="mt-1.5 block w-full resize-y rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60" placeholder="Escreva a legenda, hashtags e chamada para ação." /></label><label className="lg:col-span-2 text-[10px] uppercase tracking-[.14em] text-zinc-500">Mídias por URL pública<textarea required value={form.mediaUrls} onChange={(event) => setForm({ ...form, mediaUrls: event.target.value })} rows={3} className="mt-1.5 block w-full resize-y rounded-lg border border-white/10 bg-[#101416] px-3 py-2 font-mono text-xs normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60" placeholder={form.contentFormat === "carousel" ? "image|https://cdn.exemplo.com/card-1.jpg\nvideo|https://cdn.exemplo.com/card-2.mp4" : "https://cdn.exemplo.com/midia.jpg"} /><span className="mt-1 block normal-case tracking-normal text-zinc-600">A Meta lê as mídias por URL HTTPS pública. Em carrosséis, use uma linha por mídia e o prefixo opcional `image|` ou `video|`.</span></label><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Link opcional<input value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} type="url" className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60" placeholder="https://" /></label><label className="text-[10px] uppercase tracking-[.14em] text-zinc-500">Publicar em<input value={form.scheduledFor} onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })} type="datetime-local" className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#101416] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 outline-none focus:border-cyan-300/60" /></label><div className="flex flex-wrap items-center gap-4 lg:col-span-2"><label className="flex items-center gap-2 text-sm text-zinc-300"><input checked={form.targetFacebook} onChange={(event) => setForm({ ...form, targetFacebook: event.target.checked })} type="checkbox" className="accent-cyan-300" /><Facebook className="h-4 w-4 text-[#7ba7ff]" />Página Facebook</label><label className="flex items-center gap-2 text-sm text-zinc-300"><input checked={form.targetInstagram} onChange={(event) => setForm({ ...form, targetInstagram: event.target.checked })} type="checkbox" className="accent-cyan-300" /><Instagram className="h-4 w-4 text-pink-300" />Instagram profissional</label><button disabled={creating} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-[#062428] disabled:opacity-60"><Send className="h-3.5 w-3.5" />{creating ? "Salvando…" : form.scheduledFor ? "Agendar publicação" : "Salvar rascunho"}</button></div></form>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><LayoutList className="h-4 w-4 text-cyan-300" /><h2 className="font-['Space_Grotesk'] text-lg font-light text-white">Próximas publicações</h2></div>{overview.posts.length === 0 ? <div className="py-14 text-center"><ImagePlus className="mx-auto h-6 w-6 text-zinc-700" /><p className="mt-3 text-sm text-zinc-500">Nenhuma publicação criada ainda.</p><p className="mt-1 text-xs text-zinc-600">Comece por um rascunho e conecte a conta Meta quando a aplicação estiver configurada.</p></div> : <div className="mt-4 divide-y divide-white/8">{overview.posts.map((post) => <article key={post.id} className="grid gap-3 py-4 lg:grid-cols-[1.1fr_.6fr_.6fr_.7fr]"><div><p className="text-sm font-medium text-white">{post.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{post.caption}</p><p className="mt-2 text-[10px] uppercase tracking-[.14em] text-zinc-600">{post.unitName} · {formatLabel[post.contentFormat]} · {post.media.length} mídia(s)</p></div><p className="flex items-center gap-1.5 text-xs text-zinc-400">{post.targetFacebook && <Facebook className="h-3.5 w-3.5 text-[#7ba7ff]" />}{post.targetInstagram && <Instagram className="h-3.5 w-3.5 text-pink-300" />}</p><p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-zinc-300"><CheckCircle2 className="h-3 w-3 text-cyan-300" />{statusLabel[post.status] ?? post.status}</p><p className="flex items-center gap-1.5 text-xs text-zinc-500"><CalendarClock className="h-3.5 w-3.5" />{humanDate(post.scheduledFor)}</p></article>)}</div>}</section>
    </>}
  </div></main>;
}
