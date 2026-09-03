import React, { useEffect, useState } from 'react';
import { fetchPlanning, createPlanningItem } from '../services/planning';

export default function Planning() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    year: '2027',
    title: '',
    category: 'Elétrica',
    kind: 'Aquisição futura',
    estimated_cost: '',
    quantity: '1',
    unit: 'UN',
    justification: '',
  });

  const loadData = () => {
    fetchPlanning()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const years = Array.from(new Set(items.map((i) => i.year))).sort();
  const filtered = selectedYear === 'all' ? items : items.filter((i) => String(i.year) === selectedYear);

  const totalCost = filtered.reduce((acc, i) => acc + (Number(i.estimated_cost) || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    try {
      await createPlanningItem(form);
      setShowModal(false);
      setForm({
        year: '2027',
        title: '',
        category: 'Elétrica',
        kind: 'Aquisição futura',
        estimated_cost: '',
        quantity: '1',
        unit: 'UN',
        justification: '',
      });
      loadData();
    } catch (err) {
      alert('Erro ao salvar planejamento: ' + err.message);
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>
            Planejamento Futuro Plurianual
          </h1>
          <p className="text-muted" style={{ margin: '4px 0 0' }}>
            Consolidação de compras, obras e contratações para os próximos exercícios
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg style={{ width: '16px', height: '16px' }}><use href="#i-plus"></use></svg>
          <span>Novo Item</span>
        </button>
      </div>

      {/* Cards de Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <small className="text-muted" style={{ fontSize: '11px', fontWeight: '700' }}>TOTAL DE ITENS</small>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>{filtered.length}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <small className="text-muted" style={{ fontSize: '11px', fontWeight: '700' }}>ESTIMATIVA TOTAL</small>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
            R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filtro por Ano */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '600' }}>Exercício:</span>
        <button
          type="button"
          className={`btn ${selectedYear === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedYear('all')}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          Todos os anos
        </button>
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className={`btn ${selectedYear === String(y) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedYear(String(y))}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Tabela de Planejamento */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>Carregando planejamento...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>Nenhum item cadastrado para este exercício.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Código</th>
                  <th style={{ padding: '12px 16px' }}>Exercício</th>
                  <th style={{ padding: '12px 16px' }}>Objeto / Descrição</th>
                  <th style={{ padding: '12px 16px' }}>Tipo</th>
                  <th style={{ padding: '12px 16px' }}>Categoria</th>
                  <th style={{ padding: '12px 16px' }}>Estimativa (R$)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--blue-dark)' }}>{item.code}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{item.year}</td>
                    <td style={{ padding: '12px 16px' }}>{item.title}</td>
                    <td style={{ padding: '12px 16px' }}>{item.kind}</td>
                    <td style={{ padding: '12px 16px' }}>{item.category}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--primary)' }}>
                      R$ {Number(item.estimated_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal-box" style={{
            background: 'var(--surface)', borderRadius: '12px', maxWidth: '520px', width: '90%',
            padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--blue-dark)' }}>
              Novo Item de Planejamento Futuro
            </h2>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="label">Exercício</label>
                  <select className="select" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
                    <option>2027</option>
                    <option>2028</option>
                    <option>2029</option>
                    <option>2030</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    <option>Aquisição futura</option>
                    <option>Contratação futura</option>
                    <option>Obra futura</option>
                    <option>Projeto futuro</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="label">Objeto / Necessidade *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Aquisição de 10 aparelhos de ar-condicionado"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="label">Estimativa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={form.estimated_cost}
                    onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="label">Quantidade</label>
                  <input
                    type="number"
                    className="input"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
