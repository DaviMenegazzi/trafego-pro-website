import { Tooltip } from "@/components/ds";
import { useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Hash,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
  submission: FormSubmission;
  unitName?: string;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}

export function FormSubmissionDetailModal({
  submission,
  unitName,
  onClose,
  onDelete,
}: FormSubmissionDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayName = resolveSubmissionDisplayName(submission);
  const displayPhone = resolveSubmissionPhone(submission);
  const displayEmail = resolveSubmissionEmail(submission);
  const whatsAppLink = displayPhone ? getWhatsAppLink(displayPhone, displayName) : "";

  const copyDataAsText = async () => {
    try {
      const lines = [
        `=== SUBMISSÃO FORMULÁRIO ===`,
        `Contato: ${displayName}`,
        `Formulário: ${submission.formName}`,
        `Unidade: ${unitName || submission.clientId}`,
        `Data: ${formatSubmissionDate(submission.submittedAt)}`,
        ``,
        `--- DADOS DO FORMULÁRIO ---`,
        ...Object.entries(submission.fields).map(
          ([k, v]) => `${formatFieldLabel(k)}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}`
        ),
      ];

      if (submission.metadata) {
        lines.push(``, `--- RASTREAMENTO (UTM / ORIGEM) ---`);
        for (const [k, v] of Object.entries(submission.metadata)) {
          if (v) lines.push(`${k}: ${String(v)}`);
        }
      }

      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      toast.success("Dados copiados para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar os dados");
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(submission.id);
      toast.success("Submissão excluída com sucesso");
      onClose();
    } catch {
      toast.error("Erro ao excluir submissão");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card flex flex-col max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-6 bg-zinc-900/50">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-display font-bold text-lg shrink-0 shadow-inner">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-zinc-100 truncate">
                  {displayName}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  {submission.formName}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-300 border border-white/10">
                  <Building2 className="size-3 text-zinc-400" />
                  {unitName || submission.clientId}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                <Calendar className="size-3 text-zinc-500" />
                Recebido em {formatSubmissionDate(submission.submittedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Tooltip content={"Copiar resumo textual"}>
              <button
              type="button"
              onClick={copyDataAsText}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition" aria-label={"Copiar resumo textual"}
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            </Tooltip>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Quick Contact Bar */}
        {(displayPhone || displayEmail) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-zinc-900/30 px-6 py-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {displayPhone && (
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Phone className="size-3.5 text-emerald-400" />
                  <span className="font-mono">{displayPhone}</span>
                </div>
              )}
              {displayEmail && (
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Mail className="size-3.5 text-sky-400" />
                  <span>{displayEmail}</span>
                </div>
              )}
            </div>

            {whatsAppLink && (
              <a
                href={whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition shadow-sm active:scale-95"
              >
                <MessageCircle className="size-3.5" />
                Conversar no WhatsApp
                <ExternalLink className="size-3 opacity-70" />
              </a>
            )}
          </div>
        )}

        {/* Modal Body: Dynamic Fields & Metadata */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section: Dynamic Form Fields */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Tag className="size-3.5 text-emerald-400" />
              Campos Preenchidos no Formulário ({Object.keys(submission.fields).length})
            </h4>

            {Object.keys(submission.fields).length === 0 ? (
              <p className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-zinc-500">
                Nenhum campo registrado.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(submission.fields).map(([rawKey, value]) => {
                  const label = formatFieldLabel(rawKey);
                  const isLongText = typeof value === "string" && value.length > 80;

                  return (
                    <div
                      key={rawKey}
                      className={`rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/20 ${
                        isLongText ? "md:col-span-2" : ""
                      }`}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">
                        {label}
                      </span>

                      {/* Render based on data type */}
                      {value === null || value === undefined || value === "" ? (
                        <span className="text-xs italic text-zinc-600">Não preenchido</span>
                      ) : typeof value === "boolean" ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            value
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {value ? "Sim" : "Não"}
                        </span>
                      ) : Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {value.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-200"
                            >
                              {String(item)}
                            </span>
                          ))}
                        </div>
                      ) : typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://")) ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1 break-all"
                        >
                          {value}
                          <ExternalLink className="size-3 inline shrink-0" />
                        </a>
                      ) : isLongText ? (
                        <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                          {String(value)}
                        </p>
                      ) : (
                        <span className="text-sm font-medium text-zinc-100 break-words">
                          {String(value)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Tracking & Origin Metadata */}
          {submission.metadata && Object.keys(submission.metadata).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                <Globe className="size-3.5 text-sky-400" />
                Rastreamento e Origem (UTMs)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.entries(submission.metadata).map(([metaKey, metaVal]) => (
                  <div
                    key={metaKey}
                    className="rounded-xl border border-white/5 bg-white/[0.015] p-3"
                  >
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
                      {metaKey}
                    </span>
                    <span className="text-xs font-medium text-zinc-200 truncate block mt-0.5" title={String(metaVal)}>
                      {String(metaVal || "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Technical Audit */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-4 text-xs text-zinc-500 space-y-1.5 font-mono">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-sans font-medium uppercase tracking-wider mb-2">
              <ShieldCheck className="size-3.5 text-zinc-400" />
              Auditoria de Segurança
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>ID Submissão: <span className="text-zinc-300">{submission.id}</span></div>
              <div>ID Formulário: <span className="text-zinc-300">{submission.formKeyId}</span></div>
              <div>Unidade (clientId): <span className="text-zinc-300">{submission.clientId}</span></div>
              <div>Hash de IP: <span className="text-zinc-300">{submission.ipHash ? `${submission.ipHash.slice(0, 16)}...` : "Não registrado"}</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 p-4 bg-zinc-900/50">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-medium">Tem certeza?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-xl bg-red-500 hover:bg-red-600 px-3 py-1 text-xs font-semibold text-white transition"
                >
                  {deleting ? "Excluindo..." : "Sim, excluir"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              onDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition"
                >
                  <Trash2 className="size-3.5" />
                  Excluir registro
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white hover:bg-zinc-200 px-5 py-2 text-xs font-semibold text-zinc-950 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
