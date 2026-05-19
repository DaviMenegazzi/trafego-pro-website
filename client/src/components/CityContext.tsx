import { MapPin, Quote } from 'lucide-react';

export default function CityContext() {
  return (
    <section className="vida-section bg-[#f5f7fa]">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-12 text-[#0f1b3c]">
          Contexto da Praça
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Context Card */}
          <div className="vida-card">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-6 h-6 text-[#00a896] flex-shrink-0 mt-1" />
              <h3 className="text-2xl font-bold font-poppins text-[#0f1b3c]">
                Tupanciretã
              </h3>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="text-[#00a896] font-bold">•</span>
                <span className="text-gray-700">
                  <strong>Praça menor,</strong> onde confiança local pesa muito na decisão
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#00a896] font-bold">•</span>
                <span className="text-gray-700">
                  A comunicação precisa ser <strong>simples, direta e próxima</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#00a896] font-bold">•</span>
                <span className="text-gray-700">
                  O público precisa entender <strong>rapidamente o benefício prático</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#00a896] font-bold">•</span>
                <span className="text-gray-700">
                  A campanha deve priorizar <strong>economia real, família incluída e facilidade de acesso</strong>
                </span>
              </li>
            </ul>
          </div>

          {/* Insight Card */}
          <div className="bg-gradient-to-br from-[#00a896] to-[#008076] rounded-lg p-8 text-white">
            <Quote className="w-8 h-8 mb-4 opacity-80" />
            <p className="text-lg md:text-xl font-inter leading-relaxed">
              "Em uma praça como Tupanciretã, o anúncio precisa parecer próximo e útil. A pessoa precisa bater o olho, entender a economia e sentir que vale chamar no WhatsApp."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
