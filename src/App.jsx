import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Demands from './pages/Demands';
import DemandDetail from './pages/DemandDetail';
import Schools from './pages/Schools';
import Kanban from './pages/Kanban';
import Planning from './pages/Planning';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import About from './pages/About';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import NewDemandModal from './components/Modals/NewDemandModal';

export default function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedDemandId, setSelectedDemandId] = useState(null);
  const [demandsFilter, setDemandsFilter] = useState({});
  const [showNewDemandModal, setShowNewDemandModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [largeFont, setLargeFont] = useState(false);

  // Alternar modo escuro
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.setAttribute('data-theme', !darkMode ? 'dark' : 'light');
  };

  // Alternar acessibilidade (fonte maior)
  const toggleFontSize = () => {
    setLargeFont(!largeFont);
    document.documentElement.classList.toggle('large-font', !largeFont);
  };

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar se estiver digitando em campos de input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const key = e.key.toUpperCase();
      if (key === 'N') {
        e.preventDefault();
        setShowNewDemandModal(true);
      } else if (key === 'P') {
        setCurrentPage('dashboard');
      } else if (key === 'D') {
        setSelectedDemandId(null);
        setCurrentPage('demands');
      } else if (key === 'E') {
        setCurrentPage('schools');
      } else if (key === 'K') {
        setCurrentPage('kanban');
      } else if (key === 'F' && user?.perm?.can_view_planning) {
        setCurrentPage('planning');
      } else if (key === 'R' && user?.perm?.can_view_reports) {
        setCurrentPage('reports');
      } else if (key === 'A' && user?.perm?.can_manage_admin) {
        setCurrentPage('admin');
      } else if (key === 'S') {
        setCurrentPage('about');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-soft)' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Iniciando Agenda Integrada...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const navigateTo = (page, filters = {}) => {
    setDemandsFilter(filters);
    setSelectedDemandId(null);
    setCurrentPage(page);
  };

  const handleSelectDemand = (id) => {
    setSelectedDemandId(id);
    setCurrentPage('demand-detail');
  };

  const renderContent = () => {
    if (currentPage === 'demand-detail' && selectedDemandId) {
      return (
        <DemandDetail
          demandId={selectedDemandId}
          onBack={() => setCurrentPage('demands')}
          onNavigate={navigateTo}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            onSelectDemand={handleSelectDemand}
            onNavigate={navigateTo}
          />
        );
      case 'demands':
        return (
          <Demands
            initialFilters={demandsFilter}
            onSelectDemand={handleSelectDemand}
            onOpenNewDemand={() => setShowNewDemandModal(true)}
          />
        );
      case 'schools':
        return <Schools onSelectDemand={handleSelectDemand} />;
      case 'kanban':
        return <Kanban onSelectDemand={handleSelectDemand} />;
      case 'planning':
        return <Planning />;
      case 'reports':
        return <Reports />;
      case 'admin':
        return <Admin />;
      case 'about':
        return <About />;
      default:
        return <Dashboard onSelectDemand={handleSelectDemand} onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="govbr-shell">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={(page) => {
          setSelectedDemandId(null);
          setCurrentPage(page);
        }}
        onOpenNewDemand={() => setShowNewDemandModal(true)}
      />

      <div className="govbr-main">
        <Header
          onToggleTheme={toggleTheme}
          onToggleFontSize={toggleFontSize}
        />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>

      {showNewDemandModal && (
        <NewDemandModal
          onClose={() => setShowNewDemandModal(false)}
          onSuccess={(res) => {
            handleSelectDemand(res.id);
          }}
        />
      )}
    </div>
  );
}
