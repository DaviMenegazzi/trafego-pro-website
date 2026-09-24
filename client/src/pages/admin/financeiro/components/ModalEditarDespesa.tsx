import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, CurrencyInput, Dialog, Field, Input, SegmentedControl, Select } from "@/components/ds";
import type { Despesa } from "../types";
import { CATEGORIAS_DESP, MESES } from "../constants";

interface ModalEditarDespesaProps {
  /** Despesa em edição; `null` com `isOpen` abre o lançamento de uma nova. */
  despesa: Despesa | null;
  isOpen: boolean;
  defaultMes?: string;
  onClose: () => void;
  onSave: (id: string | null, data: Omit<Despesa, "id">) => Promise<void>;
}

type Errors = Partial<Record<"nome" | "cat" | "val" | "dia", string>>;

/** Lançar ou editar uma despesa da operação (mesmo formulário para os dois casos). */
export function ModalEditarDespesa({ despesa, isOpen, defaultMes = "2026_08", onClose, onSave }: ModalEditarDespesaProps) {
  const [nome, setNome] = useState("");
  const [cat, setCat] = useState("");
  const [val, setVal] = useState<number | null>(null);
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState(defaultMes);
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<"pendente" | "paga">("pendente");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNome(despesa?.nome || "");
    setCat(despesa?.cat || "");
    setVal(despesa?.val ?? null);
    setDia(despesa?.dia ? String(despesa.dia) : "");
    setMes(despesa?.mes || defaultMes);
    setDesc(despesa?.desc || "");
    setStatus(despesa?.status || "pendente");
    setErrors({});
  }, [despesa, isOpen, defaultMes]);

  const clear = (key: keyof Errors) => setErrors((c) => ({ ...c, [key]: undefined }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const numDia = Number.parseInt(dia, 10);
    const next: Errors = {
      nome: nome.trim() ? undefined : "Informe o nome",
      cat: cat ? undefined : "Escolha a categoria",
      val: val && val > 0 ? undefined : "Informe o valor",
      dia: numDia >= 1 && numDia <= 31 ? undefined : "Dia entre 1 e 31",
    };
    setErrors(next);
    const first = (Object.keys(next) as (keyof Errors)[]).find((k) => next[k]);
    if (first) {
      document.getElementById(`despesa-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave(despesa?.id ?? null, { nome: nome.trim(), cat, val: val ?? 0, dia: numDia, mes, desc: desc.trim(), status });
      onClose();
    } catch (error) {
      toast.error(`Não foi possível salvar a despesa: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="md"
      title={despesa ? "Editar despesa" : "Nova despesa"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="despesa-form" variant="primary" loading={saving}>{despesa ? "Salvar alterações" : "Lançar despesa"}</Button>
        </>
      }
    >
      <form id="despesa-form" onSubmit={handleSave} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="despesa-nome" required error={errors.nome} className="sm:col-span-2">
          <Input id="despesa-nome" value={nome} aria-invalid={Boolean(errors.nome) || undefined} onChange={(e) => { setNome(e.target.value); clear("nome"); }} placeholder="Ex.: Meta Ads — impulsionamentos" />
        </Field>
        <Field label="Categoria" required error={errors.cat}>
          <Select id="despesa-cat" aria-label="Categoria" value={cat} invalid={Boolean(errors.cat)} placeholder="Escolher" onValueChange={(v) => { setCat(v); clear("cat"); }} options={CATEGORIAS_DESP.map((c) => ({ value: c, label: c }))} />
        </Field>
        <Field label="Valor" htmlFor="despesa-val" required error={errors.val}>
          <CurrencyInput id="despesa-val" value={val} aria-invalid={Boolean(errors.val) || undefined} onValueChange={(v) => { setVal(v); clear("val"); }} />
        </Field>
        <Field label="Mês de competência" required>
          <Select aria-label="Mês de competência" value={mes} onValueChange={setMes} options={MESES.map((m) => ({ value: m.k, label: m.l }))} />
        </Field>
        <Field label="Dia do pagamento" htmlFor="despesa-dia" required error={errors.dia}>
          <Input id="despesa-dia" inputMode="numeric" value={dia} aria-invalid={Boolean(errors.dia) || undefined} onChange={(e) => { setDia(e.target.value.replace(/\D/g, "").slice(0, 2)); clear("dia"); }} placeholder="Ex.: 10" />
        </Field>
        <Field label="Descrição" htmlFor="despesa-desc" optional className="sm:col-span-2">
          <Input id="despesa-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Field label="Situação" className="sm:col-span-2">
          <SegmentedControl aria-label="Situação" value={status} onValueChange={setStatus} options={[{ value: "pendente", label: "Pendente" }, { value: "paga", label: "Paga" }]} />
        </Field>
      </form>
    </Dialog>
  );
}
