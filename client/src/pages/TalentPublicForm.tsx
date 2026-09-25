import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { saveConsent } from "@/lib/consent";
import { ArrowLeft, CheckCircle2, FileText, Paperclip, X } from "lucide-react";
import {
  Button,
  CheckboxField,
  DatePicker,
  Field as DsField,
  IconButton,
  Input,
  RadioGroup,
  RadioOption,
  Select,
  Textarea,
} from "@/components/ds";
import { toast } from "sonner";
import { trackTalentFormSubmission } from "@/lib/tracking";

type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "cpf"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "file";

type Field = {
  id: string;
  fieldKey: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  fieldType: FieldType;
  isRequired: boolean;
  options: { label: string; value: string }[];
  validationRules: Record<string, unknown>;
};

type TalentForm = {
  id: string;
  publicSlug: string;
  title: string;
  subtitle: string;
  bannerUrl: string | null;
  lgpdDisclaimer: string;
  successTitle: string;
  successMessage: string;
  fields: Field[];
};

const fileTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.length <= 10
    ? digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2")
    : digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function FieldControl({
  field,
  value,
  onChange,
  file,
  onFile,
  error,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  file?: File;
  onFile: (file: File | undefined) => void;
  error?: string;
}) {
  const fieldId = `talent-${field.id}`;
  // O texto de ajuda do anexo aparece dentro da área de envio, não repetido embaixo.
  // "Opcional" como ajuda repetiria o "(opcional)" do rótulo.
  const hint =
    field.fieldType === "file" || field.helpText?.trim().toLowerCase() === "opcional"
      ? undefined
      : field.helpText ?? undefined;
  const wrap = (control: React.ReactNode) => (
    <DsField
      label={field.label}
      htmlFor={fieldId}
      required={field.isRequired}
      optional={!field.isRequired}
      hint={hint}
      error={error}
    >
      {control}
    </DsField>
  );

  if (field.fieldType === "textarea") {
    return wrap(
      <Textarea
        id={fieldId}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder ?? ""}
        rows={4}
        aria-invalid={Boolean(error) || undefined}
      />
    );
  }

  if (field.fieldType === "select") {
    return wrap(
      <Select
        id={fieldId}
        size="lg"
        value={String(value ?? "")}
        onValueChange={onChange}
        placeholder="Selecione uma opção"
        invalid={Boolean(error)}
        options={field.options.map((option) => ({ value: option.label, label: option.label }))}
      />
    );
  }

  if (field.fieldType === "radio") {
    return wrap(
      <RadioGroup
        id={fieldId}
        value={String(value ?? "")}
        onValueChange={onChange}
        aria-label={field.label}
      >
        {field.options.map((option, index) => (
          <RadioOption
            key={`${option.value}-${index}`}
            id={`${fieldId}-${index}`}
            value={option.label}
            label={option.label}
          />
        ))}
      </RadioGroup>
    );
  }

  if (field.fieldType === "checkbox") {
    const selected = Array.isArray(value) ? value : [];
    return wrap(
      <div id={fieldId} className="grid gap-2.5 pt-1">
        {field.options.map((option, index) => {
          const isChecked = selected.includes(option.label) || selected.includes(option.value);
          return (
            <CheckboxField
              key={`${option.value}-${index}`}
              id={`${fieldId}-${index}`}
              label={option.label}
              checked={isChecked}
              onCheckedChange={() =>
                onChange(
                  isChecked
                    ? selected.filter((item) => item !== option.label && item !== option.value)
                    : [...selected, option.label]
                )
              }
            />
          );
        })}
      </div>
    );
  }

  if (field.fieldType === "file") {
    return wrap(
      <div
        className={`flex items-center gap-3 rounded-lg border border-dashed px-4 py-3.5 transition-colors ${
          error ? "border-rose-500/60" : "border-white/15 hover:border-white/30"
        }`}
      >
        <Paperclip className="size-4 shrink-0 text-zinc-400" />
        <label htmlFor={fieldId} className="min-w-0 flex-1 cursor-pointer">
          <span className="block truncate text-sm font-medium text-zinc-100">
            {file?.name ?? "Anexar currículo"}
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">{field.helpText || "PDF ou DOCX, até 5 MB"}</span>
        </label>
        {file && (
          <IconButton label="Remover arquivo" variant="ghost" size="sm" icon={<X />} onClick={() => onFile(undefined)} />
        )}
        <input
          id={fieldId}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      </div>
    );
  }

  if (field.fieldType === "date") {
    return wrap(
      <DatePicker id={fieldId} size="lg" value={String(value ?? "")} onChange={onChange} invalid={Boolean(error)} />
    );
  }

  const display =
    field.fieldType === "phone"
      ? maskPhone(String(value ?? ""))
      : field.fieldType === "cpf"
      ? maskCpf(String(value ?? ""))
      : String(value ?? "");

  return wrap(
    <Input
      id={fieldId}
      size="lg"
      type={field.fieldType === "email" ? "email" : field.fieldType === "number" ? "number" : "text"}
      inputMode={field.fieldType === "phone" || field.fieldType === "cpf" ? "numeric" : undefined}
      autoComplete={field.fieldType === "email" ? "email" : field.fieldType === "phone" ? "tel" : undefined}
      value={display}
      aria-invalid={Boolean(error) || undefined}
      onChange={(event) =>
        onChange(
          field.fieldType === "phone"
            ? maskPhone(event.target.value)
            : field.fieldType === "cpf"
            ? maskCpf(event.target.value)
            : event.target.value
        )
      }
      placeholder={field.placeholder ?? ""}
    />
  );
}

export default function TalentPublicForm() {
  const [, params] = useRoute("/trabalhe-conosco/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug ?? "";
  const [form, setForm] = useState<TalentForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const required = useMemo(
    () => form?.fields.filter((field) => field.isRequired) ?? [],
    [form]
  );

  useEffect(() => {
    document.title = "Trabalhe conosco";
    setLoading(true);
    fetch(`/api/talent/public/${encodeURIComponent(slug)}`)
      .then(async (response) => ({
        response,
        body: await response.json().catch(() => ({})),
      }))
      .then(({ response, body }) => {
        if (!response.ok) {
          toast.error(body.error ?? "Página não encontrada");
          setForm(null);
          return;
        }
        setForm(body);
        if (body.title) {
          document.title = `${body.title} — Trabalhe conosco`;
        }
      })
      .catch(() => toast.error("Não foi possível carregar esta oportunidade"))
      .finally(() => setLoading(false));
  }, [slug]);

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const { [key]: _removed, ...rest } = current;
      return rest;
    });

  const setAnswer = (key: string, value: unknown) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;

    const nextErrors: Record<string, string> = {};
    for (const field of required) {
      const value = answers[field.fieldKey];
      const empty =
        field.fieldType === "file"
          ? !files[field.fieldKey]
          : !value || (Array.isArray(value) && !value.length);
      if (empty) nextErrors[field.fieldKey] = "Campo obrigatório";
    }
    for (const [key, file] of Object.entries(files)) {
      if (file && (!fileTypes.includes(file.type) || file.size > 5 * 1024 * 1024)) {
        nextErrors[key] = "Envie um PDF ou DOCX de até 5 MB";
      }
    }
    if (!accepted) nextErrors.__lgpd = "Aceite o termo para enviar sua candidatura";

    setErrors(nextErrors);
    const firstKey = Object.keys(nextErrors)[0];
    if (firstKey) {
      const target =
        firstKey === "__lgpd"
          ? document.getElementById("talent-lgpd")
          : document.getElementById(`talent-${form.fields.find((f) => f.fieldKey === firstKey)?.id}`);
      target?.focus();
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setSending(true);
    try {
      const body = new FormData();
      body.set("answers", JSON.stringify(answers));
      body.set("lgpdAccepted", "true");
      Object.entries(files).forEach(([key, file]) => {
        if (file) body.append(`file_${key}`, file);
      });

      const response = await fetch(
        `/api/talent/public/${encodeURIComponent(slug)}/submit`,
        { method: "POST", body }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error ?? "Não foi possível enviar a candidatura");
        return;
      }
      saveConsent("granted");
      trackTalentFormSubmission({ form, answers });
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Não foi possível enviar sua candidatura");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-5 py-20 text-white">
        <div className="mx-auto max-w-2xl animate-pulse">
          <div className="h-6 w-40 rounded bg-white/10" />
          <div className="mt-10 h-10 w-2/3 rounded bg-white/10" />
          <div className="mt-4 h-5 w-full rounded bg-white/[0.06]" />
          <div className="mt-12 space-y-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-16 rounded-xl bg-white/[0.05]" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-6 text-center text-white">
        <div>
          <FileText className="mx-auto size-11 text-zinc-600" />
          <h1 className="mt-5 font-display text-2xl font-semibold">
            Página não encontrada
          </h1>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            Esta oportunidade não está disponível ou ainda não foi publicada.
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/">
              <ArrowLeft />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  if (sent) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-6 text-center text-white">
        <div className="max-w-xl">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 className="size-8" />
          </span>
          <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">
            {form.successTitle}
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-400">
            {form.successMessage}
          </p>
          <Button variant="secondary" className="mt-8" onClick={() => setLocation("/")}>
            Voltar ao início
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-5xl px-5 pb-12 pt-10 md:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(480px,1.15fr)] lg:gap-12">
          <aside className="space-y-5 lg:sticky lg:top-14 lg:self-start">
            {form.bannerUrl && (
              <img src={form.bannerUrl} alt="" className="h-12 max-w-[220px] object-contain" />
            )}
            <div>
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-zinc-100 sm:text-4xl">
                {form.title}
              </h1>
              {form.subtitle && (
                <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-400">{form.subtitle}</p>
              )}
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-500">
              Seus dados são usados apenas neste processo de recrutamento e seleção e guardados por até 180 dias.{" "}
              <Link href="/privacidade" className="underline underline-offset-4 hover:text-zinc-300">Política de privacidade</Link>
            </p>
          </aside>

          <form
            onSubmit={submit}
            noValidate
            className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8"
          >
            <div>
              <h2 className="font-display text-xl font-semibold text-zinc-100">Envie sua candidatura</h2>
            </div>

            <div className="space-y-5">
              {form.fields.map((field) => (
                <FieldControl
                  key={field.fieldKey}
                  field={field}
                  value={answers[field.fieldKey]}
                  onChange={(value) => setAnswer(field.fieldKey, value)}
                  file={files[field.fieldKey]}
                  error={errors[field.fieldKey]}
                  onFile={(file) => {
                    setFiles((current) => ({ ...current, [field.fieldKey]: file }));
                    clearError(field.fieldKey);
                  }}
                />
              ))}
            </div>

            <div className="space-y-1.5 border-t border-white/10 pt-5">
              <CheckboxField
                id="talent-lgpd"
                checked={accepted}
                onCheckedChange={(checked) => {
                  setAccepted(checked === true);
                  clearError("__lgpd");
                }}
                aria-invalid={Boolean(errors.__lgpd) || undefined}
                label={<span className="text-zinc-300">{form.lgpdDisclaimer}</span>}
                description="Ao enviar, você também autoriza cookies de medição (Google Analytics) neste site."
              />
              {errors.__lgpd && (
                <p role="alert" className="pl-7 text-xs leading-5 text-rose-300">{errors.__lgpd}</p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" loading={sending} className="w-full">
              {sending ? "Enviando…" : "Enviar candidatura"}
            </Button>
          </form>
        </div>
      </section>
      <footer className="mx-auto max-w-5xl px-5 pb-10 text-xs text-zinc-600">
        Página criada com{" "}
        <Link href="/" className="text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline">
          Tráfego Pro
        </Link>
      </footer>
    </main>
  );
}
