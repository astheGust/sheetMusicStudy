# Cadenza

Dashboard de partituras feito com Next.js, React e TypeScript. A biblioteca começa vazia.

## Conta e autenticação

O acesso usa Supabase Auth: é possível criar conta, entrar, sair, solicitar redefinição de senha e editar o nome de exibição ou a senha em **Perfil**. Configure `NEXT_PUBLIC_SUPABASE_URL` com a URL HTTPS do projeto e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a chave pública (publishable/anon) em `.env`. Nunca use a chave `service_role` no navegador.

Para a busca visual de partituras do MuseScore, configure `SERP_API_KEY` no ambiente do servidor (por exemplo, `.env.local`). Essa chave não deve receber o prefixo `NEXT_PUBLIC_`; as consultas passam pela rota server-side `/api/musescore-search`, que limita resultados a 15 e links ao domínio do MuseScore.

O app espera que o schema, as tabelas e as políticas RLS necessárias já estejam configurados no projeto Supabase. Configure as URLs de redirecionamento de autenticação no painel do Supabase para os endereços usados pelo app, incluindo o endereço local de desenvolvimento.

Para habilitar **Excluir conta** no perfil, configure `SUPABASE_SERVICE_ROLE_KEY` como variável somente do servidor no `.env.local` (desenvolvimento) e no ambiente de deploy. Use a chave `service_role`/secret do projeto e nunca a prefixe com `NEXT_PUBLIC_` nem a exponha no navegador. A rota reautentica a pessoa por e-mail e senha antes de excluir a conta e seus dados associados.

Com login, partituras, status personalizados, pastas, vínculos e anotações são carregados e sincronizados com o Supabase, protegidos pelas políticas RLS por usuário. No primeiro acesso, a pessoa escolhe nomes e cores dos status; depois pode alterá-los no **Quadro de Estudos**. A paleta oferece nove cores. Um status com partituras não pode ser excluído; mova essas partituras para outra coluna antes. O `localStorage` conserva uma cópia separada para cada conta como cache/debug. PDFs permanecem no IndexedDB do navegador: o banco salva somente a referência local, portanto o arquivo não fica disponível em outros dispositivos.

É possível navegar e consultar a biblioteca sem entrar. Para adicionar ou alterar partituras, pastas, status e anotações, ou para gravar um PDF, é necessário estar autenticado; ao tentar uma dessas ações, o app abre a tela de login ou cadastro.

## Partituras do MuseScore

Cole uma URL de partitura do MuseScore na busca e pressione Enter para abrir a versão incorporada no dashboard. Também é possível pesquisar pelo nome da música, selecionar várias opções visuais do MuseScore e abrir os detalhes/embeds antes de salvar. São aceitos links numéricos (`/user/.../scores/...`) e links de artista/título (`/artista/titulo`); o app normaliza ambos para a rota `/embed`. Se o embed não responder ou não mostrar a partitura, use **A partitura não apareceu?** para exibir as opções de tentar novamente e abrir o link original. Informe título, compositor/artista e pasta(s) antes de salvar na conta autenticada.

As anotações são salvas com data e hora e podem ser editadas ou excluídas.

## Pastas

Crie, renomeie e exclua pastas na página **Todas as Partituras**. Na página de detalhes de uma partitura, informe compositor ou artista e marque as pastas em que deseja organizá-la. Remover uma partitura de uma pasta não a exclui da biblioteca; a exclusão definitiva está disponível somente em **Todas as Partituras**.

## Upload de partituras em PDF

Use **PDF** na busca para carregar um arquivo sem tentar verificar se seu conteúdo é uma partitura. Informe o título e, opcionalmente, compositor/artista e pastas (que também podem ser criadas durante o cadastro). O arquivo fica no IndexedDB do navegador e é exibido na página de estudo; o catálogo local guarda os metadados e a referência necessária para localizar o arquivo neste navegador.

## Estudo

Na página de estudo, selecione um dos estados definidos na personalização da conta e registre anotações para manter o histórico da partitura. A sessão não tem cronômetro nem metrônomo.
## Requisitos

- Node.js 20.9 ou superior
- pnpm 12.3.4

Se ainda não tiver pnpm instalado, instale pelo CMD ou PowerShell:

```bash
npm install --global pnpm@12.3.4
```

## Desenvolvimento

Na pasta do projeto, instale as dependências e inicie o servidor:

```bash
pnpm install
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador. O servidor atualiza a página automaticamente quando os arquivos são alterados. Para encerrá-lo, pressione `Ctrl+C` no terminal.

## Verificações

```bash
pnpm typecheck
pnpm build
```
