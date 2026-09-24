import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronDown, Pencil, Plus, X } from "lucide-react";
import {
  ActionsMenu,
  Button,
  Dialog,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Surface,
  useConfirm,
} from "@/components/ds";
import { formatCurrency, formatMonthKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Cliente, ChecklistItemState, DatabaseState } from "../types";
import { CL_FIN, CL_SOC, CL_TRAF, now } from "../constants";
import { deleteChecklistItem, deleteClienteAndArchive, saveChecklistItem, saveCliente } from "../lib/firebase";
import { ModalEditarCliente } from "../components/ModalEditarCliente";
import { formatPerson, formatStoredDate } from "../lib/display";

interface TabClienteDetalhesProps {
  clientId: string;
  dbState: DatabaseState;
  currentUser?: string;
  onClientDeleted?: () => void;
  onBack?: () => void;
  onExport?: () => void;
}

type Tipo = "fin" | "traf" | "soc";
type Item = { id: string; t: string; extra?: boolean };

const CHECKLISTS: { tipo: Tipo; titulo: string; items: { id: string; g: string; t: string }[] }[] = [
  { tipo: "fin", titulo: "Financeiro", items: CL_FIN },
  { tipo: "traf", titulo: "Tráfego", items: CL_TRAF },
  { tipo: "soc", titulo: "Social media", items: CL_SOC },
];

const NEW_GROUP = "__novo__";

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-zinc-400">{done}/{total}</span>
    </div>
  );
}

export function TabClienteDetalhes({ clientId, dbState, currentUser = "admin", onClientDeleted, onBack, onExport }: TabClienteDetalhesProps) {
  const { confirm } = useConfirm();
  const cliente = dbState.clientes?.[clientId];
  const checks = dbState.checklists?.[clientId] || {};

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addFor, setAddFor] = useState<Tipo | null>(null);
  const [extraTexto, setExtraTexto] = useState("");
  const [extraGrupo, setExtraGrupo] = useState("");
  const [extraNovoGrupo, setExtraNovoGrupo] = useState("");
  const [extraError, setExtraError] = useState("");
  // Grupos abertos/fechados à mão; sem escolha, abre só o primeiro incompleto de cada checklist.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const lists = useMemo(
    () =>
      CHECKLISTS.map(({ tipo, titulo, items }) => {
        const grupos: Record<string, Item[]> = {};
        items.forEach((i) => { (grupos[i.g] ??= []).push(i); });
        Object.entries(checks)
          .filter(([k, v]) => k.startsWith(`extra_${tipo}_`) && v.texto)
          .forEach(([k, v]) => { (grupos[v.grupo || "Demandas adicionais"] ??= []).push({ id: k, t: v.texto!, extra: true }); });
        const entries = Object.entries(grupos).map(([g, its]) => ({ g, items: its, done: its.filter((i) => checks[i.id]?.marcado).length }));
        const firstIncomplete = entries.find((e) => e.done < e.items.length)?.g;
        return {
          tipo,
          titulo,
          grupos: entries,
          firstIncomplete,
          done: entries.reduce((s, e) => s + e.done, 0),
          total: entries.reduce((s, e) => s + e.items.length, 0),
        };
      }),
    [checks],
  );

  if (!cliente) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft />Financeiro</Button>
        <Surface className="p-8 text-center text-sm text-zinc-400">Unidade não encontrada ou já encerrada.</Surface>
      </div>
    );
  }

  const handleUpdateCliente = async (cid: string, updated: Partial<Cliente>) => {
    const merged = { ...cliente, ...updated, editadoEm: now(), editadoPor: currentUser };
    await saveCliente(merged);
  };

  const handleExcluirCliente = async () => {
    const ok = await confirm({
      title: `Encerrar a unidade "${cliente.nome}"?`,
      description: "O histórico financeiro fica arquivado. Checklists e dados cadastrais são removidos e não voltam.",
      tone: "danger",
      confirmLabel: "Encerrar unidade",
    });
    if (!ok) return;

    const archiveData = {
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      mensalidade: cliente.mensalidade,
      encerradoEm: now(),
      encerradoPor: currentUser,
      cobrancas: dbState.cobrancas?.[clientId] || {},
    };

    try {
      await deleteClienteAndArchive(clientId, archiveData);
      if (onClientDeleted) onClientDeleted();
    } catch (err: any) {
      toast.error("Não foi possível encerrar a unidade: " + err.message);
    }
  };

  const handleToggleCheck = async (
    checkId: string,
    currentMarcado: boolean,
    existingData?: ChecklistItemState
  ) => {
    const nextMarcado = !currentMarcado;
    const itemData: ChecklistItemState = {
      ...(existingData || {}),
      marcado: nextMarcado,
      por: nextMarcado ? currentUser : null,
      quando: nextMarcado ? now() : null,
    };
    await saveChecklistItem(clientId, checkId, itemData);
  };

  const handleSalvarExtra = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addFor) return;
    const texto = extraTexto.trim();
    if (!texto) {
      setExtraError("Descreva a demanda");
      return;
    }
    const grupo = extraGrupo === NEW_GROUP ? extraNovoGrupo.trim() || "Demandas adicionais" : extraGrupo || "Demandas adicionais";
    await saveChecklistItem(clientId, `extra_${addFor}_${Date.now()}`, {
      texto,
      grupo,
      marcado: false,
      por: null,
      quando: null,
      extra: true,
    });
    setExtraTexto(""); setExtraNovoGrupo(""); setExtraError(""); setAddFor(null);
  };

  const handleRemoverExtra = async (checkId: string) => {
    const ok = await confirm({ title: "Remover esta demanda?", description: "O item sai do checklist da unidade.", tone: "danger", confirmLabel: "Remover" });
    if (!ok) return;
    await deleteChecklistItem(clientId, checkId);
  };

  const addList = lists.find((l) => l.tipo === addFor);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}><ArrowLeft />Financeiro</Button>
        <PageHeader
          title={cliente.nome}
          subtitle={`${formatCurrency(cliente.mensalidade)} por mês · vence dia ${cliente.vencDia || "—"}`}
          actions={
            <>
              <Button variant="secondary" onClick={() => setEditModalOpen(true)}><Pencil />Editar</Button>
              <ActionsMenu
                label="Mais ações da unidade"
                items={[
                  ...(onExport ? [{ label: "Exportar planilha", onSelect: onExport }] : []),
                  { label: "Encerrar unidade", tone: "danger" as const, onSelect: () => void handleExcluirCliente() },
                ]}
              />
            </>
          }
        />
      </div>

      <Surface className="p-5">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["CNPJ", cliente.cnpj],
            ["Endereço", cliente.endereco],
            ["Responsável pela unidade", cliente.respUnid],
            ["Responsável financeiro", cliente.respFin],
            ["E-mail para boleto", cliente.emailBol],
            ["Início da operação", cliente.dataInicio ? formatStoredDate(cliente.dataInicio, true) : ""],
            ["Primeiro mês de cobrança", cliente.mesInicial ? formatMonthKey(cliente.mesInicial, true) : ""],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(0,11rem)_1fr] gap-3">
              <dt className="text-zinc-400">{label}</dt>
              <dd className="min-w-0 break-words text-zinc-100">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </Surface>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {lists.map((list) => (
          <Surface key={list.tipo} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
              <h2 className="text-sm font-semibold text-zinc-100">Checklist {list.titulo.toLowerCase()}</h2>
              <Progress done={list.done} total={list.total} />
            </div>
            <div className="divide-y divide-white/[0.06]">
              {list.grupos.map(({ g, items, done }) => {
                const key = `${list.tipo}:${g}`;
                const isOpen = openGroups[key] ?? g === list.firstIncomplete;
                return (
                  <div key={g}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenGroups((c) => ({ ...c, [key]: !isOpen }))}
                      className="flex w-full items-center gap-2 px-5 py-2.5 text-left outline-none hover:bg-white/[0.02] focus-visible:bg-white/[0.04]"
                    >
                      <ChevronDown className={cn("size-4 shrink-0 text-zinc-500 transition-transform", !isOpen && "-rotate-90")} />
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{g}</span>
                      <span className={cn("text-xs tabular-nums", done === items.length ? "text-emerald-300" : "text-zinc-500")}>{done}/{items.length}</span>
                    </button>
                    {isOpen && (
                      <ul className="space-y-1 px-3 pb-3">
                        {items.map((i) => {
                          const state = checks[i.id];
                          const isDone = state?.marcado || false;
                          return (
                            <li key={i.id} className="group flex items-start gap-1">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={isDone}
                                onClick={() => void handleToggleCheck(i.id, isDone, state)}
                                className="flex min-w-0 flex-1 items-start gap-2.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                              >
                                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px]", isDone ? "bg-emerald-400 text-zinc-950" : "border border-zinc-600")}>
                                  {isDone && <Check className="size-3" strokeWidth={3} />}
                                </span>
                                <span className="min-w-0">
                                  <span className={cn("block text-sm leading-5", isDone ? "text-zinc-500 line-through" : "text-zinc-200")}>{i.t}</span>
                                  {isDone && state?.por && (
                                    <span className="block text-xs text-zinc-500">{[formatPerson(state.por), state.quando ? formatStoredDate(state.quando) : null].filter(Boolean).join(" · ")}</span>
                                  )}
                                </span>
                              </button>
                              {i.extra && (
                                <IconButton label="Remover demanda" size="sm" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" icon={<X />} onClick={() => void handleRemoverExtra(i.id)} />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/[0.06] p-3">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => { setAddFor(list.tipo); setExtraGrupo(""); setExtraError(""); }}>
                <Plus />Adicionar demanda
              </Button>
            </div>
          </Surface>
        ))}
      </div>

      <Dialog
        open={Boolean(addFor)}
        onOpenChange={(open) => { if (!open) setAddFor(null); }}
        size="sm"
        title="Adicionar demanda"
        description={addList ? `Checklist ${addList.titulo.toLowerCase()}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddFor(null)}>Cancelar</Button>
            <Button type="submit" form="demanda-form" variant="primary">Adicionar</Button>
          </>
        }
      >
        <form id="demanda-form" onSubmit={handleSalvarExtra} noValidate className="space-y-4">
          <Field label="Demanda" htmlFor="demanda-texto" required error={extraError}>
            <Input id="demanda-texto" autoFocus value={extraTexto} aria-invalid={Boolean(extraError) || undefined} onChange={(e) => { setExtraTexto(e.target.value); setExtraError(""); }} />
          </Field>
          <Field label="Grupo">
            <Select
              aria-label="Grupo"
              value={extraGrupo}
              onValueChange={setExtraGrupo}
              placeholder="Demandas adicionais"
              options={[...(addList?.grupos.map((gr) => ({ value: gr.g, label: gr.g })) ?? []), { value: NEW_GROUP, label: "Novo grupo…" }]}
            />
          </Field>
          {extraGrupo === NEW_GROUP && (
            <Field label="Nome do novo grupo" htmlFor="demanda-grupo">
              <Input id="demanda-grupo" value={extraNovoGrupo} onChange={(e) => setExtraNovoGrupo(e.target.value)} />
            </Field>
          )}
        </form>
      </Dialog>

      <ModalEditarCliente cliente={cliente} isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} onSave={handleUpdateCliente} />
    </div>
  );
}
