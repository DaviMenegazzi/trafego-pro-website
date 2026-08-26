# Banco de Talentos — Supabase separado

## Decisão de arquitetura

O Banco de Talentos ficará no **projeto Supabase separado que já atende o Evolution**. Esse banco armazenará somente formulários, candidaturas, anexos privados e configurações de recrutamento. O Supabase da dashboard continuará como a única fonte de identidade, sessão e autorização por unidade.

| Responsabilidade | Origem | Regra |
|---|---|---|
| Login, papel e unidades permitidas | Supabase da dashboard | O servidor conserva a sessão e os `allowedClientIds` já emitidos no login. |
| Formulários, campos e candidatos | Supabase separado do Evolution | O servidor consulta e grava apenas após conferir a unidade da sessão. |
| Currículos | Bucket privado `talent-resumes` no Supabase separado | O arquivo é aberto somente por URL assinada de curta duração. |
| Unidade nos dados de recrutamento | `client_id` lógico | É o mesmo UUID de `clients.id` da dashboard, sem FK entre projetos e sem duplicação de usuários. |

> Como os dois bancos são independentes, a proteção não pode depender de uma política RLS que faça *join* com `user_client_access`. As tabelas de recrutamento permanecem com RLS ativado e sem políticas públicas; somente o backend, autenticado com a service role do projeto separado, acessa os dados depois de validar a sessão da dashboard e a unidade solicitada.

## Fluxo de autorização

1. A pessoa candidata abre uma rota pública pelo `public_slug` e envia uma candidatura ao servidor.
2. O servidor confirma que o formulário está publicado e associa a candidatura ao `client_id` pré-configurado.
3. Um gestor entra pela autenticação existente da Tráfego Pro.
4. O servidor compara o `client_id` solicitado contra as unidades permitidas no token da dashboard antes de listar, alterar, exportar ou assinar currículos.
5. As rotas públicas nunca retornam candidaturas, anexos, e-mails, telefones ou dados de RH.
