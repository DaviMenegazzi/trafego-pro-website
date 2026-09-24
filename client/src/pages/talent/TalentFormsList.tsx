import { useState, useMemo } from "react";
import { Check, Copy, ExternalLink, FileText, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { ActionsMenu, Button, Dialog, EmptyState, Field, IconButton, Input, SegmentedControl, StatusBadge, Surface, useConfirm } from "@/components/ds";
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
  const { confirm } = useConfirm();

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

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/trabalhe-conosco/${slug}`;
    void navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Link público copiado.");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const askDelete = async (form: TalentForm) => {
    const ok = await confirm({
      title: `Excluir "${form.title}"?`,
      description: `O formulário e ${form.candidateCount ?? 0} candidatura(s) vinculadas serão apagados. Não dá para desfazer.`,
      tone: "danger",
      confirmLabel: "Excluir formulário",
    });
    if (!ok) return;
    try {
      await onDeleteForm(form.id);
      toast.success("Formulário excluído.");
    } catch {
      toast.error("Falha ao excluir formulário");
    }
  };

  const openCreate = () => {
    setNewTitle(`Trabalhe conosco — ${unit?.name ?? "vaga"}`);
    setIsCreateOpen(true);
  };

  const publishedCount = forms.filter((f) => f.isPublished).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:max-w-xs">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar formulário" aria-label="Buscar formulário" leading={<Search />} />
        </div>
        <SegmentedControl
          aria-label="Situação"
          value={filterPublished}
          onValueChange={setFilterPublished}
          options={[
            { value: "all", label: "Todos", count: forms.length },
            { value: "published", label: "Publicados", count: publishedCount },
            { value: "draft", label: "Rascunhos", count: forms.length - publishedCount },
          ]}
        />
        <Button variant="primary" className="sm:ml-auto" onClick={openCreate}>
          <Plus />
          Novo formulário
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Surface key={item} className="h-44 animate-pulse">{null}</Surface>
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        <Surface>
          <EmptyState
            icon={<FileText />}
            title={search || filterPublished !== "all" ? "Nenhum formulário com esses filtros" : "Nenhum formulário ainda"}
            description={search || filterPublished !== "all" ? undefined : "Crie o primeiro formulário de recrutamento desta unidade."}
            action={!search && filterPublished === "all" ? <Button variant="primary" size="sm" onClick={openCreate}><Plus />Novo formulário</Button> : undefined}
          />
        </Surface>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredForms.map((f) => (
            <Surface key={f.id} as="article" className="group relative flex flex-col overflow-hidden p-5 transition-all duration-200 hover:-translate-y-px hover:border-emerald-400/25">
              <span aria-hidden className={`pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r to-transparent ${f.isPublished ? "from-emerald-400/70" : "from-amber-400/60"}`} />
              <div className="flex items-start justify-between gap-3">
                <StatusBadge tone={f.isPublished ? "good" : "warning"}>{f.isPublished ? "Publicado" : "Rascunho"}</StatusBadge>
                <div className="relative z-10 -mr-2 -mt-1.5">
                  <ActionsMenu
                    size="sm"
                    label={`Ações de ${f.title}`}
                    items={[
                      { label: "Editar perguntas", icon: <Pencil />, onSelect: () => onSelectForm(f, "builder") },
                      { label: "Ver candidatos", icon: <Users />, onSelect: () => onSelectForm(f, "candidates") },
                      { label: "Abrir página pública", icon: <ExternalLink />, onSelect: () => window.open(`/trabalhe-conosco/${f.publicSlug}`, "_blank", "noopener") },
                      { type: "separator" },
                      { label: "Excluir formulário", icon: <Trash2 />, tone: "danger", onSelect: () => void askDelete(f) },
                    ]}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-start gap-3">
                {f.bannerUrl && <img src={f.bannerUrl} alt="" className="size-9 shrink-0 rounded-lg border border-white/10 bg-white/5 object-contain p-1" />}
                <div className="min-w-0">
                  {/* O título é o alvo principal: o cartão inteiro abre o editor. */}
                  <h3 className="font-display text-base font-semibold text-white">
                    <button type="button" onClick={() => onSelectForm(f, "builder")} className="text-left outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-emerald-400/60">
                      {f.title}
                    </button>
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{f.subtitle || "Sem descrição."}</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                {f.fields.length} {f.fields.length === 1 ? "pergunta" : "perguntas"}
              </p>

              <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4">
                <Button size="sm" className="border-teal-400/25 bg-teal-500/10 text-teal-100 hover:bg-teal-500/15" onClick={() => onSelectForm(f, "candidates")}>
                  <Users className="text-teal-300" />
                  {f.candidateCount ?? 0} {(f.candidateCount ?? 0) === 1 ? "candidato" : "candidatos"}
                </Button>
                <div className="ml-auto flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs text-zinc-500">/{f.publicSlug}</span>
                  <IconButton size="sm" label={copiedSlug === f.publicSlug ? "Link copiado" : "Copiar link público"} icon={copiedSlug === f.publicSlug ? <Check className="text-emerald-400" /> : <Copy />} onClick={() => copyLink(f.publicSlug)} />
                </div>
              </div>
            </Surface>
          ))}
        </div>
      )}

      <Dialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Novo formulário"
        description={`Vaga ou oportunidade da unidade ${unit?.name ?? ""}.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" form="novo-formulario" loading={creating} disabled={!newTitle.trim()}>Criar formulário</Button>
          </>
        }
      >
        <form id="novo-formulario" onSubmit={handleCreateSubmit}>
          <Field label="Nome da vaga" htmlFor="novo-titulo" required hint="Aparece no topo da página pública.">
            <Input id="novo-titulo" autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex.: Trabalhe conosco — Atendente comercial" />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
