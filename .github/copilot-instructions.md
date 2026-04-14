# Instrucoes do GitHub Copilot (app-bridge-keeper)

## Escopo

- Este arquivo define diretrizes locais para o projeto `app-bridge-keeper`.
- Ele complementa as diretrizes globais em `AGENTS.md` e `.github/copilot-instructions.md` da raiz.

## Sincronizacao de diretrizes

- Sempre que uma diretriz local for criada, alterada ou removida, refletir a mudanca nos arquivos de diretrizes locais correspondentes na mesma entrega.
- Sempre que houver solicitacao para alterar diretrizes, propagar as alteracoes para todos os projetos pertinentes do monorepo.
- Este arquivo deve permanecer semanticamente alinhado com as diretrizes globais da raiz.

## Build e execucao

- Instalar dependencias com `pnpm install`.
- Sempre executar `pnpm install` apos mudancas para manter `pnpm-lock.yaml` alinhado ao `package.json` antes de deploy.
- Executar e validar scripts conforme `package.json` local.

## Convencoes locais

- Manter consistencia com padroes NestJS e TypeScript ja adotados no projeto.
- Evitar alteracoes de escopo fora deste repositorio sem necessidade explicita.
