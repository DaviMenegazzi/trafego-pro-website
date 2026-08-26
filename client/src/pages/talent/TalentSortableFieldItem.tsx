import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Edit2,
  Copy,
  ChevronUp,
  ChevronDown,
  Type,
  AlignLeft,
  Mail,
  Phone,
  FileBadge,
  Hash,
  List,
  CheckSquare,
  CircleDot,
  Calendar,
  Paperclip,
  Check,
} from "lucide-react";
import type { TalentField, TalentFieldType } from "./types";
import { TALENT_FIELD_TYPES } from "./types";

interface TalentSortableFieldItemProps {
  field: TalentField;
  index: number;
  totalFields: number;
  onEdit: (field: TalentField) => void;
  onDelete: (field: TalentField) => void;
  onDuplicate: (field: TalentField) => void;
  onToggleRequired: (field: TalentField) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const FIELD_ICONS: Record<TalentFieldType, React.ElementType> = {
  text: Type,
  textarea: AlignLeft,
  email: Mail,
  phone: Phone,
  cpf: FileBadge,
  number: Hash,
  select: List,
  radio: CircleDot,
  checkbox: CheckSquare,
  date: Calendar,
  file: Paperclip,
};

export function TalentSortableFieldItem({
  field,
  index,
  totalFields,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleRequired,
  onMoveUp,
  onMoveDown,
}: TalentSortableFieldItemProps) {
  const sortableId = field.id || field.fieldKey;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? "none" : transition,
  };

  const typeConfig = TALENT_FIELD_TYPES.find((t) => t.type === field.fieldType);
  const IconComponent = FIELD_ICONS[field.fieldType] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border transition-all duration-200 ${
        isDragging
          ? "border-emerald-500/80 bg-zinc-900/90 shadow-2xl shadow-emerald-950/40 opacity-90 z-30 scale-[1.01]"
          : "border-white/10 bg-zinc-900/40 hover:border-zinc-700/80 hover:bg-zinc-900/70"
      }`}
    >
      {/* Top bar with drag handle */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200 transition touch-none"
            title="Arraste para reordenar"
          >
            <GripVertical className="size-4" />
          </button>
          <span className="text-[11px] font-mono font-medium text-zinc-500">
            #{index + 1}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-zinc-300 font-medium">
            <IconComponent className="size-3 text-emerald-400" />
            {typeConfig?.label ?? field.fieldType}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
            ({field.fieldKey})
          </span>
        </div>

        {/* Quick move buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Mover para cima"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === totalFields - 1}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Mover para baixo"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main content body */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-medium text-zinc-100 break-words">
                {field.label}
              </h3>
              {field.isRequired && (
                <span className="text-xs font-semibold text-emerald-400 shrink-0">
                  * obrigatório
                </span>
              )}
            </div>

            {field.helpText && (
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                {field.helpText}
              </p>
            )}

            {/* Field mock preview */}
            <div className="mt-3">
              {field.fieldType === "textarea" ? (
                <div className="h-14 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-2 text-xs text-zinc-600">
                  {field.placeholder || "Texto longo em parágrafo..."}
                </div>
              ) : field.fieldType === "file" ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-2.5 text-xs text-zinc-500">
                  <Paperclip className="size-3.5 text-zinc-400" />
                  <span>{field.placeholder || "Área para anexar currículo (PDF/DOCX)"}</span>
                </div>
              ) : field.fieldType === "radio" || field.fieldType === "checkbox" || field.fieldType === "select" ? (
                <div className="space-y-1.5">
                  {field.options.length > 0 ? (
                    field.options.map((opt, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-950/30 px-2.5 py-1.5 text-xs text-zinc-400"
                      >
                        {field.fieldType === "radio" && (
                          <div className="size-3 rounded-full border border-zinc-600" />
                        )}
                        {field.fieldType === "checkbox" && (
                          <div className="size-3 rounded border border-zinc-600" />
                        )}
                        {field.fieldType === "select" && (
                          <span className="text-zinc-600 font-mono text-[10px]">{i + 1}.</span>
                        )}
                        <span className="text-zinc-300">{opt.label}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-zinc-800 p-2 text-center text-xs text-zinc-600">
                      Nenhuma opção configurada ainda
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-9 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-3 flex items-center text-xs text-zinc-600">
                  {field.placeholder || "Campo de resposta curta..."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
          {/* Required toggle */}
          <button
            type="button"
            onClick={() => onToggleRequired(field)}
            className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition ${
              field.isRequired
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:bg-white/5 border border-transparent"
            }`}
          >
            <div
              className={`flex size-3.5 items-center justify-center rounded border ${
                field.isRequired
                  ? "border-emerald-400 bg-emerald-500 text-zinc-950"
                  : "border-zinc-600"
              }`}
            >
              {field.isRequired && <Check className="size-2.5 stroke-[3]" />}
            </div>
            <span>Obrigatório</span>
          </button>

          {/* Edit, duplicate, delete */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDuplicate(field)}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition"
              title="Duplicar pergunta"
            >
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">Duplicar</span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(field)}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/15 hover:text-white transition"
              title="Editar pergunta"
            >
              <Edit2 className="size-3.5" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(field)}
              className="rounded-xl p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"
              title="Excluir pergunta"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
