import { useEffect, useState } from "react";
import { Copy, Globe, Link2, Trash2 } from "lucide-react";
import { Button, Dialog, Field, IconButton, InlineNotice, Input, toast, toastWithUndo } from "@/components/ds";
import { createLandingPageRequest, deleteLandingPageRequest } from "@/lib/googleApi";
import type { Ga4LandingPage } from "../../../../shared/google";

// Cadastro das Landing Pages (propriedades do GA4) da unidade selecionada. Só administradores.

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

function splitHostnames(value: string): string[] {
  return value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
}

function ServiceAccountHint({ email }: { email: string | null }) {
  if (!email) {
    return (
      <InlineNotice tone="warning">
        A conta de serviço do Google ainda não está configurada no servidor. O vínculo fica salvo, mas os dados só aparecem depois dela.
      </InlineNotice>
    );
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-sm text-zinc-400">
      <p>Antes de vincular, adicione este e-mail como <span className="text-zinc-200">Leitor</span> na propriedade do GA4 (Administrador → Gerenciamento de acesso à propriedade):</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-zinc-950 px-2 py-1 text-xs text-zinc-200">{email}</code>
        <IconButton
          label="Copiar e-mail"
          size="sm"
          icon={<Copy />}
          onClick={() => {
            void navigator.clipboard.writeText(email).then(
              () => toast.success("E-mail copiado"),
              () => toast.error("Não foi possível copiar. Selecione o e-mail e copie manualmente."),
            );
          }}
        />
      </div>
    </div>
  );
}

export function LandingPageManager({
  open,
  onOpenChange,
  unitId,
  unitName,
  landingPages,
  serviceAccountEmail,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitName: string | null;
  landingPages: Ga4LandingPage[];
  serviceAccountEmail: string | null;
  onChange: (landingPages: Ga4LandingPage[]) => void;
}) {
  const [name, setName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [hostnames, setHostnames] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(landingPages.length === 0 && unitName ? `LP ${unitName}` : "");
    setPropertyId("");
    setSiteUrl("");
    setHostnames("");
    setFormError(null);
  }, [open, unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function link(input: { name: string; propertyId: string; hostnames: string[]; siteUrl: string | null }, current: Ga4LandingPage[]) {
    const { landingPage, verified } = await createLandingPageRequest({ unitId, ...input });
    onChange([...current, landingPage]);
    return verified;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const verified = await link({ name, propertyId, hostnames: splitHostnames(hostnames), siteUrl: siteUrl.trim() || null }, landingPages);
      toast.success("Landing Page vinculada", {
        description: verified ? "O acesso ao GA4 foi conferido." : "O acesso ao GA4 será conferido quando a conta de serviço estiver configurada.",
      });
      onOpenChange(false);
    } catch (error) {
      setFormError(errorMessage(error, "Não foi possível vincular a Landing Page."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(landingPage: Ga4LandingPage) {
    setRemovingId(landingPage.id);
    try {
      await deleteLandingPageRequest(landingPage.id);
      const remaining = landingPages.filter((item) => item.id !== landingPage.id);
      onChange(remaining);
      toastWithUndo(`${landingPage.name} desvinculada`, async () => {
        try {
          await link({ name: landingPage.name, propertyId: landingPage.propertyId, hostnames: landingPage.hostnames, siteUrl: landingPage.siteUrl }, remaining);
        } catch (error) {
          toast.error(errorMessage(error, "Não foi possível refazer o vínculo."));
        }
      });
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível desvincular a Landing Page."));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Landing Pages"
      description={unitName ? `Propriedades do GA4 vinculadas a ${unitName}.` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button type="submit" form="ga4-link-form" variant="primary" loading={saving}>
            <Link2 />
            Vincular
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {landingPages.length > 0 && (
          <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]" aria-label="Landing Pages vinculadas">
            {landingPages.map((landingPage) => (
              <li key={landingPage.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <Globe className="size-4 shrink-0 text-zinc-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-100">{landingPage.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {landingPage.siteUrl ? `${landingPage.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")} · ` : ""}
                    Propriedade {landingPage.propertyId}
                    {landingPage.hostnames.length > 0 ? ` · ${landingPage.hostnames.join(", ")}` : ""}
                  </p>
                </div>
                <IconButton
                  label={`Desvincular ${landingPage.name}`}
                  size="sm"
                  icon={<Trash2 />}
                  disabled={removingId === landingPage.id}
                  onClick={() => void remove(landingPage)}
                />
              </li>
            ))}
          </ul>
        )}

        <ServiceAccountHint email={serviceAccountEmail} />

        <form id="ga4-link-form" className="space-y-4" onSubmit={submit} noValidate>
          <Field label="Nome" htmlFor="ga4-name" required hint="Como a Landing Page aparece no painel.">
            <Input id="ga4-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="LP Vida Card Ijuí" required />
          </Field>
          <Field
            label="ID da propriedade do GA4"
            htmlFor="ga4-property"
            required
            hint="Só números, em Administrador → Detalhes da propriedade. Não é o ID de medição G-."
          >
            <Input id="ga4-property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} inputMode="numeric" placeholder="412345678" required />
          </Field>
          <Field label="Endereço da Landing Page" htmlFor="ga4-site" hint="Usado no botão Abrir Landing Page.">
            <Input id="ga4-site" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} inputMode="url" placeholder="vidacardijui.com.br" />
          </Field>
          <Field
            label="Domínios"
            htmlFor="ga4-hosts"
            optional
            hint="Só se a propriedade medir mais de um site. Separe por vírgula."
          >
            <Input id="ga4-hosts" value={hostnames} onChange={(e) => setHostnames(e.target.value)} placeholder="ijui.vidacard.com.br" />
          </Field>
          {formError && <InlineNotice tone="critical">{formError}</InlineNotice>}
        </form>
      </div>
    </Dialog>
  );
}
