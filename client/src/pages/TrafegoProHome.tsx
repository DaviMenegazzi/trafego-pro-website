import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Design Philosophy: Tráfego Pro - Moderno, Minimalista
 * - Paleta: Preto (#1a1a1a), Branco (#ffffff), Cinza (#f5f5f5)
 * - Tipografia: Space Grotesk (títulos - weight 600) + Inter Extra Light (corpo - weight 100)
 * - Design limpo e profissional
 * - Foco em apresentação da assessoria
 * - SEM links para clientes
 */

export default function TrafegoProHome() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header com Logo */}
      <header className="bg-black text-white py-6 px-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <img 
            src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp" 
            alt="Tráfego Pro" 
            style={{ width: '299px', height: '24px' }}
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-black text-white py-32 px-4 relative overflow-hidden" style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="absolute inset-0 bg-black/70"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="mb-8">
            <h1 className="text-6xl md:text-7xl font-black leading-tight mb-6">
              Tráfego que<br />converte
            </h1>
          </div>
          <p className="text-xl md:text-2xl opacity-80 max-w-2xl mb-8 leading-relaxed" style={{ fontWeight: 100 }}>
            Assessoria de marketing focada em maximizar suas vendas através de estratégias de tráfego pago e conteúdo orgânico de alto impacto.
          </p>
          <div className="flex gap-4">
            <Button className="bg-white text-black hover:bg-gray-100 font-bold px-8 py-6 text-lg">
              Começar Agora
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black font-bold px-8 py-6 text-lg">
              Saiba Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-black mb-6">
              Quem Somos
            </h2>
            <div className="h-1 w-24 bg-black"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg leading-relaxed text-gray-700" style={{ fontWeight: 100 }} mb-6">
                A Tráfego Pro é uma assessoria especializada em marketing digital que ajuda empresas a alcançarem seus objetivos de vendas através de estratégias integradas de tráfego pago e conteúdo orgânico.
              </p>
              <p className="text-lg leading-relaxed text-gray-700" style={{ fontWeight: 100 }} mb-6">
                Nosso foco é transformar dados em decisões estratégicas, maximizando o retorno de cada real investido em marketing.
              </p>
              <p className="text-lg leading-relaxed text-gray-700" style={{ fontWeight: 100 }}">
                Trabalhamos com empresas de todos os tamanhos, desde startups até grandes corporações, sempre com a mesma dedicação e excelência.
              </p>
            </div>
            <div className="bg-black text-white p-12 rounded-lg">
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="space-y-8">
                <div>
                  <h3 className="text-4xl font-black mb-2">+500</h3>
                  <p className="text-gray-300" style={{ fontWeight: 100 }}">Campanhas executadas</p>
                </div>
                <div>
                  <h3 className="text-4xl font-black mb-2">+50M</h3>
                  <p className="text-gray-300" style={{ fontWeight: 100 }}">Em vendas geradas</p>
                </div>
                <div>
                  <h3 className="text-4xl font-black mb-2">98%</h3>
                  <p className="text-gray-300" style={{ fontWeight: 100 }}">Taxa de satisfação</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-black mb-6">
              Nossos Serviços
            </h2>
            <div className="h-1 w-24 bg-black"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Tráfego Pago",
                desc: "Campanhas estratégicas em Google Ads, Meta Ads e outras plataformas com foco em conversão e ROI máximo."
              },
              {
                title: "Conteúdo Orgânico",
                desc: "Estratégias de conteúdo que geram engajamento, autoridade e tráfego qualificado de forma sustentável."
              },
              {
                title: "Análise & Otimização",
                desc: "Monitoramento contínuo de métricas, testes A/B e otimizações para melhorar constantemente seus resultados."
              },
              {
                title: "Planejamento Estratégico",
                desc: "Diagnóstico completo do seu mercado, concorrência e oportunidades para criar uma estratégia vencedora."
              },
              {
                title: "Criação de Criativos",
                desc: "Produção de anúncios, vídeos e conteúdos visuais que capturam atenção e geram conversões."
              },
              {
                title: "Consultoria",
                desc: "Orientação especializada para sua equipe interna implementar as melhores práticas de marketing digital."
              }
            ].map((service, idx) => (
              <Card key={idx} className="p-8 border-2 border-black hover:shadow-lg transition">
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="text-2xl font-black mb-4 text-black">
                  {service.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {service.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Estratégia */}
      <section id="estrategia" className="py-24 px-4 bg-black text-white">
        <div className="max-w-6xl mx-auto">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              Nossa Metodologia
            </h2>
            <div className="h-1 w-24 bg-white"></div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Diagnóstico", desc: "Análise profunda do seu negócio, mercado e oportunidades" },
              { step: "02", title: "Estratégia", desc: "Planejamento detalhado de ações e metas mensuráveis" },
              { step: "03", title: "Execução", desc: "Implementação das campanhas com precisão e criatividade" },
              { step: "04", title: "Otimização", desc: "Monitoramento contínuo e ajustes para máximo desempenho" }
            ].map((item, idx) => (
              <div key={idx} className="border-l-4 border-white pl-6">
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="text-5xl font-black mb-4 opacity-50">
                  {item.step}
                </p>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="text-2xl font-black mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-300" style={{ fontWeight: 100 }}">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferencial */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-black mb-6">
              Por que Tráfego Pro?
            </h2>
            <div className="h-1 w-24 bg-black"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {[
              { icon: "■", title: "Data-Driven", desc: "Todas as decisões baseadas em dados e análises profundas" },
              { icon: "■", title: "Resultados Comprovados", desc: "Histórico de sucesso com empresas de diversos segmentos" },
              { icon: "■", title: "Execução Rápida", desc: "Implementação ágil sem comprometer a qualidade" },
              { icon: "■", title: "Otimização Contínua", desc: "Melhorias constantes baseadas em performance real" },
              { icon: "■", title: "Criatividade + Estratégia", desc: "Combinação perfeita de arte e ciência" },
              { icon: "■", title: "Parceria Real", desc: "Seu sucesso é nosso sucesso" }
            ].map((item, idx) => (
              <Card key={idx} className="p-8 bg-white border-0 shadow-md">
                <p className="text-3xl mb-4 text-black font-bold">{item.icon}</p>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="text-2xl font-black mb-3 text-black">
                  {item.title}
                </h3>
                <p className="text-gray-700" style={{ fontWeight: 100 }}>
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="contato" className="py-32 px-4 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            <h2 className="text-6xl md:text-7xl font-black mb-8 leading-tight">
              Pronto para<br />crescer?
            </h2>
          </div>
          <p className="text-xl opacity-80 mb-12 max-w-2xl mx-auto">
            Vamos conversar sobre como a Tráfego Pro pode ajudar seu negócio a alcançar novos patamares de vendas e crescimento.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-white text-black hover:bg-gray-100 font-bold px-10 py-6 text-lg">
              Agendar Reunião
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black font-bold px-10 py-6 text-lg">
              Enviar Mensagem
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
            <img 
              src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp" 
              alt="Tráfego Pro" 
              style={{ width: '259px', height: '24px', marginBottom: '1rem' }}
            />
              <p className="text-gray-400 text-sm">
                Assessoria de marketing focada em resultados reais.
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="font-black mb-4">Serviços</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Tráfego Pago</a></li>
                <li><a href="#" className="hover:text-white transition">Conteúdo Orgânico</a></li>
                <li><a href="#" className="hover:text-white transition">Consultoria</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="font-black mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#sobre" className="hover:text-white transition">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} className="font-black mb-4">Redes Sociais</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Instagram</a></li>
                <li><a href="#" className="hover:text-white transition">LinkedIn</a></li>
                <li><a href="#" className="hover:text-white transition">YouTube</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>© 2026 Tráfego Pro. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
