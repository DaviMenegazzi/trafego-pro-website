export default function HeroSection() {
  return (
    <section 
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1FBD8F] to-[#17A577]"
    >
      {/* Decorative wave background */}
      <div className="absolute inset-0 opacity-10">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,50 Q300,0 600,50 T1200,50 L1200,120 L0,120 Z" fill="white" />
        </svg>
      </div>
      
      {/* Content */}
      <div className="container relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-3xl">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src="/manus-storage/vida-card-logo_d2bca5b5.png"
              alt="Vida Card Logo"
              className="h-32 w-auto"
            />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold font-poppins text-white mb-6 leading-tight">
            VIDA CARD TUPANCIRETÃ
          </h1>
          
          <div className="mb-8">
            <span className="inline-block px-6 py-3 bg-[#FF8C42] text-white rounded-full text-sm font-bold">
              TRÁFEGO PRO | IMPLANTAÇÃO
            </span>
          </div>
          
          <p className="text-xl md:text-2xl text-white font-inter mb-6 leading-relaxed">
            Plano de ações práticas para Google Ads, Meta Ads e criativos comerciais
          </p>
          
          <p className="text-lg text-white/90 font-inter">
            Gerar conversas qualificadas • Economia real • Uso imediato
          </p>
        </div>
      </div>
    </section>
  );
}
