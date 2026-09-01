import { useState, useRef, useMemo } from "react";
import { toBlob, toPng } from "html-to-image";
import { 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  X, 
  Calendar, 
  TrendingUp, 
  MessageSquare, 
  DollarSign, 
  Eye, 
  Layers
} from "lucide-react";
import { toast } from "sonner";

export type CreativeExportItem = {
  id: string | number;
  ad_name?: string | null;
  offer_name?: string | null;

  ad_image_url?: string | null;
  total_conversas_iniciadas?: number | string | null;
  total_spend?: number | string | null;
  custo_por_conversa?: number | string | null;
  total_impressions?: number | string | null;
  total_leads_meta?: number | string | null;
};

interface WeeklyCreativeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitName: string;
  periodLabel: string;
  creatives: CreativeExportItem[];
  kpis: {
    totalLeads: number;
    totalConversas: number;
    totalSpend: number;
    totalImpressions: number;
    custoPorConversa: number;
  };
}

export function WeeklyCreativeExportModal({
  isOpen,
  onClose,
  unitName,
  periodLabel,
  creatives,
  kpis,
}: WeeklyCreativeExportModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [viewAllAds, setViewAllAds] = useState(true); // Default: mostrar TODOS os anúncios ativos

  // Filtra anúncios com imagem válida
  const activeCreatives = useMemo(() => {
    const valid = creatives.filter((c) => Boolean(c.ad_image_url));
    if (viewAllAds) {
      return valid;
    }
    // Caso o usuário queira agrupar por imagem única
    const seen = new Set<string>();
    const unique: CreativeExportItem[] = [];
    for (const c of valid) {
      const key = c.ad_image_url || String(c.id);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }
    return unique;
  }, [creatives, viewAllAds]);

  if (!isOpen) return null;


  const brl = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const n = (v: number) =>
    new Intl.NumberFormat("pt-BR").format(Math.round(v));

  // Geração de imagem PNG Ultra HD via html-to-image com altura total sem corte
  const generatePngBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const node = cardRef.current;
      const fullHeight = node.scrollHeight;
      const fullWidth = node.scrollWidth;
      const scale = 2.5; // Resolução Retina 2.5x

      const blob = await toBlob(node, {
        width: fullWidth,
        height: fullHeight,
        canvasWidth: fullWidth * scale,
        canvasHeight: fullHeight * scale,
        pixelRatio: scale,
        cacheBust: true,
        quality: 0.98,
        backgroundColor: "#09090b",
        style: {
          height: `${fullHeight}px`,
          maxHeight: "none",
          overflow: "visible",
          transform: "none",
        },
      });
      return blob;
    } catch (err: any) {
      console.error("[export-card] Falha ao renderizar card:", err);
      toast.error("Erro ao gerar imagem em alta resolução.");
      return null;
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (!cardRef.current) return;
      const node = cardRef.current;
      const fullHeight = node.scrollHeight;
      const fullWidth = node.scrollWidth;
      const scale = 2.5;

      const dataUrl = await toPng(node, {
        width: fullWidth,
        height: fullHeight,
        canvasWidth: fullWidth * scale,
        canvasHeight: fullHeight * scale,
        pixelRatio: scale,
        cacheBust: true,
        quality: 0.98,
        backgroundColor: "#09090b",
        style: {
          height: `${fullHeight}px`,
          maxHeight: "none",
          overflow: "visible",
          transform: "none",
        },
      });
      
      const safeUnit = unitName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const filename = `trafego-pro-criativos-${safeUnit}-${new Date().toISOString().slice(0, 10)}.png`;
      
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      
      toast.success("Imagem Ultra HD baixada com sucesso!");
    } catch (err) {
      toast.error("Não foi possível baixar a imagem.");
    } finally {
      setDownloading(false);
    }
  };


  const handleCopyImage = async () => {
    setCopyingImage(true);
    try {
      const blob = await generatePngBlob();
      if (!blob) return;

      if (!navigator.clipboard || !window.ClipboardItem) {
        toast.error("Seu navegador não suporta copiar imagens diretamente. Use o botão Baixar.");
        return;
      }

      await navigator.clipboard.write([
        new window.ClipboardItem({ "image/png": blob }),
      ]);

      toast.success("Card copiado para a área de transferência! (Pressione Ctrl+V no WhatsApp)");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao copiar imagem. Baixe o arquivo diretamente.");
    } finally {
      setCopyingImage(false);
    }
  };

  const handleCopyWhatsappText = () => {
    const totalConvs = kpis.totalConversas || kpis.totalLeads;
    const cpl = kpis.custoPorConversa > 0 ? brl(kpis.custoPorConversa) : "—";
    const impressions = n(kpis.totalImpressions);

    const text = `*📊 ACOMPANHAMENTO DE CRIATIVOS E RESULTADOS — TRÁFEGO PRO*
🏢 *Unidade:* ${unitName}
📅 *Período:* ${periodLabel}

*🚀 Resumo de Performance:*
💬 *Leads / Conversas no WhatsApp:* ${totalConvs}
🎯 *Custo por Lead (CPL):* ${cpl}
👁️ *Visualizações / Impressões:* ${impressions}
🖼️ *Criativos Ativos em Veiculação:* ${activeCreatives.length}

🔗 *Acompanhe os resultados completos na Dashboard:*
👉 https://www.trafego.pro/dashboard

_Os materiais acima estão ativos nas campanhas da sua unidade. Qualquer dúvida ou ajuste, estamos à disposição!_`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success("Texto formatado copiado com sucesso!");
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Exportar Card Executivo de Criativos
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ultra HD
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Gere um card visual de alta qualidade para enviar nos grupos do WhatsApp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-xl border border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-white/20 flex items-center justify-center transition-all"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Actions Bar */}
        <div className="px-5 py-3 border-b border-white/10 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="font-medium text-zinc-400">Unidade:</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-semibold text-white">
              {unitName}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="font-medium text-zinc-400">Período:</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              {periodLabel}
            </span>
            <span className="text-zinc-500">·</span>
            <button
              type="button"
              onClick={() => setViewAllAds((v) => !v)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-zinc-200 transition-all flex items-center gap-1.5"
              title="Alternar entre exibir cada anúncio ativo individualmente ou agrupar criativos únicos"
            >
              <Layers className="size-3 text-emerald-400" />
              <span>{viewAllAds ? "Todos os Anúncios Ativos" : "Criativos Únicos"}</span>
            </button>
          </div>


          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyWhatsappText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:text-white hover:border-white/20 transition-all"
            >
              {copiedText ? <Check className="size-3.5 text-emerald-400" /> : <MessageSquare className="size-3.5 text-emerald-400" />}
              <span>{copiedText ? "Copiado!" : "Copiar Texto WhatsApp"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={copyingImage || activeCreatives.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
            >
              <Copy className="size-3.5 text-cyan-400" />
              <span>{copyingImage ? "Renderizando..." : "Copiar Imagem (Ctrl+V)"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || activeCreatives.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold hover:bg-emerald-400 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
            >
              <Download className="size-3.5" />
              <span>{downloading ? "Baixando..." : "Baixar PNG (2.5x HD)"}</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-zinc-950/80 flex justify-center">
          {/* ─── CARD EXECUTIVO QUE SERÁ CAPTURADO COMO IMAGEM ──────────────── */}
          <div
            ref={cardRef}
            className="w-full max-w-[860px] rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 p-6 sm:p-8 shadow-2xl text-white space-y-6 relative overflow-hidden"
            style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
          >
            {/* Background Glow Emitters */}
            <div className="absolute -top-24 -right-24 size-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            {/* Header do Card com Logo Oficial */}
            <div className="flex items-center justify-between border-b border-white/10 pb-5 relative z-10 gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ACOMPANHAMENTO DE CRIATIVOS</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  <span>{unitName}</span>
                </h1>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-light">
                  <Calendar className="size-3.5 text-zinc-400" />
                  <span>Período de referência: <strong>{periodLabel}</strong></span>
                </p>
              </div>

              {/* Logo Oficial Tráfego Pro em Imagem de Alta Qualidade */}
              <div className="shrink-0 flex flex-col items-end justify-center">
                <img
                  src="/trafego-pro-logo-white.png"
                  alt="Tráfego Pro"
                  className="h-9 sm:h-11 w-auto object-contain brightness-110"
                />
                <div className="text-[9px] text-zinc-400 font-mono tracking-[0.2em] mt-1.5 uppercase font-medium">
                  Gestão & Performance
                </div>
              </div>
            </div>


            {/* Grid de KPIs Resumidos (Sem exibição de Investimento) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <span>Leads WhatsApp</span>
                  <MessageSquare className="size-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-emerald-400">
                  {n(kpis.totalConversas || kpis.totalLeads)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <span>Custo p/ Lead</span>
                  <TrendingUp className="size-4 text-cyan-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-cyan-300">
                  {kpis.custoPorConversa > 0 ? brl(kpis.custoPorConversa) : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <span>Visualizações</span>
                  <Eye className="size-4 text-purple-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-zinc-200">
                  {n(kpis.totalImpressions)}
                </div>
              </div>
            </div>

            {/* Galeria de TODOS os Criativos Ativos em Alta Resolução */}
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Layers className="size-3.5 text-emerald-400" />
                  <span>Criativos Ativos em Veiculação ({activeCreatives.length})</span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-light">
                  Métricas individuais do período
                </span>
              </div>

              {activeCreatives.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-xs text-zinc-500">
                  Nenhum criativo ativo com imagem para o período selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {activeCreatives.map((cr, idx) => {
                    const convs = Number(cr.total_conversas_iniciadas || 0);
                    const displayName = cr.ad_name || cr.offer_name || `Criativo ${idx + 1}`;
                    const proxiedImage = cr.ad_image_url
                      ? `/api/metrics/image-proxy?url=${encodeURIComponent(cr.ad_image_url)}`
                      : "";

                    return (
                      <div
                        key={cr.id || idx}
                        className="group aspect-[4/5] rounded-2xl overflow-hidden border border-white/15 bg-zinc-950 relative shadow-md flex flex-col justify-end"
                      >
                        {proxiedImage ? (
                          <img
                            src={proxiedImage}
                            alt={displayName}
                            crossOrigin="anonymous"
                            className="absolute inset-0 w-full h-full object-contain p-1 bg-zinc-950"
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center bg-zinc-900 text-[10px] text-zinc-500">
                            Sem imagem
                          </div>
                        )}

                        <div className="relative z-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2 pt-6">
                          <p className="text-[10px] font-medium text-zinc-200 truncate leading-tight">
                            {displayName}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[9px] font-mono">
                            <span className="text-emerald-400 font-bold">{convs} conv.</span>
                            {cr.custo_por_conversa != null && Number(cr.custo_por_conversa) > 0 ? (
                              <span className="text-zinc-400">{brl(Number(cr.custo_por_conversa))}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé Oficial do Card */}
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-zinc-400 relative z-10">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span>Dashboard Atualizada em Tempo Real</span>
                <span>·</span>
                <span className="font-mono text-zinc-300">www.trafego.pro</span>
              </div>
              <div className="font-light">
                Gerado por <strong>Tráfego Pro Performance</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



