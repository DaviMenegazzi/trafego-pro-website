import { Calendar, Zap, BarChart3, Rocket } from 'lucide-react';

export default function ImplementationPlan() {
  const weeks = [
    {
      icon: Rocket,
      week: "Semana 1",
      title: "Lançamento",
      tasks: [
        "Subir campanhas de WhatsApp no Meta e Pesquisa no Google",
        "Publicar os primeiros criativos com foco em consulta, exame e sem carência"
      ]
    },
    {
      icon: BarChart3,
      week: "Semana 2",
      title: "Análise e Otimização",
      tasks: [
        "Analisar primeiros CPLs, CTRs, CPCs e termos de pesquisa",
        "Pausar criativos genéricos e priorizar ofertas com maior intenção"
      ]
    },
    {
      icon: Zap,
      week: "Semana 3",
      title: "Expansão",
      tasks: [
        "Entrar com criativos de influencer e remarketing",
        "Reforçar prova local e explicação simples do cartão"
      ]
    },
    {
      icon: Calendar,
      week: "Semana 4+",
      title: "Consolidação",
      tasks: [
        "Escalar campanhas com melhor performance",
        "Testar novos públicos e segmentações",
        "Refinar mensagens baseado em dados reais"
      ]
    }
  ];

  return (
    <section className="vida-section bg-[#f5f7fa]">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-12 text-[#0f1b3c]">
          Plano de Implantação
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {weeks.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="vida-card flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-6 h-6 text-[#00a896]" />
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      {item.week}
                    </p>
                    <h3 className="text-lg font-bold font-poppins text-[#0f1b3c]">
                      {item.title}
                    </h3>
                  </div>
                </div>
                <ul className="space-y-2 flex-1">
                  {item.tasks.map((task, tIndex) => (
                    <li key={tIndex} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-[#c4d600] font-bold">→</span>
                      <span>{task}</span>
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
