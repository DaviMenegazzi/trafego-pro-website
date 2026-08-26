import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  Search,
  Users,
  RefreshCw,
  FileText,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type {
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
import { TalentCandidateDetailModal } from "./TalentCandidateDetailModal";

interface TalentCandidatesListProps {
  form: TalentForm;
  candidates: TalentSubmission[];
  loading: boolean;
  onRefresh: () => void;
  onStatusChange: (candidateId: string, newStatus: TalentSubmissionStatus) => Promise<void>;
  onSaveNotes: (candidateId: string, notes: string) => Promise<void>;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function TalentCandidatesList({
  form,
  candidates,
  loading,
  onRefresh,
  onStatusChange,
  onSaveNotes,
}: TalentCandidatesListProps) {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<TalentSubmission | null>(null);

  // Status counters
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: candidates.length,
      novo: 0,
      em_analise: 0,
      entrevista: 0,
      aprovado: 0,
      reprovado: 0,
      banco: 0,
    };
    candidates.forEach((c) => {
      if (map[c.status] !== undefined) map[c.status]++;
    });
    return map;
  }, [candidates]);

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
      if (!matchesStatus) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = resolveCandidateDisplayName(c, form).toLowerCase();
      const email = (resolveCandidateDisplayEmail(c) || "").toLowerCase();
      const phone = (resolveCandidateDisplayPhone(c) || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [candidates, selectedStatus, search, form]);

  // Export XLSX
  const exportXlsx = () => {
    if (candidates.length === 0) {
      toast.error("Não há candidatos para exportar");
      return;
    }
    const rows = candidates.map((c) => ({
      Data: new Date(c.createdAt).toLocaleString("pt-BR"),
      Nome: resolveCandidateDisplayName(c, form),
      Email: resolveCandidateDisplayEmail(c) ?? "",
      Telefone: resolveCandidateDisplayPhone(c) ?? "",
      Status: TALENT_STATUS_CONFIG[c.status]?.label ?? c.status,
      "Possui Currículo": c.attachments && c.attachments.length > 0 ? "Sim" : "Não",
      "Anotações do Recrutador": c.notes ?? "",
      ...Object.fromEntries(
        form.fields.map((f) => {
          const raw = c.answers[f.fieldKey];
          const mapVal = (v: unknown): string => {
            const str = String(v ?? "");
            const match = f.options?.find((opt) => opt.value === str || opt.label === str);
            return match ? match.label : str;
          };
          const valText = Array.isArray(raw)
            ? raw.map(mapVal).join(", ")
            : mapVal(raw);
          return [f.label, valText];
        })
      ),
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Candidatos");
    XLSX.writeFile(
      book,
      `candidatos-${form.title.replace(/\W+/g, "-")}.xlsx`
    );
    toast.success("Planilha XLSX gerada com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setSelectedStatus("all")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            selectedStatus === "all"
              ? "border-white/30 bg-white/10 shadow-lg"
              : "border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60"
          }`}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Total Inscritos
          </span>
          <div className="mt-1 text-2xl font-bold text-zinc-100">
            {counts.all}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus("novo")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            selectedStatus === "novo"
              ? "border-blue-500/50 bg-blue-500/15 shadow-lg"
              : "border-white/5 bg-zinc-900/40 hover:border-blue-500/30 hover:bg-zinc-900/60"
          }`}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-blue-400">
            Novos
          </span>
          <div className="mt-1 text-2xl font-bold text-blue-300">
            {counts.novo}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus("em_analise")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            selectedStatus === "em_analise"
              ? "border-amber-500/50 bg-amber-500/15 shadow-lg"
              : "border-white/5 bg-zinc-900/40 hover:border-amber-500/30 hover:bg-zinc-900/60"
          }`}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
            Em Análise
          </span>
          <div className="mt-1 text-2xl font-bold text-amber-300">
            {counts.em_analise}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus("entrevista")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            selectedStatus === "entrevista"
              ? "border-purple-500/50 bg-purple-500/15 shadow-lg"
              : "border-white/5 bg-zinc-900/40 hover:border-purple-500/30 hover:bg-zinc-900/60"
          }`}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-purple-400">
            Entrevista
          </span>
          <div className="mt-1 text-2xl font-bold text-purple-300">
            {counts.entrevista}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus("aprovado")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            selectedStatus === "aprovado"
              ? "border-emerald-500/50 bg-emerald-500/15 shadow-lg"
              : "border-white/5 bg-zinc-900/40 hover:border-emerald-500/30 hover:bg-zinc-900/60"
          }`}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
            Aprovados
          </span>
          <div className="mt-1 text-2xl font-bold text-emerald-300">
            {counts.aprovado}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus("banco")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            selectedStatus === "banco"
              ? "border-zinc-500/50 bg-zinc-500/15 shadow-lg"
              : "border-white/5 bg-zinc-900/40 hover:border-zinc-500/30 hover:bg-zinc-900/60"
          }`}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            Banco
          </span>
          <div className="mt-1 text-2xl font-bold text-zinc-300">
            {counts.banco}
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar candidato por nome, e-mail ou telefone..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none transition"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            title="Atualizar lista"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={exportXlsx}
            disabled={candidates.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 transition shrink-0"
          >
            <Download className="size-3.5 stroke-[2.5]" />
            Exportar XLSX
          </button>
        </div>
      </div>

      {/* Candidates List / Cards */}
      {filteredCandidates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
          <Users className="mx-auto size-9 text-zinc-600 mb-3" />
          <h3 className="text-base font-medium text-zinc-300">
            Nenhum candidato encontrado
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            {search || selectedStatus !== "all"
              ? "Nenhum candidato corresponde aos filtros aplicados."
              : "Assim que os candidatos enviarem o formulário público, eles aparecerão organizados aqui."}
          </p>
          {(search || selectedStatus !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedStatus("all");
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 transition"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCandidates.map((c) => {
            const st = TALENT_STATUS_CONFIG[c.status] || TALENT_STATUS_CONFIG.novo;
            const displayName = resolveCandidateDisplayName(c, form);
            const displayEmail = resolveCandidateDisplayEmail(c);
            const displayPhone = resolveCandidateDisplayPhone(c);

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCandidate(c)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-4 hover:border-emerald-500/40 hover:bg-zinc-900/80 cursor-pointer transition-all duration-200 shadow-sm"
              >
                {/* Candidate Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-display font-semibold text-sm shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-emerald-300 transition">
                        {displayName}
                      </h4>
                      {c.attachments && c.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                          <FileText className="size-3" />
                          Currículo
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                      {displayEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3 text-zinc-500" />
                          {displayEmail}
                        </span>
                      )}
                      {displayPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3 text-zinc-500" />
                          {displayPhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Calendar className="size-3 text-zinc-600" />
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status and Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${st.bg} ${st.text} ${st.border}`}
                  >
                    <span className={`size-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 group-hover:bg-emerald-500 group-hover:text-zinc-950 group-hover:border-emerald-400 transition"
                  >
                    <span>Ver Respostas</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <TalentCandidateDetailModal
          candidate={selectedCandidate}
          form={form}
          onClose={() => setSelectedCandidate(null)}
          onStatusChange={async (candidateId, newStatus) => {
            await onStatusChange(candidateId, newStatus);
            setSelectedCandidate((prev) =>
              prev && prev.id === candidateId ? { ...prev, status: newStatus } : prev
            );
          }}
          onSaveNotes={async (candidateId, notes) => {
            await onSaveNotes(candidateId, notes);
            setSelectedCandidate((prev) =>
              prev && prev.id === candidateId ? { ...prev, notes } : prev
            );
          }}
        />
      )}
    </div>
  );
}
