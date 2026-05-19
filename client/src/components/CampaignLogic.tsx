import { ArrowRight, Gift, MessageSquare, CheckCircle, Zap } from 'lucide-react';

export default function CampaignLogic() {
  const steps = [
    {
      icon: Gift,
      title: "Oferta específica",
      description: "Exame, consulta, especialista, odontologia ou clínico geral"
    },
    {
      icon: MessageSquare,
      title: "Clique no WhatsApp",
      description: "A pessoa entra pela economia imediata"
    },
    {
      icon: Zap,
      title: "Vendedora encaixa",
      description: "Explica que o benefício vem com a assinatura do cartão"
    },
    {
      icon: CheckCircle,
      title: "Conversão",
      description: "Assinatura do cartão e uso recorrente"
    }
  ];

  return (
    <section className="vida-section bg-[#f5f7fa]">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-12 text-[#0f1b3c]">
          Lógica da Campanha
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex flex-col">
                <div className="vida-card flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-6 h-6 text-[#00a896]" />
                    <span className="inline-block px-2 py-1 bg-[#c4d600] text-[#0f1b3c] rounded text-xs font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-poppins text-[#0f1b3c] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:flex justify-center py-4">
                    <ArrowRight className="w-5 h-5 text-[#00a896] transform rotate-90 md:rotate-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
