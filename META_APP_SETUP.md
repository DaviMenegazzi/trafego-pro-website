# Ativação da Central de Publicações Meta

O calendário editorial, o fluxo OAuth e o processador de publicação já estão implementados. Para publicar de verdade, a Tráfego Pro precisa criar uma aplicação própria no **Meta for Developers** e configurar suas credenciais exclusivamente como segredos de ambiente.

## 1. Criar a aplicação

Crie uma aplicação no [Meta for Developers](https://developers.facebook.com/apps/), no tipo mais compatível com gestão de negócio e integrações de Páginas. Adicione os produtos necessários para **Facebook Login** e para a **Instagram Platform**. A conta que fizer a conexão OAuth deverá ter a tarefa `CREATE_CONTENT` na Página de destino e acesso ao Instagram profissional vinculado.

## 2. Configurar URLs de retorno

No produto de login, cadastre **somente** a URL exata abaixo em **Valid OAuth Redirect URIs** e informe `www.trafego.pro` em **App Domains**.

`https://www.trafego.pro/api/social/meta/callback`

Não cadastre links de pré-visualização, `localhost`, domínios alternativos ou qualquer URL com `http`. A Central de Publicações usa esse retorno HTTPS canônico, mesmo quando o utilizador abre a pré-visualização técnica.

## 3. Solicitar permissões necessárias

O módulo solicita somente as permissões necessárias para listar e publicar nas Páginas e contas Instagram profissional autorizadas: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic` e `instagram_content_publish`. Solicite App Review e, quando exigido pela Meta, a verificação da empresa antes de disponibilizar a integração para contas fora dos papéis de teste.

## 4. Inserir segredos protegidos

Depois de criar a aplicação, cadastre estes valores **exclusivamente** na área de segredos do projeto. Nunca use `.env`, `.project-config.json`, commits, mensagens de erro, nem código-fonte para esses valores.

| Variável | Origem | Uso |
|---|---|---|
| `META_APP_ID` | Painel da aplicação Meta | Identifica a aplicação no OAuth. |
| `META_APP_SECRET` | Painel da aplicação Meta | Troca o código OAuth por token no servidor. |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Segredo aleatório com ao menos 32 caracteres | Cifra tokens de Página e sessões temporárias antes da persistência SQL. |

## 5. Conectar e validar

Depois de inserir os segredos, abra `/publicacoes`, escolha **Conectar Página Meta**, autorize a conta, associe cada Página a uma unidade permitida e crie uma publicação de teste com conteúdo real autorizado. Em seguida, o processador agendado poderá ser ativado com uma tarefa recorrente protegida.

> O processador não está ativo nesta etapa. Ele só deve ser ativado depois de uma conexão real validada, para evitar publicações acidentais ou chamadas sem credenciais válidas.
