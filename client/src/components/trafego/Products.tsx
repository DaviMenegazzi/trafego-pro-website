import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/**
 * Vitrine dos produtos da Tráfego Pro na home.
 * As telas são amostras ilustrativas montadas em JSX: nenhum número vem de cliente real.
 */

type Product = {
  n: string;
  tag: string;
  title: string;
  desc: string;
  impact: string[];
  preview: ReactNode;
};

const products: Product[] = [
  {
    n: "01",
    tag: "Dashboard",
    title: "Resultados em tempo real, num painel só.",
    desc: "Investimento, conversas iniciadas, custo por conversa e desempenho de cada campanha, por unidade e por período — sem esperar relatório no fim do mês.",
    impact: [
      "Decisões tomadas em dias, não em semanas: o dinheiro sai do que não performa mais rápido.",
      "Todo mundo olha para o mesmo número, do gestor ao dono da empresa.",
    ],
    preview: <DashboardPreview />,
  },
  {
    n: "02",
    tag: "Pixel de WhatsApp",
    title: "Saber quais conversas viraram oportunidade.",
    desc: "O pixel acompanha as conversas do WhatsApp da empresa e separa quem é lead de verdade de quem só tirou uma dúvida. Em desenvolvimento.",
    impact: [
      "O custo passa a ser medido por lead real, não só por mensagem recebida.",
      "As campanhas aprendem com quem de fato tem interesse e trazem mais gente parecida.",
    ],
    preview: <PixelPreview />,
  },
  {
    n: "03",
    tag: "Anúncios",
    title: "Cada criativo com o seu resultado ao lado.",
    desc: "Os anúncios ativos com imagem, investimento e custo por conversa lado a lado, para ver na hora qual peça está puxando o resultado.",
    impact: [
      "Os criativos vencedores ganham verba; os que não funcionam são pausados cedo.",
      "A próxima leva de peças nasce do que já provou que vende.",
    ],
    preview: <AdsPreview />,
  },
  {
    n: "04",
    tag: "Banco de talentos",
    title: "Contratar sem perder candidato no caminho.",
    desc: "Formulário de vaga com link próprio, candidaturas organizadas por etapa e exportação em planilha. Tudo no mesmo lugar da operação de marketing.",
    impact: [
      "Vagas preenchidas mais rápido, com o histórico de cada candidato guardado.",
      "Equipe completa para atender os leads que o tráfego gera — sem gargalo no atendimento.",
    ],
    preview: <TalentPreview />,
  },
];

const loop = [
  { title: "Anúncio", desc: "O criativo certo atrai o público certo." },
  { title: "Conversa", desc: "O pixel identifica quem é lead de verdade." },
  { title: "Dashboard", desc: "O resultado aparece por campanha e unidade." },
  { title: "Decisão", desc: "A verba vai para o que vende — e o ciclo recomeça." },
];

export function Products() {
  return (
    <section id="produtos" className="border-y border-border/60 bg-surface/20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-24 md:py-36">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 md:mb-24">
          <div>
            <Reveal>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-6">Nossos produtos</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="font-display font-semibold tracking-[-0.02em] leading-[1.02] text-[clamp(2.25rem,5vw,4.5rem)] max-w-3xl">
                Ferramentas próprias para enxergar o que vende.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={160}>
            <p className="text-muted-foreground max-w-sm">
              Cada cliente acessa uma plataforma feita pela Tráfego Pro. Menos
              achismo, mais dado na hora de decidir onde investir.
            </p>
          </Reveal>
        </div>

        <div className="space-y-24 md:space-y-36">
          {products.map((p, i) => (
            <article key={p.n} className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              <div className={`lg:col-span-5 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                <Reveal>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-mono">{p.n}</span>
                    <span className="h-px w-8 bg-border" />
                    <span>{p.tag}</span>
                  </div>
                </Reveal>
                <Reveal delay={80}>
                  <h3 className="mt-6 font-display text-3xl md:text-4xl font-semibold tracking-[-0.02em] leading-[1.08]">
                    {p.title}
                  </h3>
                </Reveal>
                <Reveal delay={140}>
                  <p className="mt-5 text-muted-foreground leading-relaxed">{p.desc}</p>
                </Reveal>
                <Reveal delay={200}>
                  <div className="mt-8 rounded-2xl border border-border bg-background/60 p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                      Impacto na performance
                    </p>
                    <ul className="space-y-3">
                      {p.impact.map((line) => (
                        <li key={line} className="flex gap-3 text-sm leading-relaxed">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={120} className={`lg:col-span-7 min-w-0 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                {p.preview}
              </Reveal>
            </article>
          ))}
        </div>

        <div className="mt-28 md:mt-40">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-6">Por que isso importa</p>
          </Reveal>
          <Reveal delay={80}>
            <h3 className="font-display font-semibold tracking-[-0.02em] leading-[1.05] text-[clamp(1.75rem,3.5vw,3rem)] max-w-3xl">
              Os produtos se conectam. <span className="text-muted-foreground">Cada volta do ciclo deixa a campanha mais eficiente.</span>
            </h3>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-6 max-w-2xl text-muted-foreground leading-relaxed">
              Tráfego pago perde dinheiro quando ninguém sabe o que aconteceu depois do clique.
              Ligando o anúncio à conversa e a conversa ao resultado, dá para cortar o que não
              converte, reforçar o que converte e ter gente pronta para atender a demanda. É
              assim que o mesmo investimento passa a gerar mais vendas.
            </p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/70 border border-border/70 rounded-3xl overflow-hidden">
            {loop.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <div className="bg-background p-8 h-full">
                  <span className="text-sm text-muted-foreground font-mono">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-8 font-display text-xl font-semibold">{s.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Amostras ilustrativas ---------- */

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="relative rounded-2xl border border-border bg-background shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] overflow-hidden select-none"
      aria-label={`Amostra ilustrativa: ${title}`}
      role="img"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="ml-3 truncate text-xs text-muted-foreground">{title}</span>
        <span className="ml-auto shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Ilustrativo
        </span>
      </div>
      <div className="p-4 sm:p-6" aria-hidden="true">{children}</div>
    </div>
  );
}

function Tile({ label, value, delta, up = true }: { label: string; value: string; delta: string; up?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3 sm:p-4 min-w-0">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-lg sm:text-xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-1 text-[11px] ${up ? "text-emerald-400" : "text-rose-400"}`}>{delta}</p>
    </div>
  );
}

const bars = [38, 52, 45, 61, 58, 72, 66, 80, 74, 88, 83, 95];

function DashboardPreview() {
  return (
    <Frame title="Resultados · Últimos 30 dias">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Tile label="Investimento" value="R$ 12,4 mil" delta="+8% no período" />
        <Tile label="Conversas" value="1.284" delta="+23% no período" />
        <Tile label="Custo por conversa" value="R$ 9,66" delta="−12% no período" />
        <Tile label="CTR" value="2,8%" delta="+0,4 p.p." />
      </div>
      <div className="mt-3 rounded-xl border border-border bg-surface/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Conversas iniciadas por dia</p>
          <p className="text-[11px] text-muted-foreground">Meta Ads + Google Ads</p>
        </div>
        <div className="mt-4 flex h-28 items-end gap-1.5 sm:gap-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md bg-gradient-to-t from-sky-500/30 to-sky-400/80"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-border overflow-hidden text-xs">
        {[
          ["Campanha · Conversas WhatsApp", "R$ 8,90", "412"],
          ["Campanha · Remarketing", "R$ 7,20", "268"],
          ["Campanha · Pesquisa Google", "R$ 12,40", "181"],
        ].map(([name, cpc, conv]) => (
          <div key={name} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border last:border-0 px-4 py-2.5">
            <span className="truncate text-muted-foreground">{name}</span>
            <span className="tabular-nums">{cpc}</span>
            <span className="tabular-nums w-10 text-right">{conv}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

type Status = "lead" | "nao_lead" | "pendente";

const statusStyle: Record<Status, { label: string; cls: string }> = {
  lead: { label: "Lead", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  nao_lead: { label: "Não é lead", cls: "border-border bg-surface text-muted-foreground" },
  pendente: { label: "Analisando", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
};

const chats: Array<{ name: string; msg: string; time: string; status: Status }> = [
  { name: "Mariana S.", msg: "Quero agendar uma avaliação para sábado", time: "09:42", status: "lead" },
  { name: "Carlos R.", msg: "Qual o valor do plano família?", time: "09:31", status: "lead" },
  { name: "(55) •••• 4821", msg: "Vocês abrem no feriado?", time: "09:18", status: "nao_lead" },
  { name: "Juliana P.", msg: "Vi o anúncio, ainda tem a condição?", time: "09:05", status: "pendente" },
  { name: "Roberto A.", msg: "Pode me mandar o endereço e o preço?", time: "08:51", status: "lead" },
];

function PixelPreview() {
  return (
    <Frame title="Pixel · Conversas que viraram oportunidade">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile label="Conversas hoje" value="47" delta="+9 vs. ontem" />
        <Tile label="Leads reais" value="31" delta="66% das conversas" />
        <Tile label="Custo por lead" value="R$ 14,20" delta="−18% na semana" />
      </div>
      <div className="mt-3 rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-xs font-medium">Mensagens de leads</p>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> WhatsApp conectado
          </span>
        </div>
        {chats.map((c) => (
          <div key={c.name} className="flex items-center gap-3 border-b border-border last:border-0 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium">
              {c.name.startsWith("(") ? "#" : c.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-xs font-medium">{c.name}</p>
                <span className="shrink-0 text-[10px] text-muted-foreground">{c.time}</span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">{c.msg}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle[c.status].cls}`}>
              {statusStyle[c.status].label}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const ads = [
  { name: "Vídeo depoimento", cpc: "R$ 6,80", w: 38, grad: "from-sky-500/60 via-indigo-500/40 to-fuchsia-500/40", best: true },
  { name: "Carrossel oferta", cpc: "R$ 9,10", w: 52, grad: "from-emerald-500/50 via-teal-500/30 to-sky-500/30" },
  { name: "Imagem estática", cpc: "R$ 15,30", w: 86, grad: "from-amber-500/50 via-orange-500/30 to-rose-500/30" },
];

function AdsPreview() {
  return (
    <Frame title="Anúncios · Criativos ativos">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {ads.map((a) => (
          <div key={a.name} className="rounded-xl border border-border bg-surface/40 overflow-hidden min-w-0">
            <div className={`relative aspect-[4/5] bg-gradient-to-br ${a.grad}`}>
              <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                <div className="h-2 w-3/4 rounded-full bg-white/60" />
                <div className="h-2 w-1/2 rounded-full bg-white/35" />
              </div>
              {a.best && (
                <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-emerald-300">
                  Melhor custo
                </span>
              )}
            </div>
            <div className="p-2.5 sm:p-3">
              <p className="truncate text-[11px] text-muted-foreground">{a.name}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{a.cpc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-border bg-surface/40 p-4">
        <p className="text-xs font-medium">Custo por conversa por anúncio</p>
        <div className="mt-4 space-y-3">
          {ads.map((a) => (
            <div key={a.name} className="grid grid-cols-[7rem_1fr_auto] sm:grid-cols-[9rem_1fr_auto] items-center gap-3 text-[11px]">
              <span className="truncate text-muted-foreground">{a.name}</span>
              <div className="h-2 rounded-full bg-surface-2">
                <div
                  className={`h-2 rounded-full ${a.best ? "bg-emerald-400" : "bg-foreground/40"}`}
                  style={{ width: `${a.w}%` }}
                />
              </div>
              <span className="tabular-nums">{a.cpc}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

const candidates = [
  { name: "Ana Beatriz L.", role: "Atendimento comercial", stage: "Entrevista", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  { name: "Lucas M.", role: "Atendimento comercial", stage: "Aprovado", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  { name: "Fernanda C.", role: "Recepção", stage: "Novo", cls: "border-border bg-surface text-muted-foreground" },
  { name: "Pedro H.", role: "Recepção", stage: "Novo", cls: "border-border bg-surface text-muted-foreground" },
];

function TalentPreview() {
  return (
    <Frame title="Banco de talentos · Vagas abertas">
      <div className="grid sm:grid-cols-[1fr_1.4fr] gap-3">
        <div className="rounded-xl border border-border bg-surface/40 p-4">
          <p className="text-xs font-medium">Atendimento comercial</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Formulário publicado</p>
          <div className="mt-4 truncate rounded-lg border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
            trafegopro.com.br/trabalhe-conosco/atendimento
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["24", "Inscritos"],
              ["6", "Entrevista"],
              ["2", "Aprovados"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg bg-surface-2/60 py-2">
                <p className="font-display text-base font-semibold">{v}</p>
                <p className="text-[10px] text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-xs font-medium">Candidaturas</p>
            <span className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Exportar planilha</span>
          </div>
          {candidates.map((c) => (
            <div key={c.name} className="flex items-center gap-3 border-b border-border last:border-0 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium">
                {c.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{c.role}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.cls}`}>{c.stage}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
