# Melhorias no fluxo de captação de dados do Supabase

**Autor:** Manus AI  
**Escopo:** dashboard Tráfego Pro, dados de anúncios Meta Ads e controle de acesso por unidade.  
**Data:** 14 de agosto de 2026

## Síntese executiva

O fluxo atual já separa a dashboard da origem de métricas por meio de rotas do servidor e utiliza `client_id` como chave de isolamento. A principal fragilidade identificada era permitir uma consulta de anúncios sem unidade explícita e manter uma rota de fallback dependente de uma view que não documentava `client_id`. A correção aplicada exige uma unidade, valida a permissão do usuário no servidor e utiliza a tabela de origem como contingência enquanto a view é atualizada.[1] [2]

Para evoluir a captação com previsibilidade, o próximo passo não é aumentar a quantidade de consultas na interface, mas formalizar o pipeline de ingestão: dados brutos idempotentes, normalização, execução rastreável e agregados próprios para leitura. Isso reduz duplicidade, divergência entre telas e investigações manuais quando a Meta atualizar métricas retroativamente.

| Prioridade | Melhoria | Impacto esperado | Ação recomendada |
|---|---|---|---|
| P0 | Tornar `client_id` obrigatório em toda métrica de anúncios | Garante isolamento por unidade em consultas, views e RPCs | Aplicar a revisão da view `vw_meta_ads_offer_ads` e validar a presença da coluna na produção.[3] |
| P0 | Implementar ingestão idempotente | Evita linhas duplicadas em reprocessamentos | Criar chave única por conta, anúncio e data; usar `upsert` no carregamento. |
| P0 | Criar registro de execuções de sincronização | Permite saber quando e por que uma unidade ficou desatualizada | Criar tabela `sync_runs` com origem, janela consultada, início/fim, status, contagens e erro resumido. |
| P1 | Separar dado bruto de camada analítica | Preserva rastreabilidade sem sobrecarregar a dashboard | Manter payload bruto em staging e alimentar tabelas normalizadas/agregadas. |
| P1 | Instituir verificações de qualidade | Detecta erros antes de chegarem aos KPIs | Validar chaves, datas, valores não negativos, moeda, cobertura mínima e frescor por unidade. |
| P1 | Consolidar o contrato de leitura | Reduz diferenças entre RPC, view e fallback | Definir uma única RPC ou endpoint versionado para a tela de anúncios. |
| P2 | Medir desempenho e volume | Mantém a tela responsiva com histórico crescente | Criar índices compostos e agregar o histórico diário antes da camada de apresentação. |
| P2 | Ampliar observabilidade operacional | Facilita suporte e auditoria | Expor um status por unidade com última sincronização, linhas recebidas e alertas de anomalia. |

## Arquitetura de captação recomendada

O pipeline deve receber os dados da origem em uma tabela de *staging* ou de eventos brutos, sem alterar a informação recebida. Cada lote deve portar uma identidade de execução, a janela de datas consultada e a data de recebimento. Após a validação, um processo de normalização transforma esses registros em fatos analíticos com `client_id`, identificadores da conta, campanha, conjunto e anúncio, além de suas métricas diárias.

> **Princípio recomendado:** a dashboard deve consultar tabelas ou agregados preparados para leitura; ela não deve depender de transformar dados vindos da API da Meta no momento da navegação.

Na camada de apresentação, uma única função versionada — por exemplo, `fn_offers_by_period_v1` — deve devolver o contrato consumido pela aba de anúncios. O contrato deve incluir `client_id`, intervalo coberto, `synced_at`, métricas e campos de classificação. A view pode continuar útil para análises SQL, mas não deve ser o único caminho de contingência do produto.

| Camada | Responsabilidade | Dados mínimos | Critério de aceite |
|---|---|---|---|
| `sync_runs` | Auditoria do lote | `id`, origem, `client_id`, janela, status, contagens, erro, timestamps | Cada sincronização possui registro terminal: sucesso, parcial ou falha. |
| `meta_ads_raw` | Preservação do retorno da origem | `sync_run_id`, payload JSON, identificador externo, recebido em | Permite reprocessar sem nova chamada à origem. |
| `meta_ads_offers` | Fato normalizado por anúncio/período | `client_id`, IDs Meta, datas, métricas, `synced_at` | Chave única impede duplicação no reprocessamento. |
| Agregados/RPC | Leitura rápida pela dashboard | Métricas consolidadas, filtros e classificação | Resultado consistente para uma única unidade e período. |

## Controles essenciais de confiabilidade

O primeiro controle é a idempotência. Para dados diários, uma combinação como `client_id`, `account_id`, `ad_id` e `date_start` normalmente deve identificar a mesma observação lógica; o processo deve atualizar essa linha quando a origem recalcular uma métrica. Quando a granularidade for por período, a chave deve refletir explicitamente esse período. A escolha final precisa ser confirmada conforme o formato real recebido da Meta.

O segundo controle é a qualidade. Antes de promover um lote, o processo deve bloquear ou sinalizar: ausência de `client_id`, IDs de anúncio vazios, datas fora da janela solicitada, valores negativos onde não são permitidos e discrepâncias de cobertura. Um exemplo simples de alerta é quando a quantidade de anúncios ativos de uma unidade cai abruptamente ou quando não existe sincronização bem-sucedida nas últimas 24 horas.

O terceiro é a segurança. Embora o servidor já valide o acesso da pessoa usuária para as consultas de anúncios, as políticas RLS do Supabase devem reproduzir a mesma regra de isolamento sempre que clientes com sessão de usuário forem utilizados. Chaves de serviço devem permanecer exclusivamente no servidor; o código atual prevê esse modo e, portanto, requer auditoria periódica de quais rotas o utilizam.[4]

## Plano de implementação sugerido

| Fase | Entrega | Dependência | Resultado observável |
|---|---|---|---|
| 1 | Aplicar a view revisada com `client_id` e confirmar a RPC de anúncios | Acesso ao SQL Editor do Supabase | A consulta filtrada por unidade não cai no fallback. |
| 2 | Criar `sync_runs` e padronizar o identificador de lote | Definição da rotina que extrai dados da Meta | Cada atualização passa a ter status e diagnóstico. |
| 3 | Adicionar chave única e `upsert` para fatos de anúncios | Confirmação da granularidade dos dados | Reexecuções não duplicam métricas. |
| 4 | Implementar validações e alertas de frescor | Dados históricos mínimos | Operação identifica atrasos e anomalias antes da visualização do cliente. |
| 5 | Consolidar leitura em uma RPC versionada e índices de consulta | Estabilização da camada normalizada | Menos acoplamento e melhor tempo de resposta. |

## Observações de implementação já realizadas

A aplicação agora persiste uma unidade selecionada válida, apresenta um dropdown quando há mais de uma opção e não consulta anúncios sem `clientId`. A API bloqueia solicitações sem unidade ou fora das permissões do token. A rota de fallback também consulta a tabela de origem filtrada por `client_id` caso a view legada ainda não tenha sido atualizada, preservando o isolamento enquanto a migração SQL é executada.[1] [2] [3]

Na área de usuários e permissões, cada acesso passou a conter o identificador da concessão e os metadados da unidade. Isso permite exibir a unidade associada ao acesso e revogar exatamente o registro de permissão selecionado, em vez de tentar remover pelo identificador do cliente.[1]

## Referências internas

[1]: [Rotas da dashboard e contratos de acesso](server/index.ts)
[2]: [Regra testável de autorização de unidade](server/metricsAccess.ts)
[3]: [Definição da view de anúncios](db/vw_meta_ads_offer_ads.sql)
[4]: [Configuração da integração Supabase no servidor](server/supabase.ts)
