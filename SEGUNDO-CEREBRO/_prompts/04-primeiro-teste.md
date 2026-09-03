# 04 - Validar que o segundo cérebro está funcionando

Quero testar se o segundo cérebro está configurado corretamente e pronto pra uso. Faça uma verificação completa.

## Checklist de validação

### 1. Memória
- Leia `_memory/current-state.md`
- Me diga um resumo de 3 linhas do estado atual
- Verifique se a data está atualizada (não pode ser placeholder `[DATA DE HOJE]`)
- Verifique se as seções têm conteúdo real (não apenas placeholders)

### 2. Knowledge base
- Leia cada arquivo em `_knowledge/` (about-me, goals, projects, references)
- Para cada um, diga: preenchido / parcialmente preenchido / ainda com placeholders
- Se existir `_knowledge/business/`, verificar esses também

### 3. Estrutura de pastas
Verifique se todas as pastas existem:
- `_memory/`, `_knowledge/`, `_learnings/`, `_decisions/`, `_pipeline/`, `_sessions/`, `_prompts/`, `.claude/commands/`
- Se alguma estiver faltando, diga exatamente qual

### 4. Slash commands
- Liste todos os arquivos em `.claude/commands/`
- Para cada um, leia a primeira linha e descreva brevemente o que faz
- Se algum comando essencial estiver faltando (daily-briefing, end-session, braindump, weekly-review), avise

### 5. CLAUDE.md
- Verifique se o CLAUDE.md existe e está preenchido
- Verifique se a seção de identidade (Seção 2) tem dados reais ou ainda está com `[SEU NOME]`
- Verifique se a estrutura do vault no CLAUDE.md reflete a estrutura real das pastas

### 6. Teste funcional
- Rode o `/daily-briefing` e mostre o output completo
- Se o output mencionar dados que não existem ou referências quebradas, sinalize

## Output

Responda com:

### Diagnóstico do Segundo Cérebro

**Nota geral:** [X/10]

| Componente | Status | Observação |
|------------|--------|------------|
| Memória (current-state) | [OK / Pendente / Erro] | [detalhe] |
| Knowledge base | [X/4 preenchidos] | [quais faltam] |
| Módulo negócios | [Ativo / Não configurado / Removido] | [detalhe] |
| Estrutura de pastas | [Completa / Faltando X] | [quais faltam] |
| Slash commands | [X/8 disponíveis] | [quais faltam] |
| CLAUDE.md | [Configurado / Pendente] | [o que falta] |
| Teste funcional | [Passou / Falhou] | [detalhe] |

**O que falta pra chegar em 10:**
[Lista concreta do que precisa ser feito, ordenada por prioridade]

**Próximo passo recomendado:**
[A ação mais importante pra fazer agora]
