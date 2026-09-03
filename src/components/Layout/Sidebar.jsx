import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ currentPage, setCurrentPage, onOpenNewDemand }) {
  const { user, logout } = useAuth();
  const perm = user?.perm || {};

  const navItem = (pageKey, label, iconId, keyHint) => {
    const isActive = currentPage === pageKey;
    return (
      <button
        type="button"
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={() => setCurrentPage(pageKey)}
        style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none' }}
      >
        <svg><use href={`#${iconId}`}></use></svg>
        <span>{label}</span>
        {keyHint && <kbd className="key-hint">{keyHint}</kbd>}
      </button>
    );
  };

  return (
    <aside className="sidebar side-menu" id="sidebar" aria-label="Navegação principal">
      <div className="side-menu-header">
        <div className="side-menu-title">
          <div className="municipal-mark" aria-hidden="true">AI</div>
          <div className="side-menu-title-text">
            <strong>Agenda Integrada</strong>
            <span>Infraestrutura e Gestão Escolar</span>
          </div>
        </div>
      </div>

      <div className="side-menu-content">
        <button
          type="button"
          className="btn btn-primary btn-new"
          onClick={onOpenNewDemand}
          aria-label="Registrar uma nova demanda ou intercorrência"
        >
          <svg><use href="#i-plus"></use></svg>
          <span>Registrar Demanda/CI</span>
          <kbd className="key-hint">N</kbd>
        </button>

        <div className="side-divider"></div>

        <nav className="nav-list">
          {navItem('dashboard', 'Painel', 'i-grid', 'P')}
          {navItem('demands', 'Demandas', 'i-clipboard', 'D')}
          {navItem('schools', 'Unidades Escolares', 'i-school', 'E')}
          {navItem('kanban', 'Quadro Kanban', 'i-kanban', 'K')}

          {perm.can_view_planning && navItem('planning', 'Planejamento Futuro', 'i-calendar', 'F')}

          {(perm.can_view_reports || perm.can_manage_admin) && (
            <>
              <div className="side-divider"></div>
              {perm.can_view_reports && navItem('reports', 'Relatórios', 'i-report', 'R')}
              {perm.can_manage_admin && navItem('admin', 'Administração', 'i-settings', 'A')}
            </>
          )}

          <div className="side-divider"></div>
          {navItem('about', 'Sobre o Sistema', 'i-info', 'S')}

          <div className="side-divider"></div>
          <button
            type="button"
            className="nav-item"
            onClick={logout}
            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none' }}
          >
            <svg><use href="#i-logout"></use></svg>
            <span>Sair</span>
          </button>
        </nav>
      </div>

      <div className="side-menu-footer">
        <span>SMEDU · Prefeitura Municipal de Itaguaí</span>
      </div>
    </aside>
  );
}
