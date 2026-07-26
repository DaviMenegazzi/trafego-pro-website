import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import { CreditCard, Plus, Pencil, Trash2, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";

function useAuthGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => { if (!localStorage.getItem("tp_token")) setLocation("/login"); }, [setLocation]);
}

type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";
type Payment = {
  id: string; clientId: string; clientName: string; description: string;
  amount: number; dueDate: string; paidDate?: string; status: PaymentStatus; method?: string;
};

const STATUS_LABELS: Record<PaymentStatus, string> = { pending: "Pendente", paid: "Pago", overdue: "Vencido", cancelled: "Cancelado" };
const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]",
  paid: "bg-[rgba(34,197,94,0.15)] text-[#22c55e]",
  overdue: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted/40 text-muted-foreground",
};

function fmtBRL(v: number) { return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtDate(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

type FilterTab = "all" | PaymentStatus;

export default function DashboardPagamentosPage() {
  useAuthGuard();
  useEffect(() => { document.title = "Tráfego Pro - Pagamentos"; }, []);
  const { clients } = useClientContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tp_payments");
    if (saved) { try { setPayments(JSON.parse(saved)); } catch {} }
  }, []);
  function save(list: Payment[]) { setPayments(list); localStorage.setItem("tp_payments", JSON.stringify(list)); }

  const filtered = filter === "all" ? payments : payments.filter(p => p.status === filter);
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === "overdue").reduce((s, p) => s + p.amount, 0);

  function PaymentForm({ initial, onSave, onClose, title }: { initial: Partial<Payment>; onSave: (p: Payment) => void; onClose: () => void; title: string }) {
    const [form, setForm] = useState({
      clientId: initial.clientId ?? (clients[0]?.id ?? ""),
      description: initial.description ?? "",
      amount: initial.amount ? String(initial.amount) : "",
      dueDate: initial.dueDate ?? "",
      paidDate: initial.paidDate ?? "",
      status: initial.status ?? "pending" as PaymentStatus,
      method: initial.method ?? "",
    });
    function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
    function submit(e: React.FormEvent) {
      e.preventDefault();
      if (!form.description.trim() || !form.amount || !form.dueDate) { toast.error("Preencha os campos obrigatórios"); return; }
      const client = clients.find(c => String(c.id) === String(form.clientId));
      onSave({
        id: initial.id ?? Date.now().toString(),
        clientId: String(form.clientId),
        clientName: client?.name ?? "—",
        description: form.description.trim(),
        amount: Number(form.amount),
        dueDate: form.dueDate,
        paidDate: form.paidDate || undefined,
        status: form.status,
        method: form.method || undefined,
      });
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
        <div className="glass-card w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground"><X className="size-4" /></button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cliente</label>
              <select value={form.clientId} onChange={e => set("clientId", e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary">
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição *</label>
              <input value={form.description} onChange={e => set("description", e.target.value)} required
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor (R$) *</label>
                <input value={form.amount} onChange={e => set("amount", e.target.value)} type="number" min="0" step="0.01" required
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Vencimento *</label>
                <input value={form.dueDate} onChange={e => set("dueDate", e.target.value)} type="date" required
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select value={form.status} onChange={e => set("status", e.target.value)}
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary">
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                  <option value="overdue">Vencido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data Pagamento</label>
                <input value={form.paidDate} onChange={e => set("paidDate", e.target.value)} type="date"
                  className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Método de Pagamento</label>
              <input value={form.method} onChange={e => set("method", e.target.value)} placeholder="Pix, Boleto, Cartão..."
                className="w-full text-sm rounded-lg border border-border bg-muted/20 px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 space-y-6 max-w-[1400px] mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="size-5 text-primary" /> Pagamentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Controle financeiro dos clientes</p>
          </div>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="size-3.5" /> Novo pagamento
          </button>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Recebido", value: fmtBRL(totalPaid), color: "text-[#22c55e]" },
            { label: "A Receber", value: fmtBRL(totalPending), color: "text-[#f59e0b]" },
            { label: "Vencido", value: fmtBRL(totalOverdue), color: "text-destructive" },
          ].map(k => (
            <div key={k.label} className="glass-card p-4">
              <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
              <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {([["all","Todos"],["pending","Pendentes"],["paid","Pagos"],["overdue","Vencidos"],["cancelled","Cancelados"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v as FilterTab)}
              className={`h-8 px-3 rounded-full border text-xs transition ${filter === v ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {payments.length === 0 ? "Nenhum pagamento cadastrado. Clique em \"Novo pagamento\" para começar." : "Nenhum pagamento neste filtro."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="th-cell text-left">Cliente</th>
                    <th className="th-cell text-left">Descrição</th>
                    <th className="th-cell text-right">Valor</th>
                    <th className="th-cell text-center">Vencimento</th>
                    <th className="th-cell text-center">Pagamento</th>
                    <th className="th-cell text-left">Método</th>
                    <th className="th-cell text-center">Status</th>
                    <th className="th-cell text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="td-cell font-medium">{p.clientName}</td>
                      <td className="td-cell text-muted-foreground">{p.description}</td>
                      <td className="td-cell text-right font-medium">{fmtBRL(p.amount)}</td>
                      <td className="td-cell text-center">{fmtDate(p.dueDate)}</td>
                      <td className="td-cell text-center">{p.paidDate ? fmtDate(p.paidDate) : "—"}</td>
                      <td className="td-cell text-muted-foreground">{p.method ?? "—"}</td>
                      <td className="td-cell text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                      </td>
                      <td className="td-cell text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditing(p)} className="size-6 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground"><Pencil className="size-3" /></button>
                          <button onClick={() => setConfirmDelete(p)} className="size-6 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {adding && <PaymentForm title="Novo Pagamento" initial={{}} onSave={p => { save([...payments, p]); setAdding(false); toast.success("Pagamento adicionado"); }} onClose={() => setAdding(false)} />}
      {editing && <PaymentForm title="Editar Pagamento" initial={editing} onSave={p => { save(payments.map(x => x.id === p.id ? p : x)); setEditing(null); toast.success("Pagamento atualizado"); }} onClose={() => setEditing(null)} />}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold">Excluir pagamento</h2>
            <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este pagamento?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted/20 transition-colors">Cancelar</button>
              <button onClick={() => { save(payments.filter(p => p.id !== confirmDelete.id)); setConfirmDelete(null); toast.success("Pagamento excluído"); }}
                className="px-4 py-2 rounded-lg bg-destructive text-white text-xs font-medium hover:bg-destructive/90 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
