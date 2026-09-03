---
tags: [knowledge, projects, core]
status: active
created: 2026-09-02
updated: 2026-09-02
---

# Meus Projetos

## Agenda Integrada — Infraestrutura e Gestão Escolar

| Campo | Valor |
|-------|-------|
| **Status** | em-andamento (uso demonstrativo, pendente de homologação para produção) |
| **Prioridade** | alta |
| **Início** | não registrado no histórico disponível (commits mais antigos já mostram versão GOV.BR funcional) |
| **Deadline** | sem deadline formal — depende do checklist de pré-produção (seção 10 do PRD) |
| **Próximo passo** | resolver o merge em conflito na branch `merge-test-devassist-main` (ver `[[current-state]]`) |
| **Bloqueios** | merge não resolvido; pendências de segurança (segredo/senha em texto claro) antes de produção |

**Descrição:** Sistema para a Secretaria Municipal de Educação de Itaguaí (RJ) que centraliza o registro, triagem, execução e planejamento plurianual de demandas de infraestrutura das unidades escolares. Substitui canais informais (telefone, WhatsApp, e-mail avulso) por um fluxo único e rastreável: Demanda → Análise → Ação → Resultado.

**Stack:** FastAPI + Jinja2 + SQLite, sem build de frontend, autenticação local por sessão (PBKDF2-SHA256). Roda no Windows via `INICIAR_SISTEMA.bat`.

**Perfis de acesso:** Gestor da Infraestrutura (acesso total), Unidade Escolar (escopo restrito à própria escola), Planejamento (acesso amplo, foco em consolidar itens futuros).

**Notas:**
- Especificação completa em `PRD.md` na raiz do repositório — 47 requisitos funcionais, modelo de dados, riscos, checklist de pré-produção e histórico de versões.
- Versão 1.2.0 (01/09/2026) reformulou a tela de detalhe da demanda para um painel único com trilho de marcos e criou o assistente "Registrar andamento" como único caminho de escrita.
- Pendência conhecida de bug: modal "Editar demanda" grava prioridade/status fora do padrão esperado pelo resto do sistema.
- Pendência de segurança: senha de seed e segredo de sessão em texto claro em `app.py`.

## Related

- `[[current-state]]` — estado atual e o merge não resolvido
- `[[2026-09-01-assistente-substitui-formulario-de-andamento]]`
- `[[2026-09-01-trava-de-estado-demanda-concluida]]`
