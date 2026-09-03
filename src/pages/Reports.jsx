import React from 'react';
import { fetchDemands } from '../services/demands';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { user } = useAuth();

  const handleExport = async (statusFilter) => {
    const data = await fetchDemands({ status: statusFilter }, user);
    if (!data.length) {
      alert('Nenhum dado encontrado para exportação.');
      return;
    }
    const headers = ['Código', 'Título', 'Unidade Escolar', 'Categoria', 'Prioridade', 'Status', 'Prazo', 'Responsável'];
    const rows = data.map((d) => [
      d.code,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${(d.school_name || '').replace(/"/g, '""')}"`,
      d.category || '',
      d.priority || '',
      d.status || '',
      d.due_date || '',
      `"${(d.responsible || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_demandas_${statusFilter || 'todas'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>
          Relatórios Operacionais
        </h1>
        <p className="text-muted" style={{ margin: '4px 0 0' }}>
          Exportação de dados consolidados e relatórios para prestação de contas
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--blue-dark)' }}>
            Carteira Completa de Demandas
          </h3>
          <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
            Exporta todas as demandas com unidade, prazos, prioridade e responsáveis.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => handleExport('')}>
            <svg style={{ width: '16px', height: '16px' }}><use href="#i-download"></use></svg>
            <span>Baixar Planilha (CSV)</span>
          </button>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--blue-dark)' }}>
            Demandas Concluídas
          </h3>
          <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
            Histórico consolidado de todos os serviços finalizados pela Infraestrutura.
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => handleExport('Concluída')}>
            <svg style={{ width: '16px', height: '16px' }}><use href="#i-download"></use></svg>
            <span>Baixar Concluídas (CSV)</span>
          </button>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--blue-dark)' }}>
            Demandas Urgentes (P1 / P2)
          </h3>
          <p className="text-muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
            Relatório de urgências e prioridades críticas para ação de gabinete.
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => handleExport('')}>
            <svg style={{ width: '16px', height: '16px' }}><use href="#i-download"></use></svg>
            <span>Baixar Urgências (CSV)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
