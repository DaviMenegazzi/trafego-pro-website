import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CommunicationPolicy() {
  const avoid = [
    "Você está doente?",
    "Você precisa de médico?",
    "Está com dor?"
  ];

  const safe = [
    "Economize em consultas e exames",
    "Conheça os benefícios do Vida Card",
    "Cuidado com a saúde com mais facilidade",
    "Consulte as condições disponíveis em Tupanciretã"
  ];

  return (
    <section className="vida-section bg-[#f5f7fa]">
      <div className="container">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-[#00a896]" />
          <h2 className="text-3xl md:text-4xl font-bold font-poppins text-[#0f1b3c]">
            Cuidados de Política e Comunicação
          </h2>
        </div>
        <p className="text-gray-600 mb-12 text-lg">
          Como estamos falando de saúde, os anúncios não devem afirmar condição pessoal do usuário
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Avoid */}
          <div className="vida-card border-l-4 border-red-500">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-xl font-bold font-poppins text-[#0f1b3c]">
                Evitar
              </h3>
            </div>
            <div className="space-y-3">
              {avoid.map((phrase, index) => (
                <div key={index} className="p-3 bg-red-50 rounded text-gray-700">
                  <p className="text-sm line-through text-red-600">
                    "{phrase}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Safe */}
          <div className="vida-card border-l-4 border-[#00a896]">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-[#00a896]" />
              <h3 className="text-xl font-bold font-poppins text-[#0f1b3c]">
                Usar
              </h3>
            </div>
            <div className="space-y-3">
              {safe.map((phrase, index) => (
                <div key={index} className="p-3 bg-green-50 rounded text-gray-700">
                  <p className="text-sm text-[#00a896] font-semibold">
                    "{phrase}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
