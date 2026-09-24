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
import { Button, EmptyState, InlineNotice, Page, PageHeader, SegmentedControl, Select, Surface } from "@/components/ds";

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
  const [forms, setForms] = useState<TalentForm[]>([]);
  const [activeForm, setActiveForm] = useState<TalentForm | null>(null);
  const [activeTab, setActiveTab] = useState<"builder" | "candidates">("builder");
  const [candidates, setCandidates] = useState<TalentSubmission[]>([]);

  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [savingForm, setSavingForm] = useState(false);

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

  // A unidade do contexto global tem correspondente no recrutamento?
  const contextMatched = useMemo(() => {
    if (!selectedClientId || units.length === 0) return false;
    if (units.some((u) => u.id === selectedClientId)) return true;
    const ctxClient = clients.find((c) => c.id === selectedClientId);
    if (!ctxClient) return false;
    const ctxNorm = normalizeUnitKey(ctxClient.name);
    return units.some((u) => {
      const uNorm = normalizeUnitKey(u.name);
      return uNorm === ctxNorm || uNorm.includes(ctxNorm) || ctxNorm.includes(uNorm);
    });
  }, [selectedClientId, units, clients]);


  return (
    <AppLayout>
      <Page>
        <PageHeader
          title="Banco de Talentos"
          subtitle={
            activeForm
              ? `${currentUnit?.name ?? ""} · ${activeForm.title}`
              : currentUnit
                ? `${currentUnit.name} · formulários de recrutamento`
                : "Formulários de recrutamento"
          }
          actions={
            !contextMatched && units.length > 0 ? (
              <Select
                aria-label="Unidade do recrutamento"
                value={selectedUnitId}
                onValueChange={(id) => handleSelectUnit(id)}
                className="w-64"
                options={units.map((u) => ({ value: u.id, label: u.name }))}
                placeholder="Selecionar unidade"
              />
            ) : undefined
          }
        />
        {!contextMatched && units.length > 0 && selectedClientId && (
          <InlineNotice tone="info">A unidade escolhida no menu ainda não tem recrutamento; escolha a unidade acima.</InlineNotice>
        )}

        {/* Loading State */}
        {loadingUnits ? (
          <Surface><EmptyState title="Carregando o recrutamento da unidade…" /></Surface>
        ) : !selectedUnitId ? (
          <Surface><EmptyState title="Nenhuma unidade com recrutamento" description="Peça a um administrador para ativar o Banco de Talentos na unidade." /></Surface>
        ) : activeForm ? (
          /* ─── LEVEL 2: ACTIVE FORM WORKSPACE ─── */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => setActiveForm(null)}>
                  <ArrowLeft />
                  Formulários
                </Button>
                {forms.length > 1 && (
                  <Select
                    aria-label="Trocar de formulário"
                    value={activeForm.id}
                    onValueChange={(id) => { const f = forms.find((x) => x.id === id); if (f) setActiveForm(f); }}
                    className="w-72 max-w-full"
                    options={forms.map((f) => ({ value: f.id, label: f.title, description: f.isPublished ? "Publicado" : "Rascunho" }))}
                  />
                )}
              </div>
              <SegmentedControl
                aria-label="Seção do formulário"
                value={activeTab}
                onValueChange={setActiveTab}
                options={[{ value: "builder", label: "Perguntas" }, { value: "candidates", label: "Candidatos", count: candidates.length }]}
              />
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
      </Page>
    </AppLayout>
  );
}
