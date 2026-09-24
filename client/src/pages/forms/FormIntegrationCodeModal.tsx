import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, Dialog, InlineNotice, SegmentedControl, useConfirm } from "@/components/ds";
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
  const [keyWasCopied, setKeyWasCopied] = useState(false);
  const { confirm } = useConfirm();

  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.trafego.pro";
  const endpointUrl = `${origin}/api/forms/submit`;
  const sampleClientId = formKey.clientIds[0] || "SUA_UNIDADE_ID";

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
      setKeyWasCopied(true);
      toast.success("Chave copiada");
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
      toast.success("Código copiado");
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o código");
    }
  };

  // A chave completa só aparece aqui, uma vez: fechar sem copiar pede confirmação.
  const requestClose = async () => {
    if (apiKey && !keyWasCopied) {
      const ok = await confirm({
        title: "Fechar sem copiar a chave?",
        description: "A chave completa não será exibida de novo. Sem ela, será preciso gerar um novo endpoint.",
        confirmLabel: "Fechar mesmo assim",
        cancelLabel: "Voltar",
        tone: "danger",
      });
      if (!ok) return;
    }
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) void requestClose(); }}
      size="lg"
      title="Código de integração"
      description={formKey.name}
      bodyClassName="space-y-5"
      footer={<Button variant="primary" onClick={() => void requestClose()}>Concluir</Button>}
    >
      {apiKey && (
        <InlineNotice tone="warning">
          <p><strong className="font-medium">Copie a chave agora.</strong> Ela é exibida apenas uma vez.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 select-all break-all rounded-md bg-black/40 px-2.5 py-2 font-mono text-xs text-zinc-100">{apiKey}</code>
            <Button size="sm" variant="secondary" onClick={copyKey}>
              {copiedKey ? <Check /> : <Copy />}
              {copiedKey ? "Copiada" : "Copiar"}
            </Button>
          </div>
        </InlineNotice>
      )}

      <section className="space-y-1.5">
        <h3 className="text-sm font-medium text-zinc-200">Endereço (POST)</h3>
        <code className="block select-all truncate rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 font-mono text-xs text-zinc-200">{endpointUrl}</code>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl
            aria-label="Linguagem do exemplo"
            size="sm"
            value={activeTab}
            onValueChange={setActiveTab}
            options={[
              { value: "js", label: "JavaScript" },
              { value: "html", label: "HTML + JS" },
              { value: "curl", label: "cURL" },
            ]}
          />
          <Button size="sm" variant="ghost" onClick={copySnippet}>
            {copiedSnippet ? <Check /> : <Copy />}
            {copiedSnippet ? "Copiado" : "Copiar código"}
          </Button>
        </div>
        <pre className="max-h-64 overflow-auto rounded-lg border border-white/10 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
          {activeTab === "js" ? jsSnippet : activeTab === "html" ? htmlSnippet : curlSnippet}
        </pre>
      </section>

      <section className="space-y-1.5 text-sm text-zinc-400">
        <h3 className="font-medium text-zinc-200">Campos do envio</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><code className="text-zinc-200">clientId</code>: ID da unidade (ex.: <code className="text-zinc-200">{sampleClientId}</code>); precisa estar entre as unidades da chave.</li>
          <li><code className="text-zinc-200">fields</code>: os dados do formulário (nome, telefone, cidade…). O servidor limpa tudo antes de gravar.</li>
          <li><code className="text-zinc-200">metadata</code> (opcional): UTMs e página de origem, para saber de qual campanha veio o lead.</li>
        </ul>
      </section>
    </Dialog>
  );
}
