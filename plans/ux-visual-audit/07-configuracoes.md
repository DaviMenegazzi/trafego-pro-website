# Configurações

Capturas: `img/10-configuracoes.png`, `img/10-configuracoes-seguranca.png`.

Tela simples e correta. Os ajustes são de acabamento.

## Perfil

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Título com ícone de engrenagem verde (20px) | 🔁 | `PageHeader` igual ao resto (as outras telas não têm ícone no título). |
| 10–11 | Abas Perfil / Segurança | ✅ | Sublinhado de aba é familiar (apple-design: familiaridade). |
| 12 | Nome | ✅ | 38 → 36px. |
| 13 | E-mail desabilitado com a dica **só em `title=`** ("Para trocar o e-mail, fale com um administrador") | 🔁 | A informação existe mas ninguém vê. Texto de ajuda visível abaixo do campo. |
| 14 | "Salvar" | ✅ | Desabilitado enquanto não houver alteração; toast ao salvar. |

## Segurança

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 12, 14, 16 | Senha atual, nova, confirmar | ✅ | — |
| 13, 15, 17 | Olhos (**14×14px**, sem rótulo) — **um clique revela as três senhas** | 🔁 | Um estado compartilhado (`showPwd`) para os três campos: revelar a nova senha revela também a atual. Um olho por campo, 32px, com `aria-label`. |
| — | Regras de senha | 🔁 | Não há indicação do mínimo exigido antes do erro. Texto de ajuda sob "Nova senha". |
| 18 | "Alterar senha" | ✅ | — |
