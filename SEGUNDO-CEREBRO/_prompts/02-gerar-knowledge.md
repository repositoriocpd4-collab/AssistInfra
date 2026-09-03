# 02 - Gerar templates de conhecimento

Crie templates de conhecimento na pasta `_knowledge/` para alimentar o segundo cérebro. Esses arquivos são a base que o cérebro usa para te conhecer e contextualizar tudo que faz.

## Regras para todos os templates

- Frontmatter YAML obrigatório: `tags`, `status: active`, `created`, `updated`
- Cada arquivo começa com header H1 explicando o propósito
- Perguntas-guia em formato de checklist (`- [ ] **Campo:** [Ex: exemplo]`)
- Exemplos práticos entre colchetes com "Ex:" para cada pergunta
- Seções organizadas por tema com headers H2
- Dica no final (blockquote `>`) explicando como o arquivo se conecta aos slash commands
- Linguagem direta e simples, sem jargão técnico nas perguntas-guia
- Português (BR) com acentuação correta

## Arquivos a criar

### 1. `_knowledge/about-me.md` - Quem Sou Eu
Tags: `[knowledge, identity, core]`

Seções:
- **Identidade:** nome, como prefere ser chamado, área de atuação, cargo/papel atual, tempo na área
- **O Que Faço:** descrição em 1 frase, o que me diferencia, o que NÃO faço
- **Habilidades Principais:** hard skills, soft skills, aprendendo agora
- **Ferramentas e Stack:** ferramentas do dia a dia, stack técnico, ferramentas de IA
- **Como Prefiro Trabalhar:** horário produtivo, estilo de trabalho, comunicação preferida, o que me trava, o que me destrava
- **Contexto Pessoal (opcional):** localização, idiomas, fuso horário

Dica final: "Você não precisa preencher tudo de uma vez. Comece pelo que parece mais relevante e vá completando com o tempo. O `/end-session` vai lembrando você de atualizar."

### 2. `_knowledge/goals.md` - Meus Objetivos
Tags: `[knowledge, goals, core]`

Introdução mencionando que o `/weekly-review` usa este arquivo.

Seções com 2 objetivos cada (template repetível):
- **Curto Prazo (próximo 30 dias):** o que seria sucesso, métricas, o que está me impedindo, próximo passo concreto
- **Médio Prazo (próximos 6 meses):** o que seria sucesso, métricas, o que preciso fazer antes, riscos ou bloqueios
- **Longo Prazo (próximo 1 ano):** o que seria sucesso, métricas, o que precisa acontecer antes, por que isso importa
- **Antiobjetivos (o que NÃO quero):** lista com exemplos (não trabalhar 10h/dia, não pegar clientes baratos, etc.)

Dica final: "O `/weekly-review` vai comparar seus objetivos com o que você realmente fez na semana."

### 3. `_knowledge/projects.md` - Meus Projetos
Tags: `[knowledge, projects, core]`

Introdução mencionando que o `/daily-briefing` usa este arquivo.

Estrutura:
- **Template (copie para cada projeto):** tabela com campos Status (não-iniciado/em-andamento/pausado/concluído/cancelado), Prioridade (alta/média/baixa), Início, Deadline, Próximo passo, Bloqueios. Mais campos Descrição e Notas.
- **2 exemplos fictícios preenchidos** para demonstrar o formato:
  - Exemplo 1: "Redesign do Portfólio Pessoal" - status em-andamento, prioridade alta, com deadline, bloqueio real, WikiLink para `[[references]]`
  - Exemplo 2: "Curso de TypeScript Avançado" - status em-andamento, prioridade média, sem deadline, sem bloqueios
- Marcar os exemplos com "(apague depois de entender o formato)"

Dica final: "Quando um projeto muda de status, atualize aqui. O `/end-session` vai te lembrar."

### 4. `_knowledge/references.md` - Referências e Recursos
Tags: `[knowledge, references, core]`

Seções com tabelas e listas:
- **Ferramentas que Uso:** tabela com Ferramenta, Para que uso, Link (5 exemplos como VS Code, Obsidian, Figma)
- **Links Úteis:** sub-seções para Documentação e Aprendizado, Ferramentas Online, Comunidades
- **Pessoas e Perfis de Referência:** tabela com Pessoa, Área, Por que acompanho, Onde encontrar
- **Conteúdos Salvos:** sub-seções para Artigos, Vídeos/Cursos, Livros, Templates e Exemplos

Dica final: "Quando o `/braindump` capturar uma referência, ele vai sugerir adicionar aqui automaticamente."
