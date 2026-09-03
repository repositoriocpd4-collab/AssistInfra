---
tags: [memory, state, current]
status: active
created: 2026-09-02
updated: 2026-09-02
---

# Current State

## Last Update: 2026-09-02 (carga inicial a partir do histórico do projeto)

### O que é o projeto

**Agenda Integrada** — sistema de gestão de infraestrutura e demandas escolares para a Secretaria Municipal de Educação de Itaguaí (RJ). Fluxo único **Demanda → Análise → Ação → Resultado**, com planejamento plurianual, anexos, histórico auditável e relatórios. Ver `[[projects]]` e o `PRD.md` na raiz do repositório para especificação completa (47 requisitos funcionais).

**Stack:** FastAPI + Jinja2 + SQLite (`app.py` monolítico), frontend em `static/app.js` e `static/styles.css` sem build step, autenticação por sessão local (PBKDF2-SHA256), sem SSO. Roda localmente no Windows via `INICIAR_SISTEMA.bat`, publica no GitHub via `PUBLICAR_GITHUB.bat`.

### What Was Done (extraído do histórico de commits e do PRD v1.2.0)

Trabalho recente (versão 1.2.0, entregue em 01/09/2026) na tela de detalhe da demanda:

- Reformulação completa da tela de detalhe: seis abas viraram um painel de decisão único com trilho de 4 marcos (solicitação → providência → execução → conclusão) e leituras profundas em gavetas.
- Criação do assistente "Registrar andamento" (3 etapas: tipo de atualização → detalhes → revisão antes → depois) como único caminho de escrita da demanda, substituindo um formulário de 12 campos.
- Regras de permissão: troca de escola e exclusão de demanda restritas ao Gestor da Infraestrutura, validadas também no backend (`PUT /api/demands/{id}`).
- Estado "Concluída" agora trava a demanda: só permite destinar a exercício futuro e consultar histórico.
- Catálogo de unidades de medida ampliado de 35 para 83, agrupado por natureza, com sugestão automática por categoria/descrição da demanda.
- Campos de seleção grandes (unidade de medida, unidade escolar) viraram campo de busca com normalização de acentos.
- Identidade visual unificada (paleta GOV.BR) entre Painel, Demandas Escolares, detalhe e assistente.
- PDF de Planejamento ganhou cabeçalho institucional (brasão + marca do portal).
- Categorias novas em CPD/TI: Câmeras & Alarmes, Sala de Recursos.

### Decisions Made

1. **Assistente guiado substitui formulário livre de andamento** — decisão de produto para reduzir erro de preenchimento e garantir que toda alteração técnica gere uma entrada legível na linha do tempo ("antes → depois"). Ver `[[2026-09-01-assistente-substitui-formulario-de-andamento]]`.
2. **Trava de estado para demanda concluída** — decisão para impedir edição indevida após conclusão; reabertura controlada foi cogitada e descartada nesta versão (fica só "Editar dados da demanda" para correção pontual). Ver `[[2026-09-01-trava-de-estado-demanda-concluida]]`.
3. **SQLite mantido para o ambiente demonstrativo** — decisão consciente de não migrar para Postgres ainda; ver seção "Pendências conhecidas" do PRD e o conflito de merge aberto (abaixo) que já traz `psycopg2-binary` na branch `origin/main`.

### Current Phase

**Merge em andamento, não commitado, com conflitos não resolvidos.** A branch `merge-test-devassist-main` está no meio de um merge com `origin/main` e tem 10 arquivos com conflito: `.gitignore`, `INICIAR_SISTEMA.bat`, `PRD.md`, `PUBLICAR_GITHUB.bat`, `app.py`, `requirements.txt`, `static/app.js`, `static/styles.css`, `templates/index.html`, `templates/login.html`. O `PRD.md` e o `requirements.txt` mostram que `origin/main` está numa versão anterior (1.1.0, sem os RFs 38-47) e sem as dependências `psycopg2-binary`/`python-dotenv` que aparecem do lado `HEAD`. Isso não foi resolvido nesta sessão — precisa de decisão humana sobre qual lado prevalece em cada arquivo antes de continuar.

### Next Steps

1. Resolver os conflitos de merge listados acima (decidir se `origin/main` traz algo que precisa ser preservado, ou se o merge deve ser abortado).
2. Corrigir a pendência conhecida do PRD: o modal "Editar demanda" grava prioridade/status fora do padrão (`"P2 - Alta"` em vez de `"P2"`), fazendo a demanda sumir de chips e estatísticas — normalizar os `value` dos selects e os registros já afetados.
3. Tirar do texto claro a senha de seed e o fallback do segredo de sessão em `app.py`, movendo para variável de ambiente antes de qualquer uso além do demonstrativo.
4. Seguir o checklist de pré-produção da seção 10 do `PRD.md` (Postgres, HTTPS, backup, SSO Gov.br, RBAC revisado, auditoria com IP).

### Open Questions

- O merge com `origin/main` deve integrar a migração para Postgres (`psycopg2-binary`, `python-dotenv`) junto com as mudanças locais de UI/UX da v1.2.0, ou são trabalhos paralelos que precisam ser reconciliados manualmente arquivo a arquivo?
- Qual é a política de backup de banco e anexos antes de qualquer uso além do demonstrativo?
