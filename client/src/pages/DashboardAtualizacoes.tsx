import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { Newspaper, Plus, Pencil, Trash2, Pin, PinOff, X, Eye } from "lucide-react";
import { toast } from "sonner";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => { if (!localStorage.getItem("tp_token")) setLocation("/login"); }, [setLocation]);
}

type UpdateStatus = "draft" | "published";
type Update = { id: string; title: string; content: string; status: UpdateStatus; pinned: boolean; createdAt: string; author: string };

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DashboardAtualizacoesPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro - Atualizações"; }, []);
  const [updates, setUpdates] = useState<Update[]>(() => {
    try { return JSON.parse(localStorage.getItem("tp_updates") ?? "[]"); } catch { return []; }
  });
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "pinned">("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Update | null>(null);
  const [viewing, setViewing] = useState<Update | null>(null);
  const [form, setForm] = useState({ title: "", content: "", status: "draft" as UpdateStatus });

  function persist(list: Update[]) { setUpdates(list); localStorage.setItem("tp_updates", JSON.stringify(list)); }
  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function addUpdate() {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
    persist([{ id: Date.now().toString(), title: form.title.trim(), content: form.content, status: form.status, pinned: false, createdAt: new Date().toISOString(), author: user.name ?? "Admin" }, ...updates]);
    setForm({ title: "", content: "", status: "draft" }); setAdding(false);
    toast.success("Atualização criada");
  }

  function saveEdit() {
    if (!editing) return;
    persist(updates.map(u => u.id === editing.id ? { ...editing, title: form.title, content: form.content, status: form.status } : u));
    setEditing(null); toast.success("Atualização salva");
  }

  function togglePin(id: string) { persist(updates.map(u => u.id === id ? { ...u, pinned: !u.pinned } : u)); }
  function remove(id: string) { persist(updates.filter(u => u.id !== id)); toast.success("Atualização removida"); }
  function publish(id: string) { persist(updates.map(u => u.id === id ? { ...u, status: "published" as UpdateStatus } : u)); toast.success("Publicado"); }

  const filtered = updates.filter(u => {
    if (filter === "published") return u.status === "published";
    if (filter === "draft") return u.status === "draft";
    if (filter === "pinned") return u.pinned;
    return true;
  });

  const UpdateForm = ({ onSave, onClose, title }: { onSave: () => void; onClose: () => void; title: string }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground"><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <input value={form.title} onChange={e => setF("title", e.target.value)} placeholder="Título *"
            className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
          <textarea value={form.content} onChange={e => setF("content", e.target.value)} rows={6} placeholder="Conteúdo da atualização..."
            className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none" />
          <select value={form.status} onChange={e => setF("status", e.target.value)}
            className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary">
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors">Cancelar</button>
          <button onClick={onSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Salvar</button>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-[1000px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Newspaper className="size-5 text-primary" /> Atualizações
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Comunicados e atualizações para clientes</p>
          </div>
          <button onClick={() => { setForm({ title: "", content: "", status: "draft" }); setAdding(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="size-3.5" /> Nova atualização
          </button>
        </header>

        <div className="flex gap-2">
          {([["all","Todas"],["published","Publicadas"],["draft","Rascunhos"],["pinned","Fixadas"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`h-8 px-3 rounded-full border text-xs transition ${filter === v ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
            <Newspaper className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma atualização encontrada.</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(u => (
            <div key={u.id} className="glass-card p-5 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {u.pinned && <Pin className="size-3.5 text-primary shrink-0" />}
                    <h3 className="font-semibold text-sm">{u.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.status === "published" ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" : "bg-muted/40 text-muted-foreground"}`}>
                      {u.status === "published" ? "Publicado" : "Rascunho"}
                    </span>
                  </div>
                  {u.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{u.content}</p>}
                  <div className="text-[10px] text-muted-foreground mt-2">{u.author} · {fmtDate(u.createdAt)}</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setViewing(u)} className="size-7 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground"><Eye className="size-3.5" /></button>
                  <button onClick={() => togglePin(u.id)} className="size-7 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground">
                    {u.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  </button>
                  {u.status === "draft" && (
                    <button onClick={() => publish(u.id)} className="h-7 px-2 rounded text-[10px] bg-primary/15 text-primary hover:bg-primary/25 transition-colors">Publicar</button>
                  )}
                  <button onClick={() => { setEditing(u); setForm({ title: u.title, content: u.content, status: u.status }); }}
                    className="size-7 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground"><Pencil className="size-3.5" /></button>
                  <button onClick={() => remove(u.id)} className="size-7 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {adding && <UpdateForm title="Nova Atualização" onSave={addUpdate} onClose={() => setAdding(false)} />}
      {editing && <UpdateForm title="Editar Atualização" onSave={saveEdit} onClose={() => setEditing(null)} />}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{viewing.title}</h2>
              <button onClick={() => setViewing(null)} className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground"><X className="size-4" /></button>
            </div>
            <div className="text-[10px] text-muted-foreground">{viewing.author} · {fmtDate(viewing.createdAt)}</div>
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{viewing.content || "Sem conteúdo."}</div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
