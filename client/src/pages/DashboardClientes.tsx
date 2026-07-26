import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import { Plus, Pencil, Trash2, Users2, UserPlus, Phone, Mail, Globe, X, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => { if (!localStorage.getItem("tp_token")) setLocation("/login"); }, [setLocation]);
}

type StatusTab = "all" | "active" | "paused" | "inactive";
const STATUS_LABELS: Record<string, string> = { active: "Ativo", paused: "Pausado", inactive: "Inativo" };
const STATUS_COLORS: Record<string, string> = {
  active: "bg-[rgba(34,197,94,0.15)] text-[#22c55e]",
  paused: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]",
  inactive: "bg-muted/40 text-muted-foreground",
};

type ClientForm = {
  name: string; city: string; state: string; status: string; plan: string;
  monthlyBudget: string; contact: string; phone: string; email: string; lpUrl: string; notes: string;
};
const EMPTY_FORM: ClientForm = { name: "", city: "", state: "", status: "active", plan: "", monthlyBudget: "", contact: "", phone: "", email: "", lpUrl: "", notes: "" };

function ClientModal({ initial, onSave, onClose, title }: {
  initial: ClientForm; onSave: (f: ClientForm) => Promise<void>; onClose: () => void; title: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  function set(k: keyof ClientForm, v: string) { setForm(f => ({ ...f, [k]: v })); }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} required
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cidade</label>
              <input value={form.city} onChange={e => set("city", e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
              <input value={form.state} onChange={e => set("state", e.target.value)} maxLength={2} placeholder="RS"
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary">
                <option value="active">Ativo</option>
                <option value="paused">Pausado</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plano</label>
              <input value={form.plan} onChange={e => set("plan", e.target.value)} placeholder="Ex: Mensal"
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Orçamento Mensal (R$)</label>
              <input value={form.monthlyBudget} onChange={e => set("monthlyBudget", e.target.value)} type="number" min="0" placeholder="5000"
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contato</label>
              <input value={form.contact} onChange={e => set("contact", e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
              <input value={form.email} onChange={e => set("email", e.target.value)} type="email"
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">URL da Landing Page</label>
              <input value={form.lpUrl} onChange={e => set("lpUrl", e.target.value)} placeholder="https://"
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardClientesPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro - Clientes"; }, []);
  const { clients, loading, refetch } = useClientContext();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const token = () => localStorage.getItem("tp_token") ?? "";

  const filtered = clients.filter(c => statusTab === "all" || c.status === statusTab);

  async function handleCreate(form: ClientForm) {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...form, monthlyBudget: Number(form.monthlyBudget) || 0 }),
    });
    if (!res.ok) { toast.error("Erro ao criar cliente"); return; }
    toast.success("Cliente criado");
    setCreating(false);
    refetch();
  }

  async function handleEdit(form: ClientForm) {
    const res = await fetch(`/api/clients/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...form, monthlyBudget: Number(form.monthlyBudget) || 0 }),
    });
    if (!res.ok) { toast.error("Erro ao editar cliente"); return; }
    toast.success("Cliente atualizado");
    setEditing(null);
    refetch();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const res = await fetch(`/api/clients/${confirmDelete.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) { toast.error("Erro ao excluir cliente"); return; }
    toast.success("Cliente excluído");
    setConfirmDelete(null);
    refetch();
  }

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-[1400px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Users2 className="size-5 text-primary" /> Clientes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie seus clientes e contas de anúncios.</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="size-3.5" /> Novo cliente
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {([["all","Todos"],["active","Ativos"],["paused","Pausados"],["inactive","Inativos"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStatusTab(v as StatusTab)}
              className={`h-8 px-3 rounded-full border text-xs transition ${statusTab === v ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {loading && <div className="glass-card p-6 text-center text-sm text-muted-foreground">Carregando clientes...</div>}

        {!loading && filtered.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
            <UserPlus className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Novo cliente
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <article key={c.id} className="glass-card p-5 flex flex-col gap-2 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold tracking-tight text-sm">{c.name}</div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${STATUS_COLORS[c.status ?? "inactive"]}`}>
                    {STATUS_LABELS[c.status ?? "inactive"]}
                  </span>
                </div>
                {c.city && <div className="text-xs text-muted-foreground">{c.city}{c.state ? `, ${c.state}` : ""}</div>}
                {c.contact && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span>{c.contact}</span></div>}
                {c.phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="size-3" />{c.phone}</div>}
                {c.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="size-3" />{c.email}</div>}
                {c.lpUrl && (
                  <a href={c.lpUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Globe className="size-3" /> Ver Landing Page
                  </a>
                )}
                <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    {c.monthlyBudget ? `R$ ${Number(c.monthlyBudget).toLocaleString("pt-BR")}/mês` : "Sem orçamento"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing({ ...c, monthlyBudget: String(c.monthlyBudget ?? "") })}
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-md hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="size-3" /> Editar
                    </button>
                    <button onClick={() => setConfirmDelete(c)}
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-md hover:bg-destructive/10 text-xs text-destructive transition-colors">
                      <Trash2 className="size-3" /> Excluir
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {creating && <ClientModal title="Novo Cliente" initial={EMPTY_FORM} onSave={handleCreate} onClose={() => setCreating(false)} />}
      {editing && (
        <ClientModal title="Editar Cliente"
          initial={{ name: editing.name ?? "", city: editing.city ?? "", state: editing.state ?? "", status: editing.status ?? "active", plan: editing.plan ?? "", monthlyBudget: editing.monthlyBudget ?? "", contact: editing.contact ?? "", phone: editing.phone ?? "", email: editing.email ?? "", lpUrl: editing.lpUrl ?? "", notes: editing.notes ?? "" }}
          onSave={handleEdit} onClose={() => setEditing(null)} />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold">Excluir cliente</h2>
            <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir <strong>{confirmDelete.name}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-destructive text-white text-xs font-medium hover:bg-destructive/90 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
