import { useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Download,
  MessageCircle,
  Save,
  Loader2,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  Paperclip,
  Building2,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TalentField,
  TalentFieldOption,
  TalentForm,
  TalentSubmission,
  TalentSubmissionStatus,
} from "./types";
import { TALENT_STATUS_CONFIG } from "./types";
import {
  resolveCandidateDisplayName,
  resolveCandidateDisplayEmail,
  resolveCandidateDisplayPhone,
} from "./talentHelpers";

interface TalentCandidateDetailModalProps {
  candidate: TalentSubmission;
  form: TalentForm;
  onClose: () => void;
  onStatusChange: (candidateId: string, newStatus: TalentSubmissionStatus) => Promise<void>;
  onSaveNotes: (candidateId: string, notes: string) => Promise<void>;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
}

export function TalentCandidateDetailModal({
  candidate,
  form,
  onClose,
  onStatusChange,
  onSaveNotes,
}: TalentCandidateDetailModalProps) {
  const [notes, setNotes] = useState(candidate.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [loadingAttachment, setLoadingAttachment] = useState<number | null>(null);

  const displayName = resolveCandidateDisplayName(candidate, form);
  const displayEmail = resolveCandidateDisplayEmail(candidate);
  const displayPhone = resolveCandidateDisplayPhone(candidate);

  const statusConfig = TALENT_STATUS_CONFIG[candidate.status] || TALENT_STATUS_CONFIG.novo;

  const handleStatusUpdate = async (status: TalentSubmissionStatus) => {
    if (status === candidate.status) return;
    setChangingStatus(true);
    try {
      await onStatusChange(candidate.id, status);
      toast.success(`Status alterado para "${TALENT_STATUS_CONFIG[status].label}"`);
    } catch {
      toast.error("Não foi possível alterar o status");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleNotesSubmit = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(candidate.id, notes);
      toast.success("Anotações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar anotações");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDownloadAttachment = async (index: number) => {
    setLoadingAttachment(index);
    try {
      const token = localStorage.getItem("tp_token") ?? "";
      const res = await fetch(
        `/api/talent/admin/submissions/${candidate.id}/attachments/${index}?client_id=${candidate.clientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Falha ao assinar link do anexo");
      }
      window.open(data.url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir currículo");
    } finally {
      setLoadingAttachment(null);
    }
  };

  const formatAnswerValue = (value: unknown, field?: TalentField): React.ReactNode => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-zinc-600 italic">Não informado</span>;
    }

    const getOptionLabel = (val: string): string => {
      if (!field || !field.options || field.options.length === 0) return val;
      const match = field.options.find((opt) => opt.value === val || opt.label === val);
      return match ? match.label : val;
    };

    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {value.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
            >
              {getOptionLabel(String(item))}
            </span>
          ))}
        </div>
      );
    }
    if (typeof value === "boolean") {
      return value ? (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
          <Check className="size-3.5" /> Sim
        </span>
      ) : (
        <span className="text-zinc-500 text-xs">Não</span>
      );
    }

    const strVal = String(value);
    const friendlyText = getOptionLabel(strVal);

    return <span className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{friendlyText}</span>;
  };

  // Map answers to fields for nice structured display
  const structuredFields = form.fields.map((f) => {
    const rawVal = candidate.answers ? candidate.answers[f.fieldKey] : undefined;
    return {
      field: f,
      value: rawVal,
    };
  });

  // Also collect any extra keys present in answers not in current form fields
  const definedKeys = new Set(form.fields.map((f) => f.fieldKey));
  const extraAnswers = candidate.answers
    ? Object.entries(candidate.answers).filter(([k]) => !definedKeys.has(k))
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden">
      <div className="flex flex-col w-full max-w-4xl max-h-[94vh] rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 bg-zinc-900/60 p-5 sm:p-6 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-display font-bold text-lg shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-zinc-100 truncate">
                  {displayName}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border shrink-0 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                >
                  <span className={`size-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-zinc-500" />
                  Inscrito em {formatDate(candidate.createdAt)}
                </span>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span className="text-zinc-400 truncate">Vaga: {form.title}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {displayPhone && (
              <a
                href={`https://wa.me/${cleanPhoneForWhatsApp(displayPhone)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition"
              >
                <MessageCircle className="size-3.5 fill-current" />
                <span>WhatsApp</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              title="Fechar visualizador"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Status Funnel Selector Bar */}
        <div className="border-b border-white/5 bg-zinc-900/40 px-5 sm:px-6 py-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 shrink-0">
              Etapa do Funil:
            </span>

            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(Object.keys(TALENT_STATUS_CONFIG) as TalentSubmissionStatus[]).map((st) => {
                const cfg = TALENT_STATUS_CONFIG[st];
                const isActive = candidate.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={changingStatus}
                    onClick={() => handleStatusUpdate(st)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition border ${
                      isActive
                        ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-md`
                        : "border-white/5 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick Contact & Attachments Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Email Card */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-3.5">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
                <Mail className="size-3.5 text-emerald-400" />
                <span>E-mail</span>
              </div>
              {displayEmail ? (
                <a
                  href={`mailto:${displayEmail}`}
                  className="font-medium text-xs text-zinc-200 hover:text-emerald-400 transition truncate block"
                >
                  {displayEmail}
                </a>
              ) : (
                <span className="text-xs text-zinc-600 italic">Não informado</span>
              )}
            </div>

            {/* Phone Card */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-3.5">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
                <Phone className="size-3.5 text-emerald-400" />
                <span>Telefone</span>
              </div>
              {displayPhone ? (
                <span className="font-medium text-xs text-zinc-200 truncate block">
                  {displayPhone}
                </span>
              ) : (
                <span className="text-xs text-zinc-600 italic">Não informado</span>
              )}
            </div>

            {/* Attachments / Resume Card */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3.5 sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <Paperclip className="size-3.5" />
                  <span>Currículo / Anexo</span>
                </div>
                {candidate.attachments && candidate.attachments.length > 0 && (
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono text-emerald-300">
                    {candidate.attachments.length}
                  </span>
                )}
              </div>

              {candidate.attachments && candidate.attachments.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {candidate.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-zinc-200">
                        {att.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(idx)}
                        disabled={loadingAttachment === idx}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-emerald-400 transition shrink-0"
                      >
                        {loadingAttachment === idx ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Download className="size-3" />
                        )}
                        <span>Baixar</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-500 italic mt-1">Nenhum anexo enviado</span>
              )}
            </div>
          </div>

          {/* Form Questions & Answers Section */}
          <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-emerald-400" />
                <h3 className="font-display text-sm font-semibold text-zinc-100">
                  Respostas Enviadas no Formulário
                </h3>
              </div>
              <span className="text-xs text-zinc-500">
                {structuredFields.length} {structuredFields.length === 1 ? "pergunta" : "perguntas"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {structuredFields.map(({ field, value }) => (
                <div
                  key={field.fieldKey}
                  className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4 transition hover:border-white/10"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-zinc-300">
                      {field.label}
                    </span>
                    {field.isRequired && (
                      <span className="text-[10px] text-emerald-400/80 font-mono">
                        * obrigatório
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-normal">
                    {formatAnswerValue(value, field)}
                  </div>
                </div>
              ))}

              {extraAnswers.length > 0 &&
                extraAnswers.map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4"
                  >
                    <span className="block text-xs font-semibold text-zinc-400 capitalize mb-1">
                      {k.replace(/_/g, " ")}
                    </span>
                    <div className="text-sm">{formatAnswerValue(v)}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Recruitment Internal Notes Section */}
          <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <h3 className="font-display text-sm font-semibold text-zinc-100">
                  Anotações Internas do Recrutador
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500">
                Visível apenas para administradores
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Registre detalhes de entrevistas, impressões, pretensão salarial acordada ou motivos de avanço/reprovação.
            </p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Digite suas observações sobre este candidato aqui..."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-3.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none transition leading-relaxed"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNotesSubmit}
                disabled={savingNotes}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/20 hover:text-white transition disabled:opacity-50"
              >
                {savingNotes ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    <span>Salvar Anotações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-zinc-900/60 p-4 px-6 shrink-0">
          <div className="text-xs text-zinc-500">
            ID: <span className="font-mono text-zinc-400">{candidate.id.slice(0, 12)}...</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
