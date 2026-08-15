# Validação administrativa do CRM Evolution

Data da validação: 15 de agosto de 2026.

- A rota administrativa `/api/evolution/overview` retorna `contactPhone` para leads autenticados como administradores.
- O pipeline em `/evolution`, na aba **CRM**, apresenta o telefone completo nos cartões do funil.
- O detalhe do contato apresenta o mesmo telefone completo, além das mensagens e da atribuição disponível.
- As demais telas operacionais continuam usando somente os últimos quatro dígitos do telefone.
- A suíte automatizada confirmou a persistência do campo `contact_phone` pela RPC `record_evolution_event` e a movimentação de etapas no Supabase Evolution isolado.

