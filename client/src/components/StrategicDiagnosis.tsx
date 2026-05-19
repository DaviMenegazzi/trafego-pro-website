import { AlertCircle } from 'lucide-react';

export default function StrategicDiagnosis() {
  const points = [
    "Anúncios genéricos tendem a gerar menos intenção de compra",
    "Falar apenas 'faça seu cartão' coloca o produto antes da dor",
    "A pessoa não acorda querendo um cartão de saúde. Ela quer pagar menos em consulta, exame, dentista ou atendimento médico",
    "A comunicação precisa começar pelo benefício prático",
    "Depois que a pessoa chama no WhatsApp, a vendedora encaixa o cartão como solução"
  ];

  return (
    <section className="vida-section bg-white">
      <div className="container">
        <div className="max-w-4xl">
          <div className="flex items-start gap-3 mb-6">
            <AlertCircle className="w-8 h-8 text-[#00a896] flex-shrink-0 mt-1" />
            <h2 className="text-3xl md:text-4xl font-bold font-poppins text-[#0f1b3c]">
              O problema não é só mídia, é clareza de oferta
            </h2>
          </div>

          <div className="space-y-4">
            {points.map((point, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b border-gray-200 last:border-b-0">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#c4d600] text-[#0f1b3c] font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed pt-1">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
