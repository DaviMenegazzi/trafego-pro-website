import { Button, EmptyState, IconButton, Input, MenuButton, SegmentedControl, StatusBadge, Surface } from "@/components/ds";
import { formatPhone } from "@/lib/format";
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
import { TALENT_STATUS_CONFIG, TALENT_STATUS_TONE as STATUS_TONE } from "./types";
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

  const statusOptions = [
    { value: "all", label: "Todos", count: counts.all },
    ...(Object.keys(TALENT_STATUS_CONFIG) as TalentSubmissionStatus[]).map((key) => ({ value: key, label: TALENT_STATUS_CONFIG[key].label, count: counts[key] ?? 0 })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:max-w-sm">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" aria-label="Buscar candidato" leading={<Search />} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Atualizar lista" icon={<RefreshCw className={loading ? "animate-spin" : undefined} />} onClick={onRefresh} />
          <MenuButton
            label="Exportar"
            icon={<Download />}
            disabled={candidates.length === 0}
            items={[{ label: "Planilha de candidatos", hint: "Todas as respostas e anotações", icon: <FileText />, onSelect: exportXlsx }]}
          />
        </div>
      </div>
      <SegmentedControl aria-label="Etapa" value={selectedStatus} onValueChange={setSelectedStatus} options={statusOptions} className="max-w-full" />

      {filteredCandidates.length === 0 ? (
        <Surface>
          <EmptyState
            icon={<Users />}
            title="Nenhum candidato encontrado"
            description={search || selectedStatus !== "all" ? "Nenhum candidato corresponde aos filtros." : "Quando alguém enviar o formulário público, a candidatura aparece aqui."}
            action={search || selectedStatus !== "all" ? <Button size="sm" onClick={() => { setSearch(""); setSelectedStatus("all"); }}>Limpar filtros</Button> : undefined}
          />
        </Surface>
      ) : (
        <Surface as="div" className="divide-y divide-white/[0.05] overflow-hidden">
          {filteredCandidates.map((c) => {
            const st = TALENT_STATUS_CONFIG[c.status] || TALENT_STATUS_CONFIG.novo;
            const displayName = resolveCandidateDisplayName(c, form);
            const displayEmail = resolveCandidateDisplayEmail(c);
            const displayPhone = resolveCandidateDisplayPhone(c);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCandidate(c)}
                className="flex w-full items-center gap-3.5 px-4 py-3 text-left outline-none transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.05]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-semibold text-zinc-200">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-100">{displayName}</span>
                    {c.attachments && c.attachments.length > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-zinc-500"><FileText className="size-3.5" />currículo</span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                    {[displayEmail, displayPhone ? formatPhone(displayPhone) : null, formatDate(c.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <StatusBadge tone={STATUS_TONE[c.status] ?? "neutral"}>{st.label}</StatusBadge>
                <ChevronRight className="size-4 shrink-0 text-zinc-600" />
              </button>
            );
          })}
        </Surface>
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
