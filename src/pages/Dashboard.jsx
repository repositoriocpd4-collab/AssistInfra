import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardStats } from '../services/demands';

export default function Dashboard({ onSelectDemand, onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats(user)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
        Carregando indicadores do painel...
      </div>
    );
  }

  const s = data?.stats || {};
  const attention = data?.attention || [];
  const catCounts = data?.catCounts || {};

  const statCard = (label, value, sub, colorClass, onClick) => (
    <div
      className={`stat-card ${colorClass}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );

  return (
    <div className="page-content">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>
            Painel da Agenda Integrada
          </h1>
          <p className="text-muted" style={{ margin: '4px 0 0' }}>
            {user?.perm?.school_scoped
              ? `Visão restrita: ${user.school_name || 'Unidade Escolar'}`
              : 'Visão consolidada de todas as unidades escolares da rede municipal'}
          </p>
        </div>
      </div>

      {/* Grid de Indicadores */}
      <div className="stat-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {statCard('Total de demandas', s.total, 'Registro consolidado', 'primary', () => onNavigate('demands'))}
        {statCard('Urgentes (P1)', s.urgent, 'Ação imediata necessária', 'red', () => onNavigate('demands', { priority: 'P1' }))}
        {statCard('Alta prioridade (P2)', s.high, 'Já incomoda a rotina', 'orange', () => onNavigate('demands', { priority: 'P2' }))}
        {statCard('Prazo vencido', s.overdue, 'Requer atenção imediata', 'red')}
        {statCard('Vence em 7 dias', s.due_soon, 'Ainda dá tempo de agir', 'orange')}
        {statCard('Em análise', s.analysis, 'Triagem e avaliação', 'orange', () => onNavigate('demands', { status: 'Em análise' }))}
        {statCard('Em andamento', s.progress, 'Programados ou em execução', 'teal', () => onNavigate('demands', { status: 'Em andamento' }))}
        {statCard('Aguardando contratação', s.contract, 'Processo administrativo', 'violet')}
        {statCard('Concluídas', s.completed, 'Atendimentos finalizados', 'green', () => onNavigate('demands', { status: 'Concluída' }))}
        {statCard('Planejamento futuro', s.future, 'Exercícios seguintes', 'blue', () => onNavigate('planning'))}
        {statCard('Sem responsável', s.unassigned, 'Falta indicar quem cuida', 'violet')}
        {statCard(
          'Custo em aberto',
          'R$ ' + (s.open_cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          'Estimativa do que está aberto',
          'blue'
        )}
      </div>

      {/* Seção de Atenção Necessária e Categorias */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--blue-dark)' }}>
            Atenção Necessária
          </h2>
          {attention.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '13px' }}>Nenhuma pendência crítica no momento.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Código</th>
                    <th style={{ padding: '8px' }}>Demanda</th>
                    <th style={{ padding: '8px' }}>Prioridade</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => onSelectDemand(d.id)}
                      style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '10px 8px', fontWeight: '600' }}>{d.code}</td>
                      <td style={{ padding: '10px 8px' }}>{d.title}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span className={`badge ${d.priority}`}>{d.priority}</span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span className="status-pill">{d.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--blue-dark)' }}>
            Demandas por Categoria
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(catCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([cat, count]) => {
                const max = Math.max(...Object.values(catCounts), 1);
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>{cat}</span>
                      <strong>{count}</strong>
                    </div>
                    <div style={{ background: 'var(--line)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)' }}></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
