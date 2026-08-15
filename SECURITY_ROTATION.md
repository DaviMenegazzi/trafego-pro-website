# Rotação após incidente de credenciais

Este documento não contém valores de chaves. Ele registra apenas as ações necessárias após a remoção de segredos do histórico Git.

## Estado da contenção

As branches `main` e `ajustes-dashboard` foram reescritas para remover a configuração sensível e referências históricas de credenciais. A automação diária de IA permanece pausada e não deve ser retomada até a conclusão das rotações aplicáveis.

## Credenciais que exigem ação

| Credencial ou acesso | Ação necessária | Estado antes de reativar a IA |
| --- | --- | --- |
| Senha do banco TiDB | Alterar a senha no painel TiDB Cloud e substituir `DATABASE_URL` e `DRIZZLE_DATABASE_URL` somente pelas variáveis protegidas do ambiente. | Obrigatório |
| Conta administrativa legada | Redefinir ou desativar a conta legada que existia no histórico. O acesso atual deve continuar exclusivamente no Supabase Auth. | Obrigatório se a conta ainda existir |
| Service role do Supabase Evolution | Gerar uma nova service role no projeto Supabase Evolution e substituir somente no armazenamento protegido do ambiente. | Obrigatório |
| Segredo Bearer do webhook Evolution | Gerar um novo segredo, atualizar o ambiente protegido e a configuração do webhook Evolution. | Obrigatório |
| `JWT_SECRET` do servidor | Gerar novo valor aleatório e atualizar exclusivamente no ambiente protegido. | Obrigatório |
| Chave OpenAI | A chave exposta foi revogada. Manter o agendamento pausado; quando desejado, cadastrar uma chave nova exclusivamente como segredo protegido e validar antes de retomar. | Obrigatório para reativação |

As chaves publishable do Supabase são destinadas ao cliente, mas as permissões RLS devem continuar revisadas. As credenciais AWS STS históricas já expiradas não devem ser reutilizadas.

## Sequência segura de retomada

1. Concluir as rotações acima fora do Git e fora de mensagens de chat.
2. Atualizar variáveis apenas pelo armazenamento protegido do projeto.
3. Executar `pnpm security:check`, `pnpm check`, `pnpm test` e `pnpm build`.
4. Validar o webhook Evolution com o novo Bearer.
5. Inserir a nova chave OpenAI protegida, testar a classificação e só então retomar o agendamento diário.
