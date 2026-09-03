# Bem-vindo ao seu Segundo Cérebro

Você acabou de adquirir um sistema de memória persistente para o Claude Code. Ele vai lembrar quem você é, o que você faz, seus projetos, suas decisões e seus aprendizados - tudo isso entre sessões, sem precisar explicar tudo de novo.

---

## O que você comprou

| Componente | O que faz |
|------------|-----------|
| **CLAUDE.md** | A alma do cérebro - define como o Claude pensa, opera e protege seus dados |
| **8 slash commands** | Comandos prontos que executam tarefas complexas com uma linha |
| **Templates de knowledge** | Perguntas-guia para você preencher e o cérebro te conhecer |
| **Módulo negócios** | Templates e comandos extras para quem usa o cérebro para gerenciar um negócio (opcional) |
| **4 prompts de setup** | Os mesmos prompts do vídeo + complementares para configurar tudo |
| **Guias completos** | Instalação passo a passo e personalização por perfil |
| **Suporte via IA** | Um prompt que transforma qualquer LLM num assistente que conhece o kit inteiro |

---

## Setup em 3 passos

### Passo 1: Instalar e abrir

Siga o [[guia-instalacao]] para instalar o Obsidian e o Claude Code (se ainda não tiver), e abrir o vault.

**Se já tem Obsidian e Claude Code instalados:** Basta abrir esta pasta como vault no Obsidian e rodar `claude` no terminal dentro dela.

### Passo 2: Personalizar

Siga o [[guia-personalizacao]] para preencher sua identidade no CLAUDE.md e alimentar o cérebro com seus dados.

**Tempo estimado:** 15-30 minutos para o setup básico. Você pode ir completando com o tempo.

### Passo 3: Testar

Rode o seu primeiro comando no Claude Code:

```
/daily-briefing
```

Se tudo estiver configurado, o cérebro vai gerar um briefing do seu dia com base no que você preencheu.

---

## Seus comandos

### Universais (todo mundo usa)

| Comando | O que faz |
|---------|-----------|
| `/daily-briefing` | Gera o briefing do dia: estado atual, projetos, prioridades, próximos passos |
| `/end-session` | Fecha a sessão: salva o que foi feito, decisões, aprendizados. **O cérebro evolui a cada uso.** |
| `/braindump [texto]` | Captura uma ideia ou pensamento e conecta ao vault automaticamente |
| `/weekly-review` | Revisão semanal: o que avançou, o que travou, ajustes de prioridade |

### Semi-universal

| Comando | O que faz |
|---------|-----------|
| `/content-idea` | Gera ideias de conteúdo baseadas no seu perfil, objetivos e posicionamento |

### Módulo negócios (opcional)

| Comando | O que faz |
|---------|-----------|
| `/prospect-research [nome]` | Pesquisa um prospect e cria nota no pipeline |
| `/pipeline` | Dashboard completo do seu funil com métricas e alertas |
| `/proposal-generator [nome]` | Gera proposta personalizada baseada nos dados do vault |

---

## Precisa de ajuda?

Abra o arquivo [[prompt-suporte-llm]] e copie o conteúdo inteiro como primeira mensagem num chat novo do Claude (web) ou ChatGPT. Você terá um assistente que conhece o kit inteiro e pode te ajudar com qualquer dúvida - personalização, troubleshooting, criação de novos comandos, tudo.

---

## Estrutura do vault

```
CLAUDE.md                    ← Alma do cérebro (personalizar primeiro)
START-HERE.md                ← Você está aqui
guia-instalacao.md           ← Setup passo a passo
guia-personalizacao.md       ← Como adaptar ao seu uso
prompt-suporte-llm.md        ← Suporte via IA

_prompts/                    ← Prompts usados no vídeo
_memory/                     ← Estado atual (atualizado automaticamente)
_knowledge/                  ← Sua base de conhecimento
  business/                  ← Módulo negócios (opcional)
_pipeline/                   ← Itens ativos do seu funil
_learnings/                  ← Aprendizados acumulados
_decisions/                  ← Registro de decisões
_sessions/                   ← Braindumps e sessões
.claude/commands/             ← Os 8 slash commands
```

---

> **Dica:** O segundo cérebro fica mais inteligente com o uso. Cada vez que você roda `/end-session`, ele consolida o que aconteceu e se prepara melhor para a próxima sessão. Use consistentemente e em poucas semanas ele vai conhecer seu contexto melhor do que qualquer chat novo.
