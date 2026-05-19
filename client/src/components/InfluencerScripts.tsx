import { Film } from 'lucide-react';

export default function InfluencerScripts() {
  const scripts = [
    {
      title: "Dor do exame caro",
      format: "Vídeo vertical, 30 a 40 segundos",
      scenes: [
        {
          label: "Cena 1",
          content: "Influencer falando para câmera: 'Quem já precisou fazer exame ou consulta particular sabe que o valor pesa no bolso.'"
        },
        {
          label: "Cena 2",
          content: "Texto na tela: Consultas • Exames • Procedimentos • Descontos de até 70%"
        },
        {
          label: "Cena 3",
          content: "Influencer: 'Com o Vida Card, você consegue descontos em consultas, exames e procedimentos. E o melhor, sem carência.'"
        },
        {
          label: "CTA",
          content: "Chama no WhatsApp e confere os benefícios disponíveis em Tupanciretã"
        }
      ]
    },
    {
      title: "Família no mesmo cartão",
      format: "Vídeo vertical, 30 segundos",
      scenes: [
        {
          label: "Cena 1",
          content: "Influencer: 'Imagina ter um cartão que ajuda não só você, mas também sua família.'"
        },
        {
          label: "Cena 2",
          content: "Texto na tela: Até 5 pessoas inclusas • A partir de R$59,90/mês • Sem carência"
        },
        {
          label: "Cena 3",
          content: "Influencer: 'O Vida Card é uma forma mais simples de cuidar da saúde e ainda economizar em consultas, exames, odontologia e outros serviços.'"
        },
        {
          label: "CTA",
          content: "Fala com uma consultora e veja qual cartão faz mais sentido para sua rotina"
        }
      ]
    },
    {
      title: "Explicando que não é plano de saúde",
      format: "Vídeo vertical, 35 a 45 segundos",
      scenes: [
        {
          label: "Cena 1",
          content: "Influencer: 'Muita gente confunde, então deixa eu explicar rapidinho: o Vida Card não é um plano de saúde.'"
        },
        {
          label: "Cena 2",
          content: "Texto na tela: É um cartão de benefícios em saúde"
        },
        {
          label: "Cena 3",
          content: "Influencer: 'Você assina o cartão e passa a ter acesso a descontos em consultas, exames, odontologia, farmácias e rede parceira.'"
        },
        {
          label: "Cena 4",
          content: "Influencer: 'É uma alternativa prática para quem quer economizar sem burocracia.'"
        },
        {
          label: "CTA",
          content: "Clique no botão e fale com uma consultora"
        }
      ]
    }
  ];

  return (
    <section className="vida-section bg-white">
      <div className="container">
        <div className="flex items-center gap-3 mb-4">
          <Film className="w-8 h-8 text-[#00a896]" />
          <h2 className="text-3xl md:text-4xl font-bold font-poppins text-[#0f1b3c]">
            Roteiros para Influencer
          </h2>
        </div>
        <p className="text-gray-600 mb-12 text-lg">
          Scripts para produção de vídeos com prova social local
        </p>

        <div className="space-y-8">
          {scripts.map((script, index) => (
            <div key={index} className="vida-card">
              <div className="mb-6">
                <div className="inline-block px-3 py-1 bg-[#00a896] text-white rounded-full text-xs font-bold mb-3">
                  Script {index + 1}
                </div>
                <h3 className="text-2xl font-bold font-poppins text-[#0f1b3c] mb-2">
                  {script.title}
                </h3>
                <p className="text-sm text-gray-500 font-semibold">
                  {script.format}
                </p>
              </div>

              <div className="space-y-4">
                {script.scenes.map((scene, sceneIndex) => (
                  <div key={sceneIndex} className="border-l-4 border-[#00a896] pl-4 py-2">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                      {scene.label}
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      {scene.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
