import React, { useEffect, useState } from 'react';
import { fetchSchools, fetchSchoolDetail } from '../services/schools';

export default function Schools({ onSelectDemand }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSchools()
      .then(setSchools)
      .finally(() => setLoading(false));
  }, []);

  const handleSelectSchool = async (s) => {
    setSelectedSchool(s);
    setSchoolData(null);
    const detail = await fetchSchoolDetail(s.id);
    setSchoolData(detail);
  };

  const filtered = schools.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.director && s.director.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-content">
      <div style={{ marginBottom: '20px' }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>
          Unidades Escolares da Rede
        </h1>
        <p className="text-muted" style={{ margin: '4px 0 0' }}>
          {schools.length} escolas cadastradas no município
        </p>
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: '20px' }}>
        <input
          className="input"
          placeholder="Buscar escola pelo nome ou direção..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedSchool ? '1fr 1fr' : '1fr', gap: '20px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>Carregando escolas...</div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
              <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Unidade Escolar</th>
                    <th style={{ padding: '10px 14px' }}>Direção</th>
                    <th style={{ padding: '10px 14px' }}>Contato</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => handleSelectSchool(s)}
                      className={`table-row-hover ${selectedSchool?.id === s.id ? 'row-selected' : ''}`}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        cursor: 'pointer',
                        background: selectedSchool?.id === s.id ? 'rgba(0, 90, 156, 0.08)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: '600' }}>{s.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{s.director || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{s.phone || s.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Visão 360° da Escola Selecionada */}
        {selectedSchool && (
          <div className="card" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px', color: 'var(--blue-dark)' }}>
                  {selectedSchool.name}
                </h3>
                <small style={{ color: 'var(--muted)' }}>Visão 360° da Unidade</small>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedSchool(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <svg style={{ width: '18px', height: '18px' }}><use href="#i-x"></use></svg>
              </button>
            </div>

            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <div><strong>Direção:</strong> {selectedSchool.director || '—'}</div>
              <div><strong>Endereço:</strong> {selectedSchool.address || '—'}</div>
              <div><strong>Telefone:</strong> {selectedSchool.phone || '—'}</div>
              <div><strong>E-mail:</strong> {selectedSchool.email || '—'}</div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 'bold', borderTop: '1px solid var(--line)', paddingTop: '16px', marginBottom: '12px' }}>
              Demandas desta Unidade ({schoolData?.demands?.length || 0})
            </h4>

            {!schoolData ? (
              <p className="text-muted" style={{ fontSize: '12px' }}>Carregando demandas...</p>
            ) : schoolData.demands.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '12px' }}>Nenhuma demanda registrada para esta escola.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {schoolData.demands.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => onSelectDemand(d.id)}
                    style={{
                      padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)',
                      cursor: 'pointer', background: 'var(--surface-soft)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--blue-dark)' }}>{d.code}</strong>
                      <span className={`badge ${d.priority}`}>{d.priority}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{d.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Status: {d.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
