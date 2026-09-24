// Vitrine dos componentes do design system. Só existe em desenvolvimento
// (a rota é registrada com import.meta.env.DEV em App.tsx).
import { useState } from "react";
import { Download, FileSpreadsheet, Image, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import {
  ActionsMenu, Button, CheckboxField, DatePicker, DateRangePicker, Dialog, EmptyState, Field, IconButton, InlineNotice, Input,
  MenuButton, Page, PageHeader, RadioGroup, RadioOption, SegmentedControl, Select, StatTile, StatusBadge, Surface, SwitchField,
  Textarea, toast, toastWithUndo, useConfirm,
} from "@/components/ds";

export default function DesignSystemPreview() {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState("2026-09-24");
  const [range, setRange] = useState({ start: "2026-08-26", end: "2026-09-24" });
  const [dialog, setDialog] = useState(false);
  const [radio, setRadio] = useState("desativar");
  const { confirm, prompt } = useConfirm();

  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Design system"
          subtitle="Vitrine dos componentes (somente desenvolvimento)"
          actions={
            <>
              <IconButton label="Atualizar" icon={<RefreshCw />} />
              <MenuButton label="Exportar" icon={<Download />} items={[
                { label: "Imagem para WhatsApp", icon: <Image />, onSelect: () => toast.success("Imagem gerada") },
                { label: "Planilha Excel", icon: <FileSpreadsheet />, onSelect: () => toast.success("Planilha gerada") },
              ]} />
              <Button variant="primary">Ação principal</Button>
            </>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Total investido" value="R$ 3.071,15" hint="últimos 30 dias" />
          <StatTile label="Conversas" value="346" hint="inícios de conversa" />
          <StatTile label="Custo por conversa" value="R$ 8,88" status={{ tone: "warning", label: "Atenção" }} />
          <StatTile label="Taxa de resposta" value="73,9%" hint="conversas respondidas" />
        </div>

        <Surface className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Pequeno 32</Button>
            <Button>Médio 36</Button>
            <Button size="lg">Grande 44</Button>
            <Button variant="primary">Primária</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="danger">Perigo</Button>
            <Button loading>Salvando</Button>
            <IconButton label="Editar" icon={<Pencil />} />
            <ActionsMenu items={[
              { label: "Editar", icon: <Pencil />, onSelect: () => undefined },
              { type: "separator" },
              { label: "Excluir", icon: <Trash2 />, tone: "danger", onSelect: () => undefined },
            ]} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl aria-label="Período" value={period} onValueChange={setPeriod} options={[{ value: "7", label: "7 dias" }, { value: "30", label: "30 dias" }, { value: "90", label: "90 dias" }]} />
            <SegmentedControl aria-label="Status" size="sm" value="all" onValueChange={() => undefined} options={[{ value: "all", label: "Todas", count: 12 }, { value: "crit", label: "Críticas", count: 4, tone: "danger" }, { value: "warn", label: "Atenção", count: 4, tone: "warning" }]} />
            <StatusBadge tone="good">Positivo</StatusBadge>
            <StatusBadge tone="warning">Atenção</StatusBadge>
            <StatusBadge tone="critical">Crítico</StatusBadge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nome" htmlFor="ds-nome" hint="Como aparece no relatório."><Input id="ds-nome" placeholder="Nome completo" /></Field>
            <Field label="Unidade" required><Select aria-label="Unidade" value={unit} onValueChange={setUnit} placeholder="Selecione a unidade" options={[{ value: "a", label: "Vida Card Ijuí" }, { value: "b", label: "Vida Card Santa Rosa" }]} /></Field>
            <Field label="Valor" error="Informe um valor maior que zero."><Input aria-invalid placeholder="0,00" /></Field>
            <Field label="Data"><DatePicker value={date} onChange={setDate} /></Field>
            <Field label="Período"><DateRangePicker value={range} onChange={setRange} /></Field>
            <Field label="Observações" optional><Textarea rows={2} /></Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <CheckboxField id="ds-check" label="Lembrar meu usuário" defaultChecked />
            <SwitchField id="ds-switch" label="Agrupar por criativo" description="Soma anúncios com a mesma peça." defaultChecked />
          </div>
          <InlineNotice tone="warning">Mostrando dados salvos às 09:00 — a Meta limitou as consultas.</InlineNotice>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog(true)}>Abrir diálogo</Button>
            <Button onClick={async () => { const ok = await confirm({ title: "Excluir a ata?", description: "Ela será removida para todos.", tone: "danger" }); toast(ok ? "Confirmado" : "Cancelado"); }}>Confirmar exclusão</Button>
            <Button onClick={async () => { const v = await prompt({ title: "Editar link público", label: "Final do link", prefix: "/trabalhe-conosco/", defaultValue: "vida-card-ijui", validate: (s) => (/^[a-z0-9-]+$/.test(s) ? null : "Use letras minúsculas, números e hífen.") }); if (v) toast.success(v); }}>Prompt</Button>
            <Button onClick={() => toastWithUndo("Recebimento confirmado", () => { toast("Desfeito"); })}>Toast com desfazer</Button>
          </div>
        </Surface>

        <Surface><EmptyState icon={<FileSpreadsheet />} title="Sem dados para este período" description="Não há métricas sincronizadas para a unidade e o período escolhidos." action={<Button size="sm">Ver últimos 90 dias</Button>} /></Surface>

        <Dialog open={dialog} onOpenChange={setDialog} title="Desativar usuário" description="Escolha o que acontece com a conta." footer={<><Button variant="ghost" onClick={() => setDialog(false)}>Cancelar</Button><Button variant="danger">Confirmar</Button></>}>
          <RadioGroup value={radio} onValueChange={setRadio}>
            <RadioOption id="r1" value="desativar" label="Desativar" description="Pode ser reativada depois." />
            <RadioOption id="r2" value="excluir" tone="danger" label="Excluir permanentemente" description="Remove a conta e os vínculos. Não dá para desfazer." />
          </RadioGroup>
        </Dialog>
      </Page>
    </AppLayout>
  );
}
