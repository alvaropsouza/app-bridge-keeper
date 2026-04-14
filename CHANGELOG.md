# Changelog

Todas as mudancas relevantes deste projeto serao documentadas neste arquivo.

O formato segue o padrao Keep a Changelog e este projeto adota Semantic Versioning.

## [Unreleased]

### Changed

- Migrado o lint/format do `app-bridge-keeper` para Biome, com scripts `lint`, `lint:fix` e `format` atualizados no `package.json`.
- Adicionada configuracao `biome.json` local do servico para padronizar validacao e formatacao TypeScript.
- Adicionado `.vscode/settings.json` no `app-bridge-keeper` para `formatOnSave` com Biome e code actions de `fixAll`/`organizeImports` no save.
- Adicionado `.vscode/extensions.json` com recomendacao da extensao `biomejs.biome` para habilitar formatter/linter do Biome no VS Code.
