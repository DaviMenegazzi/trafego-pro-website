import { Palette } from 'lucide-react';

export default function CreativeDemands() {
  const demands = [
    {
      name: "VIDA CARD TUPANCIRETÃ - FEED E STORIES - Consultas e exames com desconto",
      objective: "Criar criativos de conversão para WhatsApp usando a economia em consultas e exames como entrada principal",
      thought: "Usar visual limpo, direto e com destaque para 'até 70% de desconto'. Evitar parecer plano de saúde tradicional",
      success: "Pessoa entender em até 3 segundos que pode economizar em saúde e clicar para falar no WhatsApp"
    },
    {
      name: "VIDA CARD TUPANCIRETÃ - CARROSSEL - Como funciona o cartão",
      objective: "Explicar de forma simples a lógica: assina, ativa, usa e economiza",
      thought: "Carrossel em 4 etapas, com ícones e linguagem bem didática",
      success: "Reduzir dúvida sobre o funcionamento do cartão antes do contato comercial"
    },
    {
      name: "VIDA CARD TUPANCIRETÃ - REELS - Família protegida",
      objective: "Trabalhar o benefício de até 5 pessoas no mesmo cartão",
      thought: "Vídeo curto com situação familiar e foco em economia no mês",
      success: "Gerar identificação com público adulto e familiar"
    },
    {
      name: "VIDA CARD TUPANCIRETÃ - STORIES - Sem carência",
      objective: "Criar criativo rápido para reforçar uso imediato após ativação",
      thought: "Layout simples com frase forte: 'Ativou, já pode usar'",
      success: "Aumentar cliques de pessoas que precisam resolver algo rápido"
    },
    {
      name: "VIDA CARD TUPANCIRETÃ - FEED - Odontologia com desconto",
      objective: "Criar oferta específica para odontologia",
      thought: "Usar gancho de limpeza, restauração, aparelho e cuidados preventivos",
      success: "Abrir nova frente de leads além de consultas médicas"
    },
    {
      name: "VIDA CARD TUPANCIRETÃ - VÍDEO CURTO - Influencer local explicando economia",
      objective: "Criar conteúdo com rosto local para gerar confiança",
      thought: "Influencer falando de forma simples sobre economia em consulta, exame, odontologia e família",
      success: "Aumentar confiança e volume de mensagens qualificadas"
    }
  ];

  return (
    <section className="vida-section bg-[#f5f7fa]">
      <div className="container">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-8 h-8 text-[#1FBD8F]" />
          <h2 className="text-3xl md:text-4xl font-bold font-poppins text-[#1FBD8F]">
            Demandas de Criativos
          </h2>
        </div>
        <p className="text-gray-600 mb-12 text-lg">
          Especificações para produção de materiais de marketing
        </p>

        <div className="space-y-6">
          {demands.map((demand, index) => (
            <div key={index} className="vida-card">
              <div className="mb-4">
                <div className="inline-block px-3 py-1 bg-[#1FBD8F] text-white rounded-full text-xs font-bold mb-3">
                  Demanda {index + 1}
                </div>
                <h3 className="text-lg font-bold font-poppins text-[#1FBD8F]">
                  {demand.name}
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Objetivo Principal</p>
                  <p className="text-gray-700">{demand.objective}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">O que Pensei</p>
                  <p className="text-gray-700">{demand.thought}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Critério de Sucesso</p>
                  <p className="text-gray-700">{demand.success}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
