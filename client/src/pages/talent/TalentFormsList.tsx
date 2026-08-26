import { useState, useMemo } from "react";
import {
  Plus,
  FileText,
  Users,
  Eye,
  Copy,
  Check,
  Globe,
  Settings2,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Layers,
  Search,
  Trash2,
  Loader2,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { TalentForm, Unit } from "./types";

interface TalentFormsListProps {
  unit: Unit | null;
  forms: TalentForm[];
  loading?: boolean;
  onSelectForm: (form: TalentForm, initialTab?: "builder" | "candidates") => void;
  onCreateForm: (title: string) => Promise<void>;
  onDeleteForm: (formId: string) => Promise<void>;
}

export function TalentFormsList({
  unit,
  forms,
  loading = false,
  onSelectForm,
  onCreateForm,
  onDeleteForm,
}: TalentFormsListProps) {
  const [search, setSearch] = useState("");
  const [filterPublished, setFilterPublished] = useState<"all" | "published" | "draft">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<TalentForm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      if (filterPublished === "published" && !f.isPublished) return false;
      if (filterPublished === "draft" && f.isPublished) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.subtitle.toLowerCase().includes(q) ||
        f.publicSlug.toLowerCase().includes(q)
      );
    });
  }, [forms, filterPublished, search]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Informe o nome do formulário");
      return;
    }
    setCreating(true);
    try {
      await onCreateForm(newTitle.trim());
      setIsCreateOpen(false);
      setNewTitle("");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/trabalhe-conosco/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Link público copiado!");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDeleteConfirmed = async () => {
    if (!formToDelete) return;
    setDeleting(true);
    try {
      await onDeleteForm(formToDelete.id);
      setFormToDelete(null);
      toast.success("Formulário excluído com sucesso!");
    } catch {
      toast.error("Falha ao excluir formulário");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Unit Overview Card & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              {unit?.name || "Unidade Selecionada"}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {forms.length} {forms.length === 1 ? "formulário ativo" : "formulários ativos"}
            </span>
          </div>
          <h2 className="mt-2 font-display text-xl font-bold text-zinc-100">
            Formulários de Recrutamento
          </h2>
          <p className="mt-1 text-xs text-zinc-400 max-w-xl leading-relaxed">
            Gerencie todas as vagas e oportunidades da sua unidade. Crie formulários personalizados com perguntas sob medida e receba candidaturas organizadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewTitle(`Trabalhe Conosco — Vaga ${forms.length + 1}`);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-950/40 transition shrink-0"
        >
          <Plus className="size-4 stroke-[2.5]" />
          Criar Novo Formulário
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar formulário por título ou vaga..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-zinc-950/60 p-1">
          <button
            type="button"
            onClick={() => setFilterPublished("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filterPublished === "all"
                ? "bg-white/15 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Todos ({forms.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterPublished("published")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filterPublished === "published"
                ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Publicados
          </button>
          <button
            type="button"
            onClick={() => setFilterPublished("draft")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filterPublished === "draft"
                ? "bg-amber-500/20 text-amber-300 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Rascunhos
          </button>
        </div>
      </div>

      {/* Loading Skeleton Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-white/5 bg-zinc-900/30 p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 rounded-full bg-white/10" />
                <div className="h-4 w-16 rounded bg-white/5" />
              </div>
              <div className="h-6 w-3/4 rounded bg-white/10" />
              <div className="h-4 w-full rounded bg-white/5" />
              <div className="h-4 w-2/3 rounded bg-white/5" />
              <div className="pt-4 border-t border-white/5 flex gap-2">
                <div className="h-9 flex-1 rounded-xl bg-white/10" />
                <div className="h-9 flex-1 rounded-xl bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
          <FileText className="mx-auto size-9 text-zinc-600 mb-3" />
          <h3 className="text-base font-medium text-zinc-300">
            Nenhum formulário encontrado
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            {search || filterPublished !== "all"
              ? "Nenhum formulário corresponde aos filtros de busca."
              : "Comece criando o primeiro formulário de recrutamento para esta unidade."}
          </p>
          <button
            type="button"
            onClick={() => {
              setNewTitle(`Trabalhe Conosco — ${unit?.name || "Vaga"}`);
              setIsCreateOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition"
          >
            <Plus className="size-3.5" />
            Criar Primeiro Formulário
          </button>
        </div>
      ) : (
        /* Forms Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((f) => {
            const publicUrl = `${window.location.origin}/trabalhe-conosco/${f.publicSlug}`;
            return (
              <div
                key={f.id}
                onClick={() => onSelectForm(f, "builder")}
                className="group flex flex-col justify-between rounded-3xl border border-white/10 bg-zinc-900/40 p-5 hover:border-emerald-500/40 hover:bg-zinc-900/80 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-emerald-950/20"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                        f.isPublished
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          f.isPublished ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      {f.isPublished ? "Publicado" : "Rascunho"}
                    </span>

                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                        <Layers className="size-3" />
                        {f.fields.length} {f.fields.length === 1 ? "campo" : "campos"}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-mono font-medium">
                        <Users className="size-3" />
                        {f.candidateCount ?? 0}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormToDelete(f);
                        }}
                        className="rounded-lg p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"
                        title="Excluir formulário"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    {f.bannerUrl && (
                      <img
                        src={f.bannerUrl}
                        alt="Logo"
                        className="size-9 rounded-xl object-contain bg-white/5 border border-white/10 p-1 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-base text-zinc-100 group-hover:text-emerald-300 transition line-clamp-2">
                        {f.title}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {f.subtitle || "Sem descrição informada."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Bottom / Actions */}
                <div className="mt-5 border-t border-white/5 pt-4 space-y-3">
                  {/* Public Slug preview & copy */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-950/60 px-3 py-1.5 text-[11px] text-zinc-400 border border-white/5">
                    <span className="truncate font-mono text-[10px] text-zinc-500">
                      /trabalhe-conosco/{f.publicSlug}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(f.publicSlug, e)}
                      className="rounded p-1 text-zinc-400 hover:text-white transition shrink-0"
                      title="Copiar link"
                    >
                      {copiedSlug === f.publicSlug ? (
                        <Check className="size-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Primary Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectForm(f, "candidates");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <Users className="size-3.5 text-emerald-400" />
                      <span>Candidatos</span>
                      <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                        {f.candidateCount ?? 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectForm(f, "builder");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition"
                    >
                      <Settings2 className="size-3.5" />
                      <span>Editar Form</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create New Form */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-4"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-zinc-100">
                Criar Novo Formulário
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Defina o nome da vaga ou oportunidade para a unidade {unit?.name}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Nome da Vaga / Formulário *
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Trabalhe Conosco — Atendente Comercial"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
              >
                {creating ? "Criando..." : "Criar Formulário"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Dialog: Delete Form */}
      {formToDelete && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-zinc-100">
                  Excluir Formulário?
                </h3>
                <p className="text-xs text-zinc-400">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Você está prestes a excluir o formulário <strong>"{formToDelete.title}"</strong> e todas as candidaturas vinculadas a ele.
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setFormToDelete(null)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition"
              >
                {deleting ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
