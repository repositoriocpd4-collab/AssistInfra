import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDemandDetail } from '../services/demands';
import { generateDemandPdf } from '../services/pdf';
import ProgressModal from '../components/Modals/ProgressModal';

export default function DemandDetail({ demandId, onBack, onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchDemandDetail(demandId)
      .then(setData)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [demandId]);

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>Carregando dados da demanda...</div>;
  }

  if (!data?.demand) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p>Demanda não encontrada.</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>Voltar</button>
      </div>
    );
  }

  const { demand, updates, attachments } = data;
  const isCompleted = demand.status === 'Concluída';

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      await generateDemandPdf(demand, updates, user);
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="page-content">
      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
        <button type="button" onClick={() => onNavigate('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
          Painel
        </button>
        <span>›</span>
        <button type="button" onClick={() => onNavigate('demands')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
          Demandas
        </button>
        <span>›</span>
        <span style={{ fontWeight: '600', color: 'var(--text)' }}>{demand.code}</span>
      </div>

      {/* Cabeçalho da Demanda */}
      <div className="dv-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--blue-dark)', margin: '0 0 8px' }}>
            {demand.title}
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--primary)' }}>{demand.code}</span>
            <span className={`badge ${demand.priority}`}>{demand.priority}</span>
            <span className="status-pill">{demand.status}</span>
            {demand.archived_at && <span className="badge P4">Arquivada</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {isCompleted && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
            >
              <svg style={{ width: '16px', height: '16px' }}><use href="#i-download"></use></svg>
              <span>{generatingPdf ? 'Gerando PDF...' : 'Gerar PDF'}</span>
            </button>
          )}

          {!isCompleted && user?.perm?.can_edit_analysis && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowProgressModal(true)}
            >
              <svg style={{ width: '16px', height: '16px' }}><use href="#i-edit"></use></svg>
              <span>Registrar Andamento</span>
            </button>
          )}
        </div>
      </div>

      {/* Cartão de Orientação "O que fazer agora" */}
      <div className="card" style={{
        padding: '16px 20px', marginBottom: '24px',
        background: isCompleted ? 'rgba(26, 124, 68, 0.08)' : 'rgba(0, 90, 156, 0.08)',
        borderLeft: `4px solid ${isCompleted ? 'var(--green)' : 'var(--primary)'}`
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px', color: 'var(--blue-dark)' }}>
          {isCompleted ? 'Demanda Concluída' : 'Orientação do Estágio'}
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
          {isCompleted
            ? 'Esta demanda está encerrada. O andamento possível agora é consultá-la, gerar o relatório PDF oficial ou destiná-la a exercícios futuros no Planejamento.'
            : demand.status === 'Nova'
            ? 'Demanda aguardando análise técnica da equipe de Infraestrutura da Secretaria.'
            : `Demanda sob responsabilidade de ${demand.responsible || 'equipe técnica'}. Registre andamentos para documentar o avanço no local.`}
        </p>
      </div>

      {/* Grade de Fatos / Metadados */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px', marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <small className="text-muted" style={{ display: 'block', fontSize: '11px', fontWeight: '700' }}>UNIDADE ESCOLAR</small>
          <strong style={{ fontSize: '14px' }}>{demand.school_name}</strong>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <small className="text-muted" style={{ display: 'block', fontSize: '11px', fontWeight: '700' }}>CATEGORIA</small>
          <strong style={{ fontSize: '14px' }}>{demand.category || '—'}</strong>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <small className="text-muted" style={{ display: 'block', fontSize: '11px', fontWeight: '700' }}>RESPONSÁVEL</small>
          <strong style={{ fontSize: '14px' }}>{demand.responsible || 'Não definido'}</strong>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <small className="text-muted" style={{ display: 'block', fontSize: '11px', fontWeight: '700' }}>PRAZO ESTIMADO</small>
          <strong style={{ fontSize: '14px' }}>{demand.due_date ? demand.due_date.slice(0, 10) : 'Sem prazo'}</strong>
        </div>

        {demand.cost_estimate > 0 && (
          <div className="card" style={{ padding: '14px 16px' }}>
            <small className="text-muted" style={{ display: 'block', fontSize: '11px', fontWeight: '700' }}>CUSTO ESTIMADO</small>
            <strong style={{ fontSize: '14px' }}>R$ {Number(demand.cost_estimate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </div>
        )}
      </div>

      {/* Descrição e Detalhes */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--blue-dark)' }}>
          Descrição do Objeto
        </h3>
        <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line', margin: '0 0 16px' }}>
          {demand.description}
        </p>

        {demand.location && (
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
            <strong>Local específico:</strong> {demand.location}
          </div>
        )}

        {demand.impact && (
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            <strong>Impacto relatado:</strong> {demand.impact}
          </div>
        )}
      </div>

      {/* Histórico Completo de Andamentos */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--blue-dark)' }}>
          Histórico e Linha do Tempo ({updates.length})
        </h3>

        {updates.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '13px' }}>Nenhum andamento registrado até o momento.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {updates.map((u) => (
              <div
                key={u.id}
                style={{
                  borderLeft: '3px solid var(--primary)',
                  paddingLeft: '14px',
                  paddingBottom: '4px'
                }}
              >
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--primary)', fontWeight: '700', marginBottom: '4px' }}>
                  <span>{u.created_at ? u.created_at.slice(0, 16).replace('T', ' às ') : ''}</span>
                  <span>·</span>
                  <span>{u.kind}</span>
                  <span>·</span>
                  <span style={{ color: 'var(--text)', fontWeight: '600' }}>{u.author}</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', lineHeight: '1.5' }}>
                  {u.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showProgressModal && (
        <ProgressModal
          demand={demand}
          onClose={() => setShowProgressModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
