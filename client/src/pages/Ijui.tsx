import { useEffect, useRef } from "react";

// Recharts para os gráficos
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Dados ────────────────────────────────────────────────────────────────────

const conversasPorCanal = [
  { canal: "Meta Ads", conversas: 92 },
  { canal: "Google Ads", conversas: 6 },
];

const investimentoPorCanal = [
  { canal: "Meta Ads", investimento: 1094.65 },
  { canal: "Google Ads", investimento: 125.30 },
];

const conjuntosMensal = [
  { conjunto: "[CJ02] Interesse 25+", status: "Ativo", conversas: 63, cpl: "R$ 6,36", investimento: "R$ 400,45" },
  { conjunto: "[CJ01] Aberto - Base Lead", status: "Pausado", conversas: 29, cpl: "R$ 23,94", investimento: "R$ 694,20" },
];

const conjuntosSemanal = [
  { conjunto: "[CJ02] Interesse 25+", status: "Ativo", conversas: 60, cpl: "R$ 6,46", investimento: "R$ 387,41" },
  { conjunto: "[CJ01] Aberto - Base Lead", status: "Pausado", conversas: 1, cpl: "R$ 10,15", investimento: "R$ 10,15" },
];

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const TEAL = "#0d9488";
const TEAL_LIGHT = "#14b8a6";
const TEAL_BG = "#f0fdfa";
const TEAL_DARK = "#0f766e";

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <span style={{ color: TEAL }}>{icon}</span>
      </div>
      <span className="text-2xl font-bold" style={{ color: "#1e293b" }}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span style={{ color: TEAL, fontSize: 22 }}>{icon}</span>
      <h2 className="text-2xl font-bold" style={{ color: TEAL }}>{title}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isAtivo = status === "Ativo";
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: isAtivo ? "#dcfce7" : "#fee2e2",
        color: isAtivo ? "#16a34a" : "#dc2626",
      }}
    >
      {status}
    </span>
  );
}

function ConjuntosTable({
  rows,
}: {
  rows: { conjunto: string; status: string; conversas: number; cpl: string; investimento: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #e2e8f0" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            <th className="text-left px-4 py-3 text-slate-500 font-medium">Conjunto</th>
            <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
            <th className="text-right px-4 py-3 text-slate-500 font-medium">Conversas</th>
            <th className="text-right px-4 py-3 text-slate-500 font-medium">CPL</th>
            <th className="text-right px-4 py-3 text-slate-500 font-medium">Investimento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td className="px-4 py-3 text-slate-700">{row.conjunto}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: TEAL }}>{row.conversas}</td>
              <td className="px-4 py-3 text-right font-semibold" style={{ color: TEAL }}>{row.cpl}</td>
              <td className="px-4 py-3 text-right text-slate-600">{row.investimento}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightBox({ children, color = "teal" }: { children: React.ReactNode; color?: "teal" | "yellow" }) {
  const bg = color === "teal" ? "#f0fdfa" : "#fefce8";
  const border = color === "teal" ? "#99f6e4" : "#fde68a";
  const textColor = color === "teal" ? "#0f766e" : "#92400e";
  return (
    <div
      className="rounded-xl p-4 text-sm"
      style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
    >
      {children}
    </div>
  );
}

function BudgetCard({
  platform,
  saldo,
  orcamento,
  duracao,
  fimSaldo,
  dataBoleto,
}: {
  platform: string;
  saldo: string;
  orcamento: string;
  duracao: string;
  fimSaldo: string;
  dataBoleto: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <h3 className="font-semibold text-slate-700 text-base">{platform}</h3>
      <div className="flex flex-col gap-2">
        {[
          { label: "Saldo Atual", value: saldo },
          { label: "Orçamento Diário", value: orcamento },
          { label: "Duração Estimada", value: duracao },
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-center">
            <span className="text-sm text-slate-500">{item.label}</span>
            <span className="text-sm font-semibold" style={{ color: TEAL }}>{item.value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3" style={{ background: TEAL_BG, border: `1px solid #99f6e4` }}>
        <p className="text-xs text-slate-500 mb-1">Fim do saldo estimado</p>
        <p className="text-lg font-bold" style={{ color: TEAL_DARK }}>{fimSaldo}</p>
      </div>
      <div className="rounded-xl p-3" style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
        <p className="text-xs text-amber-700 mb-1">Data recomendada para envio do boleto</p>
        <p className="text-lg font-bold text-amber-800">{dataBoleto}</p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Ijui() {
  useEffect(() => {
    document.title = "Tráfego Pro - Ijuí";
    return () => {
      document.title = "Tráfego Pro";
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/manus-storage/pasted_file_rOVXot_image_2498f494.png"
            alt="Vida Card"
            style={{ height: 32, width: "auto" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <p className="font-semibold text-slate-800 text-sm leading-tight">Vida Card Ijuí</p>
            <p className="text-xs text-slate-400">Resultado de Maio</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">01/05 a 22/05/2026</p>
          <p className="text-xs text-slate-400">Análise Mensal e Semanal</p>
        </div>
      </header>

      {/* Hero banner */}
      <div className="px-4 pt-6 pb-2 max-w-4xl mx-auto">
        <div
          className="rounded-2xl p-8"
          style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Resultado de Maio</h1>
          <p className="text-teal-100 text-sm">
            Análise de performance mensal e semanal das campanhas de WhatsApp para Vida Card Ijuí
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-10">

        {/* ── Resumo Executivo ── */}
        <section>
          <SectionTitle
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            title="Resumo Executivo"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Investimento Total"
              value="R$ 1.219,95"
              icon={
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <MetricCard
              label="Conversas WhatsApp"
              value="98"
              icon={
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            <MetricCard
              label="CPL Médio Combinado"
              value="R$ 12,45"
              icon={
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
            />
            <MetricCard
              label="Melhor conjunto"
              value="[CJ02] Interesse"
              icon={
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
          </div>
        </section>

        {/* ── Análise Mensal ── */}
        <section>
          <SectionTitle
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
              </svg>
            }
            title="Análise Mensal"
          />
          <p className="text-sm text-slate-400 mb-6 -mt-4">Período: 01/05/2026 a 22/05/2026</p>

          {/* Gráficos */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <h3 className="font-semibold text-slate-700 mb-6">Performance por Canal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-400 mb-3 text-center">Conversas WhatsApp por Canal</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={conversasPorCanal} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="canal" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      formatter={(v) => [`${v} conversas`, "WhatsApp"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="conversas" fill={TEAL_LIGHT} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-3 text-center">Investimento por Canal</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={investimentoPorCanal} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="canal" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, "Investimento"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="investimento" fill={TEAL_LIGHT} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Cards por canal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div
              className="rounded-2xl p-5"
              style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
            >
              <p className="text-teal-100 text-xs mb-1">Meta Ads</p>
              <p className="text-white text-2xl font-bold mb-3">92 conversas</p>
              <div className="flex flex-col gap-1 text-teal-100 text-sm">
                <span>Investimento: R$ 1.094,65</span>
                <span>CPL: R$ 11,90</span>
                <span>Alcance: 27.711 | Frequência: 4,16</span>
              </div>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ background: "#fff", border: "1px solid #e2e8f0" }}
            >
              <p className="text-slate-400 text-xs mb-1">Google Ads</p>
              <p className="text-slate-800 text-2xl font-bold mb-3">6 conversas</p>
              <div className="flex flex-col gap-1 text-slate-500 text-sm">
                <span>Investimento: R$ 125,30</span>
                <span>CPL: R$ 20,88</span>
                <span>Volume complementar ao Meta Ads</span>
              </div>
            </div>
          </div>

          {/* Tabela mensal */}
          <h3 className="font-semibold text-slate-700 mb-3">Comparação de conjuntos (Mensal)</h3>
          <ConjuntosTable rows={conjuntosMensal} />
          <div className="mt-4">
            <InsightBox color="yellow">
              <strong>Insight:</strong> O conjunto [CJ02] Interesse 25+ gerou 63 conversas a R$ 6,36 de CPL, enquanto o [CJ01] Aberto gerou 29 conversas a R$ 23,94 de CPL. A pausa do [CJ01] foi estratégica para reduzir desperdício.
            </InsightBox>
          </div>
        </section>

        {/* ── Análise Semanal ── */}
        <section>
          <SectionTitle
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Análise Semanal"
          />
          <p className="text-sm text-slate-400 mb-6 -mt-4">Período: 15/05/2026 a 22/05/2026</p>

          <div
            className="rounded-2xl p-6 mb-6"
            style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <h3 className="font-semibold text-slate-700 mb-4">Performance Semanal</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className="rounded-xl p-4"
                style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
              >
                <p className="text-teal-100 text-xs mb-1">Conversas WhatsApp</p>
                <p className="text-white text-3xl font-bold">61</p>
                <p className="text-teal-200 text-xs mt-1">Meta Ads</p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
              >
                <p className="text-teal-100 text-xs mb-1">CPL Semanal</p>
                <p className="text-white text-3xl font-bold">R$ 6,52</p>
                <p className="text-teal-200 text-xs mt-1">Melhor que a média mensal</p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
              >
                <p className="text-teal-100 text-xs mb-1">Investimento</p>
                <p className="text-white text-3xl font-bold">R$ 397,56</p>
                <p className="text-teal-200 text-xs mt-1">Meta Ads</p>
              </div>
            </div>
          </div>

          {/* Tabela semanal */}
          <h3 className="font-semibold text-slate-700 mb-3">Comparação de conjuntos (Semanal)</h3>
          <ConjuntosTable rows={conjuntosSemanal} />
          <div className="mt-4">
            <InsightBox color="teal">
              <strong>Evolução Positiva:</strong> Na semana de 15/05 a 22/05, o conjunto [CJ02] gerou 60 conversas a R$ 6,46 de CPL. A estrutura mais limpa e focada no melhor público resultou em melhor eficiência.
            </InsightBox>
          </div>
        </section>

        {/* ── Previsão de Verba ── */}
        <section>
          <SectionTitle
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            title="Previsão de Verba e Próximo Pagamento"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <BudgetCard
              platform="Meta Ads"
              saldo="R$ 637,10"
              orcamento="R$ 57,00"
              duracao="11,2 dias"
              fimSaldo="02/06/2026"
              dataBoleto="31/05/2026"
            />
            <BudgetCard
              platform="Google Ads"
              saldo="R$ 193,32"
              orcamento="R$ 15,00"
              duracao="12,9 dias"
              fimSaldo="03/06/2026"
              dataBoleto="01/06/2026"
            />
          </div>

          <InsightBox color="teal">
            <div className="flex items-start gap-2">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="mt-0.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong>Recomendação Operacional</strong>
                <p className="mt-1">
                  Enviar ambos os boletos até <strong>29/05/2026</strong> para evitar risco de pausa por falta de saldo. Esta data antecipa o fim de semana e garante processamento seguro antes do esgotamento dos saldos.
                </p>
              </div>
            </div>
          </InsightBox>
        </section>

        {/* ── Conclusão Estratégica ── */}
        <section>
          <div
            className="rounded-2xl p-8"
            style={{ background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)` }}
          >
            <h2 className="text-2xl font-bold text-white mb-4">Conclusão Estratégica</h2>
            <p className="text-teal-100 text-sm leading-relaxed mb-4">
              A campanha está apresentando boa evolução, especialmente no corte semanal. A pausa do conjunto de público aberto ajudou a reduzir desperdício e concentrar a entrega no público com melhor performance. O CPL semanal de R$ 6,52 é superior ao CPL mensal de R$ 12,45, indicando melhoria significativa após a otimização.
            </p>
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <p className="text-white text-sm font-semibold mb-2">Próximos passos:</p>
              <p className="text-teal-100 text-sm leading-relaxed">
                Manter a estrutura ativa, monitorar a qualidade dos leads gerados, garantir que o próximo pagamento seja enviado antes do esgotamento dos saldos (até 29/05/2026) e avaliar a possibilidade de aumentar o orçamento do conjunto [CJ02] caso os leads continuem com boa qualidade.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-slate-200">
          <p className="font-semibold text-slate-700 mb-1">Vida Card Ijuí</p>
          <p className="text-xs text-slate-400">Relatório de Performance — Maio 2026</p>
          <p className="text-xs text-slate-400">Período analisado: 01/05/2026 a 22/05/2026</p>
          <p className="text-xs text-slate-400 mt-1">Gerado em: 22/05/2026</p>
        </footer>

      </div>
    </div>
  );
}
