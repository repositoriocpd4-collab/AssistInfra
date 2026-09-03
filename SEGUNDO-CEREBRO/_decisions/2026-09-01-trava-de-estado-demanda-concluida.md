---
tags: [decision]
status: active
created: 2026-09-02
updated: 2026-09-02
---

# Demanda concluída trava o andamento comum

**Data:** 01/09/2026 (registrada retroativamente em 02/09/2026 a partir do `PRD.md`, seção 14)

**Contexto:** Depois de concluída, uma demanda ainda podia ser mexida como se estivesse ativa, o que não fazia sentido no fluxo institucional e abria espaço para edição indevida do histórico.

**Decisão:** Demanda com status "Concluída" passa a avisar que restam apenas duas ações: destinar a um exercício futuro (Planejamento) ou consultar o histórico completo. Painéis de próximos passos, análise técnica e anexos, atalhos de responsável/prazo e entradas de escrita do menu ficam indisponíveis (RF43). Reabertura controlada da demanda concluída foi cogitada e **descartada** nesta versão — quem precisar corrigir algo usa "Editar dados da demanda".

**Raciocínio:** Preservar a integridade do histórico de uma demanda já encerrada, evitando que ela volte a ser tratada como ativa por engano.

**O que mudou:** RF43 no PRD; roadmap de curto prazo passou a listar "reabertura controlada" como item removido, não pendente.

**Reversibilidade:** Alta — é uma trava de UI/regra de negócio, não uma mudança estrutural de dados. Pode ser revertida reintroduzindo a ação de reabertura se a necessidade aparecer.

## Related

- `[[projects]]`
- `[[2026-09-01-assistente-substitui-formulario-de-andamento]]`
