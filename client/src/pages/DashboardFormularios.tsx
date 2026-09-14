import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  FormInput,
  Globe,
  KeyRound,
  Layers,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  Users,
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

  // Admin Guard
  useEffect(() => {
    document.title = "Tráfego Pro — Formulários & Endpoints";
    try {
      const user = JSON.parse(localStorage.getItem("tp_user") ?? "{}");
      if (!localStorage.getItem("tp_token")) {
        setLocation("/login");
      } else if (user.role !== "admin") {
        toast.error("Acesso restrito a administradores");
        setLocation("/dashboard");
      }
    } catch {
      setLocation("/login");
    }
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
  const [revokingKey, setRevokingKey] = useState<FormApiKey | null>(null);

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
    void fetchSubmissions();
    void fetchKeys();
  }, [fetchSubmissions, fetchKeys]);

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
  const handleRevokeKey = async () => {
    if (!revokingKey) return;
    try {
      const res = await fetch(`/api/forms/keys/${revokingKey.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error("Erro ao revogar chave");
        return;
      }
      toast.success("Chave revogada com sucesso!");
      setRevokingKey(null);
      void fetchKeys();
    } catch {
      toast.error("Falha ao revogar chave");
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
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = submissions.filter((s) => s.submittedAt.startsWith(today)).length;
    const activeUnits = new Set(submissions.map((s) => s.clientId)).size;
    const activeKeysCount = keys.filter((k) => !k.revokedAt).length;

    return {
      total: submissions.length,
      today: todayCount,
      activeUnits,
      activeKeysCount,
    };
  }, [submissions, keys]);

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
    toast.success("Planilha exportada com sucesso!");
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 md:px-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
              <Layers className="size-3.5" />
              Gestão de Formulários Externos
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-100">
              Formulários & Endpoints
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-zinc-400 leading-relaxed">
              Integre formulários de landing pages externas com o Tráfego Pro e visualize todas as respostas de forma padronizada e dinâmica por unidade.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                void fetchSubmissions();
                void fetchKeys();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition"
              title="Atualizar dados"
            >
              <RefreshCw
                className={`size-3.5 ${loadingSubmissions || loadingKeys ? "animate-spin" : ""}`}
              />
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => setShowNewKeyModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition shadow-sm active:scale-95"
            >
              <Plus className="size-4 stroke-[2.5]" />
              Novo Formulário / Endpoint
            </button>
          </div>
        </header>

        {/* Top Metric Cards — Exactly like TalentBankAdmin */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Total de Submissões
            </span>
            <div className="mt-1 text-2xl font-bold text-zinc-100 font-display">
              {metrics.total}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
              Submissões Hoje
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-300 font-display">
              {metrics.today}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Franquias Ativas
            </span>
            <div className="mt-1 text-2xl font-bold text-zinc-100 font-display">
              {metrics.activeUnits}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 shadow-sm">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Endpoints Configurados
            </span>
            <div className="mt-1 text-2xl font-bold text-zinc-100 font-display">
              {metrics.activeKeysCount}
            </div>
          </div>
        </div>

        {/* Main Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "submissions"
                ? "bg-white/10 text-white shadow-sm border border-white/10"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            <FileSpreadsheet className="size-4" />
            Submissões Recebidas
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
              {filteredSubmissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("endpoints")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "endpoints"
                ? "bg-white/10 text-white shadow-sm border border-white/10"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            <KeyRound className="size-4" />
            Endpoints & Chaves de API
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
              {keys.length}
            </span>
          </button>
        </div>

        {/* TAB 1: SUBMISSIONS LIST */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            {/* Filter and Action Bar — Talent Candidates Style */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por contato, telefone, e-mail ou qualquer campo do formulário..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              {/* Filters & Export */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Unit Filter */}
                <select
                  value={selectedUnitFilter}
                  onChange={(e) => setSelectedUnitFilter(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="all">Todas as Unidades</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Form Filter */}
                <select
                  value={selectedKeyFilter}
                  onChange={(e) => setSelectedKeyFilter(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="all">Todos os Formulários</option>
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>

                {/* Export Button */}
                <button
                  type="button"
                  onClick={exportXlsx}
                  disabled={filteredSubmissions.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 transition shrink-0 shadow-sm"
                >
                  <Download className="size-3.5 stroke-[2.5]" />
                  Exportar XLSX
                </button>
              </div>
            </div>

            {/* List / Cards — Pattern matching Banco de Talentos */}
            {loadingSubmissions ? (
              <div className="rounded-3xl border border-white/5 bg-zinc-900/30 p-12 text-center">
                <RefreshCw className="mx-auto size-7 animate-spin text-emerald-400 mb-3" />
                <p className="text-xs text-zinc-400">Carregando submissões dos formulários...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
                <FormInput className="mx-auto size-9 text-zinc-600 mb-3" />
                <h3 className="text-base font-medium text-zinc-300">
                  Nenhuma submissão encontrada
                </h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  {searchTerm || selectedUnitFilter !== "all" || selectedKeyFilter !== "all"
                    ? "Nenhum resultado corresponde aos filtros selecionados."
                    : "Assim que sua landing page enviar dados para o endpoint, eles aparecerão organizados aqui."}
                </p>
                {(searchTerm || selectedUnitFilter !== "all" || selectedKeyFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedUnitFilter("all");
                      setSelectedKeyFilter("all");
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 transition"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSubmissions.map((sub) => {
                  const displayName = resolveSubmissionDisplayName(sub);
                  const displayPhone = resolveSubmissionPhone(sub);
                  const displayEmail = resolveSubmissionEmail(sub);
                  const unitName = clientNameMap.get(sub.clientId) || sub.clientId;
                  const whatsAppLink = displayPhone ? getWhatsAppLink(displayPhone, displayName) : "";

                  // Identify other dynamic fields to show as pills (exclude name, phone, email)
                  const otherFields = Object.entries(sub.fields).filter(
                    ([k]) =>
                      !k.toLowerCase().includes("nome") &&
                      !k.toLowerCase().includes("name") &&
                      !k.toLowerCase().includes("phone") &&
                      !k.toLowerCase().includes("tel") &&
                      !k.toLowerCase().includes("cel") &&
                      !k.toLowerCase().includes("mail")
                  );

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className="group flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-4 hover:border-emerald-500/40 hover:bg-zinc-900/80 cursor-pointer transition-all duration-200 shadow-sm"
                    >
                      {/* Left: Contact Info */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-display font-semibold text-base shrink-0 group-hover:bg-emerald-500/20 transition">
                          {displayName.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-emerald-300 transition">
                              {displayName}
                            </h4>

                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                              {sub.formName}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-white/10">
                              <Building2 className="size-3 text-zinc-400" />
                              {unitName}
                            </span>
                          </div>

                          {/* Contact and Date Details */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                            {displayPhone && (
                              <span className="flex items-center gap-1 font-mono text-zinc-300">
                                <Phone className="size-3 text-emerald-400" />
                                {displayPhone}
                              </span>
                            )}
                            {displayEmail && (
                              <span className="flex items-center gap-1 text-zinc-300">
                                <Mail className="size-3 text-sky-400" />
                                {displayEmail}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-zinc-500">
                              <Calendar className="size-3 text-zinc-600" />
                              {formatSubmissionDate(sub.submittedAt)}
                            </span>
                          </div>

                          {/* Dynamic Field Pills (Unique per form) */}
                          {otherFields.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {otherFields.slice(0, 4).map(([rawKey, val]) => (
                                <span
                                  key={rawKey}
                                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300 border border-white/5"
                                >
                                  <span className="text-zinc-500 font-medium">
                                    {formatFieldLabel(rawKey)}:
                                  </span>
                                  <span className="font-semibold text-zinc-200 truncate max-w-[160px]">
                                    {String(val ?? "")}
                                  </span>
                                </span>
                              ))}
                              {otherFields.length > 4 && (
                                <span className="text-[10px] text-zinc-500 self-center">
                                  +{otherFields.length - 4} outros campos
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div
                        className="flex items-center justify-between md:justify-end gap-2 shrink-0 border-t border-white/5 pt-3 md:border-t-0 md:pt-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {whatsAppLink && (
                          <a
                            href={whatsAppLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold transition"
                            title="Iniciar WhatsApp com o lead"
                          >
                            <MessageCircle className="size-3.5" />
                            WhatsApp
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(sub)}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition"
                        >
                          Ver detalhes
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ENDPOINTS & KEYS */}
        {activeTab === "endpoints" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
              <div>
                <h3 className="font-display text-sm font-semibold text-zinc-100">
                  Formulários Cadastrados & Chaves Ativas
                </h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Cada formulário possui sua própria chave de autenticação para recebimento seguro via POST.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewKeyModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition shadow-sm shrink-0"
              >
                <Plus className="size-3.5 stroke-[2.5]" />
                Criar Novo Endpoint
              </button>
            </div>

            {loadingKeys ? (
              <div className="rounded-3xl border border-white/5 bg-zinc-900/30 p-12 text-center">
                <RefreshCw className="mx-auto size-7 animate-spin text-emerald-400 mb-3" />
                <p className="text-xs text-zinc-400">Carregando endpoints...</p>
              </div>
            ) : keys.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
                <KeyRound className="mx-auto size-9 text-zinc-600 mb-3" />
                <h3 className="text-base font-medium text-zinc-300">
                  Nenhum endpoint configurado
                </h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                  Clique no botão acima para cadastrar seu primeiro formulário e obter a chave de integração.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-zinc-900/40 overflow-hidden shadow-sm">
                {keys.map((k) => {
                  const isRevoked = Boolean(k.revokedAt);
                  const isExpired = Boolean(k.expiresAt && new Date(k.expiresAt) < new Date());
                  const isActive = !isRevoked && !isExpired;

                  return (
                    <div
                      key={k.id}
                      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 hover:bg-white/[0.02] transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-sm text-zinc-100">
                            {k.name}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                : isRevoked
                                ? "bg-red-500/10 text-red-300 border-red-500/25"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/25"
                            }`}
                          >
                            {isRevoked ? "Revogado" : isExpired ? "Expirado" : "Ativo"}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                          <span className="font-mono text-zinc-300">
                            Prefixo: {k.keyPrefix}...
                          </span>
                          <span>Criado por: {k.createdBy}</span>
                          <span>Em: {formatSubmissionDate(k.createdAt)}</span>
                          {k.expiresAt && (
                            <span className="text-amber-400/80">
                              Expira: {formatSubmissionDate(k.expiresAt)}
                            </span>
                          )}
                        </div>

                        {/* Allowed units */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-zinc-500">Unidades autorizadas:</span>
                          {k.clientIds.includes("*") ? (
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-200 border border-white/10">
                              Todas as franquias (*)
                            </span>
                          ) : (
                            k.clientIds.map((cId) => (
                              <span
                                key={cId}
                                className="rounded-md bg-emerald-500/5 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/15"
                              >
                                {clientNameMap.get(cId) || cId}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Allowed origins */}
                        {k.allowedOrigins && k.allowedOrigins.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                            <span>CORS:</span>
                            {k.allowedOrigins.map((orig, i) => (
                              <code key={i} className="text-[10px] text-zinc-400">
                                {orig}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCodeModalData({ formKey: k })}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition"
                        >
                          <Code2 className="size-3.5 text-emerald-400" />
                          Ver Código de Integração
                        </button>

                        {isActive && (
                          <button
                            type="button"
                            onClick={() => setRevokingKey(k)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition"
                          >
                            <Trash2 className="size-3.5" />
                            Revogar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: Detalhes da Submissão */}
      {selectedSubmission && (
        <FormSubmissionDetailModal
          submission={selectedSubmission}
          unitName={clientNameMap.get(selectedSubmission.clientId)}
          onClose={() => setSelectedSubmission(null)}
          onDelete={handleDeleteSubmission}
        />
      )}

      {/* MODAL: Novo Endpoint */}
      {showNewKeyModal && (
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
      {codeModalData && (
        <FormIntegrationCodeModal
          formKey={codeModalData.formKey}
          apiKey={codeModalData.apiKey}
          onClose={() => setCodeModalData(null)}
        />
      )}

      {/* MODAL: Confirmação de Revogação de Chave */}
      {revokingKey && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm rounded-3xl border border-red-500/20 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-2">
              <AlertTriangle className="size-5" />
              <h3 className="font-display font-semibold text-base text-zinc-100">
                Revogar Chave de Endpoint?
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O formulário <strong className="text-zinc-200">{revokingKey.name}</strong> deixará de receber submissões imediatamente. Esta ação é definitiva.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevokingKey(null)}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRevokeKey}
                className="rounded-xl bg-red-500 hover:bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition"
              >
                Sim, revogar agora
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
