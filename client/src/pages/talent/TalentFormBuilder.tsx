import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus,
  Save,
  Eye,
  Copy,
  Check,
  Globe,
  Lock,
  Sparkles,
  Layers,
  AlertCircle,
  FileCheck2,
  ExternalLink,
  Loader2,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type { TalentField, TalentForm } from "./types";
import { TalentSortableFieldItem } from "./TalentSortableFieldItem";
import { TalentFieldEditorModal } from "./TalentFieldEditorModal";

interface TalentFormBuilderProps {
  form: TalentForm;
  saving: boolean;
  onSave: (updatedForm: TalentForm) => Promise<void>;
  onFormChange: (updatedForm: TalentForm) => void;
  onDeleteForm: (formId: string) => Promise<void>;
}

export function TalentFormBuilder({
  form,
  saving,
  onSave,
  onFormChange,
  onDeleteForm,
}: TalentFormBuilderProps) {
  const [editingField, setEditingField] = useState<TalentField | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Setup optimized DnD sensors for smooth drag response
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const publicUrl = `${window.location.origin}/trabalhe-conosco/${form.publicSlug}`;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = form.fields.findIndex(
      (f) => (f.id || f.fieldKey) === active.id
    );
    const newIndex = form.fields.findIndex(
      (f) => (f.id || f.fieldKey) === over.id
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(form.fields, oldIndex, newIndex).map(
        (field, index) => ({
          ...field,
          orderIndex: index,
        })
      );
      onFormChange({ ...form, fields: reordered });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = arrayMove(form.fields, index, index - 1).map(
      (field, i) => ({ ...field, orderIndex: i })
    );
    onFormChange({ ...form, fields: reordered });
  };

  const handleMoveDown = (index: number) => {
    if (index === form.fields.length - 1) return;
    const reordered = arrayMove(form.fields, index, index + 1).map(
      (field, i) => ({ ...field, orderIndex: i })
    );
    onFormChange({ ...form, fields: reordered });
  };

  const handleAddDefaultField = () => {
    const nextIndex = form.fields.length;
    const newField: TalentField = {
      id: `draft-${crypto.randomUUID()}`,
      fieldKey: `pergunta_${nextIndex + 1}`,
      label: `Nova Pergunta ${nextIndex + 1}`,
      fieldType: "text",
      isRequired: false,
      orderIndex: nextIndex,
      placeholder: null,
      helpText: null,
      options: [],
      validationRules: {},
    };
    setEditingField(newField);
  };

  const handleSaveField = (savedField: TalentField) => {
    const existsIndex = form.fields.findIndex(
      (f) => (f.id && f.id === savedField.id) || f.fieldKey === savedField.fieldKey
    );

    let updatedFields: TalentField[];
    if (existsIndex >= 0) {
      updatedFields = form.fields.map((f, i) => (i === existsIndex ? savedField : f));
    } else {
      updatedFields = [...form.fields, { ...savedField, orderIndex: form.fields.length }];
    }

    onFormChange({ ...form, fields: updatedFields });
    setEditingField(null);
    toast.success("Campo atualizado com sucesso!");
  };

  const handleDeleteField = (fieldToDelete: TalentField) => {
    const updated = form.fields
      .filter((f) => f !== fieldToDelete)
      .map((f, i) => ({ ...f, orderIndex: i }));
    onFormChange({ ...form, fields: updated });
    toast.success("Pergunta removida");
  };

  const handleDuplicateField = (fieldToDup: TalentField) => {
    const dupKey = `${fieldToDup.fieldKey}_copia_${Date.now().toString(36)}`;
    const duplicated: TalentField = {
      ...fieldToDup,
      id: `draft-${crypto.randomUUID()}`,
      fieldKey: dupKey,
      label: `${fieldToDup.label} (Cópia)`,
      orderIndex: form.fields.length,
    };
    const updated = [...form.fields, duplicated];
    onFormChange({ ...form, fields: updated });
    toast.success("Pergunta duplicada");
  };

  const handleToggleRequired = (fieldToToggle: TalentField) => {
    const updated = form.fields.map((f) =>
      f === fieldToToggle ? { ...f, isRequired: !f.isRequired } : f
    );
    onFormChange({ ...form, fields: updated });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    toast.success("Link público copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEditSlug = async () => {
    const next = window.prompt("Defina o final do link público", form.publicSlug);
    if (next === null || next.trim() === form.publicSlug) return;
    const publicSlug = next.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publicSlug)) {
      toast.error("Use apenas letras minúsculas, números e hífens no slug.");
      return;
    }
    await onSave({ ...form, publicSlug });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("clientId", form.clientId);

      const token = localStorage.getItem("tp_token") ?? "";
      const res = await fetch(`/api/talent/admin/forms/${form.id}/logo?client_id=${form.clientId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const text = await res.text();
      let data: { logoUrl?: string; error?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          res.status === 404
            ? "O servidor backend está reiniciando. Tente novamente em alguns segundos."
            : `Erro no servidor (${res.status})`
        );
      }

      if (!res.ok || !data.logoUrl) {
        throw new Error(data.error || "Falha ao enviar logo");
      }

      const updated = { ...form, bannerUrl: data.logoUrl };
      onFormChange(updated);
      await onSave(updated);
      toast.success("Logo atualizada e salva com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFormConfirmed = async () => {
    setDeleting(true);
    try {
      await onDeleteForm(form.id);
      setConfirmDelete(false);
    } catch {
      // handled by parent
    } finally {
      setDeleting(false);
    }
  };

  const sortableItemIds = form.fields.map((f) => f.id || f.fieldKey);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* Left Column: Form Fields List & DnD Area */}
      <div className="space-y-4">
        {/* Banner with Add Field action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-emerald-400" />
              <h2 className="font-display text-base font-semibold text-zinc-100">
                Campos do Formulário
              </h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-400 font-mono">
                {form.fields.length} {form.fields.length === 1 ? "campo" : "campos"}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Arraste os campos pelo ícone de seis pontos para reordenar a sequência de perguntas.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddDefaultField}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-950/40 transition shrink-0"
          >
            <Plus className="size-4 stroke-[2.5]" />
            Adicionar Pergunta
          </button>
        </div>

        {/* DnD Sortable Container */}
        {form.fields.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
            <Sparkles className="mx-auto size-8 text-zinc-600 mb-3" />
            <h3 className="text-sm font-medium text-zinc-300">
              Nenhuma pergunta cadastrada
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
              Adicione perguntas para coletar dados dos candidatos como currículo, pretensão salarial, experiência e contatos.
            </p>
            <button
              type="button"
              onClick={handleAddDefaultField}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 transition"
            >
              <Plus className="size-3.5" />
              Criar primeira pergunta
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableItemIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {form.fields.map((f, idx) => (
                  <TalentSortableFieldItem
                    key={f.id || f.fieldKey}
                    field={f}
                    index={idx}
                    totalFields={form.fields.length}
                    onEdit={setEditingField}
                    onDelete={handleDeleteField}
                    onDuplicate={handleDuplicateField}
                    onToggleRequired={handleToggleRequired}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Add more button at the bottom */}
        {form.fields.length > 0 && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleAddDefaultField}
              className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-3 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/40 hover:text-zinc-200 transition w-full justify-center"
            >
              <Plus className="size-4" />
              Adicionar outra pergunta ao formulário
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Publication & Settings Sidebar */}
      <div className="space-y-4">
        {/* Main Save & Status Card */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-emerald-400" />
              <h3 className="font-display text-sm font-semibold text-zinc-100">
                Publicação & Status
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                form.isPublished
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  form.isPublished ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {form.isPublished ? "Publicado" : "Rascunho"}
            </span>
          </div>

          {/* Toggle Published */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-zinc-950/40 p-3 hover:bg-zinc-950/60 transition">
            <div className="min-w-0 pr-2">
              <span className="block text-xs font-medium text-zinc-200">
                Disponível na Web
              </span>
              <span className="block text-[11px] text-zinc-500">
                {form.isPublished
                  ? "Candidatos podem acessar e enviar respostas"
                  : "Link público desativado para novas inscrições"}
              </span>
            </div>
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                onFormChange({ ...form, isPublished: e.target.checked })
              }
              className="size-4 rounded border-zinc-700 accent-emerald-500 shrink-0"
            />
          </label>

          {/* Public Link Box */}
          <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Globe className="size-3 text-zinc-500" />
                Link público da vaga
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-black/40 px-2.5 py-1.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-300">
                {publicUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded p-1 text-zinc-400 hover:text-white transition"
                title="Copiar link"
              >
                {copiedLink ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleEditSlug()}
                className="rounded p-1 text-zinc-400 hover:text-white transition"
                title="Editar link público"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition"
            >
              <ExternalLink className="size-3" />
              Abrir formulário em nova aba
            </a>
          </div>

          {/* Primary Save Button */}
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 shadow-lg shadow-emerald-950/40 transition"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando alterações...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Salvar Formulário
              </>
            )}
          </button>
        </div>

        {/* Logo / Brand Identity Card */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-emerald-400" />
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Logo / Marca da Vaga
              </h3>
            </div>
            {form.bannerUrl && (
              <span className="text-[10px] text-emerald-400 font-medium">Ativa</span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Esta imagem é exibida no topo do link público onde o candidato preenche as respostas.
          </p>

          {/* Current Logo Preview */}
          {form.bannerUrl ? (
            <div className="rounded-xl border border-white/10 bg-black/50 p-3 text-center space-y-2">
              <img
                src={form.bannerUrl}
                alt="Logo da Vaga"
                className="h-14 max-w-full mx-auto object-contain"
              />
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/10 transition"
                >
                  Trocar imagem
                </button>
                <button
                  type="button"
                  onClick={() => onFormChange({ ...form, bannerUrl: null })}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-500/20 transition"
                >
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-center hover:border-zinc-600 hover:bg-zinc-900 transition"
            >
              {uploadingLogo ? (
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="size-4 animate-spin text-emerald-400" />
                  <span>Enviando logo...</span>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto size-5 text-zinc-500 mb-1" />
                  <span className="block text-xs font-medium text-zinc-300">
                    Enviar logo personalizada
                  </span>
                  <span className="block text-[10px] text-zinc-500 mt-0.5">
                    PNG, JPG ou SVG (até 5 MB)
                  </span>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>

        {/* Basic Form Settings (Title, Description, Success) */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur-sm space-y-3.5">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Cabeçalho & Textos da Vaga
          </h3>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400">
              Título do Formulário
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                onFormChange({ ...form, title: e.target.value })
              }
              placeholder="Ex: Trabalhe Conosco — Vendedor(a)"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400">
              Subtítulo / Descrição
            </label>
            <textarea
              value={form.subtitle}
              rows={2}
              onChange={(e) =>
                onFormChange({ ...form, subtitle: e.target.value })
              }
              placeholder="Ex: Faça parte do time Vida Card."
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400">
              Termo LGPD / Consentimento
            </label>
            <textarea
              value={form.lgpdDisclaimer}
              rows={2}
              onChange={(e) =>
                onFormChange({ ...form, lgpdDisclaimer: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400">
              Mensagem de Sucesso (Pós-Envio)
            </label>
            <input
              type="text"
              value={form.successTitle}
              onChange={(e) =>
                onFormChange({ ...form, successTitle: e.target.value })
              }
              placeholder="Título: Candidatura enviada com sucesso!"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <textarea
              value={form.successMessage}
              rows={2}
              onChange={(e) =>
                onFormChange({ ...form, successMessage: e.target.value })
              }
              placeholder="Descrição de confirmação..."
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Danger Zone: Delete Form */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5 backdrop-blur-sm space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="size-4" />
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider">
              Zona de Perigo
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Ao excluir este formulário, todas as perguntas e respostas de candidatos vinculadas serão removidas permanentemente.
          </p>

          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            <Trash2 className="size-3.5" />
            Excluir este formulário
          </button>
        </div>
      </div>

      {/* Field Editor Dialog */}
      {editingField && (
        <TalentFieldEditorModal
          initialValue={editingField}
          onClose={() => setEditingField(null)}
          onSave={handleSaveField}
        />
      )}

      {/* Confirmation Dialog: Delete Form */}
      {confirmDelete && (
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
              Você está prestes a excluir o formulário <strong>"{form.title}"</strong> e todas as candidaturas recebidas para esta vaga.
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteFormConfirmed}
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
