# Home (site público)

Capturas: `img/01-home.png`, `img/01-home-mobile.png`, `img/01-home-light.png`.

A home é a tela mais madura do produto: tipografia grande com tracking negativo (apple-design §15), poucos elementos, um só tom. As decisões são de ajuste.

| # | Elemento | Decisão | Por quê |
| --- | --- | --- | --- |
| 1 | Marca "TRÁFEGO PRO" | ✅ | — |
| 2–5 | Âncoras Sobre, Serviços, Estratégia, Contato | ✅ | Ok no desktop. No celular **somem sem substituto** (`hidden md:flex`); como a página é uma rolagem só, é aceitável, mas o visitante do celular perde o atalho para "Contato". |
| 6 | "Começar Agora" (pílula branca, 40px) | ✅ | Ação principal clara. |
| — | Acesso para clientes | ⭐ novo | Não existe caminho da home para `/login`. Clientes da agência precisam digitar a URL. Adicionar "Área do cliente" como link fantasma ao lado de "Começar Agora" (e visível no celular). |
| 7 | "Entrar em contato" (hero) | ✅ | — |
| 8 | "Saiba mais" | ✅ | — |
| — | Setas ↗ nos cartões de Serviços (só no hover) | ✂️ | A seta sugere link, mas o cartão não é clicável. Familiaridade (apple-design): coisas que parecem iguais devem se comportar igual. |
| — | Números "+500", "+50M", "98%" | 🔁 | Fixos no código, sem fonte. Ou vêm com contexto verificável ("desde 2021", "fonte: clientes ativos"), ou saem. **Decisão do negócio** — registrado como pendência, não alterado sem confirmação. |
| — | Faixa de logos (marquee infinito, `opacity-50 grayscale`) | ✅ | Ok. Respeitar `prefers-reduced-motion` (hoje anima sempre). |
| 9 | "Falar com a Tráfego Pro" | ✅ | — |
| 10 | "WhatsApp →" no rodapé | ✅ | — |

Esboço do topo:

```
TRÁFEGO PRO        Sobre  Serviços  Estratégia  Contato        Área do cliente  (Começar agora)
```
