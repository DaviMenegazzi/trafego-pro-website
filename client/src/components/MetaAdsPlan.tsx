export default function MetaAdsPlan() {
  const campaigns = [
    {
      name: "[MSG-WHATS] [ENG] [ACT] - CONSULTAS E EXAMES - TUPANCIRETÃ",
      objective: "Gerar conversas no WhatsApp com oferta direta de economia em consultas e exames",
      audience: "Aberto, 25 a 60+, segmentado para Tupanciretã e região próxima",
      creatives: "Feed, stories, reels e vídeo curto",
      cta: "Quero saber quanto posso economizar"
    },
    {
      name: "[MSG-WHATS] [ENG] [ACT] - FAMÍLIA E SEM CARÊNCIA - TUPANCIRETÃ",
      objective: "Trabalhar a percepção de valor do cartão para famílias",
      audience: "Aberto, 25 a 60+, pessoas em fase de decisão familiar",
      creatives: "Imagem estática, carrossel e vídeo simples",
      cta: "Quero meu cartão"
    },
    {
      name: "[MSG-WHATS] [ENG] [ACT] - ODONTO E ESPECIALISTAS - TUPANCIRETÃ",
      objective: "Captar pessoas por ofertas específicas de odontologia e especialistas",
      audience: "Aberto por cidade",
      creatives: "Criativos por tema: odonto, pediatra, clínico geral, exames e especialidades",
      cta: "Consultar descontos disponíveis"
    },
    {
      name: "[RMKT] [MSG-WHATS] - VIDA CARD TUPANCIRETÃ",
      objective: "Reimpactar pessoas que engajaram com Instagram, Facebook, vídeos ou anúncios",
      audience: "Engajamento 365 dias, visualização de vídeo, cliques e conversas anteriores",
      creatives: "Prova social, explicação simples e oferta direta",
      cta: "Falar com uma consultora"
    }
  ];

  return (
    <section className="vida-section bg-[#f5f7fa]">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-12 text-[#1FBD8F]">
          Plano de Meta Ads
        </h2>

        <div className="space-y-6">
          {campaigns.map((campaign, index) => (
            <div key={index} className="vida-card">
              <div className="mb-4">
                <div className="inline-block px-3 py-1 bg-[#1FBD8F] text-white rounded-full text-xs font-bold mb-3">
                  Campanha {index + 1}
                </div>
                <h3 className="text-xl font-bold font-poppins text-[#1FBD8F] mb-4">
                  {campaign.name}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Objetivo</p>
                  <p className="text-gray-700">{campaign.objective}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Público</p>
                  <p className="text-gray-700">{campaign.audience}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Criativos</p>
                  <p className="text-gray-700">{campaign.creatives}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">CTA</p>
                  <p className="text-[#1FBD8F] font-semibold">{campaign.cta}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
