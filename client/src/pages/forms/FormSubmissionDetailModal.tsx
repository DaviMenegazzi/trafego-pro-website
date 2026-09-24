import { useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, IconButton, Sheet, useConfirm } from "@/components/ds";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { FormSubmission } from "./formTypes";
import {
  formatFieldLabel,
  formatSubmissionDate,
  getWhatsAppLink,
  resolveSubmissionDisplayName,
  resolveSubmissionEmail,
  resolveSubmissionPhone,
} from "./formHelpers";

interface FormSubmissionDetailModalProps {
  submission: FormSubmission | null;
  unitName?: string;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}

const UTM_LABELS: Record<string, string> = {
  utm_source: "Origem (utm_source)",
  utm_medium: "Mídia (utm_medium)",
  utm_campaign: "Campanha (utm_campaign)",
  utm_content: "Conteúdo (utm_content)",
  utm_term: "Termo (utm_term)",
  source_url: "Página",
  page: "Página",
  landing_page: "Página",
  referrer: "Página anterior",
};

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-zinc-500">Não preenchido</span>;
  if (typeof value === "boolean") return <span>{value ? "Sim" : "Não"}</span>;
  if (Array.isArray(value)) return <span>{value.map(String).join(", ")}</span>;
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-emerald-300 hover:underline">
        {value}
        <ExternalLink className="size-3 shrink-0" />
      </a>
    );
  }
  if (typeof value === "object") return <span className="break-all font-mono text-xs">{JSON.stringify(value)}</span>;
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

function DefinitionList({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-white/5 rounded-lg border border-white/10">
      {rows.map(([label, value], index) => (
        <div key={`${label}-${index}`} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
          <dt className="text-sm text-zinc-400">{label}</dt>
          <dd className="min-w-0 text-sm text-zinc-100">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Detalhe de uma submissão em gaveta lateral: a lista continua visível atrás. */
export function FormSubmissionDetailModal({ submission, unitName, onClose, onDelete }: FormSubmissionDetailModalProps) {
  const { confirm } = useConfirm();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!submission) return <Sheet open={false} onOpenChange={() => onClose()} title="Submissão">{null}</Sheet>;

  const displayName = resolveSubmissionDisplayName(submission);
  const displayPhone = resolveSubmissionPhone(submission);
  const displayEmail = resolveSubmissionEmail(submission);
  const whatsAppLink = displayPhone ? getWhatsAppLink(displayPhone, displayName) : "";
  const metadata = Object.entries(submission.metadata ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== "");

  const copyDataAsText = async () => {
    try {
      const lines = [
        `Contato: ${displayName}`,
        `Formulário: ${submission.formName}`,
        `Unidade: ${unitName || submission.clientId}`,
        `Recebido em: ${formatSubmissionDate(submission.submittedAt)}`,
        "",
        ...Object.entries(submission.fields).map(
          ([k, v]) => `${formatFieldLabel(k)}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}`
        ),
      ];
      if (metadata.length) {
        lines.push("", "Origem:");
        for (const [k, v] of metadata) lines.push(`${UTM_LABELS[k] ?? formatFieldLabel(k)}: ${String(v)}`);
      }
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      toast.success("Dados copiados");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar os dados");
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const ok = await confirm({
      title: "Excluir esta submissão?",
      description: `Os dados de ${displayName} serão apagados e não podem ser recuperados.`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await onDelete(submission.id);
      toast.success("Submissão excluída");
      onClose();
    } catch {
      toast.error("Não foi possível excluir a submissão");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={displayName}
      description={`${submission.formName} · ${unitName || submission.clientId} · ${formatDateTime(submission.submittedAt)}`}
      footer={
        <>
          {onDelete && (
            <Button variant="danger-ghost" className="sm:mr-auto" loading={deleting} onClick={() => void handleDelete()}>
              <Trash2 />
              Excluir
            </Button>
          )}
          {whatsAppLink && (
            <Button asChild variant="primary">
              <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                Conversar no WhatsApp
              </a>
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-300">
          {displayPhone && <span className="tabular-nums">{formatPhone(displayPhone)}</span>}
          {displayEmail && <a href={`mailto:${displayEmail}`} className="hover:underline">{displayEmail}</a>}
          <IconButton
            label={copied ? "Copiado" : "Copiar dados"}
            variant="ghost"
            size="sm"
            className="ml-auto"
            icon={copied ? <Check className="text-emerald-400" /> : <Copy />}
            onClick={() => void copyDataAsText()}
          />
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-200">Respostas</h3>
          {Object.keys(submission.fields).length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum campo registrado.</p>
          ) : (
            <DefinitionList rows={Object.entries(submission.fields).map(([k, v]) => [formatFieldLabel(k), <FieldValue value={v} />])} />
          )}
        </section>

        {metadata.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-200">Origem</h3>
            <DefinitionList rows={metadata.map(([k, v]) => [UTM_LABELS[k] ?? formatFieldLabel(k), <FieldValue value={v} />])} />
          </section>
        )}
      </div>
    </Sheet>
  );
}
