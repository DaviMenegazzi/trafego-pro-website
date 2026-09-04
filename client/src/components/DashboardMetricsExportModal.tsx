import { useState, useRef } from "react";
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
  Target,
  Activity,
  Layers,
  MousePointerClick
} from "lucide-react";
import { toast } from "sonner";

export type CampaignExportItem = {
  campaign_name: string;
  total_spend: number | null;
  total_conversas_iniciadas: number | null;
  custo_por_conversa: number | null;
  total_leads_meta: number | null;
  total_impressions: number | null;
  total_clicks: number | null;
  avg_ctr: number | null;
  avg_cpc: number | null;
  avg_cpm: number | null;
};

export type DashboardKpis = {
  spend: number;
  conv: number;
  custoConversa: number;
  primeiras: number;
  respondidas: number;
  connections: number;
  leads: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  responseRate: number;
};

interface DashboardMetricsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitName: string;
  periodLabel: string;
  kpis: DashboardKpis;
  campaigns: CampaignExportItem[];
}

export function DashboardMetricsExportModal({
  isOpen,
  onClose,
  unitName,
  periodLabel,
  kpis,
  campaigns,
}: DashboardMetricsExportModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const brl = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const n = (v: number) =>
    new Intl.NumberFormat("pt-BR").format(Math.round(v));

  const pct = (v: number) =>
    `${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  // Geração de imagem PNG Ultra HD via html-to-image com alinhamento e largura exata
  const generatePngBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const node = cardRef.current;
      const rect = node.getBoundingClientRect();
      const targetWidth = Math.round(rect.width) || 880;
      const targetHeight = node.scrollHeight;
      const scale = 2; // Resolução Retina 2x

      const blob = await toBlob(node, {
        width: targetWidth,
        height: targetHeight,
        pixelRatio: scale,
        cacheBust: true,
        quality: 0.98,
        backgroundColor: "#09090b",
        style: {
          width: `${targetWidth}px`,
          minWidth: `${targetWidth}px`,
          maxWidth: `${targetWidth}px`,
          height: `${targetHeight}px`,
          maxHeight: "none",
          overflow: "hidden",
          transform: "none",
          margin: "0",
        },
      });
      return blob;
    } catch (err: any) {
      console.error("[export-metrics-card] Falha ao renderizar card:", err);
      toast.error("Erro ao gerar imagem em alta resolução.");
      return null;
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (!cardRef.current) return;
      const node = cardRef.current;
      const rect = node.getBoundingClientRect();
      const targetWidth = Math.round(rect.width) || 880;
      const targetHeight = node.scrollHeight;
      const scale = 2;

      const dataUrl = await toPng(node, {
        width: targetWidth,
        height: targetHeight,
        pixelRatio: scale,
        cacheBust: true,
        quality: 0.98,
        backgroundColor: "#09090b",
        style: {
          width: `${targetWidth}px`,
          minWidth: `${targetWidth}px`,
          maxWidth: `${targetWidth}px`,
          height: `${targetHeight}px`,
          maxHeight: "none",
          overflow: "hidden",
          transform: "none",
          margin: "0",
        },
      });
      
      const safeUnit = unitName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const filename = `trafego-pro-metricas-${safeUnit}-${new Date().toISOString().slice(0, 10)}.png`;
      
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      
      toast.success("Imagem Ultra HD baixada com sucesso!");
    } catch (err) {
      console.error(err);
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
    const cpl = kpis.custoConversa > 0 ? brl(kpis.custoConversa) : "—";
    
    // Top campanhas com gasto por conversas
    const topCampaigns = [...campaigns]
      .filter((c) => Number(c.total_spend || 0) > 0)
      .sort(
        (a, b) =>
          Number(b.total_conversas_iniciadas || 0) - Number(a.total_conversas_iniciadas || 0) ||
          Number(b.total_spend || 0) - Number(a.total_spend || 0)
      )
      .slice(0, 5);

    const campaignsText = topCampaigns.length > 0
      ? topCampaigns.map((c, i) => {
          const convs = Number(c.total_conversas_iniciadas || 0);
          const cost = Number(c.custo_por_conversa || 0);
          const spend = Number(c.total_spend || 0);
          return `${i + 1}. *${c.campaign_name}*: ${convs} conv. (${cost > 0 ? brl(cost) : "—"}/conv.) · Investido: ${brl(spend)}`;
        }).join("\n")
      : "_Nenhuma campanha com investimento no período._";

    const text = `*📊 RELATÓRIO EXECUTIVO DE PERFORMANCE — TRÁFEGO PRO*
🏢 *Unidade:* ${unitName}
📅 *Período:* ${periodLabel}

*🚀 Principais Indicadores:*
💰 *Total Investido:* ${brl(kpis.spend)}
💬 *Conversas no WhatsApp:* ${n(kpis.conv)}
🎯 *Custo por Conversa:* ${cpl}
⚡ *Taxa de Resposta:* ${pct(kpis.responseRate)}
👥 *Conexões de Mensagens:* ${n(kpis.connections)}
👁️ *Visualizações / Impressões:* ${n(kpis.impressions)}
🖱️ *Cliques no Link:* ${n(kpis.clicks)}
📈 *CTR Médio:* ${pct(kpis.ctr)}
🏷️ *CPC Médio:* ${brl(kpis.cpc)}

*🏆 Desempenho das Campanhas:*
${campaignsText}

🔗 *Acompanhe os resultados completos na Dashboard:*
👉 https://www.trafego.pro/dashboard

_Relatório de performance gerado pela Tráfego Pro._`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success("Texto formatado copiado com sucesso!");
    setTimeout(() => setCopiedText(false), 2500);
  };

  const sortedCampaigns = [...campaigns]
    .filter((c) => Number(c.total_spend || 0) > 0)
    .sort(
      (a, b) =>
        Number(b.total_conversas_iniciadas || 0) - Number(a.total_conversas_iniciadas || 0) ||
        Number(b.total_spend || 0) - Number(a.total_spend || 0)
    );

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
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
                Exportar Relatório Executivo de Métricas
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ultra HD
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Gere um print oficial de alta qualidade da dashboard para compartilhar no WhatsApp.
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
              disabled={copyingImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
            >
              <Copy className="size-3.5 text-cyan-400" />
              <span>{copyingImage ? "Renderizando..." : "Copiar Imagem (Ctrl+V)"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
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
            className="w-full max-w-[880px] rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 p-6 sm:p-8 shadow-2xl text-white space-y-6 relative overflow-hidden box-border"
            style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
          >
            {/* Background Glow Emitters */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 size-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 size-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            {/* Header do Card com Logo Oficial */}
            <div className="flex items-center justify-between border-b border-white/10 pb-5 relative z-10 gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>RELATÓRIO EXECUTIVO DE PERFORMANCE</span>
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

            {/* Grid Primário de KPIs Executivos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <span>Total Investido</span>
                  <DollarSign className="size-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-amber-400">
                  {brl(kpis.spend)}
                </div>
                <p className="mt-1 text-[10px] text-zinc-400 font-light">Verba Meta Ads</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <span>Conversas WhatsApp</span>
                  <MessageSquare className="size-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-emerald-400">
                  {n(kpis.conv)}
                </div>
                <p className="mt-1 text-[10px] text-zinc-400 font-light">Inícios de mensagem</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <span>Custo / Conversa</span>
                  <Target className="size-4 text-cyan-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-cyan-300">
                  {kpis.custoConversa > 0 ? brl(kpis.custoConversa) : "—"}
                </div>
                <p className="mt-1 text-[10px] text-zinc-400 font-light">Investimento ÷ conv.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                  <span>Taxa de Resposta</span>
                  <Activity className="size-4 text-purple-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-purple-300">
                  {pct(kpis.responseRate)}
                </div>
                <p className="mt-1 text-[10px] text-zinc-400 font-light">Eficiência comercial</p>
              </div>
            </div>

            {/* Grid Secundário de KPIs de Alcance e Engajamento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
              <div className="rounded-2xl border border-white/5 bg-zinc-950/60 p-3.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium flex items-center justify-between">
                  <span>Visualizações (Impressões)</span>
                  <Eye className="size-3.5 text-zinc-400" />
                </div>
                <div className="mt-1.5 text-lg font-bold font-display text-zinc-100">
                  {n(kpis.impressions)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-zinc-950/60 p-3.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium flex items-center justify-between">
                  <span>Cliques no Link</span>
                  <MousePointerClick className="size-3.5 text-zinc-400" />
                </div>
                <div className="mt-1.5 text-lg font-bold font-display text-zinc-100">
                  {n(kpis.clicks)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-zinc-950/60 p-3.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium flex items-center justify-between">
                  <span>CTR Médio (Taxa de Clique)</span>
                  <TrendingUp className="size-3.5 text-emerald-400" />
                </div>
                <div className="mt-1.5 text-lg font-bold font-display text-emerald-400">
                  {pct(kpis.ctr)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-zinc-950/60 p-3.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium flex items-center justify-between">
                  <span>CPC Médio (Custo p/ Clique)</span>
                  <DollarSign className="size-3.5 text-amber-400" />
                </div>
                <div className="mt-1.5 text-lg font-bold font-display text-amber-300">
                  {kpis.cpc > 0 ? brl(kpis.cpc) : "—"}
                </div>
              </div>
            </div>

            {/* Tabela Executiva de Campanhas (Sem Status) */}
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Layers className="size-3.5 text-emerald-400" />
                  <span>Desempenho por Campanha ({sortedCampaigns.length})</span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-light">
                  Resultados consolidados do período
                </span>
              </div>

              {sortedCampaigns.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-xs text-zinc-500">
                  Nenhuma campanha com investimento registrada no período selecionado.
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/50 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Campanha</th>
                        <th className="py-3 px-3 text-center">Conversas</th>
                        <th className="py-3 px-3 text-center">Custo/Conv.</th>
                        <th className="py-3 px-3 text-center">Investimento</th>
                        <th className="py-3 px-3 text-center">Cliques</th>
                        <th className="py-3 px-4 text-right">CTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedCampaigns.slice(0, 10).map((camp, idx) => {
                        const convs = Number(camp.total_conversas_iniciadas || 0);
                        const cost = Number(camp.custo_por_conversa || 0);
                        const spend = Number(camp.total_spend || 0);
                        const clicks = Number(camp.total_clicks || 0);
                        const ctr = Number(camp.avg_ctr || 0);

                        return (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 font-medium text-white max-w-[260px] truncate" title={camp.campaign_name}>
                              {camp.campaign_name}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-emerald-400 font-mono">
                              {convs}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-zinc-200">
                              {cost > 0 ? brl(cost) : "—"}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-amber-300 font-bold">
                              {brl(spend)}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-zinc-300">
                              {n(clicks)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
                              {pct(ctr)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {sortedCampaigns.length > 10 && (
                    <div className="py-2.5 px-4 text-center border-t border-white/5 bg-white/[0.01] text-[10px] text-zinc-500">
                      Exibindo as 10 principais campanhas de {sortedCampaigns.length} no período.
                    </div>
                  )}
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
