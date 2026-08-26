import { useState } from "react";
import { X, Plus, Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import type { TalentField, TalentFieldType, TalentFieldOption } from "./types";
import { TALENT_FIELD_TYPES } from "./types";

interface TalentFieldEditorModalProps {
  initialValue: TalentField;
  onClose: () => void;
  onSave: (field: TalentField) => void;
}

function slugifyKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 50);
}

export function TalentFieldEditorModal({
  initialValue,
  onClose,
  onSave,
}: TalentFieldEditorModalProps) {
  const [label, setLabel] = useState(initialValue.label);
  const [fieldKey, setFieldKey] = useState(initialValue.fieldKey);
  const [fieldType, setFieldType] = useState<TalentFieldType>(initialValue.fieldType);
  const [isRequired, setIsRequired] = useState(initialValue.isRequired);
  const [placeholder, setPlaceholder] = useState(initialValue.placeholder || "");
  const [helpText, setHelpText] = useState(initialValue.helpText || "");
  const [options, setOptions] = useState<TalentFieldOption[]>(
    initialValue.options && initialValue.options.length > 0
      ? initialValue.options
      : [
          { label: "Opção 1", value: "opcao_1" },
          { label: "Opção 2", value: "opcao_2" },
        ]
  );
  const [autoKey, setAutoKey] = useState(!initialValue.fieldKey || initialValue.fieldKey.startsWith("pergunta_"));

  const hasOptions = fieldType === "radio" || fieldType === "checkbox" || fieldType === "select";

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    if (autoKey) {
      const generated = slugifyKey(newLabel);
      if (generated) setFieldKey(generated);
    }
  };

  const handleAddOption = () => {
    const nextNum = options.length + 1;
    setOptions([
      ...options,
      { label: `Opção ${nextNum}`, value: `opcao_${nextNum}` },
    ]);
  };

  const handleUpdateOption = (index: number, newLabel: string) => {
    const updated = [...options];
    updated[index] = {
      label: newLabel,
      value: slugifyKey(newLabel) || `opcao_${index + 1}`,
    };
    setOptions(updated);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) {
      toast.error("É necessário ter pelo menos uma opção");
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!label.trim()) {
      toast.error("Informe a pergunta ou título do campo");
      return;
    }
    const cleanKey = (fieldKey.trim() || slugifyKey(label) || `campo_${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");

    if (hasOptions && options.length === 0) {
      toast.error("Adicione pelo menos uma opção de resposta");
      return;
    }

    onSave({
      ...initialValue,
      label: label.trim(),
      fieldKey: cleanKey,
      fieldType,
      isRequired,
      placeholder: placeholder.trim() || null,
      helpText: helpText.trim() || null,
      options: hasOptions ? options.map((opt, i) => ({
        label: opt.label.trim() || `Opção ${i + 1}`,
        value: opt.value.trim() || slugifyKey(opt.label) || `opcao_${i + 1}`,
      })) : [],
    });
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-zinc-100">
              {initialValue.id && !initialValue.id.startsWith("draft-")
                ? "Editar Campo"
                : "Novo Campo do Formulário"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Personalize o tipo de dado e opções de resposta
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Field Label */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Pergunta / Título do Campo *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Ex: Qual sua pretensão salarial? ou Anexe seu currículo"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              autoFocus
            />
          </div>

          {/* Field Type Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Tipo de Resposta
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TALENT_FIELD_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setFieldType(t.type)}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                    fieldType === t.type
                      ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-300"
                      : "border-white/5 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <span className="text-xs font-medium text-zinc-200">
                    {t.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 leading-tight mt-0.5 line-clamp-1">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Options (if radio / checkbox / select) */}
          {hasOptions && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Opções de Resposta
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-white/10 transition"
                >
                  <Plus className="size-3" />
                  Adicionar Opção
                </button>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500 w-5">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => handleUpdateOption(idx, e.target.value)}
                      placeholder={`Opção ${idx + 1}`}
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help text & Placeholder */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                Texto de Ajuda / Instrução (opcional)
              </label>
              <input
                type="text"
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                placeholder="Ex: Formato PDF ou DOCX de até 5MB"
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400">
                Placeholder / Exemplo (opcional)
              </label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Ex: Digite aqui..."
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Advanced / Field Key */}
          <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-zinc-300">
                  Identificador Interno (Chave)
                </span>
                <div title="Identificador único para exportação e banco de dados">
                  <HelpCircle className="size-3 text-zinc-500" />
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoKey}
                  onChange={(e) => {
                    setAutoKey(e.target.checked);
                    if (e.target.checked) setFieldKey(slugifyKey(label));
                  }}
                  className="rounded border-zinc-700 accent-emerald-500"
                />
                Gerar automático
              </label>
            </div>
            <input
              type="text"
              value={fieldKey}
              disabled={autoKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="ex: pretensao_salarial"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-xs text-zinc-400 disabled:opacity-50 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Is Required toggle */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-zinc-900/40 p-3.5 hover:bg-zinc-900/60 transition">
            <div>
              <span className="block text-sm font-medium text-zinc-200">
                Campo Obrigatório
              </span>
              <span className="block text-xs text-zinc-500">
                O candidato não poderá enviar o formulário sem preencher esta pergunta
              </span>
            </div>
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="size-4 rounded border-zinc-700 accent-emerald-500"
            />
          </label>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition"
          >
            Salvar Campo
          </button>
        </div>
      </div>
    </div>
  );
}
