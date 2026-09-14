import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { FormApiKey } from "./formTypes";

interface FormIntegrationCodeModalProps {
  apiKey?: string; // Presente quando recém-criada
  formKey: FormApiKey;
  onClose: () => void;
}

export function FormIntegrationCodeModal({
  apiKey,
  formKey,
  onClose,
}: FormIntegrationCodeModalProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activeTab, setActiveTab] = useState<"js" | "html" | "curl">("js");

  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.trafego.pro";
  const endpointUrl = `${origin}/api/forms/submit`;
  const sampleClientId = formKey.clientIds[0] || "SUA_UNIDADE_ID";
  const displayKey = apiKey || `${formKey.keyPrefix}... (chave oculta)`;

  const jsSnippet = `// Exemplo de envio via JavaScript na Landing Page
async function enviarFormulario(dadosDoForm) {
  try {
    const response = await fetch("${endpointUrl}", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ${apiKey || "SUA_CHAVE_API_AQUI"}"
      },
      body: JSON.stringify({
        clientId: "${sampleClientId}",
        fields: {
          nome: dadosDoForm.nome,
          telefone: dadosDoForm.telefone,
          interesse: dadosDoForm.interesse || "Plano Individual",
          cidade: dadosDoForm.cidade || "Caxias do Sul"
        },
        metadata: {
          source_url: window.location.href,
          utm_source: new URLSearchParams(window.location.search).get("utm_source") || "organico",
          utm_medium: new URLSearchParams(window.location.search).get("utm_medium") || "",
          utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || ""
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log("Submissão gravada com sucesso! ID:", result.id);
      alert("Recebemos seu contato!");
    } else {
      const err = await response.json();
      console.error("Erro no envio:", err.error);
    }
  } catch (error) {
    console.error("Falha ao conectar com o endpoint:", error);
  }
}`;

  const htmlSnippet = `<!-- Exemplo HTML com envio direto -->
<form id="contato-form">
  <input type="text" name="nome" placeholder="Seu Nome" required />
  <input type="tel" name="telefone" placeholder="Seu WhatsApp" required />
  <button type="submit">Enviar</button>
</form>

<script>
document.getElementById("contato-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  await fetch("${endpointUrl}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer ${apiKey || "SUA_CHAVE_API_AQUI"}"
    },
    body: JSON.stringify({
      clientId: "${sampleClientId}",
      fields: Object.fromEntries(formData.entries()),
      metadata: { source_url: window.location.href }
    })
  });
  alert("Contato enviado!");
  e.target.reset();
});
<\/script>`;

  const curlSnippet = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey || "SUA_CHAVE_API_AQUI"}" \\
  -d '{
    "clientId": "${sampleClientId}",
    "fields": {
      "nome": "João Silva",
      "telefone": "(54) 99999-8888",
      "interesse": "Vida Card"
    }
  }'`;

  const copyKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      toast.success("Chave de API copiada!");
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      toast.error("Não foi possível copiar a chave");
    }
  };

  const copySnippet = async () => {
    const textToCopy = activeTab === "js" ? jsSnippet : activeTab === "html" ? htmlSnippet : curlSnippet;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedSnippet(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o código");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card flex flex-col max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-6 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
              <Code2 className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-zinc-100">
                Instruções de Integração do Endpoint
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                {formKey.name} • Endpoint público seguro
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Key Banner (se recém criada) */}
          {apiKey && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs uppercase tracking-wider">
                  <ShieldCheck className="size-4" />
                  Chave de API Gerada (Copie agora!)
                </div>
                <button
                  type="button"
                  onClick={copyKey}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-zinc-950 px-2.5 py-1 text-xs font-bold transition hover:bg-emerald-400"
                >
                  {copiedKey ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copiedKey ? "Copiado!" : "Copiar Chave"}
                </button>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-black/40 p-2.5 font-mono text-xs text-emerald-200 break-all select-all">
                {apiKey}
              </div>

              <p className="text-[11px] text-amber-200/80 flex items-center gap-1">
                <AlertTriangle className="size-3 text-amber-400 shrink-0" />
                Esta chave completa é exibida apenas uma vez. Guarde-a com segurança!
              </p>
            </div>
          )}

          {/* Endpoint Info */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              URL do Endpoint (POST)
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 font-mono text-xs text-zinc-200 select-all">
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                POST
              </span>
              <span className="truncate flex-1">{endpointUrl}</span>
            </div>
          </div>

          {/* Code Snippets with Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 border-b border-white/5 pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("js")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    activeTab === "js"
                      ? "bg-white/10 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  JavaScript (Fetch)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("html")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    activeTab === "html"
                      ? "bg-white/10 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  HTML + JS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("curl")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    activeTab === "curl"
                      ? "bg-white/10 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  cURL
                </button>
              </div>

              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10 transition"
              >
                {copiedSnippet ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copiedSnippet ? "Copiado!" : "Copiar Código"}
              </button>
            </div>

            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-64 select-all leading-relaxed">
              <pre>
                {activeTab === "js" ? jsSnippet : activeTab === "html" ? htmlSnippet : curlSnippet}
              </pre>
            </div>
          </div>

          {/* Details list */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-4 space-y-2 text-xs text-zinc-400">
            <div className="font-semibold text-zinc-200 text-xs uppercase tracking-wider mb-1">
              Parâmetros do Payload:
            </div>
            <p>
              • <strong className="text-zinc-200">clientId</strong>: ID da unidade (ex.: <code className="text-emerald-400">{sampleClientId}</code>). Deve coincidir com as unidades liberadas na chave.
            </p>
            <p>
              • <strong className="text-zinc-200">fields</strong>: Objeto com qualquer dado do formulário (ex.: nome, telefone, cidade, interesse). O backend sanitiza tudo automaticamente.
            </p>
            <p>
              • <strong className="text-zinc-200">metadata</strong> (opcional): Rastreamento de UTMs e URL de origem para atribuição de tráfego.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/10 p-4 bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white hover:bg-zinc-200 px-5 py-2 text-xs font-semibold text-zinc-950 transition"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
