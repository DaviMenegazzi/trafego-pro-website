export default function Footer() {
  return (
    <footer className="bg-[#1FBD8F] text-white py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <img 
                src="/manus-storage/vida-card-logo-small_cc56e0a9.png"
                alt="Vida Card Logo"
                className="h-16 w-auto"
              />
            </div>
            <p className="text-green-50 text-sm">
              Plano estratégico de tráfego pago para geração de conversas qualificadas no WhatsApp
            </p>
          </div>
          <div>
            <h3 className="font-bold font-poppins text-lg mb-4">
              Referências
            </h3>
            <ul className="space-y-2 text-sm text-green-50">
              <li>
                <a href="https://saude.vidacard.med.br/tupancireta" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Landing Page Vida Card
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/vidacardtupancireta/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/vidacardtupancireta/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://vidacard.med.br/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Website Vida Card
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold font-poppins text-lg mb-4">
              Informações
            </h3>
            <p className="text-sm text-green-50 mb-2">
              <strong>Vida Card é um cartão de descontos em saúde</strong>
            </p>
            <ul className="text-xs text-green-100 space-y-1">
              <li>✓ Não é um plano de saúde</li>
              <li>✓ Não é um cartão de crédito</li>
              <li>✓ Não é um cartão pré-pago</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-green-400 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-green-100 text-sm">
              © 2026 Vida Card. Todos os direitos reservados.
            </p>
            <div className="text-center md:text-right">
              <p className="font-poppins font-bold text-white">
                Lucas Dorneles
              </p>
              <p className="text-green-100 text-sm">
                Analista de Marketing
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
