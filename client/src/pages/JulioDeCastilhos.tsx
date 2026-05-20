import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Design Philosophy: Vida Card Verde Vibrante
 * - Hero section com fundo verde teal (#1FBD8F)
 * - Cards brancos com sombras suaves
 * - Tipografia Poppins (títulos) + Inter (corpo)
 * - Espaçamento limpo e hierarquia clara
 * - Ícones e elementos visuais profissionais
 */

export default function JulioDeCastilhos() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-[#1FBD8F] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-orange-400 text-white px-6 py-2 rounded-full font-semibold mb-6">
            IMPLANTAÇÃO
          </div>
          <h1 className="text-5xl font-bold mb-4">Vida Card Júlio de Castilhos</h1>
          <p className="text-xl mb-6">Plano de ações práticas para Google Ads, Meta Ads e criativos comerciais</p>
          <p className="text-lg opacity-90">Estratégia completa de tráfego pago com foco em geração de conversas qualificadas no WhatsApp</p>
        </div>
      </section>

      {/* Visão Geral */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Visão Geral da Estratégia</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 border-0 shadow-md">
              <div className="bg-[#1FBD8F] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🎯</span>
              </div>
              <h3 className="font-bold text-lg mb-3">Objetivo Principal</h3>
              <p className="text-gray-700">Gerar conversas qualificadas no WhatsApp com pessoas de Júlio de Castilhos interessadas em economizar com consultas, exames, odontologia e serviços de saúde.</p>
            </Card>
            <Card className="p-6 border-0 shadow-md">
              <div className="bg-[#1FBD8F] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🔄</span>
              </div>
              <h3 className="font-bold text-lg mb-3">Mudança de Abordagem</h3>
              <p className="text-gray-700">Sair de anúncios genéricos sobre "comprar o cartão" e trabalhar ofertas específicas, onde a pessoa entende primeiro a economia e depois recebe a explicação do cartão.</p>
            </Card>
            <Card className="p-6 border-0 shadow-md">
              <div className="bg-[#1FBD8F] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h3 className="font-bold text-lg mb-3">Prioridade Inicial</h3>
              <p className="text-gray-700">Campanhas de WhatsApp com criativos focados em dor prática: consulta, exame, especialista, odontologia, família e uso imediato.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Contexto */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Contexto da Praça</h2>
          <Card className="p-8 border-0 shadow-md bg-gradient-to-br from-gray-50 to-white">
            <h3 className="text-2xl font-bold mb-6 text-[#1FBD8F]">Júlio de Castilhos</h3>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start">
                <span className="text-[#1FBD8F] font-bold mr-3">•</span>
                <span>Praça local com forte dependência de confiança e clareza na comunicação</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#1FBD8F] font-bold mr-3">•</span>
                <span>O público precisa entender a diferença entre cartão de saúde e plano de saúde</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#1FBD8F] font-bold mr-3">•</span>
                <span>Comunicação deve ser objetiva, com foco em economia, família e facilidade de uso</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#1FBD8F] font-bold mr-3">•</span>
                <span>WhatsApp precisa receber pessoas já educadas sobre o benefício principal</span>
              </li>
            </ul>
            <div className="bg-[#1FBD8F] bg-opacity-10 border-l-4 border-[#1FBD8F] p-4">
              <p className="font-semibold text-gray-900 mb-2">Insight Estratégico</p>
              <p className="text-gray-700">Em Júlio de Castilhos, a campanha precisa ser didática e direta. Quanto mais simples for a explicação do benefício, maior a chance da conversa chegar qualificada para a vendedora.</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Diagnóstico */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">Diagnóstico Estratégico</h2>
          <p className="text-lg font-semibold mb-8 text-center text-gray-800">O problema não é só mídia, é clareza de oferta</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "1", title: "Anúncios genéricos", desc: "Mensagens vagas sobre o cartão não conectam com a dor real do público" },
              { num: "2", title: "Produto antes da dor", desc: "A pessoa não acorda querendo um cartão de saúde. Ela quer pagar menos em consulta, exame, dentista ou atendimento médico" },
              { num: "3", title: "Comunicação pelo benefício", desc: "A comunicação precisa começar pelo benefício prático. Depois que a pessoa chama no WhatsApp, a vendedora encaixa o cartão como solução" }
            ].map((item) => (
              <Card key={item.num} className="p-6 border-0 shadow-md">
                <div className="bg-[#1FBD8F] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mb-4">
                  {item.num}
                </div>
                <h4 className="font-bold text-lg mb-2">{item.title}</h4>
                <p className="text-gray-700">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Lógica da Campanha */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Lógica da Campanha</h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {[
              { step: "1", title: "Oferta Específica", desc: "Exame, consulta, especialista, odontologia ou clínico geral" },
              { step: "2", title: "Clique no WhatsApp", desc: "A pessoa entra pela economia imediata" },
              { step: "3", title: "Vendedora Encaixa", desc: "Explica que o benefício vem com a assinatura" },
              { step: "4", title: "Conversão", desc: "Assinatura do cartão e uso recorrente" }
            ].map((item, idx) => (
              <div key={item.step} className="flex items-center flex-1">
                <Card className="p-6 border-0 shadow-md flex-1">
                  <div className="bg-[#1FBD8F] text-white w-12 h-12 rounded-full flex items-center justify-center font-bold mb-3 text-lg">
                    {item.step}
                  </div>
                  <h4 className="font-bold mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-700">{item.desc}</p>
                </Card>
                {idx < 3 && <div className="hidden md:block text-[#1FBD8F] text-2xl mx-2">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ofertas Principais */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Ofertas Principais para Criativos</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "📋", title: "Consultas e Exames", desc: "Pague menos em consultas e exames com o Vida Card" },
              { icon: "💰", title: "Até 70% de Desconto", desc: "Economia real em consultas, exames e procedimentos" },
              { icon: "⚡", title: "Sem Carência", desc: "Ative e comece a usar" },
              { icon: "👨‍👩‍👧‍👦", title: "Família Incluída", desc: "Um cartão para até 5 pessoas" },
              { icon: "💳", title: "A partir de R$ 59,90/mês", desc: "Saúde com economia por um valor acessível" },
              { icon: "😁", title: "Odontologia", desc: "Condições especiais para cuidar do sorriso" }
            ].map((offer) => (
              <Card key={offer.title} className="p-6 border-0 shadow-md">
                <p className="text-4xl mb-3">{offer.icon}</p>
                <h4 className="font-bold text-lg mb-2">{offer.title}</h4>
                <p className="text-gray-700">{offer.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Meta Ads */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Plano de Meta Ads</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1FBD8F] text-white">
                  <th className="p-3 text-left">Campanha</th>
                  <th className="p-3 text-left">Objetivo</th>
                  <th className="p-3 text-left">Público</th>
                  <th className="p-3 text-left">CTA</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { camp: "[MSG-WHATS] [ENG] [ACT] - CONSULTAS E EXAMES", obj: "Gerar conversas no WhatsApp com oferta direta de economia", pub: "25 a 60+, aberto, Júlio de Castilhos", cta: "Quero saber quanto posso economizar" },
                  { camp: "[MSG-WHATS] [ENG] [ACT] - FAMÍLIA E SEM CARÊNCIA", obj: "Trabalhar percepção de valor para famílias", pub: "25 a 60+, fase de decisão familiar", cta: "Quero meu cartão" },
                  { camp: "[MSG-WHATS] [ENG] [ACT] - ODONTO E ESPECIALISTAS", obj: "Captar pessoas por ofertas específicas", pub: "Aberto por cidade", cta: "Consultar descontos" }
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-3 border-b">{row.camp}</td>
                    <td className="p-3 border-b">{row.obj}</td>
                    <td className="p-3 border-b">{row.pub}</td>
                    <td className="p-3 border-b">{row.cta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Google Ads */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Plano de Google Ads</h2>
          <Card className="p-8 border-0 shadow-md">
            <h3 className="text-xl font-bold mb-4 text-[#1FBD8F]">[PESQUISA] [LEADS] - VIDA CARD JÚLIO DE CASTILHOS</h3>
            <p className="text-gray-700 mb-6">Captar intenção ativa de pessoas buscando cartão de saúde, consultas com desconto, exames com desconto e alternativas a plano de saúde</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold mb-3">Ad Groups</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Vida Card Júlio de Castilhos</li>
                  <li>• Cartão de Saúde</li>
                  <li>• Consultas com Desconto</li>
                  <li>• Exames com Desconto</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3">Títulos Sugeridos</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Vida Card Júlio de Castilhos</li>
                  <li>• Consultas com Desconto</li>
                  <li>• Exames com Desconto</li>
                  <li>• Cartão de Saúde Familiar</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* KPIs */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Indicadores de Acompanhamento</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border-0 shadow-md">
              <h3 className="font-bold text-lg mb-4 text-[#1FBD8F]">Meta Ads</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Conversas iniciadas no WhatsApp</li>
                <li>✓ Custo por conversa</li>
                <li>✓ CTR (Click-Through Rate)</li>
                <li>✓ CPC (Custo por Clique)</li>
                <li>✓ Taxa de resposta comercial</li>
              </ul>
            </Card>
            <Card className="p-6 border-0 shadow-md">
              <h3 className="font-bold text-lg mb-4 text-[#1FBD8F]">Google Ads</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Conversões para WhatsApp</li>
                <li>✓ Custo por conversão</li>
                <li>✓ Taxa de conversão</li>
                <li>✓ Termos de pesquisa</li>
                <li>✓ Cliques qualificados</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Plano de Implantação */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Plano de Implantação</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { week: "Semana 1", tasks: ["Subir campanhas de WhatsApp no Meta", "Subir Pesquisa no Google", "Publicar primeiros criativos"] },
              { week: "Semana 2", tasks: ["Analisar CPLs, CTRs, CPCs", "Analisar termos de pesquisa", "Pausar criativos genéricos"] },
              { week: "Semana 3", tasks: ["Entrar com criativos de influencer", "Ativar remarketing", "Reforçar prova local"] },
              { week: "Semana 4", tasks: ["Otimizar orçamento por oferta", "Separar conversa barata", "Ajustar estratégia"] }
            ].map((item) => (
              <Card key={item.week} className="p-4 border-0 shadow-md">
                <h4 className="font-bold text-[#1FBD8F] mb-3">{item.week}</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  {item.tasks.map((task, idx) => (
                    <li key={idx}>• {task}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="bg-[#1FBD8F] text-white py-12 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-2">Vida Card Júlio de Castilhos</h3>
          <p className="mb-4">Tráfego Pro - Implantação de Campanhas</p>
          <div className="border-t border-white border-opacity-30 pt-4">
            <p className="font-semibold">Lucas Dorneles</p>
            <p className="text-sm opacity-90">Analista de Marketing</p>
          </div>
        </div>
      </section>
    </div>
  );
}
