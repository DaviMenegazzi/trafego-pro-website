import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  FileSpreadsheet,
  FormInput,
  KeyRound,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import type { FormApiKey, FormSubmission, NewKeyResponse } from "./forms/formTypes";
import {
  formatFieldLabel,
  formatSubmissionDate,
  getWhatsAppLink,
  resolveSubmissionDisplayName,
  resolveSubmissionEmail,
  resolveSubmissionPhone,
} from "./forms/formHelpers";
import { FormSubmissionDetailModal } from "./forms/FormSubmissionDetailModal";
import { NewFormEndpointModal } from "./forms/NewFormEndpointModal";
import { FormIntegrationCodeModal } from "./forms/FormIntegrationCodeModal";
import { checkAdminAuth } from "@/components/AdminRoute";
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  MenuButton,
  Page,
  PageHeader,
  SegmentedControl,
  Select,
  StatusBadge,
  Surface,
  useConfirm,
} from "@/components/ds";
import { formatDate, formatNumber, formatPhone, formatRelative } from "@/lib/format";

const PAGE_SIZE = 25;

function isSameLocalDay(iso: string, now = new Date()) {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("tp_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function DashboardFormularios() {
  const [, setLocation] = useLocation();
  const { clients } = useClientContext();

  // Guard de acesso:
  // - Admin: acesso total (submissões + gestão de endpoints/chaves).
  // - Cliente: só entra se a própria unidade já tiver ao menos 1 endpoint
  //   ativo (verificado no servidor, sem expor nada sobre as chaves). Quando
  //   entra, só vê os resultados — a gestão de endpoints fica invisível.
  const [access, setAccess] = useState<{ ready: boolean; isAdmin: boolean }>({
    ready: false,
    isAdmin: false,
  });

  useEffect(() => {
    document.title = "Tráfego Pro — Formulários";
    const { isAuthenticated, isAdmin } = checkAdminAuth();
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (isAdmin) {
      setAccess({ ready: true, isAdmin: true });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/forms/keys/exists", { headers: authHeaders() });
        if (res.status === 401) {
          setLocation("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.hasEndpoint) {
          toast.error("Nenhum formulário disponível para sua unidade ainda.");
          setLocation("/dashboard");
          return;
        }
        setAccess({ ready: true, isAdmin: false });
      } catch {
        if (cancelled) return;
        toast.error("Falha ao verificar acesso aos formulários");
        setLocation("/dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  // Tabs
  const [activeTab, setActiveTab] = useState<"submissions" | "endpoints">("submissions");

  // Data
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [keys, setKeys] = useState<FormApiKey[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>("all");
  const [selectedKeyFilter, setSelectedKeyFilter] = useState<string>("all");

  // Modals
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [codeModalData, setCodeModalData] = useState<{
    formKey: FormApiKey;
    apiKey?: string;
  } | null>(null);
  const [page, setPage] = useState(0);
  const { confirm } = useConfirm();

  // Map of client names
  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  // Fetch Submissions
  const fetchSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch("/api/forms/submissions?limit=500", {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        setLocation("/login");
        return;
      }
      if (res.status === 403) {
        setLocation("/dashboard");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao carregar submissões");
        return;
      }
      setSubmissions(data.submissions || []);
    } catch {
      toast.error("Falha ao conectar com o servidor para carregar submissões");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [setLocation]);

  // Fetch Keys
  const fetchKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch("/api/forms/keys", {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setKeys(data.keys || []);
      }
    } catch {
      console.error("Falha ao listar chaves");
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    if (!access.ready) return;
    void fetchSubmissions();
    if (access.isAdmin) void fetchKeys();
  }, [access.ready, access.isAdmin, fetchSubmissions, fetchKeys]);

  // Delete submission
  const handleDeleteSubmission = async (id: string) => {
    const res = await fetch(`/api/forms/submissions/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error("Falha ao excluir");
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  // Revoke Key
  const handleRevokeKey = async (key: FormApiKey) => {
    const ok = await confirm({
      title: `Revogar "${key.name}"?`,
      description: "O formulário deixa de receber submissões imediatamente. Não é possível desfazer; para voltar a receber, crie um novo endpoint.",
      confirmLabel: "Revogar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/forms/keys/${key.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error("Não foi possível revogar a chave");
        return;
      }
      toast.success("Chave revogada");
      void fetchKeys();
    } catch {
      toast.error("Não foi possível revogar a chave");
    }
  };

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Unit filter
      if (selectedUnitFilter !== "all" && sub.clientId !== selectedUnitFilter) {
        return false;
      }

      // Form Key filter
      if (selectedKeyFilter !== "all" && sub.formKeyId !== selectedKeyFilter) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();

      // Check display name
      const name = resolveSubmissionDisplayName(sub).toLowerCase();
      if (name.includes(q)) return true;

      // Check unit name
      const unit = (clientNameMap.get(sub.clientId) || sub.clientId).toLowerCase();
      if (unit.includes(q)) return true;

      // Check form name
      if (sub.formName.toLowerCase().includes(q)) return true;

      // Check all field values
      for (const val of Object.values(sub.fields)) {
        if (String(val ?? "").toLowerCase().includes(q)) return true;
      }

      // Check metadata
      if (sub.metadata) {
        for (const mVal of Object.values(sub.metadata)) {
          if (String(mVal ?? "").toLowerCase().includes(q)) return true;
        }
      }

      return false;
    });
  }, [submissions, selectedUnitFilter, selectedKeyFilter, searchTerm, clientNameMap]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    return {
      total: submissions.length,
      today: submissions.filter((s) => isSameLocalDay(s.submittedAt, now)).length,
      activeUnits: new Set(submissions.map((s) => s.clientId)).size,
      activeKeysCount: keys.filter((k) => !k.revokedAt && !(k.expiresAt && new Date(k.expiresAt) < now)).length,
    };
  }, [submissions, keys]);

  const hasFilters = Boolean(searchTerm) || selectedUnitFilter !== "all" || selectedKeyFilter !== "all";
  useEffect(() => setPage(0), [searchTerm, selectedUnitFilter, selectedKeyFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filteredSubmissions.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // Export XLSX
  const exportXlsx = () => {
    if (filteredSubmissions.length === 0) {
      toast.error("Não há submissões para exportar com os filtros atuais");
      return;
    }

    // Coletar todas as colunas dinâmicas presentes nos dados
    const allFieldKeys = new Set<string>();
    filteredSubmissions.forEach((s) => {
      Object.keys(s.fields).forEach((k) => allFieldKeys.add(k));
    });
    const fieldKeysList = Array.from(allFieldKeys);

    const rows = filteredSubmissions.map((s) => {
      const meta = s.metadata || {};
      const row: Record<string, unknown> = {
        ID: s.id,
        Data: formatSubmissionDate(s.submittedAt),
        Formulário: s.formName,
        Unidade: clientNameMap.get(s.clientId) || s.clientId,
        Contato: resolveSubmissionDisplayName(s),
        Telefone: resolveSubmissionPhone(s) || "",
        Email: resolveSubmissionEmail(s) || "",
      };

      // Colunas dinâmicas
      fieldKeysList.forEach((key) => {
        const val = s.fields[key];
        row[formatFieldLabel(key)] = Array.isArray(val)
          ? val.join(", ")
          : typeof val === "object"
          ? JSON.stringify(val)
          : val ?? "";
      });

      // Metadados UTM
      row["UTM Source"] = meta.utm_source ?? "";
      row["UTM Medium"] = meta.utm_medium ?? "";
      row["UTM Campaign"] = meta.utm_campaign ?? "";
      row["URL de Origem"] = meta.source_url ?? "";

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissões");
    XLSX.writeFile(workbook, `formularios-submissoes-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Planilha exportada");
  };

  if (!access.ready) {
    return (
      <AppLayout>
        <Page>
          <EmptyState title="Carregando formulários…" />
        </Page>
      </AppLayout>
    );
  }

  const isAdmin = access.isAdmin;

  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Formulários"
          subtitle={isAdmin ? "Respostas das landing pages de todas as unidades e os endpoints que as recebem." : "Respostas recebidas pelos formulários da sua unidade."}
          actions={
            <>
              <IconButton
                label="Atualizar"
                icon={<RefreshCw className={loadingSubmissions || loadingKeys ? "animate-spin" : undefined} />}
                onClick={() => {
                  void fetchSubmissions();
                  if (isAdmin) void fetchKeys();
                }}
              />
              {activeTab === "submissions" && (
                <MenuButton
                  label="Exportar"
                  icon={<Download />}
                  disabled={filteredSubmissions.length === 0}
                  items={[{ label: "Planilha Excel", hint: hasFilters ? "Somente as submissões filtradas" : "Todas as submissões", icon: <FileSpreadsheet />, onSelect: exportXlsx }]}
                />
              )}
              {isAdmin && activeTab === "endpoints" && (
                <Button variant="primary" onClick={() => setShowNewKeyModal(true)}>
                  <Plus />
                  Novo endpoint
                </Button>
              )}
            </>
          }
        >
          {isAdmin && (
            <SegmentedControl
              aria-label="Seção"
              value={activeTab}
              onValueChange={setActiveTab}
              options={[
                { value: "submissions", label: "Submissões", count: submissions.length },
                { value: "endpoints", label: "Endpoints", count: metrics.activeKeysCount },
              ]}
            />
          )}
        </PageHeader>

        {(!isAdmin || activeTab === "submissions") && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-80">
                <Input
                  leading={<Search />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar contato, telefone ou e-mail"
                  aria-label="Buscar submissões"
                />
              </div>
              {clients.length > 1 && (
                <Select
                  aria-label="Unidade"
                  value={selectedUnitFilter}
                  onValueChange={setSelectedUnitFilter}
                  className="w-full sm:w-56"
                  options={[{ value: "all", label: "Todas as unidades" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
                />
              )}
              {isAdmin && keys.length > 0 && (
                <Select
                  aria-label="Formulário"
                  value={selectedKeyFilter}
                  onValueChange={setSelectedKeyFilter}
                  className="w-full sm:w-56"
                  options={[{ value: "all", label: "Todos os formulários" }, ...keys.map((k) => ({ value: k.id, label: k.name }))]}
                />
              )}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedUnitFilter("all");
                    setSelectedKeyFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
              <span className="ml-auto text-sm tabular-nums text-zinc-400" aria-live="polite">
                {loadingSubmissions
                  ? "Carregando…"
                  : `${formatNumber(filteredSubmissions.length)} ${filteredSubmissions.length === 1 ? "submissão" : "submissões"} · ${formatNumber(metrics.today)} hoje`}
              </span>
            </div>

            <Surface className="overflow-hidden">
              {loadingSubmissions && submissions.length === 0 ? (
                <EmptyState title="Carregando submissões…" />
              ) : filteredSubmissions.length === 0 ? (
                <EmptyState
                  icon={<FormInput />}
                  title="Nenhuma submissão encontrada"
                  description={hasFilters ? "Nenhum resultado corresponde aos filtros." : "Assim que uma landing page enviar dados para o endpoint, as respostas aparecem aqui."}
                />
              ) : (
                <>
                  {/* Celular: lista compacta */}
                  <ul className="divide-y divide-white/[0.06] md:hidden">
                    {pageRows.map((sub) => {
                      const name = resolveSubmissionDisplayName(sub);
                      const phone = resolveSubmissionPhone(sub);
                      return (
                        <li key={sub.id}>
                          <button type="button" onClick={() => setSelectedSubmission(sub)} className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-white/[0.02] focus-visible:bg-white/[0.04]">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-zinc-100">{name}</span>
                              <span className="block truncate text-xs text-zinc-500">
                                {[phone ? formatPhone(phone) : null, sub.formName].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-zinc-500">{formatRelative(sub.submittedAt)}</span>
                            <ChevronRight className="size-4 shrink-0 text-zinc-600" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Desktop: tabela */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                          <th scope="col" className="py-2.5 pl-5 pr-3 font-medium">Contato</th>
                          <th scope="col" className="px-3 py-2.5 font-medium">Telefone</th>
                          <th scope="col" className="px-3 py-2.5 font-medium">Formulário</th>
                          {clients.length > 1 && <th scope="col" className="px-3 py-2.5 font-medium">Unidade</th>}
                          <th scope="col" className="px-3 py-2.5 font-medium">Recebido</th>
                          <th scope="col" className="py-2.5 pl-3 pr-5"><span className="sr-only">Ações</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {pageRows.map((sub) => {
                          const name = resolveSubmissionDisplayName(sub);
                          const phone = resolveSubmissionPhone(sub);
                          const email = resolveSubmissionEmail(sub);
                          const whatsAppLink = phone ? getWhatsAppLink(phone, name) : "";
                          return (
                            <tr key={sub.id} className="whitespace-nowrap text-zinc-300 transition-colors hover:bg-white/[0.02]">
                              <td className="max-w-[260px] py-2.5 pl-5 pr-3">
                                <button type="button" onClick={() => setSelectedSubmission(sub)} className="block max-w-full truncate rounded-md text-left font-medium text-zinc-100 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-emerald-400/60">
                                  {name}
                                </button>
                                {email && <span className="block truncate text-xs text-zinc-500">{email}</span>}
                              </td>
                              <td className="px-3 py-2.5 tabular-nums">{phone ? formatPhone(phone) : "—"}</td>
                              <td className="max-w-[220px] truncate px-3 py-2.5">{sub.formName}</td>
                              {clients.length > 1 && <td className="max-w-[200px] truncate px-3 py-2.5 text-zinc-400">{clientNameMap.get(sub.clientId) || sub.clientId}</td>}
                              <td className="px-3 py-2.5 tabular-nums text-zinc-400" title={formatSubmissionDate(sub.submittedAt)}>{formatRelative(sub.submittedAt)}</td>
                              <td className="py-2 pl-3 pr-5 text-right">
                                {whatsAppLink && (
                                  <IconButton asChild label="Conversar no WhatsApp" size="sm" icon={<a href={whatsAppLink} target="_blank" rel="noopener noreferrer"><MessageCircle /></a>} />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {pageCount > 1 && (
                    <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-2.5 text-sm text-zinc-400">
                      <span className="tabular-nums">
                        {formatNumber(currentPage * PAGE_SIZE + 1)}–{formatNumber(Math.min((currentPage + 1) * PAGE_SIZE, filteredSubmissions.length))} de {formatNumber(filteredSubmissions.length)}
                      </span>
                      <div className="flex items-center gap-1">
                        <IconButton label="Página anterior" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} icon={<ChevronLeft />} />
                        <span className="px-2 tabular-nums">{currentPage + 1} / {pageCount}</span>
                        <IconButton label="Próxima página" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} icon={<ChevronRight />} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </Surface>
          </div>
        )}

        {/* Endpoints — nunca renderizado para clientes */}
        {isAdmin && activeTab === "endpoints" && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Cada formulário tem sua própria chave para enviar respostas via POST.{" "}
              <span className="tabular-nums">
                {formatNumber(metrics.activeKeysCount)} {metrics.activeKeysCount === 1 ? "ativo" : "ativos"} · {formatNumber(metrics.activeUnits)} {metrics.activeUnits === 1 ? "unidade recebendo" : "unidades recebendo"} submissões
              </span>
            </p>
            <Surface className="overflow-hidden">
              {loadingKeys && keys.length === 0 ? (
                <EmptyState title="Carregando endpoints…" />
              ) : keys.length === 0 ? (
                <EmptyState
                  icon={<KeyRound />}
                  title="Nenhum endpoint configurado"
                  description="Crie o primeiro para gerar a chave de integração da landing page."
                  action={<Button variant="primary" onClick={() => setShowNewKeyModal(true)}><Plus />Novo endpoint</Button>}
                />
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {keys.map((k) => {
                    const isRevoked = Boolean(k.revokedAt);
                    const isExpired = Boolean(k.expiresAt && new Date(k.expiresAt) < new Date());
                    const isActive = !isRevoked && !isExpired;
                    const units = k.clientIds.includes("*")
                      ? "Todas as unidades"
                      : k.clientIds.map((id) => clientNameMap.get(id) || id).join(", ");
                    return (
                      <li key={k.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-medium text-zinc-100">{k.name}</h3>
                            <StatusBadge tone={isActive ? "good" : isRevoked ? "critical" : "warning"}>
                              {isRevoked ? "Revogado" : isExpired ? "Expirado" : "Ativo"}
                            </StatusBadge>
                          </div>
                          <p className="truncate text-sm text-zinc-400" title={units}>{units}</p>
                          <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                            <span className="font-mono">{k.keyPrefix}…</span>
                            <span>Criado em {formatDate(k.createdAt)} por {k.createdBy}</span>
                            {k.expiresAt && <span className={isExpired ? "text-amber-300" : undefined}>{isExpired ? "Expirou" : "Expira"} em {formatDate(k.expiresAt)}</span>}
                            {k.allowedOrigins && k.allowedOrigins.length > 0 && (
                              <span className="font-mono">{k.allowedOrigins.join(", ")}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="secondary" size="sm" onClick={() => setCodeModalData({ formKey: k })}>
                            <Code2 />
                            Código de integração
                          </Button>
                          {isActive && (
                            <Button variant="danger-ghost" size="sm" onClick={() => void handleRevokeKey(k)}>
                              Revogar
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Surface>
          </div>
        )}
      </Page>

      {/* MODAL: Detalhes da Submissão */}
      <FormSubmissionDetailModal
        submission={selectedSubmission}
        unitName={selectedSubmission ? clientNameMap.get(selectedSubmission.clientId) : undefined}
        onClose={() => setSelectedSubmission(null)}
        onDelete={handleDeleteSubmission}
      />

      {/* MODAL: Novo Endpoint — gestão de endpoints é exclusiva de admin */}
      {isAdmin && showNewKeyModal && (
        <NewFormEndpointModal
          clients={clients}
          onClose={() => setShowNewKeyModal(false)}
          onCreated={(newKeyData: NewKeyResponse) => {
            setShowNewKeyModal(false);
            void fetchKeys();
            setCodeModalData({
              formKey: newKeyData.metadata,
              apiKey: newKeyData.key,
            });
          }}
        />
      )}

      {/* MODAL: Código de Integração */}
      {isAdmin && codeModalData && (
        <FormIntegrationCodeModal
          formKey={codeModalData.formKey}
          apiKey={codeModalData.apiKey}
          onClose={() => setCodeModalData(null)}
        />
      )}

    </AppLayout>
  );
}
