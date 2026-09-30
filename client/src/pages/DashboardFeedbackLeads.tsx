import { useEffect, useMemo, useRef, useState } from "react";
import { Button, DatePicker, IconButton, Surface, Textarea, isoToDate } from "@/components/ds";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCircle2, Hash, Send, Sparkles, Star, TrendingUp } from "lucide-react";
import { useAdminAuth, getToken } from "@/hooks/useAdminAuth";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { hasSeenNavItem, markNavItemSeen } from "@/lib/navNewBadge";
import {
  LOSS_REASONS,
  RATING_OPTIONS,
  feedbackWeekFor,
  previousFeedbackWeek,
  validateFeedbackCounts,
} from "./feedbackLeadsConfig";
import { submitFeedbackLead } from "./feedbackLeadsApi";
import { buildClientMetricsQuery } from "@/lib/clientMetricsRequest";

export { FALLBACK_UNITS, LOSS_REASONS } from "./feedbackLeadsConfig";

type FormData = {
  /** Essa semana, semana passada ou uma data qualquer (vale a semana do mês que a contém). */
  weekChoice: "current" | "previous" | "custom";
  customDate: string;
  totalLeads: string;
  leadsConverted: string;
  leadsInNegotiation: string;
  leadsLost: string;
  lossReason: string;
  leadQuality: string;
  agencySatisfaction: string;
  comment: string;
};

const emptyForm: FormData = {
  weekChoice: "current", customDate: "", totalLeads: "", leadsConverted: "", leadsInNegotiation: "", leadsLost: "",
  lossReason: "", leadQuality: "", agencySatisfaction: "", comment: "",
};

const INTRO_KEY = "fechamentos-intro";

const INTRO_POINTS = [
  { icon: <Hash />, title: "Os números da semana", text: "Quantos leads chegaram, quantos fecharam, quantos seguem em negociação e quantos foram perdidos." },
  { icon: <Star />, title: "Sua avaliação", text: "Uma nota para a qualidade dos leads e, se quiser, outra para a Tráfego Pro." },
  { icon: <TrendingUp />, title: "Para que serve", text: "Com isso a gente ajusta campanhas e públicos para trazer leads que fecham." },
];

function FeedbackIntro({ onStart, onExit }: { onStart: () => void; onExit: () => void }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-14">
      <div className="mb-4">
        <IconButton label="Sair" icon={<ArrowLeft />} variant="ghost" onClick={onExit} />
      </div>
      <Surface className="p-6 animate-in fade-in-0 duration-300 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Fechamentos</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-[28px]">Como foram os leads da semana?</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Uma vez por semana, você conta o que aconteceu com os leads que chegaram para a sua unidade.
        </p>
        <ul className="mt-6 space-y-4">
          {INTRO_POINTS.map((point) => (
            <li key={point.title} className="flex gap-3">
              <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-300 [&_svg]:size-4">{point.icon}</span>
              <div>
                <p className="text-sm font-medium text-zinc-100">{point.title}</p>
                <p className="mt-0.5 text-sm leading-6 text-zinc-400">{point.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-zinc-500 sm:text-left">Leva menos de 1 minuto.</p>
          <Button variant="primary" size="lg" onClick={onStart} autoFocus>Começar</Button>
        </div>
      </Surface>
    </div>
  );
}

type LastFeedback = { submittedAt: string; weekStart: string; weekEnd: string; responsible: string };

type CountKey = "totalLeads" | "leadsConverted" | "leadsInNegotiation" | "leadsLost";
type StepId = "week" | CountKey | "lossReason" | "leadQuality" | "agencySatisfaction" | "comment" | "review";

/** Desfechos na ordem das perguntas: cada um só pode usar o que sobrou dos recebidos. */
const OUTCOME_KEYS = ["leadsConverted", "leadsInNegotiation", "leadsLost"] as const;

const COUNT_QUESTIONS: Record<CountKey, { title: string; hint: string; review: string }> = {
  totalLeads: { title: "Quantos leads chegaram na semana?", hint: "Todos os contatos recebidos, mesmo os que não responderam.", review: "Recebidos" },
  leadsConverted: { title: "Quantos fecharam?", hint: "Viraram venda ou contrato.", review: "Fecharam" },
  leadsInNegotiation: { title: "Quantos ainda estão em negociação?", hint: "Conversa em andamento, sem desfecho.", review: "Em negociação" },
  leadsLost: { title: "Quantos foram perdidos?", hint: "Desistiram, sumiram ou não tinham perfil.", review: "Perdidos" },
};

function FeedbackLoading() {
  return <div className="flex min-h-screen items-center justify-center bg-[#080808] text-sm text-white/70">Verificando autenticação…</div>;
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">{title}</h1>
      {hint && <p className="mt-1 text-sm text-zinc-400">{hint}</p>}
    </div>
  );
}

/** Opção grande de toque. */
function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 text-left text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald-400/60",
        selected ? "border-emerald-500/60 bg-emerald-500/10 text-white" : "border-white/10 bg-zinc-950/70 text-zinc-200 hover:border-white/25 hover:bg-white/[0.03]",
      )}
    >
      {children}
      {selected && <Check className="size-4 shrink-0 text-emerald-300" />}
    </button>
  );
}

function RatingChoice({ value, onPick, low, high }: { value: string; onPick: (v: string) => void; low: string; high: string }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {RATING_OPTIONS.map((r) => {
          const selected = value === String(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => onPick(String(r))}
              aria-pressed={selected}
              aria-label={`${r} de 5`}
              className={cn(
                "h-14 rounded-lg border text-lg font-semibold tabular-nums outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                selected ? "border-emerald-500/60 bg-emerald-500/15 text-white" : "border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/25 hover:text-white",
              )}
            >
              {r}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-500"><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

export default function DashboardFeedbackLeads() {
  const { user, loading: authLoading } = useAdminAuth();
  const { selectedClient, selectedClientId, loading: clientsLoading } = useClientContext();
  const [, setLocation] = useLocation();
  const currentWeek = useMemo(() => feedbackWeekFor(new Date()), []);
  const lastWeek = useMemo(() => previousFeedbackWeek(currentWeek), [currentWeek]);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [stepId, setStepId] = useState<StepId>("week");
  const [direction, setDirection] = useState<1 | -1>(1);
  // Saiu da conferência para alterar algo: ao confirmar, volta direto para a conferência.
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [stepError, setStepError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Apresentação da aba: aparece uma única vez por pessoa (guardado no navegador, como o selo "Novo").
  const [showIntro, setShowIntro] = useState(() => !hasSeenNavItem(INTRO_KEY));
  const advanceTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);
  useEffect(() => { document.title = "Tráfego Pro — Fechamentos"; }, []);

  // Último feedback da unidade aberta no painel, para o aviso embaixo do quadro.
  const unitName = selectedClient?.name ?? "";
  const [lastSent, setLastSent] = useState<LastFeedback | null>(null);
  useEffect(() => {
    setLastSent(null);
    const token = getToken();
    if (!unitName || !token) return;
    let active = true;
    fetch(`/api/feedback-leads/last?unit=${encodeURIComponent(unitName)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: LastFeedback | null) => { if (active) setLastSent(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [unitName, sent]);

  const customDay = isoToDate(formData.customDate);
  const week = formData.weekChoice === "previous" ? lastWeek : formData.weekChoice === "custom" && customDay ? feedbackWeekFor(customDay) : currentWeek;

  // Sugestão de recebidos: o que a Dashboard mostra para a unidade na semana escolhida
  // (conversas iniciadas + leads Meta). Null enquanto carrega ou se não houver dados.
  const [suggestion, setSuggestion] = useState<LeadsSuggestion | null>(null);
  useEffect(() => {
    setSuggestion(null);
    const token = getToken();
    if (!selectedClientId || !token) return;
    let active = true;
    fetchLeadsSuggestion(selectedClientId, week.start, week.end, token)
      .then((result) => { if (active) setSuggestion(result); })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedClientId, week.start, week.end]);

  // Preenche os recebidos com a sugestão ao chegar na pergunta, uma vez por semana/valor:
  // se a pessoa apagar para digitar, não volta a preencher.
  const autoFilled = useRef<{ key: string; value: string } | null>(null);
  useEffect(() => {
    if (stepId !== "totalLeads" || !suggestion) return;
    const key = `${week.start}:${suggestion.total}`;
    if (autoFilled.current?.key === key) return;
    const value = String(suggestion.total);
    setFormData((previous) => (previous.totalLeads === "" || previous.totalLeads === autoFilled.current?.value ? { ...previous, totalLeads: value } : previous));
    autoFilled.current = { key, value };
  }, [stepId, suggestion, week.start]);

  if (authLoading || !user) return <FeedbackLoading />;

  const hasLosses = Number(formData.leadsLost) > 0;
  // O motivo das perdas só entra no roteiro quando há perdidos.
  const steps: StepId[] = ["week", "totalLeads", ...OUTCOME_KEYS, ...(hasLosses ? (["lossReason"] as const) : []), "leadQuality", "agencySatisfaction", "comment", "review"];
  const index = steps.indexOf(stepId);
  const questionCount = steps.length - 1;
  // A unidade é sempre a que está aberta no painel.
  const unit = unitName;
  const total = Number(formData.totalLeads) || 0;
  const exit = () => setLocation("/dashboard");

  const set = (name: keyof FormData, value: string) => {
    setStepError("");
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const goTo = (target: StepId, dir: 1 | -1) => {
    window.clearTimeout(advanceTimer.current);
    setStepError("");
    setDirection(dir);
    setStepId(target);
  };

  /** Quanto sobra dos recebidos para este desfecho, descontando os anteriores. */
  const remaining = (key: (typeof OUTCOME_KEYS)[number]) =>
    Math.max(0, total - OUTCOME_KEYS.slice(0, OUTCOME_KEYS.indexOf(key)).reduce((a, k) => a + (Number(formData[k]) || 0), 0));

  const validateStep = (): string => {
    if (stepId === "week") {
      if (!unit) return "Escolha a unidade no topo do painel.";
      if (formData.weekChoice === "custom" && !customDay) return "Escolha um dia da semana que você quer reportar.";
      return "";
    }
    if (stepId in COUNT_QUESTIONS) {
      const raw = formData[stepId as CountKey];
      if (raw === "") return "Informe um número (pode ser 0).";
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) return "Use um número inteiro, zero ou maior.";
      const left = stepId === "totalLeads" ? n : remaining(stepId as (typeof OUTCOME_KEYS)[number]);
      if (n > left) return `Só restam ${left} dos ${total} recebidos.`;
    }
    if (stepId === "lossReason" && !formData.lossReason) return "Escolha o motivo principal.";
    if (stepId === "leadQuality" && !formData.leadQuality) return "Escolha uma nota de 1 a 5.";
    return "";
  };

  /** Avança a partir do passo atual. Vindo da conferência, volta para ela (salvo se agora faltar o motivo das perdas). */
  const advance = () => {
    const missingReason = stepId === "leadsLost" && hasLosses && !formData.lossReason;
    if (editingFromReview && !missingReason) {
      setEditingFromReview(false);
      goTo("review", 1);
      return;
    }
    goTo(steps[index + 1], 1);
  };

  const next = () => {
    const error = validateStep();
    if (error) { setStepError(error); return; }
    advance();
  };

  const back = () => {
    if (editingFromReview) { setEditingFromReview(false); goTo("review", -1); return; }
    if (index <= 0) { exit(); return; }
    goTo(steps[index - 1], -1);
  };

  /** Escolha por toque: mostra a marcação por um instante e avança. */
  const pickAndAdvance = (name: keyof FormData, value: string) => {
    set(name, value);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(advance, 180);
  };

  const skip = (name: keyof FormData) => {
    set(name, "");
    advance();
  };

  const edit = (target: StepId) => {
    setEditingFromReview(true);
    goTo(target, -1);
  };

  // Recebidos vindos da Dashboard só quando o número enviado é exatamente o sugerido.
  const usedSuggestion = suggestion !== null && formData.totalLeads === String(suggestion.total);

  const reviewError = Object.values(validateFeedbackCounts(formData))[0] ?? (hasLosses && !formData.lossReason ? "Falta o motivo das perdas." : "");

  const submit = async () => {
    if (reviewError) { toast.error(reviewError); return; }
    const token = getToken();
    if (!token) { toast.error("Sessão expirada. Faça login novamente."); setLocation("/login"); return; }
    setSending(true);
    try {
      await submitFeedbackLead({
        unit,
        // O responsável é quem está logado; o campo saiu do formulário.
        responsible: user.name || user.email,
        weekStart: week.start,
        weekEnd: week.end,
        totalLeads: formData.totalLeads,
        totalLeadsSource: usedSuggestion ? "dashboard" : "manual",
        totalLeadsSuggested: suggestion?.total ?? null,
        leadsConverted: formData.leadsConverted,
        leadsInNegotiation: formData.leadsInNegotiation,
        leadsLost: formData.leadsLost,
        lossReason: hasLosses ? formData.lossReason : "",
        leadQuality: formData.leadQuality,
        agencySatisfaction: formData.agencySatisfaction,
        observations: formData.comment.trim(),
      }, token);
      setSent(true);
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_EXPIRED") { toast.error("Sessão expirada. Faça login novamente."); setLocation("/login"); }
      else toast.error(error instanceof Error ? error.message : "Erro ao salvar feedback. Tente novamente.");
    } finally { setSending(false); }
  };

  const startOver = () => {
    setFormData(emptyForm);
    autoFilled.current = null;
    setSent(false);
    setEditingFromReview(false);
    goTo("week", 1);
  };

  const reviewRows: { label: string; value: string; step?: StepId; muted?: boolean }[] = [
    { label: "Unidade", value: unit },
    { label: "Semana", value: week.label, step: "week" },
    ...(Object.keys(COUNT_QUESTIONS) as CountKey[]).map((k) => ({
      label: COUNT_QUESTIONS[k].review,
      value: k === "totalLeads" && suggestion ? `${formData[k] || "0"} · ${usedSuggestion ? "da Dashboard" : "manual"}` : formData[k] || "0",
      step: k,
    })),
    ...(hasLosses ? [{ label: "Motivo das perdas", value: formData.lossReason || "—", step: "lossReason" as StepId }] : []),
    { label: "Qualidade dos leads", value: `${formData.leadQuality}/5`, step: "leadQuality" },
    { label: "Satisfação", value: formData.agencySatisfaction ? `${formData.agencySatisfaction}/5` : "Pulado", step: "agencySatisfaction", muted: !formData.agencySatisfaction },
    { label: "Comentário", value: formData.comment.trim() || "Pulado", step: "comment", muted: !formData.comment.trim() },
  ];

  const renderStep = () => {
    if (stepId === "week") {
      return (
        <>
          <StepTitle title="Qual semana você vai reportar?" hint={unit ? `Unidade ${unit}` : undefined} />
          <div className="space-y-2">
            <ChoiceButton selected={formData.weekChoice === "current"} onClick={() => set("weekChoice", "current")}>Essa semana · {currentWeek.label}</ChoiceButton>
            <ChoiceButton selected={formData.weekChoice === "previous"} onClick={() => set("weekChoice", "previous")}>Semana passada · {lastWeek.label}</ChoiceButton>
            <ChoiceButton selected={formData.weekChoice === "custom"} onClick={() => set("weekChoice", "custom")}>Personalizado</ChoiceButton>
          </div>
          {formData.weekChoice === "custom" && (
            <div className="mt-4 space-y-1.5">
              <DatePicker aria-label="Um dia da semana" size="lg" value={formData.customDate} onChange={(iso) => set("customDate", iso)} placeholder="Escolha um dia da semana" invalid={Boolean(stepError) && !customDay} />
              {customDay && <p className="text-xs text-zinc-400">Semana de {week.label}</p>}
            </div>
          )}
          {!unit && !clientsLoading && <p className="mt-4 text-xs text-rose-300">Nenhuma unidade aberta no painel. Escolha uma no topo.</p>}
        </>
      );
    }
    if (stepId in COUNT_QUESTIONS) {
      const key = stepId as CountKey;
      const q = COUNT_QUESTIONS[key];
      const hint = key === "totalLeads" ? q.hint : `${q.hint} Restam ${remaining(key)} dos ${total} recebidos.`;
      const suggestionNote = key === "totalLeads" && suggestion ? (
        <p className="mt-3 text-center text-sm text-zinc-500" aria-live="polite">
          {usedSuggestion ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300"><Sparkles className="size-4" aria-hidden />Sugerido pela plataforma com base na Dashboard</span>
              <br />
              <span className="text-xs">Ajuste se for diferente.</span>
            </>
          ) : (
            <>A Dashboard mostra {suggestion.total} na semana.</>
          )}
        </p>
      ) : null;
      return (
        <>
          <StepTitle title={q.title} hint={hint} />
          {/* Campo "invisível": só o número grande e uma linha que acende no foco. Texto só com dígitos, sem as setinhas do type=number. */}
          <input
            autoFocus
            aria-label={q.review}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={6}
            placeholder="0"
            value={formData[key]}
            onChange={(event) => set(key, event.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(stepError)}
            className="block w-full border-0 border-b-2 border-white/10 bg-transparent pb-2 text-center font-display text-5xl font-semibold tabular-nums text-white caret-emerald-400 outline-none transition-colors duration-150 placeholder:text-zinc-700 focus:border-emerald-400 aria-[invalid=true]:border-rose-400"
          />
          {suggestionNote}
        </>
      );
    }
    if (stepId === "lossReason") {
      return (
        <>
          <StepTitle title="Qual foi o principal motivo das perdas?" hint={`${formData.leadsLost} ${Number(formData.leadsLost) === 1 ? "lead perdido" : "leads perdidos"} na semana.`} />
          <div className="space-y-2">
            {LOSS_REASONS.map((r) => (
              <ChoiceButton key={r} selected={formData.lossReason === r} onClick={() => pickAndAdvance("lossReason", r)}>{r}</ChoiceButton>
            ))}
          </div>
        </>
      );
    }
    if (stepId === "leadQuality") {
      return (
        <>
          <StepTitle title="Como estava a qualidade dos leads?" hint="Perfil, interesse e intenção de compra." />
          <RatingChoice value={formData.leadQuality} onPick={(v) => pickAndAdvance("leadQuality", v)} low="Ruim" high="Ótima" />
        </>
      );
    }
    if (stepId === "agencySatisfaction") {
      return (
        <>
          <StepTitle title="Qual sua satisfação com a Tráfego Pro nesta semana?" hint="Opcional. Ajuda a gente a ajustar a próxima semana." />
          <RatingChoice value={formData.agencySatisfaction} onPick={(v) => pickAndAdvance("agencySatisfaction", v)} low="Insatisfeito" high="Muito satisfeito" />
        </>
      );
    }
    if (stepId === "comment") {
      return (
        <>
          <StepTitle title="Quer deixar algum comentário?" hint="Opcional. Algo que a agência precisa saber ou ajustar." />
          <Textarea autoFocus aria-label="Comentário" value={formData.comment} onChange={(event) => set("comment", event.target.value)} rows={4} placeholder="Escreva aqui" />
        </>
      );
    }
    return (
      <>
        <StepTitle title="Confira antes de enviar" />
        <dl className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08]">
          {reviewRows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-2.5 pl-4 pr-2">
              <dt className="w-32 shrink-0 text-sm text-zinc-500 sm:w-40">{row.label}</dt>
              <dd className={cn("min-w-0 flex-1 truncate text-sm tabular-nums", row.muted ? "text-zinc-500" : "text-zinc-100")}>{row.value}</dd>
              {row.step && <button type="button" onClick={() => edit(row.step!)} aria-label={`Alterar ${row.label.toLowerCase()}`} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-emerald-300 outline-none hover:text-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-400/60">
                Alterar
              </button>}
            </div>
          ))}
        </dl>
        {reviewError && <p role="alert" className="mt-3 text-sm text-rose-300">{reviewError}</p>}
      </>
    );
  };

  // Nas perguntas de escolha, tocar numa opção já avança; o botão só aparece se já houver resposta (ex.: voltou um passo).
  const isChoiceStep = stepId === "lossReason" || stepId === "leadQuality" || stepId === "agencySatisfaction";
  const skippable = stepId === "agencySatisfaction" || stepId === "comment";
  const showContinue = !isChoiceStep || Boolean(formData[stepId as keyof FormData]);

  const startFromIntro = () => {
    markNavItemSeen(INTRO_KEY);
    setShowIntro(false);
  };

  const content = showIntro ? (
    <FeedbackIntro onStart={startFromIntro} onExit={exit} />
  ) : sent ? (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-16">
      <Surface className="flex flex-col items-center px-6 py-10 text-center animate-in fade-in-0 zoom-in-95 duration-300">
        <CheckCircle2 className="size-10 text-emerald-400" />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em] text-white">Feedback enviado</h1>
        <p className="mt-1 text-sm text-zinc-400">{unit} · {week.label}</p>
        <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="secondary" size="lg" onClick={startOver}>Enviar outra semana</Button>
          <Button variant="primary" size="lg" onClick={exit}>Voltar ao painel</Button>
        </div>
      </Surface>
    </div>
  ) : (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-14">
      <div className="mb-4 flex items-center gap-3">
        <IconButton label={index === 0 && !editingFromReview ? "Sair" : "Voltar"} icon={<ArrowLeft />} variant="ghost" onClick={back} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between text-xs text-zinc-500">
            <span>Fechamentos</span>
            <span className="tabular-nums">{stepId === "review" ? "Conferência" : `${index + 1} de ${questionCount}`}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label="Progresso" aria-valuemin={0} aria-valuemax={questionCount} aria-valuenow={index}>
            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300 ease-out" style={{ width: `${(index / questionCount) * 100}%` }} />
          </div>
        </div>
      </div>

      <Surface className="p-5 sm:p-7">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (stepId === "review") void submit();
            else next();
          }}
        >
          <div key={stepId} className={cn("animate-in fade-in-0 duration-200", direction === 1 ? "slide-in-from-right-3" : "slide-in-from-left-3")}>
            {renderStep()}
            {stepError && <p role="alert" className="mt-3 text-sm text-rose-300">{stepError}</p>}
          </div>

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {skippable && (
              <Button type="button" variant="ghost" size="lg" onClick={() => skip(stepId as keyof FormData)}>Pular</Button>
            )}
            {stepId === "review" ? (
              <Button type="submit" variant="primary" size="lg" loading={sending} disabled={Boolean(reviewError)}>
                <Send />
                {sending ? "Enviando…" : "Enviar feedback"}
              </Button>
            ) : showContinue ? (
              <Button type="submit" variant="primary" size="lg">{editingFromReview ? "Salvar" : "Continuar"}</Button>
            ) : null}
          </div>
        </form>
      </Surface>
      {stepId === "week" && lastSent && (
        <p className="mt-3 px-1 text-center text-xs leading-5 text-zinc-500" aria-live="polite">
          {lastSent.weekStart === week.start
            ? `Essa semana já tem feedback, enviado em ${formatDateTime(lastSent.submittedAt)} por ${lastSent.responsible}.`
            : `Último feedback enviado em ${formatDateTime(lastSent.submittedAt)} por ${lastSent.responsible}, semana de ${shortRange(lastSent.weekStart, lastSent.weekEnd)}.`}
        </p>
      )}
    </div>
  );

  return <AppLayout>{content}</AppLayout>;
}

type LeadsSuggestion = { total: number };

/** Soma, no período, o que a Dashboard mostra como entrada de leads: conversas iniciadas + leads Meta. */
async function fetchLeadsSuggestion(clientId: string, start: string, end: string, token: string): Promise<LeadsSuggestion | null> {
  const qs = buildClientMetricsQuery(start, end, clientId);
  if (!qs) return null;
  const response = await fetch(`/api/metrics/daily?${qs}`, { headers: { Authorization: `Bearer ${token}` }, credentials: "same-origin" });
  if (!response.ok) return null;
  const data = (await response.json()) as { configured?: boolean; rows?: Record<string, unknown>[] };
  if (data.configured === false || !Array.isArray(data.rows) || data.rows.length === 0) return null;
  const sum = (key: string) => data.rows!.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  return { total: Math.round(sum("total_conversas_iniciadas") + sum("total_leads_meta")) };
}

/** "19 a 25/09" a partir de datas AAAA-MM-DD. */
function shortRange(start: string, end: string) {
  const [, sm, sd] = start.split("-");
  const [, em, ed] = end.split("-");
  return sm === em ? `${sd} a ${ed}/${em}` : `${sd}/${sm} a ${ed}/${em}`;
}
