import { useCallback, useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileText,
  LayoutList,
  Loader2,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { useClientContext } from "@/contexts/ClientContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type {
  TalentForm,
  TalentSubmission,
  TalentSubmissionStatus,
  Unit,
} from "./talent/types";
import { TalentFormsList } from "./talent/TalentFormsList";
import { TalentFormBuilder } from "./talent/TalentFormBuilder";
import { TalentCandidatesList } from "./talent/TalentCandidatesList";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("tp_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeUnitKey(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export default function TalentBankAdmin() {
  const [, setLocation] = useLocation();
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();

  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [unitSearch, setUnitSearch] = useState("");
  const [forms, setForms] = useState<TalentForm[]>([]);
  const [activeForm, setActiveForm] = useState<TalentForm | null>(null);
  const [activeTab, setActiveTab] = useState<"builder" | "candidates">("builder");
  const [candidates, setCandidates] = useState<TalentSubmission[]>([]);

  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [formDropdownOpen, setFormDropdownOpen] = useState(false);

  useEffect(() => {
    document.title = "Tráfego Pro — Banco de Talentos";
  }, []);

  // ─── 1. Load Units ──────────────────────────────────────────────────────────
  const fetchUnits = useCallback(async () => {
    setLoadingUnits(true);
    try {
      const res = await fetch("/api/talent/admin/units", {
        headers: authHeaders(),
        credentials: "include",
      });
      if (res.status === 401) {
        setLocation("/login");
        return;
      }
      if (res.status === 403) {
        toast.error("Acesso restrito ao Banco de Talentos.");
        setLocation("/dashboard");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao listar unidades");
        return;
      }

      const availableUnits: Unit[] = data.units || [];
      setUnits(availableUnits);

      if (availableUnits.length > 0) {
        let initial = availableUnits[0].id;
        if (selectedClientId) {
          const directMatch = availableUnits.find((u) => u.id === selectedClientId);
          if (directMatch) {
            initial = directMatch.id;
          } else {
            const ctxClient = clients.find((c) => c.id === selectedClientId);
            if (ctxClient) {
              const ctxNorm = normalizeUnitKey(ctxClient.name);
              const nameMatch = availableUnits.find((u) => {
                const uNorm = normalizeUnitKey(u.name);
                return uNorm === ctxNorm || uNorm.includes(ctxNorm) || ctxNorm.includes(uNorm);
              });
              if (nameMatch) initial = nameMatch.id;
            }
          }
        }
        setSelectedUnitId(initial);
      }
    } catch {
      toast.error("Falha ao carregar unidades de recrutamento");
    } finally {
      setLoadingUnits(false);
    }
  }, [selectedClientId, clients, setLocation]);

  useEffect(() => {
    void fetchUnits();
  }, [fetchUnits]);

  // Sync with global client context when changed from outside
  useEffect(() => {
    if (!selectedClientId || units.length === 0) return;
    const directMatch = units.find((u) => u.id === selectedClientId);
    if (directMatch) {
      setSelectedUnitId(directMatch.id);
      return;
    }
    const ctxClient = clients.find((c) => c.id === selectedClientId);
    if (ctxClient) {
      const ctxNorm = normalizeUnitKey(ctxClient.name);
      const nameMatch = units.find((u) => {
        const uNorm = normalizeUnitKey(u.name);
        return uNorm === ctxNorm || uNorm.includes(ctxNorm) || ctxNorm.includes(uNorm);
      });
      if (nameMatch) setSelectedUnitId(nameMatch.id);
    }
  }, [selectedClientId, units, clients]);

  // ─── 2. Load Forms for selected Unit ────────────────────────────────────────
  const fetchForms = useCallback(
    async (unitId: string, preferredFormId?: string) => {
      if (!unitId) return;
      setLoadingForms(true);
      try {
        const res = await fetch(
          `/api/talent/admin/form?client_id=${unitId}${
            preferredFormId ? `&form_id=${preferredFormId}` : ""
          }`,
          { headers: authHeaders(), credentials: "include" }
        );
        if (res.status === 401) {
          setLocation("/login");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Erro ao carregar formulários da unidade");
          return;
        }

        const list: TalentForm[] = data.forms ?? (data.form ? [data.form] : []);
        setForms(list);

        if (preferredFormId) {
          const match = list.find((f) => f.id === preferredFormId) || data.form;
          setActiveForm(match || null);
        }
      } catch {
        toast.error("Falha ao consultar formulários da unidade");
      } finally {
        setLoadingForms(false);
      }
    },
    [setLocation]
  );

  useEffect(() => {
    if (selectedUnitId) {
      void fetchForms(selectedUnitId);
    }
  }, [selectedUnitId, fetchForms]);

  // ─── 3. Load Candidates for active Form ────────────────────────────────────
  const fetchCandidates = useCallback(async () => {
    if (!activeForm || !selectedUnitId) return;
    setLoadingCandidates(true);
    try {
      const res = await fetch(
        `/api/talent/admin/submissions?client_id=${selectedUnitId}&form_id=${activeForm.id}`,
        { headers: authHeaders(), credentials: "include" }
      );
      if (res.status === 401) {
        setLocation("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao carregar candidaturas");
        return;
      }
      setCandidates(data.submissions || []);
    } catch {
      toast.error("Falha ao carregar candidaturas");
    } finally {
      setLoadingCandidates(false);
    }
  }, [activeForm, selectedUnitId, setLocation]);

  useEffect(() => {
    if (activeForm) {
      void fetchCandidates();
    } else {
      setCandidates([]);
    }
  }, [activeForm, fetchCandidates]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    const targetUnit = units.find((u) => u.id === unitId);
    if (targetUnit) {
      const targetNorm = normalizeUnitKey(targetUnit.name);
      const matchCtx = clients.find((c) => {
        const cNorm = normalizeUnitKey(c.name);
        return cNorm === targetNorm || cNorm.includes(targetNorm) || targetNorm.includes(cNorm);
      });
      if (matchCtx) {
        setSelectedClientId(matchCtx.id);
      } else {
        setSelectedClientId(unitId);
      }
    } else {
      setSelectedClientId(unitId);
    }
    setActiveForm(null); // Return to forms list view on unit change
  };

  const handleSelectForm = (form: TalentForm, initialTab: "builder" | "candidates" = "builder") => {
    setActiveForm(form);
    setActiveTab(initialTab);
  };

  const handleCreateForm = async (title: string) => {
    if (!selectedUnitId) return;
    try {
      const res = await fetch("/api/talent/admin/forms", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          clientId: selectedUnitId,
          title,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Não foi possível criar o formulário");
        return;
      }
      toast.success("Novo formulário criado com sucesso!");
      await fetchForms(selectedUnitId, data.form.id);
      setActiveForm(data.form);
      setActiveTab("builder");
    } catch {
      toast.error("Falha ao criar novo formulário");
    }
  };

  const handleSaveForm = async (formToSave: TalentForm) => {
    if (!selectedUnitId || !formToSave) return;
    setSavingForm(true);
    try {
      const res = await fetch("/api/talent/admin/form", {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          clientId: selectedUnitId,
          formId: formToSave.id,
          title: formToSave.title,
          subtitle: formToSave.subtitle,
          bannerUrl: formToSave.bannerUrl,
          lgpdDisclaimer: formToSave.lgpdDisclaimer,
          successTitle: formToSave.successTitle,
          successMessage: formToSave.successMessage,
          publicSlug: formToSave.publicSlug,
          isPublished: formToSave.isPublished,
          fields: formToSave.fields,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar formulário");
      }
      setActiveForm(data.form);
      setForms((prev) => prev.map((f) => (f.id === data.form.id ? data.form : f)));
      toast.success(
        data.form.isPublished
          ? "Formulário publicado e salvo com sucesso!"
          : "Formulário salvo como rascunho."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar formulário");
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!selectedUnitId) return;
    const res = await fetch(`/api/talent/admin/forms/${formId}?client_id=${selectedUnitId}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Não foi possível excluir o formulário");
    }
    if (activeForm?.id === formId) {
      setActiveForm(null);
    }
    await fetchForms(selectedUnitId);
  };

  const handleCandidateStatusChange = async (
    candidateId: string,
    newStatus: TalentSubmissionStatus
  ) => {
    if (!selectedUnitId) return;
    const res = await fetch(`/api/talent/admin/submissions/${candidateId}`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({
        clientId: selectedUnitId,
        status: newStatus,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Não foi possível atualizar o status");
    }
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );
  };

  const handleSaveCandidateNotes = async (candidateId: string, notes: string) => {
    if (!selectedUnitId) return;
    const res = await fetch(`/api/talent/admin/submissions/${candidateId}`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({
        clientId: selectedUnitId,
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Não foi possível salvar anotações");
    }
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, notes } : c))
    );
  };

  const currentUnit = useMemo(
    () => units.find((u) => u.id === selectedUnitId) || null,
    [units, selectedUnitId]
  );

  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return units;
    const q = normalizeUnitKey(unitSearch);
    return units.filter((u) => normalizeUnitKey(u.name).includes(q));
  }, [units, unitSearch]);

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* Top Breadcrumb / Unit Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              <UsersRound className="size-3.5" />
              <span>Recrutamento & Seleção</span>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-zinc-100">
              Banco de Talentos
            </h1>
          </div>

          {/* Unit Selector Popover */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover open={unitDropdownOpen} onOpenChange={setUnitDropdownOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 w-full sm:w-72 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-2.5 text-xs text-zinc-200 shadow-sm hover:border-zinc-500 hover:bg-zinc-900 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className="size-4 text-emerald-400 shrink-0" />
                    <span className="truncate font-semibold">
                      {currentUnit?.name || "Selecionar Unidade"}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-zinc-500 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-72 rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl z-50"
              >
                <div className="p-2 border-b border-white/5">
                  <div className="relative">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Buscar unidade..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 p-1">
                  {filteredUnits.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500">Nenhuma unidade encontrada</div>
                  ) : (
                    filteredUnits.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          handleSelectUnit(u.id);
                          setUnitDropdownOpen(false);
                          setUnitSearch("");
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                          u.id === selectedUnitId
                            ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                            : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{u.name}</span>
                        {u.id === selectedUnitId && (
                          <Check className="size-3.5 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Loading State */}
        {loadingUnits ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <Loader2 className="size-8 animate-spin text-emerald-400 mr-3" />
            <span>Carregando unidades do banco de talentos...</span>
          </div>
        ) : !selectedUnitId ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center text-zinc-500">
            Nenhuma unidade selecionada.
          </div>
        ) : activeForm ? (
          /* ─── LEVEL 2: ACTIVE FORM WORKSPACE ─── */
          <div className="space-y-6">
            {/* Navigation bar with Back button & Form Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveForm(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/15 hover:text-white transition"
                >
                  <ArrowLeft className="size-4" />
                  <span>Voltar para Formulários</span>
                </button>

                <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

                {/* Form quick switcher */}
                {forms.length > 1 && (
                  <Popover open={formDropdownOpen} onOpenChange={setFormDropdownOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 transition max-w-xs"
                      >
                        <span className="truncate">{activeForm.title}</span>
                        <ChevronDown className="size-3.5 text-zinc-500 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-80 rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl"
                    >
                      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Formulários da Unidade
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {forms.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setActiveForm(f);
                              setFormDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                              f.id === activeForm.id
                                ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                                : "text-zinc-300 hover:bg-white/5"
                            }`}
                          >
                            <span className="truncate">{f.title}</span>
                            <span className="text-[10px] text-zinc-500">
                              {f.isPublished ? "Publicado" : "Rascunho"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-950/80 p-1 w-full sm:w-auto justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => setActiveTab("builder")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "builder"
                      ? "bg-white text-zinc-950 shadow-md"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Settings2 className="size-3.5" />
                  <span>Construtor de Campos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("candidates")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "candidates"
                      ? "bg-white text-zinc-950 shadow-md"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Users className="size-3.5" />
                  <span>Candidatos ({candidates.length})</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Form Builder with Drag & Drop */}
            {activeTab === "builder" && (
              <TalentFormBuilder
                form={activeForm}
                saving={savingForm}
                onSave={handleSaveForm}
                onFormChange={setActiveForm}
                onDeleteForm={handleDeleteForm}
              />
            )}

            {/* Tab 2: Candidates and Submissions list */}
            {activeTab === "candidates" && (
              <TalentCandidatesList
                form={activeForm}
                candidates={candidates}
                loading={loadingCandidates}
                onRefresh={fetchCandidates}
                onStatusChange={handleCandidateStatusChange}
                onSaveNotes={handleSaveCandidateNotes}
              />
            )}
          </div>
        ) : (
          /* ─── LEVEL 1: FORMS LIST FOR CURRENT UNIT ─── */
          <TalentFormsList
            unit={currentUnit}
            forms={forms}
            loading={loadingForms}
            onSelectForm={handleSelectForm}
            onCreateForm={handleCreateForm}
            onDeleteForm={handleDeleteForm}
          />
        )}
      </main>
    </AppLayout>
  );
}
