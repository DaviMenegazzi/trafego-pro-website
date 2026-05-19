import { BarChart3, TrendingUp, Users } from 'lucide-react';

export default function KPIs() {
  const kpiGroups = [
    {
      title: "Meta Ads",
      icon: BarChart3,
      metrics: [
        "Conversas iniciadas no WhatsApp",
        "Custo por conversa",
        "CTR",
        "CPC",
        "Frequência",
        "Taxa de resposta comercial",
        "Conversão de conversa em assinatura"
      ]
    },
    {
      title: "Google Ads",
      icon: TrendingUp,
      metrics: [
        "Conversões para WhatsApp",
        "Custo por conversão",
        "Taxa de conversão",
        "Termos de pesquisa",
        "Cliques qualificados"
      ]
    },
    {
      title: "Comercial",
      icon: Users,
      metrics: [
        "Conversas respondidas",
        "Interessados reais",
        "Principais objeções",
        "Planos mais procurados",
        "Assinaturas fechadas"
      ]
    }
  ];

  return (
    <section className="vida-section bg-white">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-4 text-[#0f1b3c]">
          Indicadores de Acompanhamento
        </h2>
        <p className="text-gray-600 mb-12 text-lg">
          KPIs para monitorar performance das campanhas
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpiGroups.map((group, index) => {
            const Icon = group.icon;
            return (
              <div key={index} className="vida-card">
                <div className="flex items-center gap-3 mb-6">
                  <Icon className="w-6 h-6 text-[#00a896]" />
                  <h3 className="text-xl font-bold font-poppins text-[#0f1b3c]">
                    {group.title}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {group.metrics.map((metric, mIndex) => (
                    <li key={mIndex} className="flex gap-3 text-gray-700">
                      <span className="text-[#00a896] font-bold">✓</span>
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
