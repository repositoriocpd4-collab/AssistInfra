# Análise do Sistema — Agenda Integrada (SMEDU Itaguaí)

Revisão completa do backend (`app.py`), do frontend (`static/app.js`, `static/styles.css`, `templates/index.html`) e da documentação de escopo (`PRD.md`, `README.md`, `implementation_plan.md`), feita sobre o estado atual publicado na branch `DevAssist` (commit `f6470ce`).

Cada item abaixo foi verificado diretamente no código (arquivo:linha). Onde a avaliação é uma opinião sobre processo administrativo municipal (não confirmável só pelo código), isso está marcado explicitamente.

---

## Resumo executivo

Os três achados mais importantes, em ordem de urgência:

1. **A tabela `schools` não tem todas as colunas que o sistema usa.** Se o banco de dados precisar ser recriado do zero um dia (recuperação de desastre, novo ambiente), o cadastro de escolas e o mapa quebram imediatamente. É o único item desta lista que classificaria como bug crítico, não só melhoria.
2. **A chave de sessão tem um valor padrão fixo no código** (`troque-esta-chave-em-producao-2026`). Enquanto a variável de ambiente `AGENDA_SECRET` não for configurada no servidor de produção, qualquer pessoa que conheça esse valor consegue forjar uma sessão de login.
3. **O checkbox "Notificar escola" na Providência não notifica ninguém.** Ele salva um `1`/`0` no banco, mas não existe nenhum envio de e-mail, webhook ou qualquer aviso — é só um registro histórico. Vale decidir: implementar de verdade ou tirar o checkbox da tela para não prometer algo que não acontece.

O restante é organizado abaixo por área.

---

## 1. O que falta (importante para o processo)

### Segurança e integridade de dados

- **Tabela `schools` incompleta no schema de criação** (`app.py:178-186`, migrações em `app.py:338-346`). O `CREATE TABLE` só define `id, name, director, address, phone, email, code, external_id`, e as migrações só adicionam `code, external_id, lat, lon, active`. Só que o cadastro de escolas (`admin_create_school`/`admin_update_school`, `app.py:1980-2056`) e o mapa (`app.py:1097`) leem e gravam `inep, ramal, street, number, complement, neighborhood, city, state, cep, full_address, maps_link, modality, school_type, photo_url` — colunas que **não existem** se o banco for criado do zero por este código. Hoje funciona porque o `agenda_integrada.db` em uso já tem essas colunas (criadas por fora, provavelmente pelos scripts `supabase_unidades_escolares.sql`/`supabase_schema.sql`). Recomendação: adicionar essas colunas como migrações `ALTER TABLE ... ADD COLUMN` (mesmo padrão já usado para as outras), para que `python app.py` num banco novo funcione sem depender de scripts externos.

- **Chave de sessão com valor padrão hardcoded** (`app.py:33`): `secret_key=os.environ.get("AGENDA_SECRET", "troque-esta-chave-em-producao-2026")`, sem `https_only=True` no cookie. Recomendação: exigir a variável de ambiente (falhar a inicialização se ausente, em vez de usar um valor previsível) e marcar o cookie como `Secure` quando o site rodar em HTTPS.

- **Endpoint de foto de escola sem autenticação** (`api_school_photo`, `app.py:1283`) — é o único endpoint de dados do sistema acessível sem login.

### Fluxo/processo

- **Sem reatribuição de escola numa demanda** — `school_id` não está entre os campos editáveis de `update_demand` (`app.py:910-912`). Se uma demanda for cadastrada na escola errada, não tem como corrigir via API.
- **Sem exclusão** de demanda, anexo ou item de planejamento — só existe criação e edição.
- **"Notificar escola" é cosmético** (`prov_notify_school`, gravado em `app.py:912/917`, exibido em `static/app.js:1238`) — nunca dispara nenhum envio real.
- **Sem controle de concorrência**: duas pessoas editando a mesma demanda ao mesmo tempo podem se sobrescrever silenciosamente — `update_demand` não verifica se o registro mudou entre a leitura e a gravação.
- **Padrão de acessibilidade não replicado na tela mais usada**: a tabela principal de "Demandas Escolares" (`renderDemandTable`, `static/app.js:1009`, navegação por `data-href` em `1009` e `3738-3742`) só é clicável com mouse. O padrão mais novo e mais acessível (`role="button"`, `tabindex`, teclado Enter/Espaço) já existe no código — foi usado na linha da Providência e do Planejamento (`static/app.js:1451-1452, 1596-1597`) — mas não foi aplicado de volta na tabela principal, que é a tela que mais gente usa no dia a dia.
- **Unidade de medida sem padronização em dois formulários irmãos**: o seletor de unidade filtrado por categoria (`CATEGORIA_UNIDADES`) existe só no painel de Providência (`refreshMaterialUnitOptions`, `static/app.js:1565-1579`). Os campos equivalentes em "Planejamento Futuro" (`openEditPlanning`, linha 1314) e "Nova demanda futura" (`openFutureDemandForm`, linha 1692) continuam texto livre — alguém pode digitar qualquer coisa nesses dois, quebrando a padronização que a Providência tentou impor.

### Rastreabilidade administrativa

- **Campos de licitação/contrato existem no banco mas nunca são usados**: a tabela `planning_items` tem colunas `process_number`, `procurement_number`, `contract_number`, `supplier`, mas não existe nenhum endpoint (`PUT`) que leia ou grave esses campos — só `GET`/`POST /api/planning`. O PRD deixa claro que a Agenda Integrada não substitui os sistemas de licitação (fronteira de escopo deliberada, não um bug), mas hoje esses campos ficam órfãos no banco sem nenhuma função — ou implementa um endpoint mínimo de atualização, ou remove as colunas para não sugerir uma capacidade que não existe.
- Sem trilha de auditoria com usuário/IP em ações administrativas — item já listado como pendência no próprio checklist de pré-produção do PRD.
- Sem ação em massa (bulk): não há como atualizar várias demandas de uma vez, nem cadastrar o mesmo problema em várias escolas simultaneamente (por exemplo, uma falha elétrica que afeta a rede toda). *(Avaliação de processo, não achado de bug.)*

---

## 2. O que está excessivo ou redundante

### Backend

- **`/api/route` está definido duas vezes** (`app.py:1067` e `app.py:1323`, mesmo caminho). O FastAPI usa só a segunda definição — a primeira é código morto. A segunda, além disso, usa uma URL fixa `http://...` em vez da constante `OSRM_ROUTE_URL` já definida em HTTPS (`app.py:81`), que ficou sem uso.
- Log de alterações truncado sem aviso: `changes[:6]` (`app.py:929`) descarta qualquer campo alterado além do sexto numa mesma edição, sem indicar que houve corte no histórico.

### Frontend

- **`renderTimeline` e `renderFiles` estão definidas duas vezes** em `static/app.js` (linhas 848/852 e novamente em 1271/1275, com conteúdo praticamente idêntico — a segunda versão de `renderFiles` inclusive é uma cópia *sem* o selo de categoria que a primeira tem). A segunda declaração sobrescreve a primeira silenciosamente; vale remover a duplicata.
- CSS morto: `.review-alert.procurement-flag` (`static/styles.css:11293`) não é referenciada em lugar nenhum do app.js — sobrou do fluxo de procurement que foi revertido do assistente. Seguro remover.
- **Dois mecanismos diferentes para "linha clicável"** convivendo no código: navegação global por atributo `data-href` (tabela principal) e o padrão mais novo `clickable-row` com listener próprio por elemento (Providência/Planejamento). Não é um bug, mas vale unificar num único helper para não manter dois padrões fazendo a mesma coisa.
- **`renderNetworkMap` tem cerca de 1.010 linhas** (`static/app.js:1914-2923`) numa função só, misturando mapa, popups, KPIs e um "Circuito de Vistorias" com otimização de rota e tempo estimado entre escolas. Isso é sofisticação de logística — geocodificação, roteirização, imagem de satélite por escola com cache em disco — que não estava nos requisitos originais do PRD e provavelmente vai além do que uma prefeitura precisa numa primeira versão. *(Avaliação de escopo, não bug — o código funciona, é uma questão de prioridade de manutenção.)*
- O nível de polimento visual (modo escuro, ampliação de texto, tooltip em praticamente todo controle, skeleton loading) é alto para uma ferramenta interna usada por três perfis, num volume que o próprio PRD estima em "dezenas a poucas centenas de registros". Não atrapalha, mas é tempo de manutenção futuro a considerar.

---

## Nota de método

- Os itens sobre orçamento formal (empenho/liquidação/pagamento) e sobre o sistema não cobrir licitação/contratação por completo **não são lacunas escondidas** — o próprio PRD (seção 12) exclui isso do escopo de propósito, com o argumento de que "a Agenda Integrada alimenta esses processos, não os substitui". É uma fronteira razoável e documentada.
- A ausência de campo de "ano letivo" tem impacto prático pequeno, porque no Brasil o ano letivo e o exercício fiscal já coincidem com o ano civil — citado aqui só por completude.
- Os achados de segurança (chave de sessão, endpoint sem autenticação, colunas ausentes) foram confirmados lendo o código linha a linha, não são suposições.
