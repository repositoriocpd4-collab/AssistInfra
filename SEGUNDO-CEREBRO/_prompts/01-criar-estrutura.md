# 01 - Criar estrutura do segundo cérebro

Crie a estrutura completa de um segundo cérebro neste diretório. O objetivo é ter um vault organizado no Obsidian onde eu possa armazenar conhecimento, registrar decisões, capturar aprendizados, e manter um estado atualizado de tudo que estou fazendo. O Claude Code vai usar esses arquivos como memória persistente entre sessões.

## Pastas a criar

- `_memory/` - Estado atual e contexto persistente entre sessões
- `_knowledge/` - Base de conhecimento pessoal (quem sou, objetivos, projetos, referências)
- `_knowledge/business/` - Módulo de negócios opcional (posicionamento, cliente ideal, serviços, preços, tom de voz)
- `_learnings/` - Insights e aprendizados documentados ao longo do tempo
- `_decisions/` - Registro de decisões importantes com data, contexto e raciocínio
- `_pipeline/` - Itens ativos (projetos, tarefas, prospects, ou o que eu usar)
- `_sessions/` - Logs de braindumps e sessões de trabalho
- `_prompts/` - Prompts de setup e configuração (onde este arquivo está)
- `.claude/commands/` - Slash commands do cérebro

## Arquivos a criar

### `_memory/current-state.md`
Template de estado atual com frontmatter YAML:
```yaml
---
tags: [memory, state, current]
status: active
created: [data de hoje]
updated: [data de hoje]
---
```
Seções obrigatórias com instruções de preenchimento entre colchetes:
- `# Current State`
- `## Last Update:` [data] (primeira configuração)
- `### What Was Done` - lista do que foi feito na última sessão
- `### Decisions Made` - decisões estratégicas tomadas
- `### Current Phase` - fase atual do que está fazendo
- `### Next Steps` - próximos passos concretos, ordenados por prioridade
- `### Open Questions` - perguntas ou decisões pendentes

### `_pipeline/_exemplo.md`
Template universal de item do pipeline com frontmatter YAML (tags: [pipeline, exemplo], status: template). Incluir:
- Tabela de Informações Básicas (nome, tipo, status, prioridade, data de entrada, responsável, origem)
- Seções: Contexto, Análise, Próximos Passos, Histórico (com formato de data), Observações Internas
- Seção Related com WikiLinks para `[[projects]]` e `[[goals]]`
- Nota explicando que `_pipeline/` pode ser renomeada (devs: `_projects/`, estudantes: `_assignments/`, etc.)

### `.gitignore`
Ignorar: `.obsidian/`, `.DS_Store`, `Thumbs.db`, `node_modules/`, `*.swp`

### `_learnings/.gitkeep`, `_decisions/.gitkeep`, `_sessions/.gitkeep`
Arquivos vazios para manter as pastas no Git.

## Regras

- Use frontmatter YAML em todo arquivo .md (tags, status, created, updated)
- Todos os placeholders devem estar entre colchetes: `[Descreva aqui]`
- Inclua exemplos práticos entre colchetes com "Ex:": `[Ex: desenvolvimento web, design]`
- Não crie o CLAUDE.md - ele já existe neste vault
- Não preencha conteúdo real nos arquivos - apenas estrutura com placeholders e instruções
- Use português (BR) com acentuação correta em todo o conteúdo
