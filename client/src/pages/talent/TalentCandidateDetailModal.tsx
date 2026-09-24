import { Button, Dialog, Field, SegmentedControl, StatusBadge, Textarea } from "@/components/ds";
import { formatDateTime, formatPhone } from "@/lib/format";
import { useState } from "react";
import { Check, Download, Mail, MessageCircle, Paperclip } from "lucide-react";
import { toast } from "sonner";
import type {
  TalentField,
  TalentFieldOption,
  TalentForm,
  TalentSubmission,
  TalentSubmissionStatus,
} from "./types";
import { TALENT_STATUS_CONFIG, TALENT_STATUS_TONE } from "./types";
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
      toast.success("Anotações salvas");
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
      return <span className="text-zinc-500">Não informado</span>;
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
              className="inline-flex items-center rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-200"
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
  // Anexos aparecem na seção "Currículo"; a linha do campo diria "Não informado".
  const structuredFields = form.fields.filter((f) => f.fieldType !== "file").map((f) => {
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
    <Dialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="lg"
      title={displayName}
      description={`Inscrito em ${formatDateTime(candidate.createdAt)} · ${form.title}`}
      bodyClassName="space-y-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={TALENT_STATUS_TONE[candidate.status] ?? "neutral"}>{statusConfig.label}</StatusBadge>
        {displayPhone && (
          <Button asChild size="sm" variant="secondary">
            <a href={`https://wa.me/${cleanPhoneForWhatsApp(displayPhone)}`} target="_blank" rel="noreferrer">
              <MessageCircle />
              WhatsApp
            </a>
          </Button>
        )}
        {displayEmail && (
          <Button asChild size="sm" variant="ghost">
            <a href={`mailto:${displayEmail}`}>
              <Mail />
              <span className="max-w-[16rem] truncate">{displayEmail}</span>
            </a>
          </Button>
        )}
        {displayPhone && <span className="text-sm tabular-nums text-zinc-400">{formatPhone(displayPhone)}</span>}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-200">Etapa</h3>
        <SegmentedControl
          aria-label="Etapa do candidato"
          value={candidate.status}
          onValueChange={(st) => { if (!changingStatus) void handleStatusUpdate(st); }}
          options={(Object.keys(TALENT_STATUS_CONFIG) as TalentSubmissionStatus[]).map((st) => ({
            value: st,
            label: TALENT_STATUS_CONFIG[st].label,
            disabled: changingStatus && st !== candidate.status,
          }))}
          className="w-full"
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-200">Currículo</h3>
        {candidate.attachments && candidate.attachments.length > 0 ? (
          <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
            {candidate.attachments.map((att, idx) => (
              <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-zinc-200">
                  <Paperclip className="size-4 shrink-0 text-zinc-500" />
                  <span className="truncate">{att.fileName}</span>
                </span>
                <Button size="sm" variant="secondary" loading={loadingAttachment === idx} onClick={() => handleDownloadAttachment(idx)}>
                  <Download />
                  Abrir
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Nenhum anexo enviado.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-200">Respostas</h3>
        <dl className="divide-y divide-white/5 rounded-lg border border-white/10">
          {structuredFields.map(({ field, value }) => (
            <div key={field.fieldKey} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
              <dt className="text-sm text-zinc-400">{field.label}</dt>
              <dd className="text-sm">{formatAnswerValue(value, field)}</dd>
            </div>
          ))}
          {extraAnswers.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
              <dt className="text-sm capitalize text-zinc-400">{k.replace(/_/g, " ")}</dt>
              <dd className="text-sm">{formatAnswerValue(v)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2">
        <Field label="Anotações internas" htmlFor="candidate-notes" hint="Visível apenas para administradores. Registre entrevistas, impressões e motivos de avanço ou reprovação.">
          <Textarea id="candidate-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Observações sobre este candidato" />
        </Field>
        <div className="flex justify-end">
          <Button variant="secondary" loading={savingNotes} disabled={notes === (candidate.notes || "")} onClick={handleNotesSubmit}>
            Salvar anotações
          </Button>
        </div>
      </section>
    </Dialog>
  );
}
