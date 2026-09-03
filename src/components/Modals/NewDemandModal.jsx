import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchSchools } from '../../services/schools';
import { createDemand } from '../../services/demands';

const CATEGORIES = [
  'Elétrica', 'Hidráulica', 'Cobertura/Telhado', 'Pintura', 'Climatização',
  'Serralheria', 'Alvenaria', 'Acessibilidade', 'Mobiliário', 'Equipamentos',
  'Segurança', 'Saneamento', 'Estrutura', 'Área externa', 'Iluminação',
  'Portas e janelas', 'Reforma', 'Obra', 'Aquisição', 'Outros'
];

export default function NewDemandModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Elétrica',
    school_id: user?.perm?.school_scoped ? user.school_id : '',
    priority: 'P3',
    location: '',
    impact: '',
    affected_people: 0,
    risk: false,
    blocks_activity: false,
  });

  useEffect(() => {
    if (!user?.perm?.school_scoped) {
      fetchSchools().then((data) => {
        setSchools(data);
        if (data.length > 0) {
          setForm((prev) => ({ ...prev, school_id: data[0].id }));
        }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      setError('Por favor, preencha o título e a descrição.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createDemand(form, user);
      onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao registrar demanda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="modal-box" style={{
        background: 'var(--surface)', borderRadius: '12px', maxWidth: '640px', width: '90%',
        maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--blue-dark)' }}>Registrar Nova Demanda</h2>
            <small style={{ color: 'var(--muted)' }}>Informe o problema identificado na unidade escolar.</small>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg style={{ width: '20px', height: '20px' }}><use href="#i-x"></use></svg>
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {!user?.perm?.school_scoped ? (
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="label">Unidade Escolar *</label>
              <select className="select" name="school_id" value={form.school_id} onChange={handleChange} required>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="label">Unidade Escolar</label>
              <input className="input" value={user?.school_name || 'Minha Unidade'} disabled />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="label">Título da Demanda *</label>
            <input
              className="input"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ex.: Curto-circuito no refeitório"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label className="label">Categoria *</label>
              <select className="select" name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Prioridade Inicial</label>
              <select className="select" name="priority" value={form.priority} onChange={handleChange}>
                <option value="P1">P1 · Urgência Imediata</option>
                <option value="P2">P2 · Alta Prioridade</option>
                <option value="P3">P3 · Média Prioridade</option>
                <option value="P4">P4 · Baixa / Planejamento</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="label">Local Exato</label>
            <input
              className="input"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Ex.: Sala 04, Bloco B ou Pátio externo"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="label">Descrição do Problema *</label>
            <textarea
              className="textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva com detalhes o que aconteceu e o que necessita de intervenção..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <label className="check" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input type="checkbox" name="risk" checked={form.risk} onChange={handleChange} />
              Oferece risco físico imediato
            </label>
            <label className="check" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input type="checkbox" name="blocks_activity" checked={form.blocks_activity} onChange={handleChange} />
              Interrompe aulas ou rotina escolar
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Demanda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
