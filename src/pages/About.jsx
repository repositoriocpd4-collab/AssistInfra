import React from 'react';

export default function About() {
  return (
    <div className="page-content" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>
          Sobre a Agenda Integrada
        </h1>
        <p className="text-muted" style={{ margin: '4px 0 0' }}>
          Infraestrutura e Gestão Escolar em Ação · Prefeitura Municipal de Itaguaí
        </p>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--blue-dark)' }}>
          Arquitetura e Tecnologia
        </h3>
        <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)' }}>
          A Agenda Integrada é uma plataforma centralizada para registro, triagem, acompanhamento e planejamento
          plurianual das demandas de infraestrutura física e predial das unidades escolares da rede municipal de Itaguaí.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div>
            <strong style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>FRONTEND</strong>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>React + Vite (SPA Estática)</span>
          </div>
          <div>
            <strong style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>HOSPEDAGEM</strong>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Netlify CDN</span>
          </div>
          <div>
            <strong style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>BANCO DE DADOS & AUTH</strong>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Supabase (PostgreSQL)</span>
          </div>
          <div>
            <strong style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>VERSÃO</strong>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>2.0.0 (Netlify + Supabase)</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--blue-dark)' }}>
          Órgão Responsável
        </h3>
        <p style={{ fontSize: '13px', margin: '0 0 6px' }}>
          <strong>Prefeitura Municipal de Itaguaí</strong>
        </p>
        <p style={{ fontSize: '13px', margin: '0 0 6px' }}>
          Secretaria Municipal de Educação (SMEDU)
        </p>
        <p style={{ fontSize: '13px', margin: '0', color: 'var(--muted)' }}>
          Subsecretaria de Infraestrutura e Gestão Escolar
        </p>
      </div>
    </div>
  );
}
