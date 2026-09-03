import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { addDemandProgress } from '../../services/demands';

export default function ProgressModal({ demand, onClose, onSuccess }) {
  const { user } = useAuth();
  const [kind, setKind] = useState('Atualização geral');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(demand.status);
  const [responsible, setResponsible] = useState(demand.responsible || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleKindChange = (e) => {
    const val = e.target.value;
    setKind(val);
    if (val === 'Serviço executado') {
      setStatus('Concluída');
    } else if (val === 'Serviço iniciado') {
      setStatus('Em andamento');
    } else if (val === 'Aguardando material') {
      setStatus('Aguardando material');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Por favor, digite a descrição do andamento.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await addDemandProgress(demand.id, {
        kind,
        message,
        author: user.name,
        status,
        responsible,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao registrar andamento.');
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
        background: 'var(--surface)', borderRadius: '12px', maxWidth: '520px', width: '90%',
        padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--blue-dark)' }}>Registrar Andamento</h2>
            <small style={{ color: 'var(--muted)' }}>{demand.code} · {demand.school_name}</small>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg style={{ width: '20px', height: '20px' }}><use href="#i-x"></use></svg>
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="label">Tipo de andamento</label>
            <select className="select" value={kind} onChange={handleKindChange}>
              <option value="Atualização geral">Atualização geral</option>
              <option value="Serviço iniciado">Serviço iniciado (Em andamento)</option>
              <option value="Aguardando material">Aguardando material</option>
              <option value="Alterar responsável">Alterar responsável</option>
              <option value="Serviço executado">Serviço executado (Concluir demanda)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="label">Atualizar status para</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Nova">Nova</option>
              <option value="Em análise">Em análise</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Aguardando material">Aguardando material</option>
              <option value="Aguardando contratação">Aguardando contratação</option>
              <option value="Concluída">Concluída</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="label">Responsável</label>
            <input
              className="input"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Nome do técnico ou empresa responsável"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="label">Descrição do andamento *</label>
            <textarea
              className="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Descreva o que foi realizado, prazos combinados ou pendências..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Andamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
