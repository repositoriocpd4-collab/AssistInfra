import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDemands } from '../services/demands';

export default function Demands({ onSelectDemand, onOpenNewDemand, initialFilters = {} }) {
  const { user } = useAuth();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState(initialFilters.status || '');
  const [priority, setPriority] = useState(initialFilters.priority || '');
  const [search, setSearch] = useState('');

  const loadDemands = () => {
    setLoading(true);
    fetchDemands({ status, priority, search }, user)
      .then(setDemands)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDemands();
  }, [status, priority, search, user]);

  const handleExportCsv = () => {
    if (!demands.length) return;
    const headers = ['Código', 'Título', 'Unidade Escolar', 'Categoria', 'Prioridade', 'Status', 'Prazo', 'Responsável'];
    const rows = demands.map((d) => [
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
    link.setAttribute('download', `demandas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>
            Carteira de Demandas
          </h1>
          <p className="text-muted" style={{ margin: '4px 0 0' }}>
            {demands.length} demanda(s) encontrada(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
            <svg style={{ width: '16px', height: '16px' }}><use href="#i-download"></use></svg>
            <span>Exportar CSV</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onOpenNewDemand}>
            <svg style={{ width: '16px', height: '16px' }}><use href="#i-plus"></use></svg>
            <span>Nova Demanda</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="input"
          placeholder="Buscar por título, código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />

        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '180px' }}>
          <option value="">Todos os status</option>
          <option value="Nova">Nova</option>
          <option value="Em análise">Em análise</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Aguardando material">Aguardando material</option>
          <option value="Aguardando contratação">Aguardando contratação</option>
          <option value="Concluída">Concluída</option>
          <option value="Cancelada">Cancelada</option>
        </select>

        <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '160px' }}>
          <option value="">Todas as prioridades</option>
          <option value="P1">P1 · Urgência</option>
          <option value="P2">P2 · Alta</option>
          <option value="P3">P3 · Média</option>
          <option value="P4">P4 · Baixa</option>
        </select>

        {(status || priority || search) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setStatus(''); setPriority(''); setSearch(''); }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela de Demandas */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>Carregando demandas...</div>
        ) : demands.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>Nenhuma demanda encontrada com os filtros selecionados.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Código</th>
                  <th style={{ padding: '12px 16px' }}>Demanda</th>
                  <th style={{ padding: '12px 16px' }}>Unidade Escolar</th>
                  <th style={{ padding: '12px 16px' }}>Categoria</th>
                  <th style={{ padding: '12px 16px' }}>Prioridade</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => onSelectDemand(d.id)}
                    style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--blue-dark)' }}>{d.code}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{d.title}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{d.school_name}</td>
                    <td style={{ padding: '12px 16px' }}>{d.category}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${d.priority}`}>{d.priority}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="status-pill">{d.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{d.responsible || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
