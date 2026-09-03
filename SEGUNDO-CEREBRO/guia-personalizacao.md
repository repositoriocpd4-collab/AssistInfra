# Guia de Personalização

Como transformar o template genérico no **seu** segundo cérebro. Funciona para qualquer perfil.

**Tempo estimado:** 15-30 minutos para o setup básico. Você pode ir completando com o tempo.

---

## Passo 1: Preencher sua identidade no CLAUDE.md

Abra o `CLAUDE.md` e vá até a **Seção 2 — Identidade**. Preencha os campos:

- **Nome:** Seu nome
- **Área de atuação:** O que você faz
- **Papel:** Seu papel atual
- **Objetivo principal:** O que está buscando agora
- **Ferramentas principais:** O que usa no dia a dia
- **Stack técnico:** Suas tecnologias (se aplicável)

### Exemplos por perfil

**Freelancer de web design:**
```
- Nome: Marina Costa
- Área de atuação: Design e desenvolvimento de sites para negócios locais
- Papel: Freelancer solo
- Objetivo principal: Conseguir 5 clientes recorrentes nos próximos 6 meses
- Ferramentas principais: Figma, VS Code, Obsidian, Claude Code
- Stack técnico: HTML, CSS, JavaScript, WordPress, Elementor
```

**Desenvolvedor em startup:**
```
- Nome: Lucas Pereira
- Área de atuação: Desenvolvimento full-stack
- Papel: Dev sênior na TechCo
- Objetivo principal: Liderar a migração do monolito para microserviços
- Ferramentas principais: VS Code, GitHub, Linear, Slack, Claude Code
- Stack técnico: TypeScript, React, Node.js, PostgreSQL, AWS
```

**Estudante de engenharia:**
```
- Nome: Ana Souza
- Área de atuação: Engenharia de Software (último ano)
- Papel: Estudante + estagiária
- Objetivo principal: Terminar o TCC e conseguir efetivação no estágio
- Ferramentas principais: IntelliJ, Obsidian, Google Docs, Claude Code
- Stack técnico: Java, Spring Boot, MySQL
```

**Criador de conteúdo:**
```
- Nome: Pedro Almeida
- Área de atuação: Conteúdo sobre tecnologia e produtividade
- Papel: Criador de conteúdo no Instagram e YouTube
- Objetivo principal: Chegar a 50k seguidores e lançar primeiro infoproduto
- Ferramentas principais: CapCut, Canva, Obsidian, Claude Code
- Stack técnico: N/A
```

**Gestor de projetos:**
```
- Nome: Carla Mendes
- Área de atuação: Gestão de projetos de TI
- Papel: PM numa consultoria de tecnologia
- Objetivo principal: Organizar os 4 projetos simultâneos e reduzir atrasos
- Ferramentas principais: Jira, Confluence, Slack, Obsidian, Claude Code
- Stack técnico: N/A (gestão, não código)
```

### Ajustar regras de idioma (se necessário)

Na **Seção 0 — Regras de idioma**, o padrão é tudo em português (BR). Ajuste se precisar:
- Se trabalha com clientes internacionais, pode querer outputs em inglês
- Se prefere vault em inglês, mude a regra do idioma do vault

---

## Passo 2: Preencher a knowledge base

Abra cada arquivo em `_knowledge/` e preencha as perguntas-guia. Não precisa preencher tudo de uma vez - comece pelo essencial:

### Ordem recomendada

1. **[[about-me]]** — O mais importante. O cérebro precisa saber quem você é pra contextualizar tudo.
2. **[[goals]]** — Seus objetivos. Sem isso, o `/daily-briefing` não tem como priorizar.
3. **[[projects]]** — Seus projetos ativos. Apague os exemplos fictícios e adicione os seus.
4. **[[references]]** — Links e ferramentas. Pode ir preenchendo aos poucos.

### Dica: use os prompts

Se preferir que o Claude Code te ajude a preencher, use os prompts da pasta `_prompts/`:

1. Abra o Claude Code na pasta do vault
2. Copie e cole o conteúdo do `_prompts/03-configurar-estado.md` no chat
3. O Claude vai ler o que você preencheu e gerar o estado inicial

---

## Passo 3: Módulo negócios (OPCIONAL)

Se você usa o segundo cérebro para gerenciar um negócio (freelancing, agência, consultoria, etc.), preencha os arquivos em `_knowledge/business/`:

1. **[[positioning]]** — O que você faz, pra quem, que problema resolve
2. **[[icp]]** — Quem é seu cliente ideal
3. **[[services]]** — Seus serviços e faixas de preço
4. **[[pricing]]** — Como você precifica
5. **[[tone-of-voice]]** — Como você se comunica

Isso ativa os comandos de negócios: `/prospect-research`, `/pipeline`, `/proposal-generator`.

### Se NÃO precisa do módulo negócios

Você pode simplesmente ignorar a pasta `_knowledge/business/`. Os 5 comandos universais funcionam sem ela.

Se quiser uma limpeza total:
1. Delete a pasta `_knowledge/business/`
2. No `CLAUDE.md`, remova a **Seção 5 — Módulo negócios** inteira
3. Delete os comandos: `prospect-research.md`, `pipeline.md`, `proposal-generator.md` de `.claude/commands/`

---

## Passo 4: Testar os comandos

Rode cada comando e veja se o output faz sentido:

```
/daily-briefing
```
Deve mostrar seus projetos, prioridades e próximos passos.

```
/braindump Estou pensando em mudar o foco do meu projeto X para Y porque...
```
Deve capturar a ideia, categorizar e conectar ao vault.

```
/end-session
```
Deve consolidar o que você fez, atualizar o current-state, e preparar o contexto para a próxima sessão.

Se algum comando mencionar dados que não existem ou gerar output vazio, é sinal de que faltam dados na knowledge base. Volte ao Passo 2.

---

## Passo 5: Consolidar o estado inicial

Depois de preencher a knowledge base e testar, rode:

```
/end-session
```

Isso vai gerar o primeiro estado real do cérebro em `_memory/current-state.md`. A partir daqui, o cérebro está operacional.

---

## Dicas avançadas

### Criar novos slash commands

Crie um arquivo `.md` em `.claude/commands/` com a seguinte estrutura:

```markdown
Você é o [papel] do segundo cérebro. [O que faz].

## Argumentos

$ARGUMENTS contém: [o que o usuário passa]

## Passos

1. [O que fazer primeiro]
2. [O que fazer depois]

## Output

[Formato esperado da resposta]

## Regras

- [Guardrails específicos]
```

O comando fica disponível automaticamente como `/nome-do-arquivo`.

### Renomear pastas

As pastas são convenções, não regras fixas. Renomeie conforme seu uso:

| Padrão | Alternativas |
|--------|-------------|
| `_pipeline/` | `_clients/`, `_projects/`, `_tasks/`, `_assignments/` |
| `_learnings/` | `_notes/`, `_insights/`, `_til/` |
| `_sessions/` | `_journal/`, `_logs/` |

Se renomear, atualize as referências nos slash commands e no CLAUDE.md.

### Adicionar módulos

Você pode criar novas pastas de knowledge para temas específicos:

- `_knowledge/content/` — Estratégia de conteúdo, calendário editorial
- `_knowledge/studies/` — Matérias, cronogramas, anotações de aula
- `_knowledge/health/` — Rotinas, treinos, metas de saúde

E criar slash commands que consultam esses módulos.

---

## Resumo

| Passo | O que fazer | Tempo |
|-------|-------------|-------|
| 1 | Preencher identidade no CLAUDE.md | 5 min |
| 2 | Preencher knowledge base (about-me, goals, projects) | 10-20 min |
| 3 | Módulo negócios (se usar) | 10-15 min |
| 4 | Testar comandos | 5 min |
| 5 | Rodar `/end-session` para consolidar | 2 min |

**Total:** 15-30 minutos para o setup básico. O cérebro fica mais inteligente com o uso - cada `/end-session` alimenta a memória.
