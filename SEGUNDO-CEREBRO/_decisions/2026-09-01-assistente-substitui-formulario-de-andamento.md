---
tags: [decision]
status: active
created: 2026-09-02
updated: 2026-09-02
---

# Assistente guiado substitui o formulário livre de andamento

**Data:** 01/09/2026 (registrada retroativamente em 02/09/2026 a partir do `PRD.md`, seção 14)

**Contexto:** A tela de detalhe da demanda tinha um formulário de providência com doze campos e ações rápidas de avanço, todos usados livremente. Isso deixava a linha do tempo da demanda inconsistente e dificultava saber o que realmente mudou a cada atualização.

**Decisão:** Criar o assistente "Registrar andamento" como único caminho de escrita da demanda, em três etapas: escolha do tipo de atualização (atualização geral, serviço iniciado, aguardando material, alterar responsável, reprogramar prazo, serviço executado/reabrir), preenchimento dos detalhes específicos daquele tipo, e revisão do "antes → depois" antes de gravar.

**Raciocínio:** Cada tipo de atualização predefine status e campos obrigatórios, reduzindo erro de preenchimento. A etapa de revisão garante que toda mudança técnica ou devolutiva fique legível na linha do tempo da demanda, visível à escola.

**O que mudou:** RF13 (tela de detalhe virou painel único com trilho de 4 marcos e gavetas), RF38-RF40 (o assistente em si). O formulário de doze campos e as ações rápidas de avanço foram removidos.

**Reversibilidade:** Média. Reverter exigiria reintroduzir o formulário antigo e aceitar de volta a inconsistência na linha do tempo que motivou a mudança.

## Related

- `[[projects]]`
- `[[2026-09-01-trava-de-estado-demanda-concluida]]`
