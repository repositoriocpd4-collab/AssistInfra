# IMPLEMENTAÇÃO — RESPONSIVIDADE, INSTALAÇÃO PWA E SISTEMA DE ATUALIZAÇÃO

Implemente no sistema uma experiência de instalação PWA e atualização de versão de forma inteligente, responsiva e amigável ao usuário.

## 1. RESPONSIVIDADE PARA SMARTPHONES

Ajuste toda a interface do sistema para funcionar corretamente em:

- Desktop;
- Tablets;
- Smartphones Android;
- Smartphones iOS.

O sistema deverá identificar automaticamente o tamanho da tela e adaptar:

- menus;
- cabeçalhos;
- cards;
- tabelas;
- formulários;
- modais;
- botões;
- espaçamentos;
- tipografia;
- navegação.

Evite rolagem horizontal e componentes que ultrapassem a largura da tela.

Em smartphones, priorize uma experiência semelhante à de um aplicativo mobile.

---

# 2. INSTALAÇÃO DO SISTEMA COMO PWA

Implemente o sistema como uma Progressive Web App (PWA).

O sistema deverá verificar automaticamente:

1. se o usuário está acessando através de um dispositivo móvel;
2. se o sistema já está instalado como PWA;
3. se o navegador permite oferecer a instalação.

O banner de instalação deverá aparecer somente quando fizer sentido e nunca quando o sistema já estiver instalado.

## Android

Quando o usuário acessar o sistema através de um navegador compatível, como o Google Chrome, apresentar um banner discreto na parte inferior da tela.

Exemplo:

**Instale o Processos**

Tenha acesso mais rápido ao sistema diretamente pela tela inicial do seu smartphone.

[Agora não] [Instalar]

Ao clicar em **Instalar**, utilizar o fluxo nativo de instalação PWA disponibilizado pelo navegador.

Após a instalação, o ícone e o nome **Processos** deverão aparecer normalmente na tela inicial do dispositivo.

Não tentar realizar instalação invisível ou automática, pois o navegador exige confirmação do usuário.

## iPhone / iOS

Como o Safari no iOS não oferece o mesmo fluxo automático de instalação do Android, apresentar um banner específico.

Exemplo:

**Instale o Processos no seu iPhone**

Para acessar o sistema como aplicativo:

**Compartilhar → Adicionar à Tela de Início**

Adicionar, se possível, uma representação visual do ícone de compartilhamento do Safari para facilitar a compreensão.

O banner deverá poder ser fechado pelo usuário.

---

# 3. REGRAS DO BANNER DE INSTALAÇÃO

O banner de instalação não deverá aparecer continuamente.

Criar controle para verificar:

- se o PWA já está instalado;
- se o usuário dispensou recentemente o aviso;
- qual dispositivo está sendo utilizado;
- qual navegador está sendo utilizado.

Caso o usuário clique em **Agora não** ou feche o banner, armazenar essa informação localmente para evitar exibir novamente a cada acesso.

O aviso poderá reaparecer posteriormente de acordo com uma estratégia adequada de UX.

---

# 4. CONTROLE DE VERSÃO DO SISTEMA

Implemente um sistema de controle de versão da aplicação.

A versão inicial deverá ser:

`1.0.4`

O sistema deverá trabalhar com pelo menos duas informações:

- **Versão instalada/em uso**
- **Última versão disponível**

Exemplo:

Versão instalada: **1.0.4**

Nova versão disponível: **1.0.5**

---

# 5. DETECÇÃO DE NOVA ATUALIZAÇÃO

Sempre que uma nova versão do sistema for publicada, a aplicação deverá identificar que existe uma versão mais recente.

Exemplo:

Usuário utilizando:

`1.0.4`

Servidor disponibilizando:

`1.0.5`

Nesse caso, apresentar um aviso de atualização.

A verificação deverá funcionar tanto em:

- desktop;
- smartphone;
- PWA instalado.

---

# 6. AVISO DE NOVA ATUALIZAÇÃO

Quando houver uma nova versão disponível, apresentar uma mensagem elegante e objetiva.

Exemplo:

**Nova atualização disponível!**

Uma nova versão do Processos está disponível.

Versão atual: **1.0.4**

Nova versão: **1.0.5**

A **nova versão deverá aparecer destacada em vermelho**.

Botões:

[Depois] [Atualizar]

O botão **Atualizar** deverá ser visualmente destacado como ação principal.

---

# 7. COMPORTAMENTO DO BOTÃO "ATUALIZAR"

Ao clicar em **Atualizar**, o sistema deverá carregar efetivamente a versão mais recente da aplicação.

O processo deverá:

1. verificar se existe um novo Service Worker;
2. ativar a nova versão;
3. remover ou atualizar caches antigos quando necessário;
4. carregar os novos arquivos da aplicação;
5. atualizar a página;
6. garantir que o usuário não continue utilizando arquivos antigos armazenados no cache.

Evitar apenas utilizar um `location.reload()` simples caso isso não garanta a atualização dos arquivos armazenados pelo PWA.

---

# 8. ATUALIZAÇÃO DO SERVICE WORKER

Implemente corretamente o ciclo de atualização do Service Worker.

Quando uma nova versão estiver disponível:

- detectar o novo Service Worker;
- informar a interface;
- permitir que o usuário escolha quando atualizar;
- ao clicar em **Atualizar**, ativar o novo Service Worker;
- assumir o controle da aplicação;
- recarregar o sistema já utilizando a nova versão.

Evitar loops infinitos de reload.

---

# 9. VERSIONAMENTO E CACHE

Relacionar o cache do PWA à versão atual do sistema.

Exemplo:

`processos-cache-v1.0.4`

Quando a versão mudar para:

`1.0.5`

o sistema poderá trabalhar com:

`processos-cache-v1.0.5`

Caches obsoletos deverão ser removidos durante a ativação da nova versão.

Arquivos críticos da aplicação não deverão permanecer indefinidamente em versões antigas.

---

# 10. EXPERIÊNCIA DO USUÁRIO

Os dois avisos possuem finalidades diferentes e não deverão aparecer simultaneamente.

Prioridade:

1. primeiro verificar se existe atualização crítica/nova versão;
2. depois verificar necessidade de oferecer instalação PWA.

Se existir uma atualização disponível, apresentar primeiro o aviso:

**Nova atualização disponível**

Somente depois que a situação da atualização estiver resolvida o sistema poderá apresentar o convite para instalação como PWA.

---

# 11. NÃO EXIBIR AVISOS DESNECESSÁRIOS

Não apresentar o banner de instalação quando:

- o sistema já estiver instalado como PWA;
- estiver sendo executado em modo standalone;
- o dispositivo/navegador não suportar aquele fluxo;
- o usuário tiver dispensado recentemente o aviso.

Não apresentar o aviso de atualização quando:

`versão instalada = última versão disponível`

---

# 12. RESULTADO ESPERADO

Ao final da implementação, o sistema deverá possuir:

- layout totalmente responsivo;
- experiência otimizada para smartphone;
- instalação como PWA;
- banner inteligente de instalação no Android;
- orientação específica de instalação no iPhone/iOS;
- detecção automática de PWA já instalado;
- controle de versão iniciando em `1.0.4`;
- detecção de novas versões;
- aviso visual de atualização;
- nova versão destacada em vermelho;
- botão **Atualizar**;
- atualização segura do Service Worker;
- renovação adequada do cache;
- prevenção de arquivos antigos após uma atualização;
- funcionamento consistente em desktop, smartphone e PWA instalado.

## IMPORTANTE

Antes de alterar os arquivos, analise a estrutura atual do projeto e reutilize a arquitetura existente sempre que possível.

Não crie implementações duplicadas caso o projeto já possua:

- `manifest.json`;
- Service Worker;
- controle de cache;
- detecção de dispositivo;
- sistema de versionamento;
- lógica de atualização PWA.

Caso já existam, ajuste e centralize as funcionalidades existentes.

Mantenha o código organizado, reutilizável e separado por responsabilidade.