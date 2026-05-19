export default function HeroSection() {
  return (
    <section 
      className="relative w-full h-96 md:h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663655133524/HCdtznE9dNy8ZoAnjMwrWj/vida-card-hero-background-RuE2X4fRo3SUNrbZyky5rw.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f1b3c]/80 to-[#0f1b3c]/40"></div>
      
      {/* Content */}
      <div className="container relative z-10 flex items-center">
        <div className="max-w-2xl">
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-[#c4d600] text-[#0f1b3c] rounded-full text-sm font-bold">
              ESTRATÉGIA DE TRÁFEGO PAGO
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-poppins text-white mb-4 leading-tight">
            Vida Card Tupanciretã
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 font-inter mb-8">
            Plano de ações práticas para Google Ads, Meta Ads e criativos comerciais com foco em WhatsApp
          </p>
          <p className="text-lg text-gray-200 font-inter">
            Gerar conversas qualificadas • Economia real • Uso imediato
          </p>
        </div>
      </div>
    </section>
  );
}
