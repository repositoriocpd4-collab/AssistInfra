import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ onToggleTheme, onToggleFontSize }) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="govbr-header">
      <div className="header-top">
        <div className="header-logo-area">
          <div className="prefeitura-brand" aria-label="Prefeitura Municipal de Itaguaí">
            <img
              className="header-logo"
              src="https://novoportal.itaguai.rj.gov.br/@@obter_logo_portal/logo25.png"
              alt="Prefeitura de Itaguaí"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="prefeitura-wordmark">
              <span>ITAGUAÍ</span>
              <small>PREFEITURA</small>
            </div>
          </div>
          <div className="logo-separator"></div>
          <span className="state-name hide-on-medium">Estado do Rio de Janeiro</span>
        </div>

        <div className="header-actions">
          <a
            href="https://novoportal.itaguai.rj.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link hide-on-small"
          >
            Portal PMI
          </a>
          <div className="actions-separator hide-on-small"></div>
          <a
            href="https://portal.transparencia.itaguai.rj.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link hide-on-small"
          >
            Transparência
          </a>
          <div className="actions-separator hide-on-small"></div>

          <button
            type="button"
            className="header-icon-btn"
            onClick={onToggleTheme}
            title="Alternar modo escuro"
            aria-label="Alternar modo escuro"
          >
            <svg><use href="#i-eye"></use></svg>
          </button>

          <button
            type="button"
            className="header-icon-btn"
            onClick={onToggleFontSize}
            title="Acessibilidade: ajustar tamanho de fonte"
            aria-label="Ajustar tamanho da fonte"
          >
            <svg><use href="#i-textsize"></use></svg>
          </button>

          {user && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="header-user-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                <svg style={{ width: '14px', height: '14px' }}><use href="#i-user"></use></svg>
                <span>{user.name.split(' ')[0]}</span>
                <span style={{ opacity: 0.8, fontSize: '10px' }}>({user.role_label})</span>
              </button>

              {showUserMenu && (
                <div
                  className="user-menu"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '36px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '8px 0',
                    minWidth: '200px',
                    zIndex: 999,
                  }}
                >
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)' }}>
                    <strong style={{ display: 'block', fontSize: '13px' }}>{user.name}</strong>
                    <small style={{ color: 'var(--muted)', fontSize: '11px' }}>{user.email}</small>
                    {user.school_name && (
                      <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px' }}>
                        {user.school_name}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg style={{ width: '14px', height: '14px' }}><use href="#i-logout"></use></svg>
                    <span>Sair da conta</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-bottom">
        <div className="system-title-wrap">
          <h1 className="system-title">Secretaria Municipal de Educação</h1>
          <span className="system-tagline">Subsecretaria de Infraestrutura · Gestão Escolar</span>
        </div>
      </div>
    </header>
  );
}
