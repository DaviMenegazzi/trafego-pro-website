# Login e Cadastro

Capturas: `img/02-login.png`, `img/02-login-mobile.png`, `img/02-login-erro.png`, `img/03-cadastro.png`.

## Login

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| — | Selo "● ACESSO SEGURO" (mono, CAIXA ALTA) | ✂️ | É o terceiro selo de segurança da tela ("Acesso seguro…", "Acesso protegido", "Ambiente seguro com criptografia"). Repetir não aumenta confiança; parece template. |
| — | Rótulos "USUÁRIO OU E-MAIL", "SENHA" em CAIXA ALTA | 🔁 | Rótulo em frase ("Usuário ou e-mail") lê mais rápido. CAIXA ALTA fica só para sobrelinhas curtas. |
| 1 | Campo usuário (46px, raio 16) | 🔁 | Padronizar em 44px (campo grande de formulário público). |
| 2 | Campo senha | 🔁 | Idem. |
| 3 | "Ver senha" (só ícone, `tabIndex=-1`, `title=`) | 🔁 | **Fora da ordem do teclado** de propósito, e a dica é `title=`. Deixar focável, com `aria-label` e `aria-pressed`. |
| 4 | Checkbox nativo "Lembrar meu usuário" | 🔁 | Checkbox nativo de 16px com cor do navegador. Usar `Checkbox`. |
| — | "Acesso protegido" (texto solto à direita) | ✂️ | Não é ação nem informação. |
| 5 | "Acessar Painel" | ✅ ⭐ | Ação principal óbvia, largura total, 48px → 44px. |
| 6 | "Solicitar cadastro" | ✅ | — |
| — | "Ambiente seguro com criptografia e controle de acesso." | ✂️ | Selo genérico. |
| 7 | "Voltar ao site" (11px) | ✅ | Aumentar para 12px. |
| — | Coluna esquerda com 3 cartões de recursos | ✅ | Some no celular, correto. "Performance em tempo real" é promessa que o produto não cumpre (há cache e fallback para banco) → "Performance da sua rede, num só lugar." |

## Cadastro

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 1–4, 6 | Campos (38px, raio 16) | 🔁 | 38px aqui e 46px no login. Mesmo tipo de tela, mesma altura: 44px. |
| 5, 7 | Olhos de senha (**14×14px**, sem rótulo) | 🔁 | Alvo de 14px e sem nome acessível. `IconButton` 32px com `aria-label`. |
| 8 | "Solicitar Acesso" | ✅ ⭐ | 40 → 44px. |
| 9 | "Fazer login" | ✅ | — |
