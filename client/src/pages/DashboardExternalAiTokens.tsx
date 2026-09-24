import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Check, Copy, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import {
  Button,
  CheckboxField,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  InlineNotice,
  Input,
  Page,
  PageHeader,
  Popover,
  SegmentedControl,
  StatusBadge,
  Surface,
  SurfaceHeader,
  useConfirm,
} from "@/components/ds";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";

type Unit = { id: string; name: string };
type Token = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  unitIds: string[];
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};
type PageData = {
  scopes: string[];
  rateLimitPerMinute: number;
  units: Unit[];
  tokens: Token[];
};

const SCOPES: Record<string, { label: string; description: string }> = {
  "metrics:read": { label: "Métricas", description: "Investimento, conversas e custo por unidade" },
  "leads:summary:read": { label: "Leads", description: "Totais por origem, sem nomes ou telefones" },
  "crm:summary:read": { label: "CRM", description: "Resumo do funil, sem dados pessoais" },
  "ads:metrics:read": { label: "Anúncios", description: "Métricas por anúncio" },
  "leads:read": { label: "Leads individuais", description: "Lista pseudonimizada de leads" },
  "creatives:read": { label: "Criativos", description: "Criativos ativos por unidade" },
  "targets:read": { label: "Metas", description: "Metas mensais das unidades" },
};
const scopeLabel = (scope: string) => SCOPES[scope]?.label ?? scope;

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("tp_token") ?? ""}`,
  "Content-Type": "application/json",
});

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function useAdminGuard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      if (!localStorage.getItem("tp_token")) setLocation("/login");
      else if (user.role !== "admin") setLocation("/dashboard");
    } catch {
      setLocation("/login");
    }
  }, [setLocation]);
}

type Errors = Partial<Record<"name" | "scopes" | "units", string>>;

function NewTokenDialog({
  open,
  scopes,
  units,
  onClose,
  onCreated,
}: {
  open: boolean;
  scopes: string[];
  units: Unit[];
  onClose: () => void;
  onCreated: (token: { token: string; metadata: Token }) => void;
}) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(scopes);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [unitSearch, setUnitSearch] = useState("");
  const [days, setDays] = useState<"30" | "90" | "365">("90");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setSelectedScopes(scopes); setSelectedUnits([]); setUnitSearch(""); setDays("90"); setErrors({});
    }
  }, [open, scopes]);

  const toggle = (value: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const filteredUnits = useMemo(
    () => (unitSearch.trim() ? units.filter((u) => normalize(u.name).includes(normalize(unitSearch))) : units),
    [units, unitSearch],
  );
  const allSelected = units.length > 0 && selectedUnits.length === units.length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Errors = {
      name: name.trim() ? undefined : "Dê um nome para reconhecer a integração",
      scopes: selectedScopes.length ? undefined : "Libere ao menos um tipo de dado",
      units: selectedUnits.length ? undefined : "Escolha ao menos uma unidade",
    };
    setErrors(next);
    if (next.name || next.scopes || next.units) {
      if (next.name) document.getElementById("token-name")?.focus();
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/external-ai/tokens", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name,
          scopes: selectedScopes,
          unitIds: selectedUnits,
          expiresAt: new Date(Date.now() + Number(days) * 86_400_000).toISOString(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Não foi possível criar o token");
        return;
      }
      onCreated(body);
    } catch {
      toast.error("Não foi possível conectar ao servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => { if (!value) onClose(); }}
      size="lg"
      title="Novo token"
      description="Escolha quais dados e quais unidades a ferramenta de IA poderá consultar."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="token-form" variant="primary" loading={saving}>Emitir token</Button>
        </>
      }
    >
      <form id="token-form" onSubmit={submit} noValidate className="space-y-5">
        <Field label="Nome da integração" htmlFor="token-name" required error={errors.name}>
          <Input id="token-name" autoFocus maxLength={120} value={name} aria-invalid={Boolean(errors.name) || undefined} onChange={(e) => { setName(e.target.value); setErrors((c) => ({ ...c, name: undefined })); }} placeholder="Ex.: Assistente de performance" />
        </Field>

        <Field label="Dados liberados" required error={errors.scopes} hint={errors.scopes ? undefined : "Somente dados agregados; nomes, telefones e conversas nunca saem."}>
          <div className="space-y-2.5 pt-1">
            {scopes.map((scope) => (
              <CheckboxField
                key={scope}
                id={`scope-${scope}`}
                label={scopeLabel(scope)}
                description={SCOPES[scope]?.description}
                checked={selectedScopes.includes(scope)}
                onCheckedChange={() => { toggle(scope, selectedScopes, setSelectedScopes); setErrors((c) => ({ ...c, scopes: undefined })); }}
              />
            ))}
          </div>
        </Field>

        <Field label={`Unidades (${selectedUnits.length} de ${units.length})`} required error={errors.units}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input leading={<Search />} value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} placeholder="Filtrar unidades" aria-label="Filtrar unidades" />
              </div>
              <Button variant="secondary" onClick={() => { setSelectedUnits(allSelected ? [] : units.map((u) => u.id)); setErrors((c) => ({ ...c, units: undefined })); }}>
                {allSelected ? "Desmarcar todas" : "Marcar todas"}
              </Button>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
              {filteredUnits.length === 0 ? (
                <p className="p-3 text-center text-sm text-zinc-500">Nenhuma unidade encontrada.</p>
              ) : (
                filteredUnits.map((unit) => (
                  <CheckboxField
                    key={unit.id}
                    id={`unit-${unit.id}`}
                    className="rounded-md px-1.5 py-1 hover:bg-white/[0.03]"
                    label={unit.name}
                    checked={selectedUnits.includes(unit.id)}
                    onCheckedChange={() => { toggle(unit.id, selectedUnits, setSelectedUnits); setErrors((c) => ({ ...c, units: undefined })); }}
                  />
                ))
              )}
            </div>
          </div>
        </Field>

        <Field label="Validade">
          <SegmentedControl
            aria-label="Validade"
            value={days}
            onValueChange={setDays}
            options={[
              { value: "30", label: "30 dias" },
              { value: "90", label: "90 dias" },
              { value: "365", label: "1 ano" },
            ]}
          />
        </Field>
      </form>
    </Dialog>
  );
}

function SecretDialog({ result, onClose }: { result: { token: string; metadata: Token } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [result]);
  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.token);
      setCopied(true);
      toast.success("Token copiado");
    } catch {
      toast.error("Não foi possível copiar automaticamente");
    }
  };
  return (
    <Dialog
      open={Boolean(result)}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="md"
      title="Token emitido"
      description="Copie agora: ele não aparece de novo."
      footer={<Button variant="primary" onClick={onClose}>Já guardei</Button>}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-3">
          <code className="min-w-0 flex-1 select-all break-all font-mono text-xs text-zinc-100">{result?.token}</code>
          <IconButton label={copied ? "Copiado" : "Copiar token"} icon={copied ? <Check /> : <Copy />} onClick={() => void copy()} />
        </div>
        <InlineNotice tone="warning">Guarde em um gestor de senhas. Não envie por e-mail, planilha ou chat.</InlineNotice>
      </div>
    </Dialog>
  );
}

export default function DashboardExternalAiTokens() {
  useAdminGuard();
  const { confirm } = useConfirm();
  const [data, setData] = useState<PageData>({ scopes: [], rateLimitPerMinute: 60, units: [], tokens: [] });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<{ token: string; metadata: Token } | null>(null);
  const unitNames = useMemo(() => new Map(data.units.map((unit) => [unit.id, unit.name])), [data.units]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/external-ai/tokens", { headers: headers() });
      if (response.status === 401) { window.location.href = "/login"; return; }
      if (response.status === 403) { window.location.href = "/dashboard"; return; }
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Não foi possível carregar as integrações");
        return;
      }
      setData(body);
    } catch {
      toast.error("Não foi possível conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Tráfego Pro — Integrações de IA";
    void load();
  }, [load]);

  const revoke = async (token: Token) => {
    const ok = await confirm({
      title: `Revogar "${token.name}"?`,
      description: "O acesso é bloqueado na próxima chamada e o token não pode ser reativado.",
      confirmLabel: "Revogar token",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/external-ai/tokens/${token.id}`, { method: "DELETE", headers: headers() });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Não foi possível revogar o token");
        return;
      }
      toast.success("Token revogado");
      void load();
    } catch {
      toast.error("Não foi possível conectar ao servidor");
    }
  };

  return (
    <AppLayout>
      <Page width="medium">
        <PageHeader
          title="Integrações de IA"
          subtitle="Tokens somente leitura, limitados às unidades escolhidas e revogáveis a qualquer momento."
          actions={
            <>
              <IconButton label="Atualizar" icon={<RefreshCw className={loading ? "animate-spin" : undefined} />} onClick={() => void load()} disabled={loading} />
              <Button variant="primary" onClick={() => setCreating(true)}><Plus />Novo token</Button>
            </>
          }
        />

        <Surface className="overflow-hidden">
          <SurfaceHeader title={`Tokens · ${data.tokens.length}`} description={`Até ${data.rateLimitPerMinute} chamadas por minuto por token.`} />
          {loading && data.tokens.length === 0 ? (
            <EmptyState title="Carregando integrações…" />
          ) : data.tokens.length === 0 ? (
            <EmptyState title="Nenhum token emitido" description="Crie um token para conectar uma ferramenta de IA aos indicadores agregados." />
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.tokens.map((token) => {
                const active = !token.revokedAt && new Date(token.expiresAt).getTime() > Date.now();
                const names = token.unitIds.map((id) => unitNames.get(id) ?? "Unidade removida");
                return (
                  <li key={token.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100">{token.name}</span>
                        <StatusBadge tone={active ? "good" : token.revokedAt ? "critical" : "neutral"}>
                          {token.revokedAt ? "Revogado" : active ? "Ativo" : "Expirado"}
                        </StatusBadge>
                      </div>
                      <p className="mt-0.5 text-sm text-zinc-400">
                        {token.scopes.map(scopeLabel).join(" · ")} <span className="font-mono text-xs text-zinc-500">· {token.tokenPrefix}</span>
                      </p>
                    </div>
                    <dl className="grid grid-cols-3 gap-4 text-sm lg:w-[440px]">
                      <div className="min-w-0">
                        <dt className="text-xs text-zinc-500">Unidades</dt>
                        <dd>
                          <Popover
                            className="w-64"
                            trigger={
                              <button type="button" className="rounded-md text-left text-zinc-200 underline decoration-zinc-600 underline-offset-4 outline-none hover:decoration-zinc-300 focus-visible:ring-2 focus-visible:ring-emerald-400/60">
                                {names.length === 1 ? names[0] : `${names.length} unidades`}
                              </button>
                            }
                          >
                            <ul className="max-h-64 space-y-1 overflow-y-auto p-3 text-sm text-zinc-200">
                              {names.map((n, i) => <li key={`${n}-${i}`} className="truncate">{n}</li>)}
                            </ul>
                          </Popover>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">Expira</dt>
                        <dd className="tabular-nums text-zinc-200" title={formatDateTime(token.expiresAt)}>{formatDate(token.expiresAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">Último uso</dt>
                        <dd className="text-zinc-200">{token.lastUsedAt ? formatRelative(token.lastUsedAt) : "Nunca"}</dd>
                      </div>
                    </dl>
                    <div className="lg:w-24 lg:text-right">
                      {!token.revokedAt && (
                        <Button variant="danger-ghost" size="sm" onClick={() => void revoke(token)}>Revogar</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Surface>

        <Surface>
          <SurfaceHeader title="Endpoints disponíveis" description="Envie Authorization: Bearer <token> e consulte primeiro as unidades permitidas." />
          <div className="grid gap-2 p-5 text-xs text-zinc-300 md:grid-cols-3">
            <code className="rounded-lg border border-white/10 bg-black/20 p-2.5">GET /api/external/v1/metrics</code>
            <code className="rounded-lg border border-white/10 bg-black/20 p-2.5">GET /api/external/v1/leads/summary</code>
            <code className="rounded-lg border border-white/10 bg-black/20 p-2.5">GET /api/external/v1/crm/summary</code>
          </div>
        </Surface>
      </Page>

      <NewTokenDialog
        open={creating}
        scopes={data.scopes}
        units={data.units}
        onClose={() => setCreating(false)}
        onCreated={(value) => {
          setCreating(false);
          setSecret(value);
          void load();
        }}
      />
      <SecretDialog result={secret} onClose={() => setSecret(null)} />
    </AppLayout>
  );
}
