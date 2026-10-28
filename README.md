# Cadenza

Dashboard de partituras feito com Next.js, React e TypeScript. A biblioteca começa vazia; os dados adicionados são salvos no armazenamento local do navegador.

## Partituras do MuseScore

Cole uma URL de partitura do MuseScore na busca e pressione Enter para abrir a versão incorporada no dashboard. Informe um título obrigatório e selecione **Adicionar e estudar** para salvar a partitura na biblioteca e abrir a sessão de estudo.

`lib/data.ts` define os tipos e valida/normaliza a URL, gerando a URL `/embed`. `lib/store.tsx` gerencia a biblioteca e persiste as partituras adicionadas no `localStorage` deste navegador. Esse armazenamento é provisório e local ao navegador; ainda não associa os dados a uma conta. A futura integração com Supabase poderá substituir esse mecanismo por armazenamento vinculado ao usuário autenticado.

## Upload de partituras em PDF

Use o botão **PDF** na busca para enviar um arquivo. No modo de teste, a rota `app/api/score-upload/route.ts` valida a assinatura e se o documento pode ser lido, limita o tamanho a 20 MB e aceita PDFs genéricos sem tentar identificar se são partituras. Arquivos que não são PDF, estão corrompidos ou excedem os limites continuam sendo recusados.

Após a aprovação, o PDF é pré-visualizado, recebe um título obrigatório e pode ser adicionado ao catálogo provisório. Os metadados ficam no `localStorage`; o conteúdo do arquivo fica no IndexedDB deste navegador. Ainda não há associação a uma conta ou sincronização entre dispositivos.

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
