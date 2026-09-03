# 03 - Configurar estado inicial do cérebro

Leia todos os arquivos na pasta `_knowledge/` que eu já preenchi. Com base nessas informações, gere o primeiro estado real do cérebro atualizando o arquivo `_memory/current-state.md`.

## O que fazer

1. Ler `_knowledge/about-me.md` e extrair: nome, área de atuação, papel, ferramentas
2. Ler `_knowledge/goals.md` e extrair: objetivos priorizados por prazo
3. Ler `_knowledge/projects.md` e extrair: projetos ativos com status e próximo passo
4. Ler `_knowledge/references.md` e extrair: ferramentas e recursos relevantes
5. Se existir `_knowledge/business/`, ler os arquivos e extrair contexto de negócio

## Formato do current-state.md

Manter o frontmatter YAML existente, atualizar a data e preencher com dados reais:

```markdown
---
tags: [memory, state, current]
status: active
created: [manter data original]
updated: [data de hoje]
---

# Current State

## Last Update: [data de hoje] (estado inicial configurado)

### What Was Done
- Configuração inicial do segundo cérebro
- Knowledge base preenchida: [listar quais arquivos foram preenchidos]
- Estado inicial gerado a partir dos dados de _knowledge/

### Decisions Made
Nenhuma registrada ainda - use `/end-session` pra começar a acumular.

### Current Phase
[Inferir da combinação de goals.md + projects.md. Ex: "Fase inicial - 2 projetos ativos, foco em [objetivo de curto prazo]"]

### Next Steps
[Inferir dos projetos e objetivos. Listar 3-5 ações concretas ordenadas por prioridade.]

1. [Ação do projeto de maior prioridade]
2. [Ação do segundo projeto/objetivo]
3. [Próximo passo do objetivo de curto prazo]

### Open Questions
[Listar questões pendentes inferidas dos dados. Se não houver, usar:]
- Quais projetos merecem mais tempo esta semana?
- Algum objetivo de curto prazo precisa de ajuste?
```

## Após gerar

1. Confirme o que foi feito e quais arquivos foram lidos
2. Mostre um resumo de 3 linhas do estado gerado
3. Explique como rodar o `/daily-briefing` pra testar: "No Claude Code, dentro da pasta do vault, digite `/daily-briefing`"
4. Se algum arquivo de `_knowledge/` ainda estiver com placeholders, avise quais faltam preencher

## Regras

- Não invente dados - use apenas o que foi extraído dos arquivos
- Se um arquivo está vazio ou só com placeholders, registre como "não preenchido ainda"
- Mantenha o formato limpo com headers markdown claros
- Use português (BR) com acentuação correta
