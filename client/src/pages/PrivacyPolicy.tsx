import { useEffect } from "react";
import { Link } from "wouter";
import { openConsentPreferences } from "@/lib/consent";

// Pedidos de titulares chegam pelo WhatsApp. Quando houver CNPJ e e-mail do
// encarregado definidos, incluí-los na seção "Quem somos".
const CONTACT_URL = "https://wa.me/55999940634";
const UPDATED_AT = "25 de setembro de 2026";

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Política de Privacidade — Tráfego Pro";
  }, []);

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-14 text-zinc-300">
      <article className="mx-auto max-w-2xl space-y-8 text-[15px] leading-7 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">← Voltar ao início</Link>
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-100">Política de Privacidade e Cookies</h1>
          <p className="mt-2 text-sm text-zinc-500">Última atualização: {UPDATED_AT}</p>
        </header>

        <section>
          <h2>1. Quem somos</h2>
          <p>
            A Tráfego Pro é a controladora dos dados pessoais tratados neste site, nos termos da Lei Geral de
            Proteção de Dados (Lei 13.709/2018 — LGPD).
          </p>
        </section>

        <section>
          <h2>2. Quais dados coletamos e por quê</h2>
          <ul>
            <li>
              <strong>Navegação (cookies de medição e anúncios):</strong> páginas visitadas, dispositivo, origem da
              visita e identificadores de cookie. Finalidade: medir o desempenho do site e das campanhas. Base legal:
              consentimento (art. 7º, I). Só coletamos depois que você clica em “Aceitar”, envia uma candidatura ou entra na plataforma com login.
            </li>
            <li>
              <strong>Candidaturas (Trabalhe Conosco):</strong> os dados pedidos no formulário (como nome, contato e
              currículo). Finalidade: recrutamento e seleção. Base legal: consentimento (art. 7º, I) e procedimentos
              preliminares a contrato de trabalho (art. 7º, V). Guardados por até 180 dias e depois anonimizados.
            </li>
            <li>
              <strong>Cadastro na plataforma:</strong> nome, e-mail, cargo e senha (armazenada criptografada).
              Finalidade: dar acesso ao painel. Base legal: execução de contrato (art. 7º, V). Mantidos enquanto a conta
              estiver ativa.
            </li>
            <li>
              <strong>Contato por WhatsApp:</strong> as mensagens que você nos envia, usadas apenas para responder e
              apresentar nossos serviços.
            </li>
          </ul>
          <p>Não vendemos dados pessoais e não pedimos dados além do necessário para cada finalidade.</p>
        </section>

        <section>
          <h2>3. Cookies</h2>
          <ul>
            <li><strong>Essenciais:</strong> mantêm sua sessão e suas preferências. Sempre ativos.</li>
            <li>
              <strong>Medição:</strong> Google Analytics 4, carregado pelo Google Tag Manager. Só ativos com seu
              consentimento.
            </li>
            <li>
              <strong>Publicidade:</strong> tags de conversão e remarketing das plataformas de anúncio configuradas no
              Google Tag Manager (como Google Ads e Meta). Só ativos com seu consentimento.
            </li>
          </ul>
          <p>
            Você pode mudar sua escolha a qualquer momento:{" "}
            <button type="button" onClick={openConsentPreferences} className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200">
              abrir preferências de cookies
            </button>
            .
          </p>
        </section>

        <section>
          <h2>4. Com quem compartilhamos</h2>
          <p>
            Com fornecedores que operam o serviço em nosso nome: hospedagem (Hostinger), banco de dados e
            armazenamento (Google Firebase e Supabase), Google (Analytics/Tag Manager) e plataformas de anúncio, quando
            há consentimento. Alguns desses fornecedores processam dados fora do Brasil, com as salvaguardas previstas
            nos arts. 33 a 36 da LGPD.
          </p>
        </section>

        <section>
          <h2>5. Seus direitos</h2>
          <p>
            Você pode pedir confirmação de tratamento, acesso, correção, anonimização, portabilidade, exclusão dos dados
            e revogar o consentimento (art. 18 da LGPD). Envie o pedido pelo{" "}
            <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200">WhatsApp</a>; respondemos em até 15
            dias. Você também pode reclamar à ANPD (gov.br/anpd).
          </p>
        </section>

        <section>
          <h2>6. Segurança</h2>
          <p>
            Usamos HTTPS, controle de acesso por perfil e registro de acesso a dados pessoais. Se houver incidente que
            possa causar risco relevante, comunicaremos você e a ANPD.
          </p>
        </section>

        <section>
          <h2>7. Alterações</h2>
          <p>Quando esta política mudar, a data no topo será atualizada.</p>
        </section>
      </article>
    </main>
  );
}
