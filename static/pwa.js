/* Instalação como PWA (Android/iOS), atualização de versão e ciclo de vida do
 * Service Worker. Carregado tanto em index.html quanto em login.html — por
 * isso não depende do sprite de ícones (#i-...) nem de nada definido em app.js,
 * só de window.APP_CONTEXT quando existir (páginas autenticadas). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const ctx = window.APP_CONTEXT || null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const ICON = {
    close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    install: '<svg viewBox="0 0 24 24"><path d="M12 3v12m-4-4 4 4 4-4M5 19h14"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v11m-3.5-7.5L12 3l3.5 3.5M6 21h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1"/></svg>',
  };

  function banner(id, className, html) {
    $(`#${id}`)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.className = `pwa-banner ${className}`;
    el.innerHTML = html;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    return el;
  }

  function dismissBanner(el) {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }

  // ---------------------------------------------------------------------
  // Service Worker: registra, e mantém a referência ao registration para o
  // fluxo de atualização (o SW nunca ativa sozinho — ver sw.js).
  // ---------------------------------------------------------------------
  let swRegistration = null;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        swRegistration = reg;
      }).catch(() => {});
    });
  }

  function activateNewVersionAndReload() {
    if (swRegistration && swRegistration.waiting) {
      let done = false;
      const reloadOnce = () => { if (!done) { done = true; location.reload(); } };
      navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Salvaguarda: se o navegador não disparar controllerchange (não deveria
      // acontecer, mas evita o usuário ficar preso na versão antiga).
      setTimeout(reloadOnce, 2000);
    } else {
      location.reload();
    }
  }

  // ---------------------------------------------------------------------
  // Aviso de nova versão — compara a versão com que a página foi carregada
  // (window.APP_CONTEXT.appVersion) com a versão atual do servidor (/api/about,
  // que já existe e já expõe "version"). Só roda em páginas autenticadas.
  // ---------------------------------------------------------------------
  const UPDATE_DISMISS_KEY = 'agenda-update-dismissed-version';

  function showUpdateBanner(current, latest) {
    if ($('#agendaUpdateBanner')) return;
    const el = banner('agendaUpdateBanner', 'pwa-update', `
      <div class="pwa-banner-icon">${ICON.refresh}</div>
      <div class="pwa-banner-copy">
        <strong>Nova atualização disponível!</strong>
        <p>Uma nova versão da Agenda Integrada está disponível.<br>
          Versão atual: <b>${current}</b> · Nova versão: <b class="pwa-version-new">${latest}</b></p>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="btn btn-secondary" id="pwaUpdateLater">Depois</button>
        <button type="button" class="btn btn-primary" id="pwaUpdateNow">${ICON.refresh}Atualizar</button>
      </div>`);
    $('#pwaUpdateLater', el).addEventListener('click', () => {
      localStorage.setItem(UPDATE_DISMISS_KEY, latest);
      dismissBanner(el);
    });
    $('#pwaUpdateNow', el).addEventListener('click', () => {
      dismissBanner(el);
      activateNewVersionAndReload();
    });
  }

  async function checkForUpdate() {
    if (!ctx || !ctx.appVersion) return false;
    try {
      const res = await fetch('/api/about', { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.version && data.version !== ctx.appVersion) {
        if (localStorage.getItem(UPDATE_DISMISS_KEY) === data.version) return true;
        showUpdateBanner(ctx.appVersion, data.version);
        return true;
      }
    } catch { /* offline ou servidor indisponível: não incomoda o usuário */ }
    return false;
  }

  // ---------------------------------------------------------------------
  // Convite de instalação — Android/Chrome usa o beforeinstallprompt nativo;
  // iOS/Safari não dispara esse evento, então orientamos manualmente.
  // ---------------------------------------------------------------------
  const INSTALL_DISMISS_KEY = 'agenda-pwa-install-dismissed-at';
  const DISMISS_DAYS = 14;
  let deferredPrompt = null;

  const dismissedRecently = () => {
    const raw = localStorage.getItem(INSTALL_DISMISS_KEY);
    return !!raw && (Date.now() - Number(raw)) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  };

  function showInstallBanner(kind) {
    if (isStandalone() || dismissedRecently() || $('#pwaInstallBanner')) return;
    const copy = kind === 'ios'
      ? `<strong>Instale a Agenda Integrada no seu iPhone</strong>
         <p>Toque em <span class="pwa-inline-icon">${ICON.share}</span> <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>`
      : `<strong>Instale a Agenda Integrada</strong>
         <p>Tenha acesso mais rápido ao sistema diretamente pela tela inicial do seu smartphone.</p>`;
    const actions = kind === 'ios' ? '' : `
      <div class="pwa-banner-actions">
        <button type="button" class="btn btn-secondary" id="pwaInstallLater">Agora não</button>
        <button type="button" class="btn btn-primary" id="pwaInstallNow">${ICON.install}Instalar</button>
      </div>`;
    const el = banner('pwaInstallBanner', 'pwa-install', `
      <button type="button" class="pwa-banner-close" id="pwaInstallClose" aria-label="Fechar">${ICON.close}</button>
      <div class="pwa-banner-icon"><img src="/static/icons/icon-192.png" alt=""></div>
      <div class="pwa-banner-copy">${copy}</div>
      ${actions}`);
    const dismiss = () => { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); dismissBanner(el); };
    $('#pwaInstallClose', el).addEventListener('click', dismiss);
    $('#pwaInstallLater', el)?.addEventListener('click', dismiss);
    $('#pwaInstallNow', el)?.addEventListener('click', async () => {
      dismissBanner(el);
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome !== 'accepted') localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    });
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone() || dismissedRecently()) return;
    setTimeout(() => showInstallBanner('android'), 1200);
  });

  window.addEventListener('appinstalled', () => {
    localStorage.removeItem(INSTALL_DISMISS_KEY);
    $('#pwaInstallBanner')?.remove();
  });

  // ---------------------------------------------------------------------
  // Orquestração: atualização de versão tem prioridade sobre o convite de
  // instalação (os dois nunca aparecem juntos). Nada disso roda se o app já
  // está instalado e rodando em modo standalone.
  // ---------------------------------------------------------------------
  registerServiceWorker();

  (async () => {
    if (isStandalone()) return;
    const hasUpdate = await checkForUpdate();
    if (hasUpdate) return;
    if (isIOS() && !dismissedRecently()) setTimeout(() => showInstallBanner('ios'), 1500);
  })();

  if (ctx && ctx.appVersion) {
    setInterval(checkForUpdate, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  }
})();
