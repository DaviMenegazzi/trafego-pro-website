import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  ActionsMenu,
  Button,
  CheckboxField,
  DatePicker,
  Dialog,
  EmptyState,
  Field,
  Input,
  Select,
  Surface,
  SurfaceHeader,
  Textarea,
  dateToIso,
  useConfirm,
} from "@/components/ds";
import type { Ata, DatabaseState } from "../types";
import { PARTICIPANTES, now } from "../constants";
import { deleteAta, saveAta } from "../lib/firebase";
import { formatStoredDate } from "../lib/display";

interface TabAtasProps {
  dbState: DatabaseState;
  currentUser?: string;
}

type Errors = Partial<Record<"titulo" | "demandante" | "data" | "participantes" | "pauta", string>>;

export function TabAtas({ dbState, currentUser = "admin" }: TabAtasProps) {
  const { confirm } = useConfirm();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [demandante, setDemandante] = useState("");
  const [data, setData] = useState(() => dateToIso(new Date()));
  const [pauta, setPauta] = useState("");
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const clear = (key: keyof Errors) => setErrors((c) => ({ ...c, [key]: undefined }));

  const toggleParticipante = (p: string) => {
    setParticipantes((current) => (current.includes(p) ? current.filter((x) => x !== p) : [...current, p]));
    clear("participantes");
  };

  const handleSalvarAta = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Errors = {
      titulo: titulo.trim() ? undefined : "Informe o título",
      demandante: demandante ? undefined : "Escolha quem abriu a demanda",
      data: data ? undefined : "Informe a data",
      participantes: participantes.length ? undefined : "Marque ao menos um participante",
      pauta: pauta.trim() ? undefined : "Descreva o que foi tratado",
    };
    setErrors(next);
    const first = (Object.keys(next) as (keyof Errors)[]).find((k) => next[k]);
    if (first) {
      document.getElementById(`ata-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await saveAta({
        id: `ata_${Date.now()}`,
        titulo: titulo.trim(),
        demandante,
        data,
        pauta: pauta.trim(),
        participantes,
        criadoEm: now(),
        criadoPor: currentUser,
      });
      toast.success("Ata registrada");
      setTitulo(""); setDemandante(""); setPauta(""); setParticipantes([]); setErrors({});
      setOpen(false);
    } catch (error) {
      toast.error(`Não foi possível registrar a ata: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAta = async (a: Ata) => {
    const ok = await confirm({ title: `Excluir a ata "${a.titulo}"?`, description: "A ata some para toda a equipe. Não dá para desfazer.", tone: "danger", confirmLabel: "Excluir ata" });
    if (!ok) return;
    await deleteAta(a.id);
    toast.success("Ata excluída");
  };

  const atasOrdenadas = useMemo(
    () => Object.values(dbState.atas || {}).sort((a, b) => b.data.localeCompare(a.data)),
    [dbState.atas],
  );

  return (
    <Surface>
      <SurfaceHeader
        title={`Atas de reunião · ${atasOrdenadas.length}`}
        description="Alinhamentos entre sócios, pautas comerciais e decisões."
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus />Nova ata</Button>}
      />
      {atasOrdenadas.length === 0 ? (
        <EmptyState title="Nenhuma ata registrada" />
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {atasOrdenadas.map((a) => (
            <li key={a.id} className="space-y-2 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-zinc-100">{a.titulo}</h3>
                  <p className="text-xs text-zinc-500">
                    {formatStoredDate(a.data, true)} · demanda de {a.demandante} · {a.participantes.join(", ")}
                  </p>
                </div>
                <ActionsMenu label={`Ações da ata ${a.titulo}`} size="sm" items={[{ label: "Excluir", tone: "danger", onSelect: () => void handleDeleteAta(a) }]} />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{a.pauta}</p>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title="Nova ata"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="ata-form" variant="primary" loading={saving}>Registrar ata</Button>
          </>
        }
      >
        <form id="ata-form" onSubmit={handleSalvarAta} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" htmlFor="ata-titulo" required error={errors.titulo} className="sm:col-span-2">
            <Input id="ata-titulo" value={titulo} aria-invalid={Boolean(errors.titulo) || undefined} onChange={(e) => { setTitulo(e.target.value); clear("titulo"); }} placeholder="Ex.: Alinhamento comercial de julho" />
          </Field>
          <Field label="Quem abriu a demanda" required error={errors.demandante}>
            <Select id="ata-demandante" aria-label="Quem abriu a demanda" value={demandante} invalid={Boolean(errors.demandante)} placeholder="Escolher" onValueChange={(v) => { setDemandante(v); clear("demandante"); }} options={PARTICIPANTES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Data da reunião" required error={errors.data}>
            <DatePicker id="ata-data" aria-label="Data da reunião" value={data} invalid={Boolean(errors.data)} onChange={(v) => { setData(v); clear("data"); }} />
          </Field>
          <Field label="Participantes" required error={errors.participantes} className="sm:col-span-2">
            <div id="ata-participantes" tabIndex={-1} className="flex flex-wrap gap-x-5 gap-y-2 pt-1 outline-none">
              {PARTICIPANTES.map((p) => (
                <CheckboxField key={p} id={`ata-participante-${p}`} label={p} checked={participantes.includes(p)} onCheckedChange={() => toggleParticipante(p)} />
              ))}
            </div>
          </Field>
          <Field label="O que foi tratado" htmlFor="ata-pauta" required error={errors.pauta} hint="Tópicos, decisões e próximos passos." className="sm:col-span-2">
            <Textarea id="ata-pauta" rows={6} value={pauta} aria-invalid={Boolean(errors.pauta) || undefined} onChange={(e) => { setPauta(e.target.value); clear("pauta"); }} />
          </Field>
        </form>
      </Dialog>
    </Surface>
  );
}
