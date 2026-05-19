export default function Header() {
  return (
    <header className="vida-hero py-12 md:py-16">
      <div className="container">
        <div className="flex flex-col gap-2 mb-4">
          <div className="vida-badge vida-badge-accent w-fit">
            IMPLANTAÇÃO
          </div>
        </div>
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-poppins mb-4 leading-tight">
            VIDA CARD TUPANCIRETÃ
            <span className="block vida-text-teal">| TRÁFEGO PRO</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-100 font-inter">
            Plano de ações práticas para Google Ads, Meta Ads e criativos comerciais
          </p>
        </div>
      </div>
    </header>
  );
}
