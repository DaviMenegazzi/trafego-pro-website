import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { ClipboardList, Plus, Trash2, Pencil, Check, X, Calendar } from "lucide-react";
import { toast } from "sonner";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => { if (!localStorage.getItem("tp_token")) setLocation("/login"); }, [setLocation]);
}

type Priority = "urgent" | "high" | "medium" | "low";
type Task = { id: string; title: string; priority: Priority; dueDate?: string; done: boolean; notes?: string };

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "bg-destructive/20 text-destructive",
  high: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]",
  medium: "bg-primary/15 text-primary",
  low: "bg-muted/40 text-muted-foreground",
};
const PRIORITY_LABELS: Record<Priority, string> = { urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" };

function fmtDate(s?: string) {
  if (!s) return null;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function DashboardMeuTrabalhoPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro - Meu Trabalho"; }, []);
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { return JSON.parse(localStorage.getItem("tp_tasks") ?? "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", priority: "medium" as Priority, dueDate: "", notes: "" });
  const [filterDone, setFilterDone] = useState<"all" | "pending" | "done">("all");

  function persist(list: Task[]) { setTasks(list); localStorage.setItem("tp_tasks", JSON.stringify(list)); }
  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function addTask() {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    persist([...tasks, { id: Date.now().toString(), title: form.title.trim(), priority: form.priority, dueDate: form.dueDate || undefined, done: false, notes: form.notes || undefined }]);
    setForm({ title: "", priority: "medium", dueDate: "", notes: "" });
    setAdding(false);
    toast.success("Tarefa adicionada");
  }

  function saveEdit() {
    if (!editing) return;
    persist(tasks.map(t => t.id === editing.id ? { ...editing, ...form, dueDate: form.dueDate || undefined } : t));
    setEditing(null);
    toast.success("Tarefa atualizada");
  }

  function toggle(id: string) { persist(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function remove(id: string) { persist(tasks.filter(t => t.id !== id)); toast.success("Tarefa removida"); }

  const filtered = tasks.filter(t => filterDone === "all" ? true : filterDone === "done" ? t.done : !t.done);
  const pending = tasks.filter(t => !t.done).length;

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-[900px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" /> Meu Trabalho
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{pending} tarefa{pending !== 1 ? "s" : ""} pendente{pending !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="size-3.5" /> Nova tarefa
          </button>
        </header>

        <div className="flex gap-2">
          {([["all","Todas"],["pending","Pendentes"],["done","Concluídas"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilterDone(v)}
              className={`h-8 px-3 rounded-full border text-xs transition ${filterDone === v ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {adding && (
          <div className="glass-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input autoFocus value={form.title} onChange={e => setF("title", e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setAdding(false); }}
                  placeholder="Título da tarefa..."
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <select value={form.priority} onChange={e => setF("priority", e.target.value)}
                className="text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary">
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
              <input value={form.dueDate} onChange={e => setF("dueDate", e.target.value)} type="date"
                className="text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              <div className="col-span-2">
                <textarea value={form.notes} onChange={e => setF("notes", e.target.value)} rows={2} placeholder="Observações (opcional)"
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors">Cancelar</button>
              <button onClick={addTask} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Adicionar</button>
            </div>
          </div>
        )}

        {filtered.length === 0 && !adding && (
          <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(t => (
            <div key={t.id} className={`glass-card p-4 flex items-start gap-3 group transition-opacity ${t.done ? "opacity-60" : ""}`}>
              <button onClick={() => toggle(t.id)}
                className={`mt-0.5 size-5 rounded border flex items-center justify-center shrink-0 transition-colors ${t.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"}`}>
                {t.done && <Check className="size-3 text-primary-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                {t.notes && <div className="text-xs text-muted-foreground mt-0.5">{t.notes}</div>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span>
                  {t.dueDate && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="size-3" /> {fmtDate(t.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditing(t); setForm({ title: t.title, priority: t.priority, dueDate: t.dueDate ?? "", notes: t.notes ?? "" }); }}
                  className="size-7 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground"><Pencil className="size-3.5" /></button>
                <button onClick={() => remove(t.id)}
                  className="size-7 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Editar tarefa</h2>
              <button onClick={() => setEditing(null)} className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground"><X className="size-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setF("title", e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={e => setF("priority", e.target.value)}
                  className="text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
                <input value={form.dueDate} onChange={e => setF("dueDate", e.target.value)} type="date"
                  className="text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <textarea value={form.notes} onChange={e => setF("notes", e.target.value)} rows={2}
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors">Cancelar</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
