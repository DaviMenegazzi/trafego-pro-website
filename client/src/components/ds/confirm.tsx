import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./field";

// Substitui confirm() e prompt() do navegador. Use só para o que é destrutivo
// e irreversível; ações reversíveis ganham toast com "Desfazer".

type ConfirmOptions = {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type PromptOptions = {
  title: React.ReactNode;
  description?: React.ReactNode;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  prefix?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Retorna a mensagem de erro, ou null quando o valor é válido. */
  validate?: (value: string) => string | null;
};

type Request =
  | ({ kind: "confirm"; resolve: (ok: boolean) => void } & ConfirmOptions)
  | ({ kind: "prompt"; resolve: (value: string | null) => void } & PromptOptions);

type ConfirmApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const ConfirmContext = React.createContext<ConfirmApi | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<Request | null>(null);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const api = React.useMemo<ConfirmApi>(
    () => ({
      confirm: (options) => new Promise<boolean>((resolve) => setRequest({ kind: "confirm", resolve, ...options })),
      prompt: (options) =>
        new Promise<string | null>((resolve) => {
          setValue(options.defaultValue ?? "");
          setError(null);
          setRequest({ kind: "prompt", resolve, ...options });
        }),
    }),
    [],
  );

  const close = (result: boolean) => {
    if (!request) return;
    if (request.kind === "confirm") request.resolve(result);
    else request.resolve(result ? value.trim() : null);
    setRequest(null);
  };

  const submitPrompt = (event: React.FormEvent) => {
    event.preventDefault();
    if (!request || request.kind !== "prompt") return;
    const message = request.validate?.(value.trim()) ?? null;
    if (message) { setError(message); return; }
    close(true);
  };

  const danger = request?.kind === "confirm" && request.tone === "danger";

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <AlertDialogPrimitive.Root open={Boolean(request)} onOpenChange={(open) => { if (!open) close(false); }}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[170] bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-200" />
          <AlertDialogPrimitive.Content
            className="fixed left-1/2 top-1/2 z-[180] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-zinc-100 shadow-2xl shadow-black/70 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-200"
          >
            {request && (
              <form onSubmit={request.kind === "prompt" ? submitPrompt : (event) => { event.preventDefault(); close(true); }}>
                <div className="flex gap-3">
                  {danger && (
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
                      <AlertTriangle className="size-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <AlertDialogPrimitive.Title className="font-display text-base font-semibold text-white">{request.title}</AlertDialogPrimitive.Title>
                    <AlertDialogPrimitive.Description className={cn("mt-1.5 text-sm leading-6 text-zinc-400", !request.description && "sr-only")}>
                      {request.description ?? "Confirme para continuar."}
                    </AlertDialogPrimitive.Description>
                  </div>
                </div>

                {request.kind === "prompt" && (
                  <div className="mt-4 space-y-1.5">
                    <label htmlFor="ds-prompt-input" className="text-sm font-medium text-zinc-200">{request.label}</label>
                    <div className="flex items-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950/70 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20">
                      {request.prefix && <span className="whitespace-nowrap pl-3 text-sm text-zinc-500">{request.prefix}</span>}
                      <Input
                        id="ds-prompt-input"
                        autoFocus
                        value={value}
                        placeholder={request.placeholder}
                        aria-invalid={Boolean(error)}
                        onChange={(event) => { setValue(event.target.value); setError(null); }}
                        className={cn("border-0 bg-transparent focus:ring-0", request.prefix && "pl-1")}
                      />
                    </div>
                    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
                  </div>
                )}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <AlertDialogPrimitive.Cancel asChild>
                    <Button variant="ghost">{request.cancelLabel ?? "Cancelar"}</Button>
                  </AlertDialogPrimitive.Cancel>
                  <Button type="submit" variant={danger ? "danger" : "primary"} autoFocus={request.kind === "confirm"}>
                    {request.confirmLabel ?? (danger ? "Excluir" : "Confirmar")}
                  </Button>
                </div>
              </form>
            )}
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const api = React.useContext(ConfirmContext);
  if (!api) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
  return api;
}

export type { ConfirmOptions, PromptOptions };
