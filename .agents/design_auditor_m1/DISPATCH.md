# Dispatch — design_auditor

## Missão
Você é o Design Auditor da equipe de Redesenho Visual do Módulo Pixel (/pixel) na plataforma Tráfego Pro.

Seu diretório de trabalho é:
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1`

Leia os arquivos de contexto:
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md`
- `C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md`

Investigue os arquivos-chave do projeto:
- `client/src/pages/EvolutionAdmin.tsx` (código atual do módulo Pixel)
- `client/src/pages/SocialPublishingAdmin.tsx` (referência visual canônica da dashboard)
- Páginas da dashboard em `client/src/pages/`
- Componentes em `client/src/components/ui/`

Produza um diagnóstico completo e estruturado em:
`C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\audit_report.md`
e seu `handoff.md` contendo:
1. Inventário de problemas de UI/UX atuais em EvolutionAdmin.tsx
2. Análise detalhada aba por aba (Operação, CRM, Atribuição Meta, Conversas, Origem & tags, Auditoria)
3. Elementos que dão aspecto de "painel administrativo isolado" vs dashboard integrada
4. Inconsistências de densidade, tipografia, bordas e superfícies em comparação com SocialPublishingAdmin.tsx
5. Problemas de contraste WCAG AA e legibilidade no tema dark

## 2026-09-04T21:49:03Z
Você é o Design Auditor (especialista 1 da equipe de redesign do Pixel).
Seu diretório de trabalho exclusivo é:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1

Você DEVE ler antes de tudo:
1. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\ORIGINAL_REQUEST.md
2. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\PROJECT.md
3. C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\DISPATCH.md

Investigue detalhadamente o código:
- client/src/pages/EvolutionAdmin.tsx (estado atual)
- client/src/pages/SocialPublishingAdmin.tsx (referência visual padrão da dashboard)
- client/src/components/ui/ (componentes existentes)

Produza o relatório de auditoria detalhado em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\audit_report.md
e seu handoff em:
C:\Users\Davi Menegazzi\Desktop\Projetos Dev\Website Tráfego Pro\.agents\design_auditor_m1\handoff.md

Cobrir minuciosamente:
1. Diagnóstico de consistência com o restante da dashboard (#090a0b, bg-white/[.025], border-white/8, acentos cyan-300 e halo, tipografia Space Grotesk light / Inter 300, uppercase tracking-[.18em]).
2. Análise profunda das 6 abas (Operação, CRM, Atribuição Meta, Conversas, Origem & tags, Auditoria).
3. Problemas de contraste WCAG AA, hierarquia visual, espaçamento, densidade da informação.
4. Pontos de atrito no Kanban CRM (DnD), tabelas, filtros e controles de instância/unidade.
5. Presença de menções textuais indevidas a "Evolution" na UI visível ao usuário.
6. Recomendações diretas para o ui_architect e information_designer.

Ao finalizar, envie uma mensagem com o resumo dos seus achados e confirme que os arquivos foram salvos.
