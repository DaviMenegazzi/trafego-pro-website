import { useState } from "react";
import { toast } from "sonner";
import { Button, CurrencyInput, DatePicker, Dialog, Field, Input, Select } from "@/components/ds";
import { useClientContext } from "@/contexts/ClientContext";
import type { Cliente, Cobranca, DatabaseState } from "../types";
import { CL_FIN, CL_SOC, CL_TRAF, MESES, mascararCNPJ, now, slug, validarCNPJ } from "../constants";
import { saveChecklistItem, saveCliente, saveCobranca } from "../lib/firebase";

type Errors = Partial<Record<"nome" | "cnpj" | "vencDia" | "mensalidade" | "mesInicial", string>>;

const NO_META = "";

export function NovaUnidadeDialog({
  open,
  onOpenChange,
  dbState,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dbState: DatabaseState;
  onCreated?: (id: string) => void;
}) {
  const { clients: metaAccounts } = useClientContext();
  const [metaId, setMetaId] = useState(NO_META);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [respUnid, setRespUnid] = useState("");
  const [respFin, setRespFin] = useState("");
  const [emailBol, setEmailBol] = useState("");
  const [vencDia, setVencDia] = useState("");
  const [mensalidade, setMensalidade] = useState<number | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [mesInicial, setMesInicial] = useState("2026_07");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMetaId(NO_META); setNome(""); setCnpj(""); setEndereco(""); setRespUnid(""); setRespFin("");
    setEmailBol(""); setVencDia(""); setMensalidade(null); setDataInicio(""); setMesInicial("2026_07"); setErrors({});
  };

  const clear = (key: keyof Errors) => setErrors((current) => ({ ...current, [key]: undefined }));

  const validate = (): Errors => {
    const next: Errors = {};
    const digits = cnpj.replace(/\D/g, "");
    if (!nome.trim()) next.nome = "Informe o nome da unidade";
    if (digits.length !== 14) next.cnpj = "CNPJ completo: 00.000.000/0000-00";
    else if (!validarCNPJ(cnpj)) next.cnpj = "CNPJ inválido; confira os dígitos";
    else {
      const dup = Object.values(dbState.clientes || {}).find((c) => c.cnpj.replace(/\D/g, "") === digits);
      if (dup) next.cnpj = `Já cadastrado para ${dup.nome}`;
    }
    if (!vencDia) next.vencDia = "Escolha o dia de vencimento";
    if (!mensalidade || mensalidade <= 0) next.mensalidade = "Informe o valor da mensalidade";
    if (!mesInicial) next.mesInicial = "Escolha o primeiro mês de cobrança";
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`nova-unidade-${first}`)?.focus();
      return;
    }

    const id = `${slug(nome)}_${Date.now()}`;
    const cliente: Cliente = {
      id,
      metaId: metaId || undefined,
      nome: nome.trim(),
      cnpj: cnpj.trim(),
      endereco: endereco.trim(),
      respUnid: respUnid.trim(),
      respFin: respFin.trim(),
      emailBol: emailBol.trim(),
      vencDia,
      mensalidade: mensalidade ?? 0,
      mesInicial,
      dataInicio,
      criadoEm: now(),
    };

    setSaving(true);
    try {
      await saveCliente(cliente);
      for (const item of [...CL_FIN, ...CL_TRAF, ...CL_SOC]) {
        await saveChecklistItem(id, item.id, { marcado: false, por: null, quando: null });
      }
      const cobranca: Cobranca = {
        mes: MESES.find((m) => m.k === mesInicial)?.l || mesInicial,
        boletoGerado: false,
        nfGerada: false,
        recebido: false,
        valorRecebido: null,
        divisao: null,
      };
      await saveCobranca(id, mesInicial, cobranca);
      toast.success(`${cliente.nome} cadastrada`);
      reset();
      onOpenChange(false);
      onCreated?.(id);
    } catch (error) {
      toast.error(`Não foi possível cadastrar a unidade: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Nova unidade"
      description="Unidade pagante: entra nas cobranças a partir do primeiro mês escolhido."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="nova-unidade-form" variant="primary" loading={saving}>Cadastrar unidade</Button>
        </>
      }
    >
      <form id="nova-unidade-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {metaAccounts.length > 0 && (
          <Field label="Conta de anúncios" optional hint="Vincula a unidade à conta Meta e preenche o nome." className="sm:col-span-2">
            <Select
              aria-label="Conta de anúncios"
              value={metaId}
              placeholder="Sem vínculo"
              onValueChange={(value) => {
                setMetaId(value);
                const found = metaAccounts.find((a) => a.id === value);
                if (found && !nome) { setNome(found.name); clear("nome"); }
              }}
              options={[{ value: NO_META, label: "Sem vínculo" }, ...metaAccounts.map((a) => ({ value: a.id, label: a.name, description: a.id }))]}
            />
          </Field>
        )}

        <Field label="Nome da unidade" htmlFor="nova-unidade-nome" required error={errors.nome}>
          <Input id="nova-unidade-nome" value={nome} aria-invalid={Boolean(errors.nome) || undefined} onChange={(e) => { setNome(e.target.value); clear("nome"); }} placeholder="Ex.: Vida Card Santo Ângelo" />
        </Field>
        <Field label="CNPJ" htmlFor="nova-unidade-cnpj" required error={errors.cnpj}>
          <Input
            id="nova-unidade-cnpj"
            inputMode="numeric"
            value={cnpj}
            maxLength={18}
            aria-invalid={Boolean(errors.cnpj) || undefined}
            onChange={(e) => { setCnpj(mascararCNPJ(e.target.value)); clear("cnpj"); }}
            onBlur={() => { if (cnpj) setErrors((c) => ({ ...c, cnpj: validate().cnpj })); }}
            placeholder="00.000.000/0000-00"
          />
        </Field>
        <Field label="Mensalidade" htmlFor="nova-unidade-mensalidade" required error={errors.mensalidade}>
          <CurrencyInput id="nova-unidade-mensalidade" value={mensalidade} aria-invalid={Boolean(errors.mensalidade) || undefined} onValueChange={(v) => { setMensalidade(v); clear("mensalidade"); }} />
        </Field>
        <Field label="Dia de vencimento" required error={errors.vencDia}>
          <Select
            id="nova-unidade-vencDia"
            aria-label="Dia de vencimento"
            value={vencDia}
            invalid={Boolean(errors.vencDia)}
            placeholder="Escolher"
            onValueChange={(v) => { setVencDia(v); clear("vencDia"); }}
            options={[5, 10, 15, 20, 25].map((d) => ({ value: String(d), label: `Dia ${d}` }))}
          />
        </Field>
        <Field label="Primeiro mês de cobrança" required error={errors.mesInicial}>
          <Select id="nova-unidade-mesInicial" aria-label="Primeiro mês de cobrança" value={mesInicial} onValueChange={(v) => { setMesInicial(v); clear("mesInicial"); }} options={MESES.map((m) => ({ value: m.k, label: m.l }))} />
        </Field>
        <Field label="Início da operação" optional>
          <DatePicker aria-label="Início da operação" value={dataInicio} onChange={setDataInicio} />
        </Field>
        <Field label="Responsável pela unidade" htmlFor="nova-unidade-resp" optional>
          <Input id="nova-unidade-resp" value={respUnid} onChange={(e) => setRespUnid(e.target.value)} />
        </Field>
        <Field label="Responsável financeiro" htmlFor="nova-unidade-respfin" optional>
          <Input id="nova-unidade-respfin" value={respFin} onChange={(e) => setRespFin(e.target.value)} />
        </Field>
        <Field label="E-mail para boleto" htmlFor="nova-unidade-email" optional>
          <Input id="nova-unidade-email" type="email" value={emailBol} onChange={(e) => setEmailBol(e.target.value)} placeholder="financeiro@unidade.com.br" />
        </Field>
        <Field label="Endereço" htmlFor="nova-unidade-endereco" optional>
          <Input id="nova-unidade-endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, cidade/UF" />
        </Field>
      </form>
    </Dialog>
  );
}
