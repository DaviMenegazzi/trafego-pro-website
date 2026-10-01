// Contato do suporte da Tráfego Pro dentro do painel (mesmo WhatsApp do site institucional).
export const SUPPORT_WHATSAPP_NUMBER = "5555999940634";

export function supportWhatsAppUrl(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function ga4LinkRequestUrl(unitName: string | null | undefined): string {
  const unit = unitName?.trim() ? ` da unidade ${unitName.trim()}` : "";
  return supportWhatsAppUrl(`Olá! Quero vincular a Landing Page${unit} ao Google Analytics na plataforma da Tráfego Pro.`);
}
