import { MessageCircle, Lightbulb, Target } from 'lucide-react';

export default function StrategicOverview() {
  const cards = [
    {
      icon: Target,
      title: "Objetivo principal",
      description: "Gerar conversas qualificadas no WhatsApp com pessoas de Tupanciretã interessadas em economizar com consultas, exames, odontologia e serviços de saúde."
    },
    {
      icon: Lightbulb,
      title: "Mudança de abordagem",
      description: "Sair de anúncios genéricos sobre 'comprar o cartão' e trabalhar ofertas específicas, onde a pessoa entende primeiro a economia e depois recebe a explicação do cartão."
    },
    {
      icon: MessageCircle,
      title: "Prioridade inicial",
      description: "Campanhas de WhatsApp com criativos focados em dor prática: consulta, exame, especialista, odontologia, família e uso imediato."
    }
  ];

  return (
    <section className="vida-section bg-white">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-4 text-[#1FBD8F]">
          Visão Geral da Estratégia
        </h2>
        <p className="text-gray-600 mb-12 text-lg">
          Três pilares que guiam o plano de implantação
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="vida-card">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Icon className="w-8 h-8 text-[#1FBD8F]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-poppins text-[#1FBD8F] mb-2">
                      {card.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
