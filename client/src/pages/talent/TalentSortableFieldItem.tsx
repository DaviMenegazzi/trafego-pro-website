import { ActionsMenu, IconButton, Switch, Tooltip } from "@/components/ds";
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
  Pencil,
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

  const choices = field.fieldType === "radio" || field.fieldType === "checkbox" || field.fieldType === "select";
  const requiredId = `obrigatorio-${sortableId}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border transition-colors duration-150 ${
        isDragging ? "z-30 border-emerald-500/60 bg-zinc-900 shadow-2xl" : "border-white/[0.08] bg-zinc-900/60 hover:border-white/15"
      }`}
    >
      <div className="flex items-start gap-2 p-3 sm:p-4">
        {/* Alça e setas: aparecem no hover/foco; as setas são o caminho de teclado para reordenar. */}
        <div className="flex flex-col items-center gap-0.5 opacity-40 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Tooltip content="Arraste para reordenar">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label="Arraste para reordenar"
              className="flex size-8 cursor-grab touch-none items-center justify-center rounded-lg text-zinc-400 outline-none hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-emerald-400/60 active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </button>
          </Tooltip>
          <IconButton size="sm" label="Mover para cima" icon={<ChevronUp />} onClick={() => onMoveUp(index)} disabled={index === 0} />
          <IconButton size="sm" label="Mover para baixo" icon={<ChevronDown />} onClick={() => onMoveDown(index)} disabled={index === totalFields - 1} />
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <button type="button" onClick={() => onEdit(field)} className="w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-xs tabular-nums text-zinc-500">{index + 1}.</span>
              <span className="break-words text-base font-medium text-zinc-100">{field.label}</span>
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5"><IconComponent className="size-3.5" />{typeConfig?.label ?? field.fieldType}</span>
              {choices && <span>{field.options.length} {field.options.length === 1 ? "opção" : "opções"}{field.options.length > 0 ? `: ${field.options.slice(0, 3).map((o) => o.label).join(", ")}${field.options.length > 3 ? "…" : ""}` : ""}</span>}
              {field.helpText && <span className="truncate">{field.helpText}</span>}
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-1">
          <label htmlFor={requiredId} className="hidden cursor-pointer text-xs text-zinc-400 sm:inline">Obrigatória</label>
          <Switch id={requiredId} aria-label="Pergunta obrigatória" checked={field.isRequired} onCheckedChange={() => onToggleRequired(field)} />
          <ActionsMenu
            size="sm"
            label={`Ações da pergunta ${field.label}`}
            items={[
              { label: "Editar pergunta", icon: <Pencil />, onSelect: () => onEdit(field) },
              { label: "Duplicar", icon: <Copy />, onSelect: () => onDuplicate(field) },
              { type: "separator" },
              { label: "Excluir pergunta", icon: <Trash2 />, tone: "danger", onSelect: () => onDelete(field) },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
