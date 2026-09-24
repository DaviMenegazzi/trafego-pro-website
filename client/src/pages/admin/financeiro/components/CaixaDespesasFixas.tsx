import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, CurrencyInput, Field, IconButton, Input, InlineNotice, StatTile, Surface, SurfaceHeader, useConfirm } from "@/components/ds";
import { formatCurrency } from "@/lib/format";
import type { DatabaseState } from "../types";
import { now } from "../constants";
import { deleteDespesaFixa, saveCaixa, saveDespesaFixa } from "../lib/firebase";

/**
 * Caixa e despesas fixas da empresa (não das unidades).
 *
 * O saldo antes era copiado para o estado uma única vez, na montagem — quando o
 * Firebase ainda não tinha respondido. O campo ficava em 0 e "Salvar caixa"
 * gravava 0 por cima do saldo real. Agora o rascunho acompanha o banco até ser
 * editado, e só é enviado quando há alteração.
 */
export function CaixaDespesasFixas({ dbState }: { dbState: DatabaseState }) {
  const { confirm } = useConfirm();
  const stored = dbState.caixa ?? { saldo: 0, metaFimAno: 0 };
  const [draft, setDraft] = useState<{ saldo: number | null; meta: number | null } | null>(null);
  const saldo = draft ? draft.saldo ?? 0 : Number(stored.saldo || 0);
  const meta = draft ? draft.meta ?? 0 : Number(stored.metaFimAno || 0);
  const dirty = draft !== null && (saldo !== Number(stored.saldo || 0) || meta !== Number(stored.metaFimAno || 0));
  const [savingCaixa, setSavingCaixa] = useState(false);

  // Se outra pessoa salvar enquanto este rascunho não foi mexido, mostra o valor novo.
  useEffect(() => {
    if (draft && !dirty) setDraft(null);
  }, [stored.saldo, stored.metaFimAno]); // eslint-disable-line react-hooks/exhaustive-deps

  const [dfNome, setDfNome] = useState("");
  const [dfVal, setDfVal] = useState<number | null>(null);
  const [dfDesc, setDfDesc] = useState("");
  const [dfErrors, setDfErrors] = useState<{ nome?: string; val?: string }>({});

  const despFixas = Object.values(dbState.despFixas || {});
  const totalDespFixas = despFixas.reduce((s, d) => s + Number(d.val || 0), 0);
  const mesesRestantes = Math.max(1, 12 - new Date().getMonth());
  const receitaMedMes = useMemo(() => {
    const recs: number[] = [];
    Object.values(dbState.cobrancas || {}).forEach((m) =>
      Object.values(m || {}).forEach((c) => { if (c.recebido && c.valorRecebido) recs.push(c.valorRecebido); }),
    );
    return recs.length ? recs.reduce((a, b) => a + b, 0) / recs.length : 0;
  }, [dbState.cobrancas]);
  const projecao = saldo + receitaMedMes * mesesRestantes - totalDespFixas * mesesRestantes;

  const salvarCaixa = async () => {
    setSavingCaixa(true);
    try {
      await saveCaixa({ saldo, metaFimAno: meta, atualizadoEm: now() });
      setDraft(null);
      toast.success("Caixa atualizado");
    } catch (error) {
      toast.error(`Não foi possível salvar o caixa: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setSavingCaixa(false);
    }
  };

  const addDespFixa = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = {
      nome: dfNome.trim() ? undefined : "Informe o nome",
      val: dfVal && dfVal > 0 ? undefined : "Informe o valor mensal",
    };
    setDfErrors(errors);
    if (errors.nome || errors.val) return;
    try {
      await saveDespesaFixa({ id: `df_${Date.now()}`, nome: dfNome.trim(), val: dfVal ?? 0, desc: dfDesc.trim() });
      setDfNome(""); setDfVal(null); setDfDesc("");
      toast.success("Despesa fixa adicionada");
    } catch {
      toast.error("Não foi possível adicionar a despesa fixa");
    }
  };

  const removeDespFixa = async (id: string, nome: string) => {
    const ok = await confirm({ title: `Remover "${nome}"?`, description: "Ela deixa de entrar na projeção de caixa.", tone: "danger", confirmLabel: "Remover" });
    if (!ok) return;
    await deleteDespesaFixa(id);
  };

  return (
    <Surface>
      <SurfaceHeader title="Caixa e despesas fixas" description="Reserva da empresa e custos recorrentes; usados na projeção de fim de ano." />
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="space-y-4">
          <Field label="Saldo atual em caixa" htmlFor="caixa-saldo">
            <CurrencyInput id="caixa-saldo" value={saldo} onValueChange={(v) => setDraft({ saldo: v, meta })} />
          </Field>
          <Field label="Meta de caixa no fim do ano" htmlFor="caixa-meta">
            <CurrencyInput id="caixa-meta" value={meta} onValueChange={(v) => setDraft({ saldo, meta: v })} />
          </Field>
          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={!dirty} loading={savingCaixa} onClick={() => void salvarCaixa()}>Salvar caixa</Button>
            {dirty && <Button variant="ghost" onClick={() => setDraft(null)}>Descartar</Button>}
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Saldo atual" value={formatCurrency(saldo)} />
            <StatTile label="Projeção no fim do ano" value={formatCurrency(projecao)} hint={`Saldo + ${mesesRestantes} meses de receita média − despesas fixas`} />
          </div>
          {meta > 0 && (
            <InlineNotice tone={projecao >= meta ? "info" : "warning"}>
              {projecao >= meta
                ? `A projeção alcança a meta de ${formatCurrency(meta)}.`
                : `A projeção fica ${formatCurrency(meta - projecao)} abaixo da meta de ${formatCurrency(meta)}.`}
            </InlineNotice>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06] p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-200">Despesas fixas</h3>
          <span className="text-sm tabular-nums text-zinc-400">{formatCurrency(totalDespFixas)} por mês</span>
        </div>
        <form onSubmit={addDespFixa} noValidate className="mb-4 grid gap-3 sm:grid-cols-[1fr_10rem_1fr_auto] sm:items-start">
          <Field label="Nome" htmlFor="df-nome" error={dfErrors.nome}>
            <Input id="df-nome" value={dfNome} aria-invalid={Boolean(dfErrors.nome) || undefined} onChange={(e) => { setDfNome(e.target.value); setDfErrors((c) => ({ ...c, nome: undefined })); }} placeholder="Ex.: Ferramentas" />
          </Field>
          <Field label="Valor mensal" htmlFor="df-val" error={dfErrors.val}>
            <CurrencyInput id="df-val" value={dfVal} aria-invalid={Boolean(dfErrors.val) || undefined} onValueChange={(v) => { setDfVal(v); setDfErrors((c) => ({ ...c, val: undefined })); }} />
          </Field>
          <Field label="Descrição" htmlFor="df-desc" optional>
            <Input id="df-desc" value={dfDesc} onChange={(e) => setDfDesc(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" className="sm:mt-[26px]">Adicionar</Button>
        </form>
        {despFixas.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma despesa fixa cadastrada.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/10">
            {despFixas.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-100">{d.nome}</span>
                  {d.desc && <span className="block truncate text-xs text-zinc-500">{d.desc}</span>}
                </span>
                <span className="text-sm tabular-nums text-zinc-200">{formatCurrency(d.val)}</span>
                <IconButton label={`Remover ${d.nome}`} size="sm" icon={<Trash2 />} onClick={() => void removeDespFixa(d.id, d.nome)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Surface>
  );
}
