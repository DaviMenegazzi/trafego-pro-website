import { Search } from 'lucide-react';

export default function GoogleAdsPlan() {
  const adGroups = [
    {
      name: "Vida Card Tupanciretã",
      keywords: ["vida card tupanciretã", "cartão vida card tupanciretã", "vida card cartão de saúde tupanciretã"]
    },
    {
      name: "Cartão de saúde",
      keywords: ["cartão de saúde", "cartão de desconto saúde", "cartão para consulta médica", "cartão de benefícios saúde"]
    },
    {
      name: "Consultas com desconto",
      keywords: ["consulta médica com desconto", "clínico geral com desconto", "pediatra com desconto", "especialista com desconto"]
    },
    {
      name: "Exames com desconto",
      keywords: ["exame com desconto", "exames médicos com desconto", "laboratório com desconto"]
    },
    {
      name: "Odontologia com desconto",
      keywords: ["dentista com desconto", "odontologia com desconto", "tratamento dentário com desconto"]
    }
  ];

  const titles = [
    "Vida Card Tupanciretã",
    "Consultas com Desconto",
    "Exames com Desconto",
    "Cartão de Saúde Familiar",
    "Sem Carência",
    "Use Após Ativar",
    "Até 5 Pessoas Inclusas",
    "A partir de R$59,90/mês",
    "Fale pelo WhatsApp",
    "Economize com Saúde",
    "Benefícios para Família",
    "Saúde com Mais Economia"
  ];

  const descriptions = [
    "Economize em consultas, exames e procedimentos com o Vida Card.",
    "Cartão de saúde para até 5 pessoas, sem carência e com uso imediato.",
    "Fale com uma consultora e veja os benefícios disponíveis em Tupanciretã.",
    "Consultas, exames, odontologia e rede parceira com condições especiais."
  ];

  const callouts = [
    "Sem carência",
    "Uso imediato",
    "Até 5 pessoas",
    "Consultas com desconto",
    "Exames com desconto",
    "Odontologia",
    "Rede parceira",
    "WhatsApp rápido"
  ];

  const sitelinks = [
    "Planos Vida Card",
    "Consultas e Exames",
    "Odontologia",
    "Falar no WhatsApp"
  ];

  return (
    <section className="vida-section bg-white">
      <div className="container">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-8 h-8 text-[#00a896]" />
          <h2 className="text-3xl md:text-4xl font-bold font-poppins text-[#0f1b3c]">
            Plano de Google Ads
          </h2>
        </div>
        <p className="text-gray-600 mb-12 text-lg">
          Campanha de pesquisa para captar intenção ativa
        </p>

        {/* Campaign Header */}
        <div className="vida-card mb-8">
          <div className="mb-4">
            <div className="inline-block px-3 py-1 bg-[#00a896] text-white rounded-full text-xs font-bold mb-3">
              Campanha Principal
            </div>
            <h3 className="text-xl font-bold font-poppins text-[#0f1b3c]">
              [PESQUISA] [LEADS] - VIDA CARD TUPANCIRETÃ
            </h3>
          </div>
          <p className="text-gray-700 mb-4">
            <strong>Objetivo:</strong> Captar intenção ativa de pessoas buscando cartão de saúde, consultas com desconto, exames com desconto e alternativas a plano de saúde em Tupanciretã.
          </p>
        </div>

        {/* Ad Groups */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold font-poppins text-[#0f1b3c] mb-6">
            Grupos de Anúncios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adGroups.map((group, index) => (
              <div key={index} className="vida-card">
                <h4 className="font-bold font-poppins text-[#0f1b3c] mb-3">
                  {group.name}
                </h4>
                <ul className="space-y-2">
                  {group.keywords.map((keyword, kIndex) => (
                    <li key={kIndex} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-[#00a896]">•</span>
                      <span>{keyword}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Copy Elements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Titles */}
          <div className="vida-card">
            <h4 className="font-bold font-poppins text-[#0f1b3c] mb-4">
              Títulos de Anúncios
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {titles.map((title, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm text-gray-700">
                  {title}
                </div>
              ))}
            </div>
          </div>

          {/* Descriptions */}
          <div className="vida-card">
            <h4 className="font-bold font-poppins text-[#0f1b3c] mb-4">
              Descrições
            </h4>
            <div className="space-y-3">
              {descriptions.map((desc, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded text-sm text-gray-700">
                  {desc}
                </div>
              ))}
            </div>
          </div>

          {/* Callouts */}
          <div className="vida-card">
            <h4 className="font-bold font-poppins text-[#0f1b3c] mb-4">
              Callouts
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {callouts.map((callout, index) => (
                <div key={index} className="p-2 bg-[#c4d600] text-[#0f1b3c] rounded text-sm font-semibold">
                  {callout}
                </div>
              ))}
            </div>
          </div>

          {/* Sitelinks */}
          <div className="vida-card">
            <h4 className="font-bold font-poppins text-[#0f1b3c] mb-4">
              Sitelinks
            </h4>
            <div className="space-y-2">
              {sitelinks.map((link, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm text-gray-700 flex gap-2">
                  <span className="text-[#00a896]">→</span>
                  <span>{link}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
