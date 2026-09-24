import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Button, Checkbox, Dialog, Field, Input, SegmentedControl, Textarea } from "@/components/ds";
import { toast } from "sonner";
import type { NewKeyResponse } from "./formTypes";

interface ClientOption {
  id: string;
  name: string;
}

interface NewFormEndpointModalProps {
  clients: ClientOption[];
  onClose: () => void;
  onCreated: (created: NewKeyResponse) => void;
}

export function NewFormEndpointModal({
  clients,
  onClose,
  onCreated,
}: NewFormEndpointModalProps) {
  const [name, setName] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [unitSearch, setUnitSearch] = useState("");
  const [allowedOriginsText, setAllowedOriginsText] = useState("");
  const [expiryDays, setExpiryDays] = useState<string>("never");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; units?: string }>({});

  const toggleUnit = (unitId: string) => {
    setSelectedUnits((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return clients;
    const term = unitSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return clients.filter((c) =>
      c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(term)
    );
  }, [clients, unitSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      name: name.trim() ? undefined : "Informe o nome do formulário",
      units: selectedUnits.length ? undefined : "Selecione ao menos uma unidade",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.units) return;

    // Processar origens CORS
    let allowedOrigins: string[] | null = null;
    if (allowedOriginsText.trim()) {
      allowedOrigins = allowedOriginsText
        .split(/[\n,]+/)
        .map((s) => s.trim().replace(/\/$/, ""))
        .filter(Boolean);
    }

    let expiresAt: string | null = null;
    if (expiryDays !== "never") {
      const days = Number(expiryDays);
      if (!Number.isNaN(days) && days > 0) {
        expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("tp_token");
      const res = await fetch("/api/forms/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          clientIds: selectedUnits,
          allowedOrigins,
          expiresAt,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Não foi possível criar o endpoint do formulário");
        return;
      }

      toast.success("Endpoint criado");
      onCreated(body as NewKeyResponse);
    } catch {
      toast.error("Não foi possível conectar ao servidor");
    } finally {
      setSaving(false);
    }
  };

  const allSelected = clients.length > 0 && selectedUnits.length === clients.length;

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="lg"
      title="Novo endpoint"
      description="Gera uma chave para a landing page enviar respostas ao Tráfego Pro."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="new-endpoint-form" variant="primary" loading={saving}>
            Gerar chave
          </Button>
        </>
      }
    >
      <form id="new-endpoint-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Nome do formulário" htmlFor="endpoint-name" required error={errors.name}>
          <Input
            id="endpoint-name"
            autoFocus
            value={name}
            aria-invalid={Boolean(errors.name) || undefined}
            onChange={(e) => { setName(e.target.value); setErrors((c) => ({ ...c, name: undefined })); }}
            placeholder="Ex.: Landing page Caxias – contato"
          />
        </Field>

        <Field
          label={`Unidades (${selectedUnits.length} de ${clients.length})`}
          required
          error={errors.units}
          hint="Só as unidades marcadas podem receber respostas por esta chave. A chave grava o ID da conta de anúncios, mostrado abaixo de cada nome."
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input leading={<Search />} value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} placeholder="Filtrar unidades" aria-label="Filtrar unidades" />
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedUnits(allSelected ? [] : clients.map((c) => c.id));
                  setErrors((c) => ({ ...c, units: undefined }));
                }}
              >
                {allSelected ? "Desmarcar todas" : "Marcar todas"}
              </Button>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 p-1">
              {filteredUnits.length === 0 ? (
                <p className="p-3 text-center text-sm text-zinc-500">Nenhuma unidade encontrada.</p>
              ) : (
                filteredUnits.map((u) => (
                  <label key={u.id} htmlFor={`unit-${u.id}`} className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 hover:bg-white/[0.04]">
                    <Checkbox
                      id={`unit-${u.id}`}
                      checked={selectedUnits.includes(u.id)}
                      onCheckedChange={() => { toggleUnit(u.id); setErrors((c) => ({ ...c, units: undefined })); }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-zinc-100">{u.name}</span>
                      <span className="block truncate font-mono text-xs text-zinc-500">{u.id}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </Field>

        <Field
          label="Domínios permitidos"
          htmlFor="endpoint-origins"
          optional
          hint="Um por linha. Vazio aceita envios de qualquer site."
        >
          <Textarea
            id="endpoint-origins"
            rows={2}
            value={allowedOriginsText}
            onChange={(e) => setAllowedOriginsText(e.target.value)}
            placeholder={"https://vidacardcaxias.com.br\nhttps://www.vidacardcaxias.com.br"}
            className="font-mono text-xs"
          />
        </Field>

        <Field label="Validade da chave" hint={expiryDays === "never" ? "Recomendado para landing pages, que ficam no ar sem data para sair." : undefined}>
          <SegmentedControl
            aria-label="Validade da chave"
            value={expiryDays}
            onValueChange={setExpiryDays}
            options={[
              { value: "never", label: "Sem validade" },
              { value: "90", label: "90 dias" },
              { value: "180", label: "180 dias" },
              { value: "365", label: "1 ano" },
            ]}
          />
        </Field>
      </form>
    </Dialog>
  );
}
