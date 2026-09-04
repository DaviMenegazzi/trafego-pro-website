# Handoff Report — M3 Information Designer

**Agent:** `information_designer_m3`  
**Milestone:** `M3: Information Design & Wireframes`  
**Deliverable Document:** `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md`  
**Target Codebase:** `client/src/pages/EvolutionAdmin.tsx` e componentes satélites  
**Canonical Reference:** `client/src/pages/SocialPublishingAdmin.tsx`, `client/src/components/AppLayout.tsx`  
**Status:** Completo / Pronto para M4 (Interaction Designer) e M5 (Frontend Implementer)

---

## 1. Observation

A partir da análise detalhada dos arquivos de entrada (`ORIGINAL_REQUEST.md`, `PROJECT.md`, `audit_report.md`, `design_system_spec.md`, `EvolutionAdmin.tsx` e `SocialPublishingAdmin.tsx`), foram observados os seguintes pontos estruturais e de layout:

### 1.1 Inversão e Fragmentação da Aba Operação
- Em `EvolutionAdmin.tsx:345-353`, a aba de Operação se iniciava com o formulário de cadastro de instâncias (`<form ... className="grid gap-3 rounded-xl border border-white/8 bg-black/15 p-4 md:grid-cols-[1fr_1fr_auto_auto]">`).
- Em `EvolutionAdmin.tsx:356`, os 4 cartões de KPIs executivos (*Eventos hoje*, *Contatos rastreados*, *A validar*, *Fechados*) eram renderizados apenas **abaixo** do formulário.
- Em `EvolutionAdmin.tsx:357`, uma segunda lista de instâncias era renderizada sob o título *"Instâncias monitoradas"*, gerando redundância direta com o bloco anterior.
- Em `EvolutionAdmin.tsx:358`, a tabela de contatos recebidos utilizava botões de classificação pequenos (`px-2.5 py-1.5`) com área de toque inferior a 32px de altura.

### 1.2 Quebra da Continuidade Sequencial no CRM Kanban
- Em `EvolutionAdmin.tsx:341`, o grid do pipeline estava configurado como:
  ```tsx
  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
  ```
  Isso forçava a quebra das 7 colunas sequenciais do funil comercial em duas linhas em resoluções de 1280px a 1440px (as etapas finais "Negociação", "Lead fechou" e "Lead perdido" ficavam abaixo da primeira linha).
- Em `EvolutionAdmin.tsx:339`, havia vazamento explícito do nome técnico:
  > *"A movimentação fica registrada no Supabase Evolution e nunca mistura contatos de instâncias fora do filtro atual."*
- Não havia campo de pesquisa ou filtro por nome/telefone no CRM, exigindo inspeção visual manual card por card.

### 1.3 Limitações nas Abas de Atribuição, Conversas, Origem e Auditoria
- **Atribuição Meta (`EvolutionAdmin.tsx:361`)**: Vazamento do termo *"quando a Evolution entrega um identificador Meta..."*. Células poluídas com IDs mono em cinza sem botão de cópia de um clique. Ausência de filtro por status de correspondência.
- **Conversas (`EvolutionAdmin.tsx:363`)**: Divisão rígida `lg:grid-cols-[340px_1fr]`. A lista de contatos não possuía campo de busca. O painel de mensagens não possuía auto-scroll para a última mensagem.
- **Origem & tags (`EvolutionAdmin.tsx:365-373`)**: Os 4 KPI cards superiores (*Meta verificado*, *Meta observado*, *Google Ads observado*, *Sem evidência*) eram puramente decorativos e não permitiam clique para filtrar a tabela. O token `metaCtwaClid` estourava a largura da célula quando longo.
- **Auditoria (`EvolutionAdmin.tsx:375`)**: O payload de atribuição era impresso em texto bruto `<pre>{JSON.stringify(event.attributionPayload, null, 2)}</pre>`, criando rolagens verticais desnecessárias.

---

## 2. Logic Chain

1. **Da Eliminação do "Painel Isolado" à Arquitetura do Shell Integrado:**
   - *Observação:* A navegação original continha cabeçalhos isolacionistas (`EvolutionAdmin.tsx:313`) e botões de fuga externa.
   - *Raciocínio:* Como o Pixel é o coração do rastreamento de anúncios e tráfego pago da plataforma, ele deve portar a identidade "Operations-Grade" compartilhada com `SocialPublishingAdmin.tsx`. Desenhamos o `PixelHeader` com eyebrow ciano corporativo, título Space Grotesk `text-3xl sm:text-4xl`, status badge pulsante e CTA de atualização com spinner.

2. **Da Usabilidade em Rolagem à Sticky Scope Bar:**
   - *Observação:* O seletor de unidade e instância (`EvolutionAdmin.tsx:318-332`) ficava no topo e sumia com o scroll, forçando o usuário a voltar ao início para alternar entre unidades.
   - *Raciocínio:* A barra foi projetada com fixação superior `lg:sticky lg:top-3 lg:z-20`, fundo `bg-[#090a0b]/85 backdrop-blur-md` e pílula de contagem rápida de instâncias e leads, permitindo controle contextual contínuo.

3. **Da Correção Semiótica ao Segmented Tabs:**
   - *Observação:* A aba ativa usava preenchimento sólido `bg-cyan-300 text-[#082124]`, idêntico a um botão CTA de envio.
   - *Raciocínio:* O padrão Linear/Vercel preconiza abas neutras em estilo de pílula (`bg-white/[.08] text-white`) com micro-indicador ciano inferior (`h-0.5 w-6 bg-cyan-300`), preservando a cor ciano sólida estritamente para o botão de ação "Atualizar dados".

4. **Da Racionalização da Aba Operação:**
   - *Observação:* KPIs vinham após o formulário e havia duas listas duplicadas de instâncias.
   - *Raciocínio:* Reorganizamos a hierarquia: (1) Resumo Executivo em 4 colunas no topo; (2) Grid split balanceado `xl:grid-cols-[1.5fr_1fr]` unificando o gerenciamento de instâncias à esquerda e o painel do webhook seguro à direita; (3) Tabela de Triagem Comercial na base com botões acessíveis de 36px de altura.

5. **Do Modelo Mental de Vendas à Esteira Horizontal do CRM:**
   - *Observação:* O grid quebrador de 4 colunas desorientava o fluxo sequencial do pipeline comercial.
   - *Raciocínio:* Funis comerciais de 7 estágios devem ser contínuos e lineares. Desenhamos um container com scroll horizontal suave (`overflow-x-auto`) composto por 7 colunas de largura fixa `w-[290px] shrink-0`, scroll interno por coluna (`max-h-[660px]`), drag handle dedicado, badges de origem enriquecidos e drawer/modal expansível de detalhes.

6. **Da Performance e Limpeza em Atribuição e Auditoria:**
   - *Observação:* Payloads JSON gigantescos e tabelas sem filtro criavam fricção operacional.
   - *Raciocínio:* Inserção de filtros rápidos por status e tipo de evento, truncamento inteligente de identificadores com botão "Copiar", e acordeão expansível para payloads de auditoria no console.

---

## 3. Caveats

- **Imutabilidade de Contratos de Dados e Lógica de Negócio:** Todas as rotas de API (`/api/evolution/*`), nomes de tabelas Supabase, tipos TypeScript e lógica de permissão de acesso (`canAccessEvolutionPanel`) foram mantidos intactos. As especificações de wireframe tratam estritamente da organização da informação, hierarquia visual e layout.
- **Especificação de Interação Dinâmica:** O comportamento exato de animação do drag-and-drop (shimmer, transições CSS e feedback de drop-zone) será refinado pelo especialista seguinte, `interaction_designer_m4`.
- **Implementação do Código:** Nenhuma alteração foi realizada diretamente em `client/src/pages/EvolutionAdmin.tsx` durante este milestone (M3), respeitando o papel de exploração e desenho conceitual. O código será gerado pelo `frontend_implementer_m5`.

---

## 4. Conclusion

A arquitetura de informação completa e os wireframes textuais detalhados foram elaborados e salvos com sucesso em:  
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md`

### Principais Ganhos Estruturais Entregues:
1. **Identidade Visual Integrada:** Fim do isolamento administrativo; alinhamento completo ao design language "Operations-Grade" da Tráfego Pro e container `max-w-[1440px]`.
2. **Eliminação de Redundâncias na Operação:** Unificação da lista de instâncias em layout split com o webhook seguro e elevação dos KPIs para o topo da página.
3. **Pipeline CRM Linear Contínuo:** Esteira de 7 colunas sequenciais com 290px de largura e campo de busca rápida integrado.
4. **Resolução de Violações de Marca e Acessibilidade:** Sanitização completa de todas as menções a "Evolution", eliminação absoluta de emojis e aplicação rigorosa da escala de 4px.
5. **Responsividade Garantida:** Matriz de adaptação detalhada para Mobile/Tablet, 1280px, 1440px e 1920px.

---

## 5. Verification Method

Para verificar de forma independente as especificações geradas:

1. **Inspeção do Arquivo de Wireframes:**
   ```powershell
   Get-Content "C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md" -TotalCount 120
   ```

2. **Verificação de Ausência do Termo "Evolution" na UI Projetada:**
   Verificar que a documentação sanitiza todas as menções textuais na UI visível (exceto nos paths técnicos de API):
   ```powershell
   Select-String -Path "C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\information_designer_m3\wireframes_and_hierarchy.md" -Pattern "Evolution"
   ```

3. **Verificação da Suíte de Testes do Projeto:**
   Garantir que a integridade do código e políticas continua válida:
   ```powershell
   npx vitest run
   ```
   *Critério de Invalidação:* Falhas nos testes unitários ou violações das regras do design system spec.
