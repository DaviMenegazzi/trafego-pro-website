import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Plus, Receipt } from "lucide-react";
import { ActionsMenu, Button, EmptyState, Select, StatusBadge, Surface, SurfaceHeader, useConfirm } from "@/components/ds";
import { formatCurrency, formatMonthKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Despesa, DatabaseState } from "../types";
import { MESES, now } from "../constants";
import { deleteDespesa, saveDespesa } from "../lib/firebase";
import { ModalEditarDespesa } from "../components/ModalEditarDespesa";
import { CaixaDespesasFixas } from "../components/CaixaDespesasFixas";

interface TabDespesasProps {
  dbState: DatabaseState;
}

export function TabDespesas({ dbState }: TabDespesasProps) {
  const { confirm } = useConfirm();
  const [filtroMes, setFiltroMes] = useState("");
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [creating, setCreating] = useState(false);

  const handleToggleStatus = async (d: Despesa) => {
    const newStatus = d.status === "paga" ? "pendente" : "paga";
    await saveDespesa({
      ...d,
      status: newStatus,
      editadoEm: now(),
    });
  };

  const handleDeleteDespesa = async (d: Despesa) => {
    const ok = await confirm({ title: `Excluir a despesa "${d.nome}"?`, description: `${formatCurrency(d.val)} deixa de contar no mês. Não dá para desfazer.`, tone: "danger", confirmLabel: "Excluir despesa" });
    if (!ok) return;
    await deleteDespesa(d.id);
    toast.success("Despesa excluída");
  };

  const handleSaveDespesa = async (id: string | null, data: Omit<Despesa, "id">) => {
    if (!id) {
      await saveDespesa({ ...data, id: `desp_${Date.now()}`, criadoEm: now() });
      toast.success(`Despesa "${data.nome}" lançada`);
      return;
    }
    const existing = dbState.despesas?.[id];
    if (!existing) return;
    await saveDespesa({ ...existing, ...data, id, editadoEm: now() });
    toast.success("Despesa atualizada");
  };

  const despesasFiltradas = useMemo(() => {
    return Object.values(dbState.despesas || {})
      .filter((d) => !filtroMes || d.mes === filtroMes)
      .sort((a, b) => {
        if (a.mes !== b.mes) return a.mes.localeCompare(b.mes);
        return a.dia - b.dia;
      });
  }, [dbState.despesas, filtroMes]);

  const resumoMeses = useMemo(() => {
    const porMes: Record<
      string,
      { mes: string; total: number; pagas: number; pend: number }
    > = {};

    Object.values(dbState.despesas || {}).forEach((d) => {
      if (!porMes[d.mes]) {
        porMes[d.mes] = {
          mes: MESES.find((m) => m.k === d.mes)?.l || d.mes,
          total: 0,
          pagas: 0,
          pend: 0,
        };
      }
      porMes[d.mes].total += d.val;
      if (d.status === "paga") porMes[d.mes].pagas += d.val;
      else porMes[d.mes].pend += d.val;
    });

    return Object.entries(porMes).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dbState.despesas]);

  return (
    <div className="space-y-6">
      <Surface className="overflow-hidden">
        <SurfaceHeader
          icon={<Receipt />}
          accent="orange"
          title={`Despesas da operação · ${despesasFiltradas.length}`}
          description="Clique na situação para alternar entre pendente e paga."
          actions={
            <>
              <Select
                aria-label="Mês"
                value={filtroMes}
                onValueChange={setFiltroMes}
                className="w-44"
                placeholder="Todos os meses"
                options={[{ value: "", label: "Todos os meses" }, ...MESES.map((m) => ({ value: m.k, label: m.l }))]}
              />
              <Button variant="primary" onClick={() => setCreating(true)}><Plus />Nova despesa</Button>
            </>
          }
        />
        {despesasFiltradas.length === 0 ? (
          <EmptyState title="Nenhuma despesa neste mês" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Despesa</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Categoria</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Competência</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Valor</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Situação</th>
                  <th scope="col" className="py-2.5 pl-3 pr-5"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                {despesasFiltradas.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 pl-5 pr-3">
                      <span className="block text-zinc-100">{d.nome}</span>
                      {d.desc && <span className="block text-xs text-zinc-500">{d.desc}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{d.cat || "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatMonthKey(d.mes)} · dia {d.dia}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-100">{formatCurrency(d.val)}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(d)}
                        aria-label={`${d.nome}: ${d.status === "paga" ? "paga" : "pendente"}. Alternar situação`}
                        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                      >
                        <StatusBadge tone={d.status === "paga" ? "good" : "warning"} className={cn("cursor-pointer")}>{d.status === "paga" ? "Paga" : "Pendente"}</StatusBadge>
                      </button>
                    </td>
                    <td className="py-2 pl-3 pr-5 text-right">
                      <ActionsMenu
                        label={`Ações de ${d.nome}`}
                        size="sm"
                        items={[
                          { label: "Editar", onSelect: () => setEditingDespesa(d) },
                          { label: "Excluir", tone: "danger", onSelect: () => void handleDeleteDespesa(d) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <CaixaDespesasFixas dbState={dbState} />

      <Surface className="overflow-hidden">
        <SurfaceHeader icon={<CalendarRange />} accent="blue" title="Resumo por mês" />
        {resumoMeses.length === 0 ? (
          <p className="px-5 py-4 text-sm text-zinc-500">Nenhuma despesa ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm tabular-nums">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Mês</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Pagas</th>
                  <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-medium">Pendentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                {resumoMeses.map(([mk, m]) => (
                  <tr key={mk}>
                    <td className="py-2.5 pl-5 pr-3 text-zinc-100">{formatMonthKey(mk, true)}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-100">{formatCurrency(m.total)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(m.pagas)}</td>
                    <td className={cn("py-2.5 pl-3 pr-5 text-right", m.pend > 0 && "text-amber-300")}>{formatCurrency(m.pend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <ModalEditarDespesa
        despesa={editingDespesa}
        isOpen={Boolean(editingDespesa) || creating}
        defaultMes={filtroMes || undefined}
        onClose={() => { setEditingDespesa(null); setCreating(false); }}
        onSave={handleSaveDespesa}
      />
    </div>
  );
}
