import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

/**
 * Design Philosophy: Vida Card Verde Vibrante
 * - Hero section com fundo verde teal (#1FBD8F)
 * - Cards brancos com sombras suaves
 * - Tipografia Poppins (títulos) + Inter (corpo)
 * - Espaçamento limpo e hierarquia clara
 * - Links para as duas cidades
 */

export default function Index() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1FBD8F] to-[#17a377] text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold mb-4">Tráfego Pro</h1>
            <p className="text-2xl opacity-95">Estratégia de Tráfego Pago Vida Card</p>
          </div>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Planos de ações práticas para Google Ads, Meta Ads e criativos comerciais com foco em geração de conversas qualificadas no WhatsApp
          </p>
        </div>
      </section>

      {/* Cidades */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Estratégias por Cidade</h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Selecione a cidade para visualizar o plano estratégico completo</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Tupanciretã */}
            <Link href="/tupancireta">
              <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
                <div className="mb-6">
                  <div className="bg-[#1FBD8F] w-16 h-16 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-3xl">🏥</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Tupanciretã</h3>
                  <p className="text-[#1FBD8F] font-semibold">Plano Estratégico</p>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Visão geral estratégica</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Contexto da praça local</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Plano de Meta Ads</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Plano de Google Ads</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Demandas de criativos</span>
                  </div>
                </div>

                <div className="bg-[#1FBD8F] bg-opacity-10 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700">
                    <strong>Foco:</strong> Geração de conversas qualificadas no WhatsApp com ofertas específicas de saúde
                  </p>
                </div>

                <Button className="w-full bg-[#1FBD8F] hover:bg-[#17a377] text-white font-semibold py-3">
                  Ver Estratégia →
                </Button>
              </Card>
            </Link>

            {/* Júlio de Castilhos */}
            <Link href="/juliodecastilhos">
              <Card className="p-8 border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
                <div className="mb-6">
                  <div className="bg-[#1FBD8F] w-16 h-16 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-white text-3xl">💚</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Júlio de Castilhos</h3>
                  <p className="text-[#1FBD8F] font-semibold">Plano Estratégico</p>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Visão geral estratégica</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Contexto da praça local</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Plano de Meta Ads</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Plano de Google Ads</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#1FBD8F] font-bold mr-3">✓</span>
                    <span className="text-gray-700">Demandas de criativos</span>
                  </div>
                </div>

                <div className="bg-[#1FBD8F] bg-opacity-10 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700">
                    <strong>Foco:</strong> Comunicação didática com ênfase em economia e clareza de benefícios
                  </p>
                </div>

                <Button className="w-full bg-[#1FBD8F] hover:bg-[#17a377] text-white font-semibold py-3">
                  Ver Estratégia →
                </Button>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Sobre o Projeto */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Sobre Este Projeto</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 border-0 shadow-md">
              <div className="bg-[#1FBD8F] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">📊</span>
              </div>
              <h3 className="font-bold text-lg mb-3">Análise Estratégica</h3>
              <p className="text-gray-700 text-sm">Diagnóstico completo do mercado local com foco em oportunidades de tráfego pago</p>
            </Card>
            <Card className="p-6 border-0 shadow-md">
              <div className="bg-[#1FBD8F] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🎯</span>
              </div>
              <h3 className="font-bold text-lg mb-3">Planos Práticos</h3>
              <p className="text-gray-700 text-sm">Ações concretas para Meta Ads, Google Ads e criação de criativos comerciais</p>
            </Card>
            <Card className="p-6 border-0 shadow-md">
              <div className="bg-[#1FBD8F] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">💬</span>
              </div>
              <h3 className="font-bold text-lg mb-3">Conversas Qualificadas</h3>
              <p className="text-gray-700 text-sm">Foco em gerar leads qualificados no WhatsApp para conversão efetiva</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-[#1FBD8F] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para Começar?</h2>
          <p className="text-lg opacity-90 mb-8">Selecione a cidade acima para visualizar o plano estratégico completo de tráfego pago</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tupancireta">
              <Button className="bg-white text-[#1FBD8F] hover:bg-gray-100 font-semibold px-8 py-3">
                Tupanciretã
              </Button>
            </Link>
            <Link href="/juliodecastilhos">
              <Button className="bg-white text-[#1FBD8F] hover:bg-gray-100 font-semibold px-8 py-3">
                Júlio de Castilhos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="bg-gray-900 text-white py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="mb-2">Tráfego Pro - Implantação de Campanhas</p>
          <p className="text-sm opacity-75">
            <strong>Lucas Dorneles</strong> | Analista de Marketing
          </p>
          <p className="text-xs opacity-60 mt-4">© 2026 Vida Card. Todos os direitos reservados.</p>
        </div>
      </section>
    </div>
  );
}
