import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, CurrencyInput, DatePicker, Dialog, Field, Input, Select } from "@/components/ds";
import type { Cliente } from "../types";
import { MESES, mascararCNPJ, validarCNPJ } from "../constants";

interface ModalEditarClienteProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (cid: string, updatedData: Partial<Cliente>) => Promise<void>;
}

type Errors = Partial<Record<"nome" | "cnpj" | "vencDia" | "mensalidade", string>>;

export function ModalEditarCliente({ cliente, isOpen, onClose, onSave }: ModalEditarClienteProps) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [respUnid, setRespUnid] = useState("");
  const [respFin, setRespFin] = useState("");
  const [emailBol, setEmailBol] = useState("");
  const [vencDia, setVencDia] = useState("");
  const [mensalidade, setMensalidade] = useState<number | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [mesInicial, setMesInicial] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cliente || !isOpen) return;
    setNome(cliente.nome || "");
    setCnpj(cliente.cnpj || "");
    setEndereco(cliente.endereco || "");
    setRespUnid(cliente.respUnid || "");
    setRespFin(cliente.respFin || "");
    setEmailBol(cliente.emailBol || "");
    setVencDia(cliente.vencDia ? String(cliente.vencDia) : "");
    setMensalidade(cliente.mensalidade || null);
    setDataInicio(cliente.dataInicio || "");
    setMesInicial(cliente.mesInicial || "");
    setErrors({});
  }, [cliente, isOpen]);

  const clear = (key: keyof Errors) => setErrors((c) => ({ ...c, [key]: undefined }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cliente) return;
    const digits = cnpj.replace(/\D/g, "");
    const next: Errors = {
      nome: nome.trim() ? undefined : "Informe o nome da unidade",
      cnpj: digits.length === 14 && validarCNPJ(cnpj) ? undefined : "CNPJ inválido",
      vencDia: vencDia ? undefined : "Escolha o dia de vencimento",
      mensalidade: mensalidade && mensalidade > 0 ? undefined : "Informe a mensalidade",
    };
    setErrors(next);
    const first = (Object.keys(next) as (keyof Errors)[]).find((k) => next[k]);
    if (first) {
      document.getElementById(`editar-unidade-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave(cliente.id, {
        nome: nome.trim(),
        cnpj: cnpj.trim(),
        endereco: endereco.trim(),
        respUnid: respUnid.trim(),
        respFin: respFin.trim(),
        emailBol: emailBol.trim(),
        vencDia,
        mensalidade: mensalidade ?? 0,
        dataInicio,
        mesInicial,
      });
      toast.success("Unidade atualizada");
      onClose();
    } catch (error) {
      toast.error(`Não foi possível salvar: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen && Boolean(cliente)}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="lg"
      title="Editar unidade"
      description={cliente?.nome}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="editar-unidade-form" variant="primary" loading={saving}>Salvar alterações</Button>
        </>
      }
    >
      <form id="editar-unidade-form" onSubmit={handleSave} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da unidade" htmlFor="editar-unidade-nome" required error={errors.nome}>
          <Input id="editar-unidade-nome" value={nome} aria-invalid={Boolean(errors.nome) || undefined} onChange={(e) => { setNome(e.target.value); clear("nome"); }} />
        </Field>
        <Field label="CNPJ" htmlFor="editar-unidade-cnpj" required error={errors.cnpj}>
          <Input id="editar-unidade-cnpj" inputMode="numeric" maxLength={18} value={cnpj} aria-invalid={Boolean(errors.cnpj) || undefined} onChange={(e) => { setCnpj(mascararCNPJ(e.target.value)); clear("cnpj"); }} />
        </Field>
        <Field label="Mensalidade" htmlFor="editar-unidade-mensalidade" required error={errors.mensalidade}>
          <CurrencyInput id="editar-unidade-mensalidade" value={mensalidade} aria-invalid={Boolean(errors.mensalidade) || undefined} onValueChange={(v) => { setMensalidade(v); clear("mensalidade"); }} />
        </Field>
        <Field label="Dia de vencimento" required error={errors.vencDia}>
          <Select id="editar-unidade-vencDia" aria-label="Dia de vencimento" value={vencDia} invalid={Boolean(errors.vencDia)} onValueChange={(v) => { setVencDia(v); clear("vencDia"); }} options={[5, 10, 15, 20, 25].map((d) => ({ value: String(d), label: `Dia ${d}` }))} />
        </Field>
        <Field label="Primeiro mês de cobrança">
          <Select aria-label="Primeiro mês de cobrança" value={mesInicial} onValueChange={setMesInicial} options={MESES.map((m) => ({ value: m.k, label: m.l }))} />
        </Field>
        <Field label="Início da operação" optional>
          <DatePicker aria-label="Início da operação" value={dataInicio} onChange={setDataInicio} />
        </Field>
        <Field label="Responsável pela unidade" htmlFor="editar-unidade-resp" optional>
          <Input id="editar-unidade-resp" value={respUnid} onChange={(e) => setRespUnid(e.target.value)} />
        </Field>
        <Field label="Responsável financeiro" htmlFor="editar-unidade-respfin" optional>
          <Input id="editar-unidade-respfin" value={respFin} onChange={(e) => setRespFin(e.target.value)} />
        </Field>
        <Field label="E-mail para boleto" htmlFor="editar-unidade-email" optional>
          <Input id="editar-unidade-email" type="email" value={emailBol} onChange={(e) => setEmailBol(e.target.value)} />
        </Field>
        <Field label="Endereço" htmlFor="editar-unidade-endereco" optional>
          <Input id="editar-unidade-endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
