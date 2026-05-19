export default function Footer() {
  return (
    <footer className="bg-[#0f1b3c] text-white py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-bold font-poppins text-lg mb-4">
              Vida Card Tupanciretã
            </h3>
            <p className="text-gray-300 text-sm">
              Plano estratégico de tráfego pago para geração de conversas qualificadas no WhatsApp
            </p>
          </div>
          <div>
            <h3 className="font-bold font-poppins text-lg mb-4">
              Referências
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a href="https://saude.vidacard.med.br/tupancireta" target="_blank" rel="noopener noreferrer" className="hover:text-[#00a896] transition">
                  Landing Page Vida Card
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/vidacardtupancireta/" target="_blank" rel="noopener noreferrer" className="hover:text-[#00a896] transition">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/vidacardtupancireta/" target="_blank" rel="noopener noreferrer" className="hover:text-[#00a896] transition">
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://vidacard.med.br/" target="_blank" rel="noopener noreferrer" className="hover:text-[#00a896] transition">
                  Website Vida Card
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold font-poppins text-lg mb-4">
              Informações
            </h3>
            <p className="text-sm text-gray-300 mb-2">
              <strong>Vida Card é um cartão de descontos em saúde</strong>
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>✓ Não é um plano de saúde</li>
              <li>✓ Não é um cartão de crédito</li>
              <li>✓ Não é um cartão pré-pago</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2026 Vida Card. Todos os direitos reservados.
            </p>
            <div className="text-center md:text-right">
              <p className="font-poppins font-bold text-[#00a896]">
                Lucas Dorneles
              </p>
              <p className="text-gray-400 text-sm">
                Analista de Marketing
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
