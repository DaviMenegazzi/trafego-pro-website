import { 
  Stethoscope, 
  Pill, 
  Zap, 
  Users, 
  DollarSign, 
  Smile, 
  Clock, 
  Network 
} from 'lucide-react';

export default function MainOffers() {
  const offers = [
    {
      icon: Stethoscope,
      title: "Consultas e exames com desconto",
      hook: "Pague menos em consultas e exames com o Vida Card"
    },
    {
      icon: DollarSign,
      title: "Até 70% de desconto",
      hook: "Economia real em consultas, exames e procedimentos"
    },
    {
      icon: Zap,
      title: "Sem carência",
      hook: "Ative e comece a usar"
    },
    {
      icon: Users,
      title: "Família incluída",
      hook: "Um cartão para até 5 pessoas"
    },
    {
      icon: DollarSign,
      title: "A partir de R$ 59,90/mês",
      hook: "Saúde com economia por um valor acessível"
    },
    {
      icon: Smile,
      title: "Odontologia",
      hook: "Condições especiais para cuidar do sorriso"
    },
    {
      icon: Clock,
      title: "Pronto atendimento online 24h",
      hook: "Mais facilidade para atendimentos rápidos"
    },
    {
      icon: Network,
      title: "Rede parceira",
      hook: "Benefícios para usar no dia a dia"
    }
  ];

  return (
    <section className="vida-section bg-white">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-4 text-[#0f1b3c]">
          Ofertas Principais
        </h2>
        <p className="text-gray-600 mb-12 text-lg">
          Elementos para usar nos criativos de Meta Ads e Google Ads
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {offers.map((offer, index) => {
            const Icon = offer.icon;
            return (
              <div key={index} className="vida-card">
                <div className="flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-4">
                    <Icon className="w-6 h-6 text-[#00a896] flex-shrink-0 mt-1" />
                  </div>
                  <h3 className="text-base font-bold font-poppins text-[#0f1b3c] mb-2">
                    {offer.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">
                    <em>"{offer.hook}"</em>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
