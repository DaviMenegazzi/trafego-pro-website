# Registro de migração — Banco de Talentos Vida Card

## Ambiente aplicado

| Item | Registro |
|---|---|
| Projeto Supabase | `trafegopro-analise` (`mppsvwqjmlvgsakqtpiw`) |
| Finalidade | Persistência isolada de formulários, candidaturas e currículos do Banco de Talentos |
| Data da execução | 26 de agosto de 2026 |
| Resultado no SQL Editor | **Success. No rows returned** |

## Objetos criados

A migração `supabase-talent-bank-schema.sql` criou as tabelas `talent_forms`, `talent_form_fields` e `talent_submissions`, seus índices de consulta, gatilhos de atualização e o bucket privado `talent-resumes` para currículos PDF/DOCX de até 5 MB.

As tabelas mantêm RLS ativado e não recebem políticas de acesso público direto. O servidor valida a sessão e a unidade autorizada no Supabase da dashboard antes de acessar o Supabase separado com a credencial de serviço existente. Os currículos são disponibilizados ao gestor somente por URLs assinadas de curta duração.

## Validações locais

O projeto foi validado com `pnpm check`, `pnpm test` e `pnpm build`. A suíte contabilizou **132 testes aprovados** e **1 teste ignorado** no momento da validação. O build de produção concluiu sem erros.
