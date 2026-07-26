import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Plus, GripVertical, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => { if (!localStorage.getItem("tp_token")) setLocation("/login"); }, [setLocation]);
}

type Priority = "urgent" | "high" | "medium" | "low";
type Card = { id: string; title: string; priority: Priority };
type Column = { id: string; name: string; color: string; cards: Card[] };

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "bg-destructive/20 text-destructive",
  high: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]",
  medium: "bg-primary/15 text-primary",
  low: "bg-muted/40 text-muted-foreground",
};
const PRIORITY_LABELS: Record<Priority, string> = { urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" };

const INITIAL: Column[] = [
  { id: "backlog", name: "Backlog", color: "#6b7280", cards: [
    { id: "c1", title: "Criar criativos para campanha de Julho", priority: "high" },
    { id: "c2", title: "Revisar segmentação de público", priority: "medium" },
  ]},
  { id: "todo", name: "A Fazer", color: "#3b82f6", cards: [
    { id: "c3", title: "Configurar pixel do Meta", priority: "urgent" },
    { id: "c4", title: "Subir campanha de remarketing", priority: "high" },
  ]},
  { id: "doing", name: "Em Andamento", color: "#f59e0b", cards: [
    { id: "c5", title: "Otimizar lances da campanha de leads", priority: "high" },
  ]},
  { id: "review", name: "Revisão", color: "#8b5cf6", cards: [] },
  { id: "done", name: "Concluído", color: "#22c55e", cards: [
    { id: "c6", title: "Criar conta de anúncios no Google", priority: "low" },
  ]},
];

function CardItem({ card, onDelete, onEdit }: { card: Card; onDelete: () => void; onEdit: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(card.title);
  function save() { if (val.trim()) { onEdit(val.trim()); setEditing(false); } }
  return (
    <div className="glass-card p-3 group cursor-grab">
      {editing ? (
        <div className="flex gap-1.5">
          <input autoFocus value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            className="flex-1 text-xs bg-transparent border-b border-primary outline-none" />
          <button onClick={save} className="text-primary"><Check className="size-3.5" /></button>
          <button onClick={() => setEditing(false)} className="text-muted-foreground"><X className="size-3.5" /></button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5">
              <GripVertical className="size-3.5 text-muted-foreground/30 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">{card.title}</p>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => setEditing(true)} className="size-5 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground"><Pencil className="size-3" /></button>
              <button onClick={onDelete} className="size-5 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
            </div>
          </div>
          <div className="mt-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[card.priority]}`}>{PRIORITY_LABELS[card.priority]}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPipelinePage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro - Pipeline"; }, []);
  const [columns, setColumns] = useState<Column[]>(INITIAL);
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  function addCard(colId: string) {
    if (!newTitle.trim()) return;
    setColumns(cols => cols.map(c => c.id === colId ? { ...c, cards: [...c.cards, { id: Date.now().toString(), title: newTitle.trim(), priority: newPriority }] } : c));
    setNewTitle(""); setNewPriority("medium"); setAddingCol(null);
    toast.success("Card adicionado");
  }
  function deleteCard(colId: string, cardId: string) {
    setColumns(cols => cols.map(c => c.id === colId ? { ...c, cards: c.cards.filter(k => k.id !== cardId) } : c));
    toast.success("Card removido");
  }
  function editCard(colId: string, cardId: string, title: string) {
    setColumns(cols => cols.map(c => c.id === colId ? { ...c, cards: c.cards.map(k => k.id === cardId ? { ...k, title } : k) } : c));
  }
  function addColumn() {
    setColumns(cols => [...cols, { id: `col_${Date.now()}`, name: "Nova Coluna", color: "#6b7280", cards: [] }]);
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-sm text-muted-foreground">Gerencie as demandas e tarefas</p>
          </div>
          <button onClick={addColumn} className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs font-medium hover:bg-muted/20 transition-colors">
            <Plus className="size-3.5" /> Nova Coluna
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: "calc(100vh - 180px)" }}>
          {columns.map(col => (
            <div key={col.id} className="flex flex-col w-72 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-2 rounded-full shrink-0" style={{ background: col.color }} />
                <span className="text-xs font-semibold">{col.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-full">{col.cards.length}</span>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {col.cards.map(card => (
                  <CardItem key={card.id} card={card} onDelete={() => deleteCard(col.id, card.id)} onEdit={title => editCard(col.id, card.id, title)} />
                ))}
                {addingCol === col.id ? (
                  <div className="glass-card p-3 space-y-2">
                    <textarea autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(col.id); } if (e.key === "Escape") setAddingCol(null); }}
                      placeholder="Título da tarefa..." rows={2}
                      className="w-full text-xs bg-transparent resize-none outline-none placeholder:text-muted-foreground/50" />
                    <div className="flex items-center gap-2">
                      <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}
                        className="flex-1 text-[10px] rounded border border-border bg-muted/20 px-2 py-1 outline-none">
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                      <button onClick={() => addCard(col.id)} className="px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] font-medium">Adicionar</button>
                      <button onClick={() => setAddingCol(null)} className="size-6 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground"><X className="size-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddingCol(col.id); setNewTitle(""); }}
                    className="flex items-center gap-1.5 w-full rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                    <Plus className="size-3.5" /> Adicionar card
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
