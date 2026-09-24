import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, ArrowRight, Check, ChevronDown, Plus } from "lucide-react";
import {
  ActionsMenu,
  Button,
  CurrencyInput,
  Dialog,
  EmptyState,
  Field,
  StatTile,
  StatusBadge,
  Surface,
  SurfaceHeader,
  toastWithUndo,
} from "@/components/ds";
import { formatCurrency, formatMonthKey, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Cobranca, DatabaseState } from "../types";
import { MESES } from "../constants";
import { saveCobranca } from "../lib/firebase";
import { formatStoredDate } from "../lib/display";
import { MonthPicker } from "../components/MonthPicker";
import { NovaUnidadeDialog } from "../components/NovaUnidadeDialog";

interface TabFinanceiroProps {
  dbState: DatabaseState;
  onClientRegistered?: (cid: string) => void;
  onSelectClient?: (cid: string) => void;
  onCobrancaUpdated?: (cid: string, mesKey: string, cobranca: Cobranca) => void;
}

const SOCIOS = [
  { key: "patrono", label: "Patrono", pct: "30%" },
  { key: "davi", label: "Davi", pct: "30%" },
  { key: "lucas", label: "Lucas", pct: "30%" },
  { key: "ana", label: "Ana", pct: "10%" },
] as const;

/** Alternância "gerado / pendente" com o estado visível no próprio botão. */
function DocToggle({ done, doneLabel, label, disabled, onToggle }: { done: boolean; doneLabel: string; label: string; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={`${label}: ${done ? doneLabel.toLowerCase() : "pendente"}`}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-50",
        done ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15" : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-100",
      )}
    >
      <span className={cn("flex size-3.5 items-center justify-center rounded-[4px]", done ? "bg-emerald-400 text-zinc-950" : "border border-zinc-600")}>
        {done && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      {done ? doneLabel : "Pendente"}
    </button>
  );
}

export function TabFinanceiro({ dbState, onClientRegistered, onSelectClient, onCobrancaUpdated }: TabFinanceiroProps) {
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [showArquivados, setShowArquivados] = useState(false);

  const [mesCobKey, setMesCobKey] = useState(() => {
    const hoje = new Date();
    const currentKey = `${hoje.getFullYear()}_${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    return MESES.some((m) => m.k === currentKey) ? currentKey : "2026_09";
  });

  const [editRecModal, setEditRecModal] = useState<{ cid: string; mesKey: string; nome: string } | null>(null);
  const [editRecInput, setEditRecInput] = useState<number | null>(null);
  const [inputValoresRec, setInputValoresRec] = useState<Record<string, number | null>>({});
  const [savingCobrancas, setSavingCobrancas] = useState<Record<string, boolean>>({});

  const totalDespFixas = useMemo(
    () => Object.values(dbState.despFixas || {}).reduce((s, d) => s + parseFloat(String(d.val || 0)), 0),
    [dbState.despFixas],
  );

  const persistCobranca = async (
    cid: string,
    mesKey: string,
    updated: Cobranca,
    successMessage: string,
  ): Promise<boolean> => {
    const operationKey = `${cid}:${mesKey}`;
    if (savingCobrancas[operationKey]) return false;

    // Snapshot anterior para rollback se a gravação falhar
    const previous = dbState.cobrancas?.[cid]?.[mesKey];

    // Atualização otimista imediata na interface
    onCobrancaUpdated?.(cid, mesKey, updated);

    setSavingCobrancas((current) => ({ ...current, [operationKey]: true }));
    try {
      await saveCobranca(cid, mesKey, updated);
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (error) {
      console.error("Firebase financial write error:", error);
      // Reverte em caso de falha de rede
      if (previous) {
        onCobrancaUpdated?.(cid, mesKey, previous);
      }
      toast.error("Não foi possível salvar a alteração no financeiro. Tente novamente.");
      return false;
    } finally {
      setSavingCobrancas((current) => ({ ...current, [operationKey]: false }));
    }
  };

  const handleToggleCobField = async (
    cid: string,
    field: "boletoGerado" | "nfGerada",
    currentVal: boolean
  ) => {
    const existing = dbState.cobrancas?.[cid]?.[mesCobKey] || {
      mes: MESES.find((m) => m.k === mesCobKey)?.l || mesCobKey,
      boletoGerado: false,
      nfGerada: false,
      recebido: false,
      valorRecebido: null,
      divisao: null,
    };

    const updated = {
      ...existing,
      [field]: !currentVal,
    };
    await persistCobranca(
      cid,
      mesCobKey,
      updated,
      field === "boletoGerado"
        ? updated.boletoGerado
          ? "Boleto marcado como gerado."
          : "Boleto desmarcado."
        : updated.nfGerada
        ? "Nota fiscal marcada como gerada."
        : "Nota fiscal desmarcada."
    );
  };

  const handleConfirmarRecebimento = async (cid: string, fallbackVal: number) => {
    const typed = inputValoresRec[cid];
    const val = typed ?? fallbackVal;
    if (!val || val <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }

    const caixa = val * 0.5;
    const sobra = val * 0.5;
    const hoje = new Date();
    const em = `30/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;

    const existing = dbState.cobrancas?.[cid]?.[mesCobKey] || {
      mes: MESES.find((m) => m.k === mesCobKey)?.l || mesCobKey,
      boletoGerado: false,
      nfGerada: false,
    };

    const updated: Cobranca = {
      ...existing,
      recebido: true,
      valorRecebido: val,
      divisao: {
        caixa,
        patrono: sobra * 0.3,
        socio3: sobra * 0.3,
        davi: sobra * 0.3,
        lucas: sobra * 0.3,
        ana: sobra * 0.1,
        em,
      },
    };

    const ok = await persistCobranca(cid, mesCobKey, updated, "Recebimento confirmado");
    if (ok) {
      setInputValoresRec((prev) => {
        const copy = { ...prev };
        delete copy[cid];
        return copy;
      });
    }
  };

  const handleDesconfirmarRecebimento = async (
    cid: string,
    mesKey: string,
    clienteNome: string
  ) => {
    // Reversível: volta para pendente na hora e oferece "Desfazer" em vez de pedir confirmação.
    const previous = dbState.cobrancas?.[cid]?.[mesKey];
    const existing = previous || {
      mes: MESES.find((m) => m.k === mesKey)?.l || mesKey,
      boletoGerado: false,
      nfGerada: false,
    };

    const updated: Cobranca = {
      ...existing,
      recebido: false,
      valorRecebido: null,
      divisao: null,
    };

    const saved = await persistCobranca(cid, mesKey, updated, "");
    if (saved && previous) {
      toastWithUndo(`Recebimento de ${clienteNome} voltou para pendente.`, async () => {
        await persistCobranca(cid, mesKey, previous, "Recebimento restaurado.");
      });
    }
  };

  const handleSalvarEdicaoRecebimento = async () => {
    if (!editRecModal) return;
    const val = editRecInput ?? 0;
    if (!val || val <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    const { cid, mesKey } = editRecModal;
    const caixa = val * 0.5;
    const sobra = val * 0.5;
    const hoje = new Date();
    const em = `30/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;

    const existing = dbState.cobrancas?.[cid]?.[mesKey] || {
      mes: MESES.find((m) => m.k === mesKey)?.l || mesKey,
      boletoGerado: false,
      nfGerada: false,
    };

    const updated: Cobranca = {
      ...existing,
      recebido: true,
      valorRecebido: val,
      divisao: {
        caixa,
        patrono: sobra * 0.3,
        socio3: sobra * 0.3,
        davi: sobra * 0.3,
        lucas: sobra * 0.3,
        ana: sobra * 0.1,
        em,
      },
    };

    if (await persistCobranca(cid, mesKey, updated, "Recebimento atualizado.")) {
      setEditRecModal(null);
    }
  };

  const clientesOrdenadosPorVenc = useMemo(() => {
    return Object.values(dbState.clientes || {}).sort(
      (a, b) => parseInt(String(a.vencDia || 99)) - parseInt(String(b.vencDia || 99))
    );
  }, [dbState.clientes]);

  // Previsão detalhada para o mês selecionado (ex: Setembro 2026)
  const previsaoMes = useMemo(() => {
    // 1. Unidades pagantes ativas para este mês
    const unidadesAtivas = Object.values(dbState.clientes || {}).filter((c) => {
      const ini = c.mesInicial || "2026_07";
      return mesCobKey >= ini;
    });

    // 2. Faturamento previsto total das mensalidades cadastradas
    const faturamentoPrevisto = unidadesAtivas.reduce(
      (sum, c) => sum + parseFloat(String(c.mensalidade || 0)),
      0
    );

    // 3. Faturamento já confirmado e contagem de confirmados
    let faturamentoConfirmado = 0;
    let unidadesConfirmadasCount = 0;
    let boletosGeradosCount = 0;
    let nfsGeradasCount = 0;

    unidadesAtivas.forEach((c) => {
      const cb = dbState.cobrancas?.[c.id]?.[mesCobKey];
      if (cb?.boletoGerado) boletosGeradosCount++;
      if (cb?.nfGerada) nfsGeradasCount++;
      if (cb?.recebido && typeof cb.valorRecebido === "number" && cb.valorRecebido > 0) {
        faturamentoConfirmado += cb.valorRecebido;
        unidadesConfirmadasCount++;
      }
    });

    // 4. Despesas do mês
    const despFixasTotal = totalDespFixas;
    const despVariaveisTotal = Object.values(dbState.despesas || {})
      .filter((d) => d.mes === mesCobKey)
      .reduce((sum, d) => sum + parseFloat(String(d.val || 0)), 0);
    const totalDespesas = despFixasTotal + despVariaveisTotal;

    // 5. Lucro Líquido Previsto (Faturamento Previsto - Despesas Totais)
    const lucroTotalPrevisto = Math.max(0, faturamentoPrevisto - totalDespesas);
    const lucroTotalConfirmado = Math.max(0, faturamentoConfirmado - totalDespesas);

    // 6. Divisão Prevista (50% Caixa, 50% Sobra para Sócios: 30% Patrono, 30% Davi, 30% Lucas, 10% Ana)
    const caixaPrevisto = lucroTotalPrevisto * 0.5;
    const sobraPrevista = lucroTotalPrevisto * 0.5;
    const patronoPrevisto = sobraPrevista * 0.3;
    const daviPrevisto = sobraPrevista * 0.3;
    const lucasPrevisto = sobraPrevista * 0.3;
    const anaPrevisto = sobraPrevista * 0.1;

    // Divisão já confirmada
    const caixaConfirmado = lucroTotalConfirmado * 0.5;
    const sobraConfirmada = lucroTotalConfirmado * 0.5;
    const patronoConfirmado = sobraConfirmada * 0.3;
    const daviConfirmado = sobraConfirmada * 0.3;
    const lucasConfirmado = sobraConfirmada * 0.3;
    const anaConfirmado = sobraConfirmada * 0.1;

    const mesObj = MESES.find((m) => m.k === mesCobKey);
    const mesLabel = mesObj ? mesObj.l : mesCobKey;

    const progressoConfirmacao = faturamentoPrevisto > 0
      ? Math.round((faturamentoConfirmado / faturamentoPrevisto) * 100)
      : 0;

    return {
      mesKey: mesCobKey,
      mesLabel,
      unidadesAtivasCount: unidadesAtivas.length,
      unidadesConfirmadasCount,
      boletosGeradosCount,
      nfsGeradasCount,
      faturamentoPrevisto,
      faturamentoConfirmado,
      faturamentoPendente: Math.max(0, faturamentoPrevisto - faturamentoConfirmado),
      despFixasTotal,
      despVariaveisTotal,
      totalDespesas,
      lucroTotalPrevisto,
      lucroTotalConfirmado,
      caixaPrevisto,
      sobraPrevista,
      patronoPrevisto,
      daviPrevisto,
      lucasPrevisto,
      anaPrevisto,
      caixaConfirmado,
      patronoConfirmado,
      daviConfirmado,
      lucasConfirmado,
      anaConfirmado,
      progressoConfirmacao,
    };
  }, [dbState.clientes, dbState.cobrancas, dbState.despesas, totalDespFixas, mesCobKey]);

  const acumuladoSocios = useMemo(() => {
    const tot: Record<
      string,
      {
        mes: string;
        t: number;
        caixa: number;
        patrono: number;
        davi: number;
        lucas: number;
        ana: number;
        em: string;
      }
    > = {};

    Object.entries(dbState.cobrancas || {}).forEach(([_cid, meses]) => {
      Object.entries(meses || {}).forEach(([mk, cb]) => {
        if (!cb.recebido || !cb.divisao || !cb.valorRecebido) return;
        if (!tot[mk]) {
          tot[mk] = {
            mes: cb.mes || mk,
            t: 0,
            caixa: 0,
            patrono: 0,
            davi: 0,
            lucas: 0,
            ana: 0,
            em: cb.divisao.em,
          };
        }
        tot[mk].t += cb.valorRecebido;
        tot[mk].caixa += cb.divisao.caixa;
        tot[mk].patrono += cb.divisao.patrono || cb.divisao.socio3 || 0;
        tot[mk].davi += cb.divisao.davi;
        tot[mk].lucas += cb.divisao.lucas;
        tot[mk].ana += cb.divisao.ana;
      });
    });

    return Object.entries(tot).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dbState.cobrancas]);

  const historicalSocios = useMemo(() => {
    return acumuladoSocios.filter(([mk]) => mk !== mesCobKey);
  }, [acumuladoSocios, mesCobKey]);

  const arquivadosList = useMemo(() => {
    return Object.values(dbState.arquivados || {}).sort((a, b) =>
      (b.encerradoEm || "").localeCompare(a.encerradoEm || "")
    );
  }, [dbState.arquivados]);

  const cobrancasDoMes = clientesOrdenadosPorVenc.filter((c) => mesCobKey >= (c.mesInicial || "2026_07"));
  const mesLabel = formatMonthKey(mesCobKey, true);

  return (
    <div className="space-y-6">
      {/* Unidades */}
      <Surface>
        <SurfaceHeader
          title={`Unidades pagantes · ${clientesOrdenadosPorVenc.length}`}
          description="Abra uma unidade para ver a ficha, as cobranças e os checklists."
          actions={<Button variant="primary" onClick={() => setShowNewUnit(true)}><Plus />Nova unidade</Button>}
        />
        {clientesOrdenadosPorVenc.length === 0 ? (
          <EmptyState title="Nenhuma unidade cadastrada" description="Cadastre a primeira para acompanhar mensalidades e rotinas." />
        ) : (
          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clientesOrdenadosPorVenc.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectClient?.(c.id)}
                className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/40 px-4 py-3 text-left outline-none transition-colors hover:border-white/15 hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-100">{c.nome}</span>
                  <span className="block text-xs tabular-nums text-zinc-500">{formatCurrency(c.mensalidade)} · dia {c.vencDia || "—"}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
              </button>
            ))}
          </div>
        )}
      </Surface>

      {/* Cobranças do mês */}
      <Surface className="overflow-hidden">
        <SurfaceHeader
          title="Cobranças"
          description={`${previsaoMes.unidadesConfirmadasCount} de ${previsaoMes.unidadesAtivasCount} recebidas · ${formatCurrency(previsaoMes.faturamentoConfirmado)} de ${formatCurrency(previsaoMes.faturamentoPrevisto)}`}
          actions={<MonthPicker value={mesCobKey} onChange={setMesCobKey} label="Mês da cobrança" />}
        />
        {cobrancasDoMes.length === 0 ? (
          <EmptyState title={`Nenhuma cobrança em ${mesLabel}`} description="As unidades entram nas cobranças a partir do primeiro mês cadastrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Unidade</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Mensalidade</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Boleto</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Nota fiscal</th>
                  <th scope="col" className="py-2.5 pl-3 pr-5 font-medium">Recebimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {cobrancasDoMes.map((c) => {
                  const cb = dbState.cobrancas?.[c.id]?.[mesCobKey] || {
                    mes: MESES.find((m) => m.k === mesCobKey)?.l || mesCobKey,
                    boletoGerado: false,
                    nfGerada: false,
                    recebido: false,
                    valorRecebido: null,
                    divisao: null,
                  };
                  const val = parseFloat(String(c.mensalidade || 0));
                  const busy = Boolean(savingCobrancas[`${c.id}:${mesCobKey}`]);
                  return (
                    <tr key={c.id} className="text-zinc-300">
                      <td className="py-2.5 pl-5 pr-3">
                        <button type="button" onClick={() => onSelectClient?.(c.id)} className="whitespace-nowrap rounded-md text-left font-medium text-zinc-100 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-emerald-400/60">
                          {c.nome}
                        </button>
                        <span className="block text-xs text-zinc-500">vence dia {c.vencDia || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(val)}</td>
                      <td className="px-3 py-2.5">
                        <DocToggle label="Boleto" done={cb.boletoGerado} doneLabel="Gerado" disabled={busy} onToggle={() => void handleToggleCobField(c.id, "boletoGerado", cb.boletoGerado)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <DocToggle label="Nota fiscal" done={cb.nfGerada} doneLabel="Gerada" disabled={busy} onToggle={() => void handleToggleCobField(c.id, "nfGerada", cb.nfGerada)} />
                      </td>
                      <td className="py-2 pl-3 pr-5">
                        {cb.recebido ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge tone="good">{formatCurrency(cb.valorRecebido)}</StatusBadge>
                            {cb.divisao?.em && <span className="text-xs text-zinc-500">dividido em {formatStoredDate(cb.divisao.em)}</span>}
                            <span className="ml-auto">
                              <ActionsMenu
                                label={`Ações do recebimento de ${c.nome}`}
                                size="sm"
                                items={[
                                  { label: "Editar valor recebido", onSelect: () => { setEditRecModal({ cid: c.id, mesKey: mesCobKey, nome: c.nome }); setEditRecInput(cb.valorRecebido || val); } },
                                  { label: "Voltar para pendente", disabled: busy, onSelect: () => void handleDesconfirmarRecebimento(c.id, mesCobKey, c.nome) },
                                ]}
                              />
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-36">
                              <CurrencyInput
                                aria-label={`Valor recebido de ${c.nome}`}
                                value={inputValoresRec[c.id] ?? null}
                                placeholder={formatNumber(val, 2)}
                                onValueChange={(v) => setInputValoresRec((prev) => ({ ...prev, [c.id]: v }))}
                              />
                            </div>
                            <Button size="sm" variant="secondary" loading={busy} onClick={() => void handleConfirmarRecebimento(c.id, val)}>
                              Confirmar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      {/* Previsão e divisão */}
      <Surface>
        <SurfaceHeader
          title={`Previsão de ${mesLabel}`}
          description={`${previsaoMes.unidadesAtivasCount} unidades pagantes · repasse previsto para o dia 30. Mude o mês em Cobranças.`}
        />
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Faturamento previsto" value={formatCurrency(previsaoMes.faturamentoPrevisto)} hint={`${formatCurrency(previsaoMes.faturamentoConfirmado)} já recebido`} />
            <StatTile label="Despesas previstas" value={formatCurrency(previsaoMes.totalDespesas)} hint={`Fixas ${formatCurrency(previsaoMes.despFixasTotal)} · do mês ${formatCurrency(previsaoMes.despVariaveisTotal)}`} />
            <StatTile label="Lucro previsto" value={formatCurrency(previsaoMes.lucroTotalPrevisto)} hint={previsaoMes.lucroTotalConfirmado > 0 ? `${formatCurrency(previsaoMes.lucroTotalConfirmado)} com o que já entrou` : "Faturamento − despesas"} />
            <StatTile label="Caixa da empresa (50%)" value={formatCurrency(previsaoMes.caixaPrevisto)} hint="Metade do lucro fica na empresa" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-200">
              Divisão entre sócios <span className="font-normal text-zinc-500">· outros 50%: {formatCurrency(previsaoMes.sobraPrevista)}</span>
            </h3>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
              {SOCIOS.map((s) => {
                const previsto = previsaoMes[`${s.key}Previsto` as const];
                const confirmado = previsaoMes[`${s.key}Confirmado` as const];
                return (
                  <div key={s.key} className="bg-zinc-900 px-4 py-3">
                    <dt className="text-xs text-zinc-400">{s.label} · {s.pct}</dt>
                    <dd className="mt-0.5 text-base font-medium tabular-nums text-zinc-100">{formatCurrency(previsto)}</dd>
                    {confirmado > 0 && <dd className="text-xs tabular-nums text-zinc-500">{formatCurrency(confirmado)} já confirmado</dd>}
                  </div>
                );
              })}
            </dl>
          </div>
        </div>

        <div className="border-t border-white/[0.06]">
          <h3 className="px-5 pb-2 pt-4 text-sm font-medium text-zinc-200">Demonstrativo mensal</h3>
          {historicalSocios.length === 0 && previsaoMes.faturamentoPrevisto === 0 ? (
            <p className="px-5 pb-5 text-sm text-zinc-500">Nenhum recebimento confirmado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                    <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Mês</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Caixa · 50%</th>
                    {SOCIOS.map((s) => (
                      <th key={s.key} scope="col" className="px-3 py-2.5 text-right font-medium last:pr-5">{s.label} · {s.pct}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                  {previsaoMes.faturamentoPrevisto > 0 && (
                    <tr className="bg-white/[0.03]">
                      <td className="py-2.5 pl-5 pr-3">
                        <span className="font-medium text-zinc-100">{mesLabel}</span>{" "}
                        <StatusBadge tone="info" className="ml-1">Previsão</StatusBadge>
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-100">{formatCurrency(previsaoMes.lucroTotalPrevisto)}</td>
                      <td className="px-3 py-2.5 text-right">{formatCurrency(previsaoMes.caixaPrevisto)}</td>
                      {SOCIOS.map((s) => (
                        <td key={s.key} className="px-3 py-2.5 text-right last:pr-5">{formatCurrency(previsaoMes[`${s.key}Previsto` as const])}</td>
                      ))}
                    </tr>
                  )}
                  {historicalSocios.map(([mk, t]) => (
                    <tr key={mk}>
                      <td className="py-2.5 pl-5 pr-3 text-zinc-100">{formatMonthKey(mk, true)}</td>
                      <td className="px-3 py-2.5 text-right text-zinc-100">{formatCurrency(t.t)}</td>
                      <td className="px-3 py-2.5 text-right">{formatCurrency(t.caixa)}</td>
                      {SOCIOS.map((s) => (
                        <td key={s.key} className="px-3 py-2.5 text-right last:pr-5">{formatCurrency(t[s.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Surface>

      {/* Unidades encerradas */}
      {arquivadosList.length > 0 && (
        <Surface className="overflow-hidden">
          <button
            type="button"
            aria-expanded={showArquivados}
            onClick={() => setShowArquivados(!showArquivados)}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left outline-none hover:bg-white/[0.02] focus-visible:bg-white/[0.04]"
          >
            <Archive className="size-4 text-zinc-500" />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-zinc-100">Unidades encerradas · {arquivadosList.length}</span>
              <span className="block text-sm text-zinc-400">Histórico financeiro de contratos finalizados.</span>
            </span>
            <ChevronDown className={cn("size-4 text-zinc-400 transition-transform", showArquivados && "rotate-180")} />
          </button>
          {showArquivados && (
            <div className="overflow-x-auto border-t border-white/[0.06]">
              <table className="w-full min-w-[760px] text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                    <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Unidade</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Encerrada</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Meses pagos</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Caixa</th>
                    {SOCIOS.map((s) => (
                      <th key={s.key} scope="col" className="px-3 py-2.5 text-right font-medium last:pr-5">{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                  {arquivadosList.map((a, i) => {
                    const pagas = Object.values(a.cobrancas || {}).filter((c) => c.recebido);
                    const totalRec = pagas.reduce((s, c) => s + (c.valorRecebido || 0), 0);
                    const sobra = totalRec * 0.5;
                    const share = { patrono: sobra * 0.3, davi: sobra * 0.3, lucas: sobra * 0.3, ana: sobra * 0.1 };
                    return (
                      <tr key={i}>
                        <td className="py-2.5 pl-5 pr-3">
                          <span className="block text-zinc-100">{a.nome}</span>
                          <span className="block text-xs text-zinc-500">{a.cnpj || "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400">{formatStoredDate(a.encerradoEm, true)}{a.encerradoPor ? ` · ${a.encerradoPor}` : ""}</td>
                        <td className="px-3 py-2.5 text-right">{pagas.length}</td>
                        <td className="px-3 py-2.5 text-right text-zinc-100">{formatCurrency(totalRec)}</td>
                        <td className="px-3 py-2.5 text-right">{formatCurrency(totalRec * 0.5)}</td>
                        {SOCIOS.map((s) => (
                          <td key={s.key} className="px-3 py-2.5 text-right last:pr-5">{formatCurrency(share[s.key])}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      )}

      <NovaUnidadeDialog open={showNewUnit} onOpenChange={setShowNewUnit} dbState={dbState} onCreated={onClientRegistered} />

      <Dialog
        open={Boolean(editRecModal)}
        onOpenChange={(open) => { if (!open) setEditRecModal(null); }}
        size="sm"
        title="Editar valor recebido"
        description={editRecModal ? `${editRecModal.nome} · ${formatMonthKey(editRecModal.mesKey, true)}. A divisão é recalculada.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditRecModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={() => void handleSalvarEdicaoRecebimento()}>Salvar</Button>
          </>
        }
      >
        <Field label="Valor recebido" htmlFor="edit-rec-valor">
          <CurrencyInput id="edit-rec-valor" autoFocus value={editRecInput} onValueChange={setEditRecInput} />
        </Field>
      </Dialog>
    </div>
  );
}
