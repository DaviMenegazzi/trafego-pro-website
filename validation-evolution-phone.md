# Validação administrativa do CRM Evolution

Data da validação: 15 de agosto de 2026.

- A rota administrativa `/api/evolution/overview` retorna `contactPhone` para leads autenticados como administradores.
- O pipeline em `/evolution`, na aba **CRM**, apresenta o telefone completo nos cartões do funil.
- O detalhe do contato apresenta o mesmo telefone completo, além das mensagens e da atribuição disponível.
- As demais telas operacionais continuam usando somente os últimos quatro dígitos do telefone.
- A suíte automatizada confirmou a persistência do campo `contact_phone` pela RPC `record_evolution_event` e a movimentação de etapas no Supabase Evolution isolado.

## Correção de usabilidade do pipeline

Data da validação: 15 de agosto de 2026.

- O pipeline passou a usar o `dnd-kit`, com cartões acessíveis, áreas de destino destacadas e proteção contra soltar no estágio atual ou em destinos inválidos.
- O grid responsivo substituiu a faixa horizontal fixa: os estágios quebram em linhas conforme a largura disponível e a página não apresenta overflow horizontal global.
- A validação no navegador confirmou `scrollWidth` de 1265 px em viewport de 1280 px, três cartões registrados no mecanismo de arrastar e os atributos acessíveis do `dnd-kit` no cartão.
- Não foi alterada a etapa de nenhum contato real durante a validação visual.
