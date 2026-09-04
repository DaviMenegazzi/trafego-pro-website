# Dispatch — information_designer

## Missão
Você é o Information Designer (especialista 3 da equipe de redesenho do Pixel).
Seu objetivo é desenhar a arquitetura de informação completa, layout textual (wireframes estruturados em ASCII/markdown) e hierarquia visual para cada uma das 6 abas do módulo Pixel, respeitando a escala de 4px, o container `max-w-[1440px]`, e definindo os comportamentos responsivos nos breakpoints (1280px, 1440px, 1920px e mobile/tablet).

Seu diretório de trabalho exclusivo é:
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3`

Arquivos de entrada obrigatórios:
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\audit_report.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\handoff.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\handoff.md`
- `client/src/pages/EvolutionAdmin.tsx`

Entregáveis:
1. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md`
2. `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\handoff.md`

Conteúdo obrigatório dos wireframes e hierarquia:
- Estrutura macro da página:
  * Top Bar / Header unificado de produto (Eyebrow 'MÉTRICAS & ATRIBUIÇÃO WHATSAPP', Título 'Pixel', Badge de Status ativo, CTA 'Atualizar dados')
  * Sticky Scope Bar: Filtros de Unidade e Instância com controles rápidos
  * Segmented Navigation Bar: Abas (Operação, CRM, Atribuição Meta, Conversas, Origem & tags, Auditoria)
- Wireframes textuais detalhados para cada uma das 6 abas:
- Wireframes textuais detalhados para cada as 6 abas:
  1. **Operação**: Resumo executivo de métricas no topo (KPIs em grid de 4 colunas); eliminação de redundâncias de instâncias; painel de instâncias ativas à esquerda e formulário/status à direita.
  2. **CRM**: Header com estatísticas do funil (Total de leads, em negociação, fechados, taxa de conversão); Esteira horizontal de 7 colunas (w-[290px] shrink-0) com drag-and-drop e scroll interno.
  3. **Atribuição Meta**: KPIs de pareamento e correlação; tabela de atribuição com hierarquia visual clara, filtros por status e drawer/expand de detalhes.
  4. **Conversas**: Barra de busca com debounce visual, filtro por instância/status; lista densa de mensagens com identificador do lead, canal e timestamp em formato tabular/chat card.
  5. **Origem & tags**: Matriz de mapeamento de tags UTM/campanha para regras de roteamento comercial; formulário compacto e tabela de correlação.
  6. **Auditoria**: Log operacional cronológico denso estilo console/terminal com filtros por tipo de evento (webhook, erro, sinc, transição de lead).
- Mapa de responsividade: comportamento em 375px/768px (colapsado/empilhado), 1280px (layout denso, kanban com scroll horizontal), 1440px (desktop padrão) e 1920px (container centralizado com margens balanceadas).

## 2026-09-04T21:55:33Z
<USER_REQUEST>
Você é o Information Designer (especialista 3 da equipe de redesenho do Pixel).
Seu diretório de trabalho exclusivo é:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3

Você DEVE ler antes de iniciar:
1. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md
2. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md
3. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\audit_report.md
4. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ui_architect_m2\design_system_spec.md
5. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\DISPATCH.md
6. client/src/pages/EvolutionAdmin.tsx

Produza os wireframes textuais completos e arquitetura de informação em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md
e seu handoff em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\handoff.md

Cobrir minuciosamente:
- Arquitetura de informação macro (Header integrado, Sticky Scope Bar, Segmented Tabs).
- Wireframes textuais diagramados em ASCII/Markdown detalhando o layout bloco a bloco para todas as 6 abas (Operação, CRM, Atribuição Meta, Conversas, Origem & tags, Auditoria).
- Grid de 4px e proporções exatas para cada container.
- Eliminação das duplicações da aba Operação e reorganização hierárquica.
- Estrutura da esteira horizontal contínua de 7 colunas do CRM Kanban.
- Tabela de breakpoints responsivos (mobile/tablet, 1280px, 1440px, 1920px).
- Blindagem contra menções a "Evolution" e proibição de emojis.

Ao finalizar, envie uma mensagem com o resumo dos seus achados e confirme que os arquivos foram salvos.
</USER_REQUEST>
