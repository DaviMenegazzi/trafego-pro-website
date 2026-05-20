import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Hook para detectar quando elemento entra em view
function useInView(options = {}) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isInView] as const;
}

/**
 * Design Philosophy: Tráfego Pro - Moderno, Minimalista
 * - Paleta: Preto (#0a0a0a), Branco (#ffffff), Cinza (#f5f5f5)
 * - Tipografia: Space Grotesk (títulos - weight 600) + Inter Extra Light (corpo - weight 100)
 * - Design limpo e profissional com efeito de esfera/círculo
 * - Foco em apresentação da assessoria
 * - SEM links para clientes
 * - Animações: Fade-in e Slide-up ao scroll
 */

export default function TrafegoProHome() {
  const [aboutRef, aboutInView] = useInView();
  const [servicesRef, servicesInView] = useInView();
  const [ctaRef, ctaInView] = useInView();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .animate-on-scroll.in-view {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Header */}
      <header className="relative z-10 py-6 px-4 sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp" 
              alt="Tráfego Pro" 
              style={{ width: '200px', height: '20px' }}
            />
          </div>
          
          <nav className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#sobre" className="hover:text-gray-300 transition">Sobre</a>
            <a href="#servicos" className="hover:text-gray-300 transition">Serviços</a>
            <a href="#estrategia" className="hover:text-gray-300 transition">Estratégia</a>
            <a href="#contato" className="hover:text-gray-300 transition">Contato</a>
          </nav>

          <Button className="border border-gray-600 bg-transparent text-white hover:bg-gray-900 hover:border-gray-400 transition px-6 py-2">
            Começar Agora
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Animated stars/particles - Only in Hero */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.2,
                animation: `twinkle ${3 + Math.random() * 4}s infinite`
              }}
            ></div>
          ))}
        </div>

        {/* NEW Badge */}
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase">NOVO</span>
          <span className="text-sm text-gray-300">Maximize suas vendas com IA</span>
          <ArrowRight size={14} className="text-gray-400" />
        </div>

        {/* Main Title */}
        <h1 
          className="text-6xl md:text-7xl lg:text-8xl font-black text-center leading-tight mb-8 max-w-5xl"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
        >
          Tráfego que<br />
          <span className="bg-gradient-to-r from-white via-gray-300 to-gray-400 bg-clip-text text-transparent">
            Converte
          </span>
        </h1>

        {/* Subtitle */}
        <p 
          className="text-lg md:text-xl text-gray-400 text-center max-w-2xl mb-12 leading-relaxed"
          style={{ fontWeight: 300 }}
        >
          Maximize suas vendas com estratégias de tráfego pago e conteúdo orgânico de alto impacto. Resultados reais, dados comprovados.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Button className="bg-white text-black hover:bg-gray-100 font-bold px-8 py-6 text-lg rounded-full transition">
            Solicitar Demo
          </Button>
          <Button className="border-2 border-gray-600 bg-transparent text-white hover:bg-gray-900 hover:border-gray-400 font-bold px-8 py-6 text-lg rounded-full transition">
            Saiba Mais
          </Button>
        </div>
      </section>

      {/* About Section */}
      <section 
        id="sobre" 
        ref={aboutRef}
        className={`relative z-10 py-24 px-4 bg-gradient-to-b from-black to-gray-900/20 animate-on-scroll ${aboutInView ? 'in-view' : ''}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 
              className="text-5xl md:text-6xl font-black text-white mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
            >
              Quem Somos
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-white to-gray-600"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg leading-relaxed text-gray-400 mb-6" style={{ fontWeight: 300 }}>
                A Tráfego Pro é uma assessoria especializada em marketing digital que ajuda empresas a alcançarem seus objetivos de vendas através de estratégias integradas de tráfego pago e conteúdo orgânico.
              </p>
              <p className="text-lg leading-relaxed text-gray-400 mb-6" style={{ fontWeight: 300 }}>
                Nosso foco é transformar dados em decisões estratégicas, maximizando o retorno de cada real investido em marketing.
              </p>
              <p className="text-lg leading-relaxed text-gray-400" style={{ fontWeight: 300 }}>
                Trabalhamos com empresas de todos os tamanhos, sempre com a mesma dedicação e excelência.
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-black p-12 rounded-2xl border border-gray-800">
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }} className="space-y-8">
                <div>
                  <h3 className="text-4xl font-black text-white mb-2">+500</h3>
                  <p className="text-gray-400" style={{ fontWeight: 300 }}>Campanhas gerenciadas com sucesso</p>
                </div>
                <div>
                  <h3 className="text-4xl font-black text-white mb-2">+50M</h3>
                  <p className="text-gray-400" style={{ fontWeight: 300 }}>Em vendas geradas para clientes</p>
                </div>
                <div>
                  <h3 className="text-4xl font-black text-white mb-2">98%</h3>
                  <p className="text-gray-400" style={{ fontWeight: 300 }}>Taxa de satisfação de clientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section 
        id="servicos"
        ref={servicesRef}
        className={`relative z-10 py-24 px-4 bg-black animate-on-scroll ${servicesInView ? 'in-view' : ''}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 
              className="text-5xl md:text-6xl font-black text-white mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
            >
              Nossos Serviços
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-white to-gray-600"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Google Ads", desc: "Campanhas de pesquisa otimizadas para máxima conversão" },
              { title: "Meta Ads", desc: "Estratégias de tráfego pago em Facebook e Instagram" },
              { title: "Conteúdo Orgânico", desc: "Estratégias de marketing de conteúdo de alto impacto" },
              { title: "Análise de Dados", desc: "Relatórios detalhados e insights acionáveis" },
              { title: "Otimização de Funil", desc: "Melhoria contínua de conversão e ROI" },
              { title: "Consultoria", desc: "Orientação estratégica personalizada para seu negócio" }
            ].map((service, i) => (
              <div 
                key={i}
                className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-gray-800 hover:border-gray-600 transition"
              >
                <h3 
                  className="text-2xl font-black text-white mb-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
                >
                  {service.title}
                </h3>
                <p className="text-gray-400" style={{ fontWeight: 300 }}>
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategy Section */}
      <section id="estrategia" className="relative z-10 py-24 px-4 bg-gradient-to-b from-black to-gray-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 
              className="text-5xl md:text-6xl font-black text-white mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
            >
              Nossa Metodologia
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-white to-gray-600"></div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { num: "01", title: "Diagnóstico", desc: "Análise completa do seu negócio e concorrência" },
              { num: "02", title: "Estratégia", desc: "Planejamento de campanhas personalizadas" },
              { num: "03", title: "Execução", desc: "Implementação e otimização contínua" },
              { num: "04", title: "Resultados", desc: "Relatórios e ajustes baseados em dados" }
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="text-6xl font-black text-gray-800 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {step.num}
                </div>
                <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                  {step.title}
                </h3>
                <p className="text-gray-400 text-sm" style={{ fontWeight: 300 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="contato"
        ref={ctaRef}
        className={`relative z-10 py-24 px-4 bg-black animate-on-scroll ${ctaInView ? 'in-view' : ''}`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-5xl md:text-6xl font-black text-white mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
          >
            Pronto para Transformar Seus Resultados?
          </h2>
          <p className="text-lg text-gray-400 mb-12 leading-relaxed" style={{ fontWeight: 300 }}>
            Vamos conversar sobre como a Tráfego Pro pode ajudar seu negócio a crescer exponencialmente com estratégias de marketing digital comprovadas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-white text-black hover:bg-gray-100 font-bold px-8 py-6 text-lg rounded-full transition">
              Solicitar Demo
            </Button>
            <Button className="border-2 border-gray-600 bg-transparent text-white hover:bg-gray-900 hover:border-gray-400 font-bold px-8 py-6 text-lg rounded-full transition">
              Falar com Especialista
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 border-t border-gray-800/50 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <img 
                src="/manus-storage/logo_trafego_pro_white_9daf2f2e.webp" 
                alt="Tráfego Pro" 
                style={{ width: '259px', height: '24px' }}
              />
              <p className="text-gray-500 text-sm mt-4" style={{ fontWeight: 300 }}>
                Assessoria de marketing focada em resultados reais.
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm" style={{ fontWeight: 300 }}>
                © 2026 Tráfego Pro. Todos os direitos reservados.
              </p>
              <div className="flex gap-6 justify-center md:justify-end mt-4">
                <a href="#" className="text-gray-500 hover:text-white transition text-sm">Privacidade</a>
                <a href="#" className="text-gray-500 hover:text-white transition text-sm">Termos</a>
                <a href="#" className="text-gray-500 hover:text-white transition text-sm">Contato</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
