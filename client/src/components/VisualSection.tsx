export default function VisualSection() {
  return (
    <section className="vida-section bg-white">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-12 text-[#0f1b3c]">
          Estratégia Visual
        </h2>

        {/* Strategy Illustration */}
        <div className="mb-16">
          <div className="rounded-lg overflow-hidden shadow-lg">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663655133524/HCdtznE9dNy8ZoAnjMwrWj/vida-card-strategy-illustration-Qszwhdb5fJXZ3J8Ruaviak.webp"
              alt="Estratégia de 4 passos: Oferta, WhatsApp, Vendedora, Conversão"
              className="w-full h-auto"
            />
          </div>
          <p className="text-center text-gray-600 mt-4 text-sm">
            A jornada do cliente: da oferta específica até a conversão em assinatura
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Family Benefits */}
          <div className="rounded-lg overflow-hidden shadow-lg">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663655133524/HCdtznE9dNy8ZoAnjMwrWj/vida-card-family-benefits-RXqeLV52gwrgYPFfEuZk6R.webp"
              alt="Família protegida com até 5 pessoas no mesmo cartão"
              className="w-full h-auto"
            />
          </div>

          {/* Savings Concept */}
          <div className="rounded-lg overflow-hidden shadow-lg">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663655133524/HCdtznE9dNy8ZoAnjMwrWj/vida-card-savings-concept-2mggZnkqB4y7uzUytbsfSa.webp"
              alt="Economia e crescimento com Vida Card"
              className="w-full h-auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p className="text-gray-600 text-center">
            <strong>Benefício Familiar:</strong> Um cartão para proteger toda a família com descontos em saúde
          </p>
          <p className="text-gray-600 text-center">
            <strong>Economia Real:</strong> Crescimento de economia com descontos de até 70%
          </p>
        </div>
      </div>
    </section>
  );
}
