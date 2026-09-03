import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDemands, updateDemand } from '../services/demands';

const COLUMNS = [
  { key: 'Nova', label: 'Nova', color: 'blue' },
  { key: 'Em análise', label: 'Em Análise', color: 'orange' },
  { key: 'Em andamento', label: 'Em Andamento', color: 'teal' },
  { key: 'Aguardando material', label: 'Aguardando Material', color: 'violet' },
  { key: 'Concluída', label: 'Concluída', color: 'green' },
];

export default function Kanban({ onSelectDemand }) {
  const { user } = useAuth();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    fetchDemands({}, user)
      .then(setDemands)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const demandId = e.dataTransfer.getData('text/plain');
    if (!demandId) return;

    const d = demands.find((x) => String(x.id) === String(demandId));
    if (!d || d.status === targetStatus) return;

    // Atualização otimista
    setDemands((prev) =>
      prev.map((item) => (String(item.id) === String(demandId) ? { ...item, status: targetStatus } : item))
    );

    try {
      await updateDemand(
        demandId,
        { status: targetStatus },
        user.name,
        `Status alterado no Kanban: ${d.status} → ${targetStatus}`
      );
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: '20px' }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>
          Quadro Kanban
        </h1>
        <p className="text-muted" style={{ margin: '4px 0 0' }}>
          Arraste e solte os cartões entre as colunas para atualizar os status operacionais
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>Carregando quadro kanban...</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(260px, 1fr))`,
          gap: '16px',
          overflowX: 'auto',
          alignItems: 'start',
          paddingBottom: '16px'
        }}>
          {COLUMNS.map((col) => {
            const colDemands = demands.filter((d) => d.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.key)}
                style={{
                  background: 'var(--surface-soft)',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  padding: '14px',
                  minHeight: '600px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--blue-dark)' }}>{col.label}</strong>
                  <span className="badge P4" style={{ fontSize: '11px' }}>{colDemands.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {colDemands.map((d) => (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', d.id)}
                      onClick={() => onSelectDemand(d.id)}
                      className="card table-row-hover"
                      style={{
                        padding: '12px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        cursor: 'grab',
                        border: '1px solid var(--line)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>{d.code}</span>
                        <span className={`badge ${d.priority}`}>{d.priority}</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                        {d.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {d.school_name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
